#!/usr/bin/env node
/**
 * check-lookup-keys.mjs — build gate against INVENTED lookup keys.
 *
 * Real incident: an intent UI shipped `zahlungsstatus: 'offen'` — semantically
 * plausible, but the schema's keys were bezahlt|ausstehend|gemahnt, so every
 * wizard write 400'd in production. This gate embeds the schema's valid keys
 * and scans the agent-written sources for literal assignments to known lookup
 * fields. Runs in Step 3 / before `npm run build`; exit 1 on any unknown
 * literal — read the valid keys from LOOKUP_OPTIONS, never invent one.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// field name -> union of valid keys across ALL entities (a literal valid in
// any entity passes — avoids false positives on shared field names).
const VALID_KEYS = {
  "branche": [
    "bauwesen",
    "dienstleistungen",
    "energie",
    "gesundheit",
    "handel",
    "industrie",
    "it",
    "landwirtschaft",
    "sonstige"
  ],
  "ef_einheit": [
    "eur",
    "gj",
    "kg",
    "kwh",
    "liter",
    "m3",
    "mwh",
    "pkm",
    "sonstige",
    "tkm",
    "tonne"
  ],
  "ef_kategorie": [
    "dampf",
    "fluechtige_emissionen",
    "kaelte",
    "mobile_verbrennung",
    "nachgelagert",
    "prozessemissionen",
    "sonstige",
    "stationaere_verbrennung",
    "strom",
    "vorgelagert",
    "waerme"
  ],
  "ef_scope": [
    "scope1",
    "scope2",
    "scope3"
  ],
  "ef_treibhausgas": [
    "ch4",
    "co2",
    "hfc",
    "n2o",
    "nf3",
    "pfc",
    "sf6"
  ],
  "einheit_typ": [
    "abteilung",
    "konzern",
    "niederlassung",
    "tochtergesellschaft",
    "werk"
  ],
  "gb_verifizierungsstatus": [
    "extern",
    "intern",
    "ungeprueft"
  ],
  "konsolidierungsmethode": [
    "equity_anteil",
    "finanzielle_kontrolle",
    "operationale_kontrolle"
  ],
  "s1_datenqualitaet": [
    "primaer",
    "schaetzung",
    "sekundaer"
  ],
  "s1_einheit_verbrauch": [
    "gj",
    "kg",
    "kwh",
    "liter",
    "m3",
    "mwh",
    "sonstige",
    "tonne"
  ],
  "s1_unterkategorie": [
    "fluechtige_emissionen",
    "mobile_verbrennung",
    "prozessemissionen",
    "stationaere_verbrennung"
  ],
  "s2_berechnungsmethode": [
    "beide",
    "marktbasiert",
    "standortbasiert"
  ],
  "s2_energieart": [
    "dampf",
    "fernkaelte",
    "fernwaerme",
    "strom"
  ],
  "s3_berechnungsmethode": [
    "aktivitaetsbasiert",
    "ausgabenbasiert",
    "hybrid",
    "lieferantenspezifisch"
  ],
  "s3_datenqualitaet": [
    "primaer",
    "schaetzung",
    "sekundaer"
  ],
  "s3_einheit_aktivitaet": [
    "eur",
    "kg",
    "kwh",
    "liter",
    "m3",
    "mwh",
    "pkm",
    "sonstige",
    "tkm",
    "tonne"
  ],
  "s3_kategorie": [
    "kat1",
    "kat10",
    "kat11",
    "kat12",
    "kat13",
    "kat14",
    "kat15",
    "kat2",
    "kat3",
    "kat4",
    "kat5",
    "kat6",
    "kat7",
    "kat8",
    "kat9"
  ],
  "se_datenqualitaet": [
    "primaer",
    "schaetzung",
    "sekundaer"
  ],
  "se_einheit_menge": [
    "eur",
    "gj",
    "kg",
    "kwh",
    "liter",
    "m3",
    "mwh",
    "pkm",
    "sonstige",
    "tkm",
    "tonne"
  ],
  "se_scope": [
    "scope1",
    "scope2",
    "scope3"
  ],
  "se_unterkategorie": [
    "s1_fluechtig",
    "s1_mobil",
    "s1_prozess",
    "s1_stationaer",
    "s2_dampf",
    "s2_kaelte",
    "s2_strom",
    "s2_waerme",
    "s3_kat1",
    "s3_kat10",
    "s3_kat11",
    "s3_kat12",
    "s3_kat13",
    "s3_kat14",
    "s3_kat15",
    "s3_kat2",
    "s3_kat3",
    "s3_kat4",
    "s3_kat5",
    "s3_kat6",
    "s3_kat7",
    "s3_kat8",
    "s3_kat9"
  ],
  "status_jahr": [
    "archiviert",
    "geschlossen",
    "offen"
  ]
};

const ROOTS = ['src/pages', 'src/components'];
// .example.tsx targets a fixed demo schema; src/components/ui are shadcn
// primitives — neither carries Living-Apps writes.
const SKIP = /\.example\.tsx$|[\\/]ui[\\/]/;

function walk(dir, out = []) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const errors = [];
const files = ROOTS.flatMap(r => walk(r)).filter(f => !SKIP.test(f));
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [field, keys] of Object.entries(VALID_KEYS)) {
      // property-assignment syntax only: `field: 'literal'` / `field: "literal"`
      const re = new RegExp(`[{,\\s]${field}\\s*:\\s*(['"])([^'"]*)\\1`, 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        const val = m[2];
        if (!keys.includes(val)) {
          errors.push(
            `${file}:${i + 1}: '${val}' is not a valid key for '${field}' — valid: ${keys.join(' | ')}. ` +
            `(Local UI property sharing the name? Rename it.)`
          );
        }
      }
    }
  });
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`\n${errors.length} invalid lookup-key literal(s) — keys come from LOOKUP_OPTIONS, never invent one.`);
  process.exit(1);
}
console.log(`check-lookup-keys: OK (${files.length} files scanned)`);
