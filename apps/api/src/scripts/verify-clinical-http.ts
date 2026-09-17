/**
 * HTTP-level verification of the clinical documentation endpoints.
 *
 * Run from `apps/api` with the API already listening:
 *   npx tsx src/scripts/verify-clinical-http.ts
 *
 * Complements `verify-clinical-docs.ts`, which exercises the services directly.
 * This one goes over the wire so the real guards run — `AuthGuard`, `CaslGuard`
 * and `RolesGuard` are the security boundary, and a service-level test cannot
 * prove they are wired correctly.
 *
 * Creates two throwaway accounts (provider + front_desk), runs the checks, then
 * removes them.
 */
import 'dotenv/config';
import { db } from '../core/db/index.js';
import { user, patients, encounters } from '../core/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { getAuth } from '../core/auth/auth.js';

const BASE = 'http://localhost:3000/api';

const pass = (msg: string) => console.log(`  PASS  ${msg}`);
const fail = (msg: string) => {
  console.error(`  FAIL  ${msg}`);
  process.exitCode = 1;
};
const section = (msg: string) => console.log(`\n== ${msg}`);

const STAMP = Date.now();
const PROVIDER_EMAIL = `verify.provider.${STAMP}@example.test`;
const FRONT_DESK_EMAIL = `verify.frontdesk.${STAMP}@example.test`;
const PASSWORD = `Verify-${STAMP}-pw`;

/**
 * Minimal cookie-jar fetch: extracts `Set-Cookie` and replays it.
 *
 * The `Origin` header is required: Better Auth rejects state-changing requests
 * (sign-in included) whose origin is not in its trusted list, with a 403 that
 * looks nothing like an auth failure. This mirrors what the browser sends.
 */
function makeClient() {
  let cookie = '';
  return async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: any }> => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) {
      cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    }

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* some responses have no body */
    }
    return { status: res.status, json };
  };
}

async function createUserWithRole(
  email: string,
  role: string,
): Promise<string> {
  const auth = getAuth()!;
  const created: any = await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: `Verify ${role}`,
      data: { role },
    },
  });
  return created?.user?.id;
}

async function signIn(
  email: string,
): Promise<ReturnType<typeof makeClient>> {
  const client = makeClient();
  const res = await client('POST', '/auth/sign-in/email', {
    email,
    password: PASSWORD,
  });
  if (res.status >= 400) {
    throw new Error(`sign-in failed for ${email}: ${res.status}`);
  }
  return client;
}

