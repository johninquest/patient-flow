/**
 * Data Migration: Convert free-text country values to ISO 3166-1 alpha-2 codes
 * 
 * This script migrates existing patient records from free-text country values
 * (e.g., "France", "United States") to standardized ISO codes (e.g., "FR", "US").
 * 
 * Fields migrated:
 * - patients.address.country
 * - patients.identity.country_national
 * 
 * Usage:
 *   npm run db:migrate-country
 * 
 * Options:
 *   --dry-run    Preview changes without updating the database
 *   --verbose    Show detailed output for each record
 *   --rollback   Restore from backup table (patients_country_backup)
 * 
 * Rollback:
 *   This script creates a backup table `patients_country_backup` before migration.
 *   To rollback: npm run db:migrate-country -- --rollback
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as schema from '../core/db/schema';
import { ISO_COUNTRY_CODES } from '../core/common/iso-codes';

// Load environment variables from api/.env
config({ path: resolve(__dirname, '../../.env') });

// Country name to ISO code mapping — split into English and French to avoid
// duplicate key errors for names that are identical in both languages
// (e.g., angola, canada, cuba, france, iran, oman, pakistan, samoa, tonga, etc.)

const ENGLISH_COUNTRY_NAMES: Record<string, string> = {
  'afghanistan': 'AF', 'albania': 'AL', 'algeria': 'DZ', 'andorra': 'AD', 'angola': 'AO',
  'argentina': 'AR', 'armenia': 'AM', 'australia': 'AU', 'austria': 'AT', 'azerbaijan': 'AZ',
  'bahamas': 'BS', 'bahrain': 'BH', 'bangladesh': 'BD', 'barbados': 'BB', 'belarus': 'BY',
  'belgium': 'BE', 'belize': 'BZ', 'benin': 'BJ', 'bhutan': 'BT', 'bolivia': 'BO',
  'bosnia and herzegovina': 'BA', 'botswana': 'BW', 'brazil': 'BR', 'brunei': 'BN',
  'bulgaria': 'BG', 'burkina faso': 'BF', 'burundi': 'BI', 'cambodia': 'KH', 'cameroon': 'CM',
  'canada': 'CA', 'cape verde': 'CV', 'central african republic': 'CF', 'chad': 'TD',
  'chile': 'CL', 'china': 'CN', 'colombia': 'CO', 'comoros': 'KM', 'congo': 'CG',
  'costa rica': 'CR', 'croatia': 'HR', 'cuba': 'CU', 'cyprus': 'CY', 'czech republic': 'CZ',
  'czechia': 'CZ', 'denmark': 'DK', 'djibouti': 'DJ', 'dominica': 'DM', 'dominican republic': 'DO',
  'dr congo': 'CD', 'ecuador': 'EC', 'egypt': 'EG', 'el salvador': 'SV', 'equatorial guinea': 'GQ',
  'eritrea': 'ER', 'estonia': 'EE', 'eswatini': 'SZ', 'ethiopia': 'ET', 'fiji': 'FJ',
  'finland': 'FI', 'france': 'FR', 'gabon': 'GA', 'gambia': 'GM', 'georgia': 'GE',
  'germany': 'DE', 'ghana': 'GH', 'greece': 'GR', 'grenada': 'GD', 'guatemala': 'GT',
  'guinea': 'GN', 'guinea-bissau': 'GW', 'guyana': 'GY', 'haiti': 'HT', 'honduras': 'HN',
  'hungary': 'HU', 'iceland': 'IS', 'india': 'IN', 'indonesia': 'ID', 'iran': 'IR',
  'iraq': 'IQ', 'ireland': 'IE', 'israel': 'IL', 'italy': 'IT', 'ivory coast': 'CI',
  'jamaica': 'JM', 'japan': 'JP', 'jordan': 'JO', 'kazakhstan': 'KZ', 'kenya': 'KE',
  'kiribati': 'KI', 'kuwait': 'KW', 'kyrgyzstan': 'KG', 'laos': 'LA', 'latvia': 'LV',
  'lebanon': 'LB', 'lesotho': 'LS', 'liberia': 'LR', 'libya': 'LY', 'liechtenstein': 'LI',
  'lithuania': 'LT', 'luxembourg': 'LU', 'madagascar': 'MG', 'malawi': 'MW', 'malaysia': 'MY',
  'maldives': 'MV', 'mali': 'ML', 'malta': 'MT', 'marshall islands': 'MH', 'mauritania': 'MR',
  'mauritius': 'MU', 'mexico': 'MX', 'micronesia': 'FM', 'moldova': 'MD', 'monaco': 'MC',
  'mongolia': 'MN', 'montenegro': 'ME', 'morocco': 'MA', 'mozambique': 'MZ', 'myanmar': 'MM',
  'namibia': 'NA', 'nauru': 'NR', 'nepal': 'NP', 'netherlands': 'NL', 'new zealand': 'NZ',
  'nicaragua': 'NI', 'niger': 'NE', 'nigeria': 'NG', 'north korea': 'KP', 'north macedonia': 'MK',
  'norway': 'NO', 'oman': 'OM', 'pakistan': 'PK', 'palau': 'PW', 'palestine': 'PS',
  'panama': 'PA', 'papua new guinea': 'PG', 'paraguay': 'PY', 'peru': 'PE', 'philippines': 'PH',
  'poland': 'PL', 'portugal': 'PT', 'qatar': 'QA', 'romania': 'RO', 'russia': 'RU',
  'rwanda': 'RW', 'saint kitts and nevis': 'KN', 'saint lucia': 'LC', 'saint vincent and the grenadines': 'VC',
  'samoa': 'WS', 'san marino': 'SM', 'sao tome and principe': 'ST', 'saudi arabia': 'SA',
  'senegal': 'SN', 'serbia': 'RS', 'seychelles': 'SC', 'sierra leone': 'SL', 'singapore': 'SG',
  'slovakia': 'SK', 'slovenia': 'SI', 'solomon islands': 'SB', 'somalia': 'SO', 'south africa': 'ZA',
  'south korea': 'KR', 'south sudan': 'SS', 'spain': 'ES', 'sri lanka': 'LK', 'sudan': 'SD',
  'suriname': 'SR', 'sweden': 'SE', 'switzerland': 'CH', 'syria': 'SY', 'taiwan': 'TW',
  'tajikistan': 'TJ', 'tanzania': 'TZ', 'thailand': 'TH', 'timor-leste': 'TL', 'togo': 'TG',
  'tonga': 'TO', 'trinidad and tobago': 'TT', 'tunisia': 'TN', 'turkey': 'TR', 'turkmenistan': 'TM',
  'tuvalu': 'TV', 'uganda': 'UG', 'ukraine': 'UA', 'united arab emirates': 'AE',
  'united kingdom': 'GB', 'united states': 'US', 'uruguay': 'UY', 'usa': 'US', 'uk': 'GB',
  'uzbekistan': 'UZ', 'vanuatu': 'VU', 'vatican city': 'VA', 'venezuela': 'VE', 'vietnam': 'VN',
  'yemen': 'YE', 'zambia': 'ZM', 'zimbabwe': 'ZW',
};

const FRENCH_COUNTRY_NAMES: Record<string, string> = {
  'afrique du sud': 'ZA', 'allemagne': 'DE', 'algérie': 'DZ', 'andorre': 'AD',
  'arabie saoudite': 'SA', 'argentine': 'AR', 'arménie': 'AM', 'australie': 'AU', 'autriche': 'AT',
  'azerbaïdjan': 'AZ', 'bahreïn': 'BH', 'barbade': 'BB', 'belgique': 'BE',
  'bénin': 'BJ', 'bhoutan': 'BT', 'biélorussie': 'BY', 'birmanie': 'MM',
  'bolivie': 'BO', 'bosnie-herzégovine': 'BA', 'brésil': 'BR',
  'cambodge': 'KH', 'cameroun': 'CM',
  'cap-vert': 'CV', 'chili': 'CL', 'chine': 'CN', 'chypre': 'CY',
  'colombie': 'CO', 'comores': 'KM', 'corée du nord': 'KP', 'corée du sud': 'KR',
  'côte d\'ivoire': 'CI', 'croatie': 'HR', 'danemark': 'DK',
  'dominique': 'DM', 'égypte': 'EG', 'émirats arabes unis': 'AE', 'équateur': 'EC',
  'érythrée': 'ER', 'espagne': 'ES', 'estonie': 'EE', 'états-unis': 'US',
  'éthiopie': 'ET', 'fidji': 'FJ', 'finlande': 'FI',
  'géorgie': 'GE', 'grèce': 'GR', 'grenade': 'GD',
  'guinée': 'GN', 'guinée équatoriale': 'GQ', 'guinée-bissau': 'GW', 'haïti': 'HT',
  'hongrie': 'HU', 'inde': 'IN', 'indonésie': 'ID', 'irak': 'IQ',
  'irlande': 'IE', 'islande': 'IS', 'israël': 'IL', 'italie': 'IT',
  'jamaïque': 'JM', 'japon': 'JP', 'jordanie': 'JO',
  'kirghizistan': 'KG', 'koweït': 'KW',
  'lettonie': 'LV', 'liban': 'LB', 'libéria': 'LR', 'libye': 'LY',
  'lituanie': 'LT', 'macédoine du nord': 'MK', 'malaisie': 'MY',
  'malte': 'MT', 'maroc': 'MA',
  'maurice': 'MU', 'mauritanie': 'MR', 'mexique': 'MX', 'micronésie': 'FM', 'moldavie': 'MD',
  'mongolie': 'MN', 'monténégro': 'ME', 'namibie': 'NA',
  'népal': 'NP', 'nigéria': 'NG',
  'norvège': 'NO', 'nouvelle-zélande': 'NZ', 'ouganda': 'UG', 'ouzbékistan': 'UZ',
  'palaos': 'PW', 'papouasie-nouvelle-guinée': 'PG',
  'pays-bas': 'NL', 'pérou': 'PE', 'pologne': 'PL',
  'république centrafricaine': 'CF', 'république dominicaine': 'DO',
  'république du congo': 'CG', 'république démocratique du congo': 'CD', 'république tchèque': 'CZ',
  'roumanie': 'RO', 'royaume-uni': 'GB', 'russie': 'RU', 'saint-kitts-et-nevis': 'KN',
  'sainte-lucie': 'LC', 'saint-vincent-et-les-grenadines': 'VC', 'salomon': 'SB', 'salvador': 'SV',
  'sao tomé-et-principe': 'ST', 'sénégal': 'SN', 'serbie': 'RS',
  'singapour': 'SG', 'slovaquie': 'SK', 'slovénie': 'SI', 'somalie': 'SO',
  'soudan': 'SD', 'soudan du sud': 'SS', 'suède': 'SE', 'suisse': 'CH',
  'swaziland': 'SZ', 'syrie': 'SY', 'tadjikistan': 'TJ', 'taïwan': 'TW',
  'tanzanie': 'TZ', 'tchad': 'TD', 'thaïlande': 'TH', 'timor oriental': 'TL',
  'trinité-et-tobago': 'TT', 'tunisie': 'TN', 'turkménistan': 'TM', 'turquie': 'TR',
  'vatican': 'VA', 'yémen': 'YE', 'zambie': 'ZM',
};

// Merge English and French mappings (French-only names added on top of English)
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  ...ENGLISH_COUNTRY_NAMES,
  ...FRENCH_COUNTRY_NAMES,
};

// Type guards for jsonb fields
interface Address {
  country?: string;
  [key: string]: any;
}

interface Identity {
  country_national?: string;
  [key: string]: any;
}

function isAddress(value: any): value is Address {
  return value && typeof value === 'object' && 'country' in value;
}

function isIdentity(value: any): value is Identity {
  return value && typeof value === 'object' && 'country_national' in value;
}

// Normalize country name for lookup
function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase();
}

// Check if value is already an ISO code
function isIsoCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

// Validate that all mapped ISO codes are valid
function validateMapping(): string[] {
  const invalidCodes: string[] = [];
  const validCodes = new Set(ISO_COUNTRY_CODES);
  
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_ISO)) {
    if (!validCodes.has(code as any)) {
      invalidCodes.push(`${name} → ${code}`);
    }
  }
  
  return invalidCodes;
}

async function rollback(pool: Pool): Promise<void> {
  console.log('🔄 Starting rollback from backup table...');
  console.log('');

  try {
    // Check if backup table exists
    const backupCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'patients_country_backup'
      );
    `);

    if (!backupCheck.rows[0].exists) {
      console.error('❌ Backup table "patients_country_backup" does not exist');
      console.log('   Run the migration first to create a backup');
      process.exit(1);
    }

    // Count records to restore
    const countResult = await pool.query('SELECT COUNT(*) FROM patients_country_backup');
    const count = parseInt(countResult.rows[0].count, 10);
    console.log(`Found ${count} records in backup table`);
    console.log('');

    // Restore from backup
    await pool.query(`
      UPDATE patients p
      SET 
        address = b.address,
        identity = b.identity,
        updated_at = NOW()
      FROM patients_country_backup b
      WHERE p.id = b.id;
    `);

    console.log(`✓ Restored ${count} records from backup`);
    console.log('');
    console.log('To remove the backup table:');
    console.log('  DROP TABLE patients_country_backup;');
    console.log('');
    console.log('✓ Rollback completed successfully');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const doRollback = args.includes('--rollback');

  console.log('🚀 Country to ISO Code Migration');
  console.log('═══════════════════════════════════════');
  console.log('');

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    console.log('   Ensure api/.env exists and contains DATABASE_URL');
    process.exit(1);
  }

  // Validate mapping before connecting
  console.log('🔍 Validating ISO code mapping...');
  const invalidCodes = validateMapping();
  if (invalidCodes.length > 0) {
    console.error('❌ Invalid ISO codes found in mapping:');
    invalidCodes.forEach(entry => console.log(`   ${entry}`));
    console.log('');
    console.log('   These codes are not in ISO_COUNTRY_CODES. Fix the mapping before proceeding.');
    process.exit(1);
  }
  console.log('✓ All mapped ISO codes are valid');
  console.log('');

  // Connect to database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Pre-flight: test connection
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Handle rollback mode
  if (doRollback) {
    await rollback(pool);
    await pool.end();
    return;
  }

  const db = drizzle(pool, { schema });

  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  try {
    // Create backup table if not in dry-run mode
    if (!dryRun) {
      console.log('📦 Creating backup table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS patients_country_backup AS
        SELECT id, address, identity FROM patients
        WHERE address IS NOT NULL OR identity IS NOT NULL;
      `);
      console.log('✓ Backup table created');
      console.log('');
    }

    // Fetch all patients
    const patients = await db.select().from(schema.patients);
    console.log(`Found ${patients.length} patients to scan`);
    console.log('');
    
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const notFoundValues: Set<string> = new Set();
    const updates: Array<{ id: string; address: any; identity: any }> = [];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      
      // Progress indicator
      if ((i + 1) % 50 === 0 || i === patients.length - 1) {
        console.log(`Processing ${i + 1}/${patients.length} patients...`);
      }

      let needsUpdate = false;
      const newAddress = isAddress(patient.address) ? { ...patient.address } : patient.address;
      const newIdentity = isIdentity(patient.identity) ? { ...patient.identity } : patient.identity;

      // Migrate address.country
      if (isAddress(newAddress) && newAddress.country && !isIsoCode(newAddress.country)) {
        const normalized = normalizeCountryName(newAddress.country);
        const isoCode = COUNTRY_NAME_TO_ISO[normalized];
        
        if (isoCode) {
          if (verbose) {
            console.log(`  Patient ${patient.id}: address.country "${newAddress.country}" → "${isoCode}"`);
          }
          newAddress.country = isoCode;
          needsUpdate = true;
        } else {
          notFound++;
          notFoundValues.add(newAddress.country);
          if (verbose) {
            console.log(`  ⚠️  Patient ${patient.id}: address.country "${newAddress.country}" not found`);
          }
        }
      } else if (isAddress(newAddress) && newAddress.country) {
        skipped++;
      }

      // Migrate identity.country_national
      if (isIdentity(newIdentity) && newIdentity.country_national && !isIsoCode(newIdentity.country_national)) {
        const normalized = normalizeCountryName(newIdentity.country_national);
        const isoCode = COUNTRY_NAME_TO_ISO[normalized];
        
        if (isoCode) {
          if (verbose) {
            console.log(`  Patient ${patient.id}: identity.country_national "${newIdentity.country_national}" → "${isoCode}"`);
          }
          newIdentity.country_national = isoCode;
          needsUpdate = true;
        } else {
          notFound++;
          notFoundValues.add(newIdentity.country_national);
          if (verbose) {
            console.log(`  ⚠️  Patient ${patient.id}: identity.country_national "${newIdentity.country_national}" not found`);
          }
        }
      } else if (isIdentity(newIdentity) && newIdentity.country_national) {
        skipped++;
      }

      // Collect updates
      if (needsUpdate) {
        updates.push({
          id: patient.id,
          address: newAddress,
          identity: newIdentity,
        });
      }
    }

    console.log('');

    // Apply updates in transaction
    if (updates.length > 0 && !dryRun) {
      console.log(`Applying ${updates.length} updates in transaction...`);
      
      await db.transaction(async (tx) => {
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          
          // Progress indicator for updates
          if ((i + 1) % 50 === 0 || i === updates.length - 1) {
            console.log(`  Updating ${i + 1}/${updates.length} records...`);
          }

          await tx.update(schema.patients)
            .set({
              address: update.address,
              identity: update.identity,
              updated_at: new Date(),
            })
            .where(eq(schema.patients.id, update.id));
        }
      });

      updated = updates.length;
      console.log('✓ Transaction committed');
    } else if (updates.length > 0) {
      updated = updates.length;
    }

    // Print summary
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('Migration Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Total patients scanned: ${patients.length}`);
    console.log(`Records ${dryRun ? 'would be ' : ''}updated: ${updated}`);
    console.log(`Already ISO codes (skipped): ${skipped}`);
    console.log(`Values not found in mapping: ${notFound}`);
    
    if (notFoundValues.size > 0) {
      console.log('');
      console.log('Unmapped values (add to COUNTRY_NAME_TO_ISO if needed):');
      Array.from(notFoundValues).sort().forEach(val => {
        console.log(`  - "${val}"`);
      });
    }

    if (!dryRun && updated > 0) {
      console.log('');
      console.log('✓ Migration completed successfully');
      console.log('');
      console.log('To rollback if needed:');
      console.log('  npm run db:migrate-country -- --rollback');
    } else if (dryRun) {
      console.log('');
      console.log('✓ Dry run completed - no changes made');
      console.log('');
      console.log('To apply changes, run without --dry-run flag');
    } else {
      console.log('');
      console.log('✓ No updates needed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('Transaction rolled back - no partial updates applied');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
