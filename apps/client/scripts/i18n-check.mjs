#!/usr/bin/env node
/**
 * i18n parity check.
 *
 * Verifies that every locale file defines the same translation keys, and that
 * the messages behind those keys are structurally sound.
 *
 * Two classes of drift are caught:
 *
 *   1. Key drift — a key present in one locale but missing from another. Users
 *      of that language silently fall back to English, or see a raw key.
 *   2. Placeholder drift — a message whose placeholders are malformed or differ
 *      between locales. i18next interpolates `{{name}}`; a single-braced
 *      `{name}` is not recognised and is rendered to the user verbatim, so the
 *      screen shows the raw template instead of the value.
 *
 * Locale files are discovered automatically, so adding a new language (e.g.
 * `de.json`) requires no changes here — it is picked up and enforced on the
 * next run.
 *
 * Usage:
 *   pnpm run i18n:check
 *
 * Exit codes:
 *   0 — locales have identical key sets and no placeholder problems
 *   1 — drift detected (keys or placeholders) or a locale file is unreadable
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');

/** Recursively flattens a nested object into `[dottedKey, value]` leaf entries. */
function flattenEntries(value, prefix = '') {
  const entries = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      entries.push(...flattenEntries(child, path));
    } else {
      entries.push([path, child]);
    }
  }
  return entries;
}

/** CLDR plural suffixes recognised by i18next's default (v4) JSON format. */
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

const hasPluralSuffix = (key) => PLURAL_SUFFIXES.some((suffix) => key.endsWith(suffix));

/** The interpolation syntax i18next actually substitutes: `{{name}}`. */
const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * A braced token that is *not* a well-formed `{{name}}` placeholder.
 *
 * The lookarounds keep the two braces of a valid placeholder from being read as
 * a stray single-braced token, so `{{count}}` yields nothing here.
 */
const MALFORMED_PLACEHOLDER_PATTERN = /(?<!\{)\{\s*([\w.]+)\s*\}(?!\})/g;

/** Names of every `{{name}}` placeholder in a message. */
function extractPlaceholders(message) {
  return new Set([...message.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]));
}

/** Single-braced tokens in a message, which i18next will not substitute. */
function findMalformedPlaceholders(message) {
  return [...message.matchAll(MALFORMED_PLACEHOLDER_PATTERN)].map((match) => match[0]);
}

function loadLocales() {
  const files = readdirSync(LOCALES_DIR).filter((file) => file.endsWith('.json'));

  if (files.length === 0) {
    console.error(`No locale files found in ${LOCALES_DIR}`);
    process.exit(1);
  }

  return files.map((file) => {
    const fullPath = join(LOCALES_DIR, file);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (error) {
      console.error(`Failed to parse ${file}: ${error.message}`);
      process.exit(1);
    }
    const values = new Map(flattenEntries(parsed));
    return {
      locale: file.replace(/\.json$/, ''),
      file,
      keys: new Set(values.keys()),
      values,
    };
  });
}

/**
 * Validates the messages themselves, independent of which keys exist.
 *
 * Runs over every locale — including the reference — because a malformed
 * placeholder is broken wherever it lives, not only where it differs.
 * Returns a list of human-readable problems rather than throw/exit, so a single
 * run reports everything that needs fixing.
 */
function checkPlaceholders(locales, reference) {
  const problems = [];

  for (const locale of locales) {
    for (const [key, message] of locale.values) {
      if (typeof message !== 'string') continue;

      const malformed = findMalformedPlaceholders(message);
      if (malformed.length > 0) {
        const tokens = malformed.map((token) => `'${token}'`).join(', ');
        problems.push(
          `${locale.file} → "${key}": ${tokens} is not a valid placeholder and would render literally. ` +
            `i18next substitutes double-braced names ({{...}}).`,
        );
      }

      const placeholders = extractPlaceholders(message);

      // i18next picks the plural category from a variable named exactly
      // `count`, so a plural key without it never selects a variant.
      if (hasPluralSuffix(key) && !placeholders.has('count')) {
        problems.push(
          `${locale.file} → "${key}": plural key has no {{count}} placeholder. ` +
            `i18next pluralises on a variable named "count".`,
        );
      }

      const referenceMessage = reference.values.get(key);
      if (typeof referenceMessage !== 'string') continue;

      const expected = extractPlaceholders(referenceMessage);
      const missing = [...expected].filter((name) => !placeholders.has(name));
      const unexpected = [...placeholders].filter((name) => !expected.has(name));

      if (missing.length > 0 || unexpected.length > 0) {
        const details = [];
        if (missing.length > 0) {
          details.push(`missing ${missing.map((name) => `{{${name}}}`).join(', ')}`);
        }
        if (unexpected.length > 0) {
          details.push(`unexpected ${unexpected.map((name) => `{{${name}}}`).join(', ')}`);
        }
        problems.push(
          `${locale.file} → "${key}": placeholders differ from ${reference.locale} (${details.join('; ')}).`,
        );
      }
    }
  }

  return problems;
}

function main() {
  const locales = loadLocales();

  // The first locale alphabetically acts as the reference set. Every other
  // locale is compared against it in both directions.
  const [reference, ...others] = locales;
  let hasDrift = false;

  console.log(
    `Checking ${locales.length} locale(s): ${locales.map((l) => l.locale).join(', ')}\n`,
  );

  for (const other of others) {
    const missing = [...reference.keys].filter((key) => !other.keys.has(key));
    const extra = [...other.keys].filter((key) => !reference.keys.has(key));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${other.locale} matches ${reference.locale} (${other.keys.size} keys)`);
      continue;
    }

    hasDrift = true;
    console.error(`✗ ${other.locale} differs from ${reference.locale}`);

    if (missing.length > 0) {
      console.error(`\n  Missing from ${other.locale} (${missing.length}):`);
      for (const key of missing.sort()) console.error(`    - ${key}`);
    }
    if (extra.length > 0) {
      console.error(`\n  Extra in ${other.locale} (${extra.length}):`);
      for (const key of extra.sort()) console.error(`    + ${key}`);
    }
    console.error('');
  }

  const placeholderProblems = checkPlaceholders(locales, reference);
  if (placeholderProblems.length > 0) {
    hasDrift = true;
    console.error(`Placeholder problems (${placeholderProblems.length}):`);
    for (const problem of placeholderProblems) console.error(`  - ${problem}`);
    console.error('');
  }

  if (hasDrift) {
    console.error('i18n check failed. Fix the key and placeholder problems reported above.');
    process.exit(1);
  }

  console.log(`\ni18n check passed (${reference.keys.size} keys, placeholders valid).`);
}

main();