async function main() {
  const auth = getAuth();
  if (!auth) {
    fail('auth is not initialised');
    return;
  }

  section('Setup: create throwaway accounts');
  const providerId = await createUserWithRole(PROVIDER_EMAIL, 'provider');
  const frontDeskId = await createUserWithRole(FRONT_DESK_EMAIL, 'front_desk');
  pass(`provider ${providerId}`);
  pass(`front_desk ${frontDeskId}`);

  const [patient] = await db
    .insert(patients)
    .values({ first_name: 'Http', last_name: 'Verify' })
    .returning();
  const [encounter] = await db
    .insert(encounters)
    .values({ patient_id: patient.id, status: 'in_progress' })
    .returning();
  pass(`patient ${patient.id}, encounter ${encounter.id}`);

  const provider = await signIn(PROVIDER_EMAIL);
  const frontDesk = await signIn(FRONT_DESK_EMAIL);
  pass('both accounts signed in');

  try {
    section('GET /api/diagnoses — available to every authenticated role');
    const fdCatalogue = await frontDesk('GET', '/diagnoses');
    if (fdCatalogue.status !== 200) {
      fail(`front_desk got ${fdCatalogue.status}, expected 200`);
    } else {
      pass('front_desk can read the catalogue (it is a picker source)');
    }
    const items = fdCatalogue.json?.items ?? [];
    if (items.length !== 30) fail(`expected 30 items, got ${items.length}`);
    else pass(`catalogue returned ${items.length} items`);
    if (!fdCatalogue.json?.groups?.length) fail('groups array missing');
    else pass(`groups: ${fdCatalogue.json.groups.join(', ')}`);

    section('Clinical notes over HTTP — provider can write');
    const created = await provider('POST', '/clinical-notes', {
      encounter_id: encounter.id,
      note_type: 'consultation',
      subjective: 'Cough and fever',
      assessment: 'Acute URI',
      plan: 'Symptomatic treatment',
    });
    if (created.status !== 201) {
      fail(`create returned ${created.status}: ${JSON.stringify(created.json)}`);
    } else {
      pass(`note created over HTTP (version ${created.json.version})`);
    }
    const noteId = created.json?.id;

    section('Clinical notes over HTTP — front_desk is refused');
    const fdRead = await frontDesk('GET', `/clinical-notes?patient_id=${patient.id}`);
    if (fdRead.status !== 403) fail(`front_desk read got ${fdRead.status}, expected 403`);
    else pass('front_desk cannot list clinical notes (403)');

    const fdWrite = await frontDesk('POST', '/clinical-notes', {
      encounter_id: encounter.id,
      subjective: 'should not be allowed',
    });
    if (fdWrite.status !== 403) fail(`front_desk write got ${fdWrite.status}, expected 403`);
    else pass('front_desk cannot create a clinical note (403)');

    section('Problems over HTTP — catalogue code validation');
    const goodProblem = await provider('POST', '/problems', {
      patient_id: patient.id,
      encounter_id: encounter.id,
      description: 'Malaria, unspecified',
      code: 'B54',
      code_system: 'ICD-10',
      diagnosis_slug: 'malaria',
    });
    if (goodProblem.status !== 201) {
      fail(`valid problem got ${goodProblem.status}: ${JSON.stringify(goodProblem.json)}`);
    } else {
      pass(`catalogue-coded problem created (${goodProblem.json.code})`);
    }

    const badCode = await provider('POST', '/problems', {
      patient_id: patient.id,
      description: 'Bogus',
      code: 'Z99.9',
      code_system: 'ICD-10',
      diagnosis_slug: 'bogus',
    });
    if (badCode.status !== 400) fail(`off-list code got ${badCode.status}, expected 400`);
    else pass('off-list code rejected with 400');

    const mismatchedSlug = await provider('POST', '/problems', {
      patient_id: patient.id,
      description: 'Mismatched slug',
      code: 'B54',
      code_system: 'ICD-10',
      diagnosis_slug: 'asthma',
    });
    if (mismatchedSlug.status !== 400)
      fail(`mismatched slug got ${mismatchedSlug.status}, expected 400`);
    else pass('slug that disagrees with the code rejected with 400');

    const freeText = await provider('POST', '/problems', {
      patient_id: patient.id,
      description: 'Off-list diagnosis, no code',
    });
    if (freeText.status !== 201)
      fail(`free-text problem got ${freeText.status}, expected 201`);
    else pass('free-text problem with no code accepted');

    section('Problems over HTTP — front_desk is refused');
    const fdProblems = await frontDesk('GET', `/problems?patient_id=${patient.id}`);
    if (fdProblems.status !== 403)
      fail(`front_desk problems got ${fdProblems.status}, expected 403`);
    else pass('front_desk cannot read the problem list (403)');

    section('Notes over HTTP — optimistic lock');
    const stale = await provider('PUT', `/clinical-notes/${noteId}`, {
      version: 99,
      assessment: 'Stale',
    });
    if (stale.status !== 409) fail(`stale update got ${stale.status}, expected 409`);
    else pass('stale version rejected with 409');

    const fresh = await provider('PUT', `/clinical-notes/${noteId}`, {
      version: 1,
      assessment: 'Confirmed acute URI',
    });
    if (fresh.status !== 200) fail(`fresh update got ${fresh.status}, expected 200`);
    else pass(`update succeeded, version now ${fresh.json.version}`);

    const revisions = await provider('GET', `/clinical-notes/${noteId}/revisions`);
    if (revisions.status !== 200) fail(`revisions got ${revisions.status}`);
    else if (revisions.json?.length !== 1)
      fail(`expected 1 revision, got ${revisions.json?.length}`);
    else if (revisions.json[0].assessment !== 'Acute URI')
      fail('revision did not preserve the original assessment');
    else pass('revision history returned the superseded content');

    section('Audit: encounter timeline carries no clinical text');
    const encounterAudit = await frontDesk('GET', `/audit/encounter/${encounter.id}`);
    if (encounterAudit.status !== 200) {
      fail(`encounter audit got ${encounterAudit.status}, expected 200`);
    } else {
      const serialised = JSON.stringify(encounterAudit.json ?? []);
      const forbidden = [
        'Cough and fever',
        'Acute URI',
        'Confirmed acute URI',
        'Symptomatic treatment',
        'Malaria, unspecified',
        'Off-list diagnosis',
      ];
      const leaked = forbidden.filter((t) => serialised.includes(t));
      if (leaked.length) fail(`encounter audit leaked: ${leaked.join(' | ')}`);
      else pass('front_desk can read the encounter timeline with no clinical text');
    }

    section('Audit: clinical entries are present but metadata-only');
    const noteAuditEntries = (encounterAudit.json ?? []).filter(
      (e: any) => e.resource_type === 'clinical_note',
    );
    if (noteAuditEntries.length === 0) fail('no clinical_note entries on the timeline');
    else pass(`${noteAuditEntries.length} clinical_note audit entries on the timeline`);
    for (const entry of noteAuditEntries) {
      const keys = Object.keys(entry.diff ?? {});
      const bad = keys.filter((k) =>
        ['subjective', 'objective', 'assessment', 'plan', 'additional_notes'].includes(k),
      );
      if (bad.length) fail(`audit diff exposed content keys: ${bad.join(', ')}`);
    }
  } finally {
    section('Cleanup');
    await db.delete(patients).where(eq(patients.id, patient.id));
    await db.delete(user).where(inArray(user.id, [providerId, frontDeskId]));
    pass('test accounts and patient removed');
  }

  console.log(
    process.exitCode
      ? '\nRESULT: FAILURES ABOVE'
      : '\nRESULT: all HTTP checks passed',
  );
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error('\nUnexpected error:', e);
    process.exit(1);
  });
