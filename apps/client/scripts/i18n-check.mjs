#!/usr/bin/env node
/**
 * i18n parity check.
 *
 * Verifies that every locale file defines exactly the same set of translation
 * keys. A key present in one locale but missing from another means users of
 * that language silently fall back to English (or see a raw key), which is the
 * most common way translation drift reaches production.
 *
 * Locale files are discovered automatically, so adding a new language (e.g.
 * `de.json`) requires no changes here — it is picked up and enforced on the
 * next run.
 *
 * Usage:
 *   pnpm run i18n:check
 *
 * Exit codes:
 *   0 — all locales have identical key sets
 *   1 — drift detected (missing/extra keys) or a locale file is unreadable
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');

/** Recursively flattens a nested object into dotted key paths. */
function flattenKeys(value, prefix = '') {
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...flattenKeys(child, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
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
    return {
      locale: file.replace(/\.json$/, ''),
      file,
      keys: new Set(flattenKeys(parsed)),
    };
  });
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

  if (hasDrift) {
    console.error('i18n parity check failed. Add the missing keys to every locale.');
    process.exit(1);
  }

  console.log('\ni18n parity check passed.');
}

main();
