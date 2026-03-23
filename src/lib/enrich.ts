import type { EnrichedEmissionenSchnelleingabe, EnrichedGhgBerichtsuebersicht, EnrichedScope1DirekteEmissionen, EnrichedScope2IndirekteEnergieemissionen, EnrichedScope3WeitereIndirekteEmissionen } from '@/types/enriched';
import type { Berichtsjahr, EmissionenSchnelleingabe, Emissionsfaktoren, GhgBerichtsuebersicht, Konzernstruktur, Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, Scope3WeitereIndirekteEmissionen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface Scope1DirekteEmissionenMaps {
  konzernstrukturMap: Map<string, Konzernstruktur>;
  berichtsjahrMap: Map<string, Berichtsjahr>;
  emissionsfaktorenMap: Map<string, Emissionsfaktoren>;
}

export function enrichScope1DirekteEmissionen(
  scope1DirekteEmissionen: Scope1DirekteEmissionen[],
  maps: Scope1DirekteEmissionenMaps
): EnrichedScope1DirekteEmissionen[] {
  return scope1DirekteEmissionen.map(r => ({
    ...r,
    s1_einheitName: resolveDisplay(r.fields.s1_einheit, maps.konzernstrukturMap, 'einheit_name'),
    s1_berichtsjahrName: resolveDisplay(r.fields.s1_berichtsjahr, maps.berichtsjahrMap, 'anmerkungen_jahr'),
    s1_emissionsfaktorName: resolveDisplay(r.fields.s1_emissionsfaktor, maps.emissionsfaktorenMap, 'ef_bezeichnung'),
  }));
}

interface Scope2IndirekteEnergieemissionenMaps {
  konzernstrukturMap: Map<string, Konzernstruktur>;
  berichtsjahrMap: Map<string, Berichtsjahr>;
  emissionsfaktorenMap: Map<string, Emissionsfaktoren>;
}

export function enrichScope2IndirekteEnergieemissionen(
  scope2IndirekteEnergieemissionen: Scope2IndirekteEnergieemissionen[],
  maps: Scope2IndirekteEnergieemissionenMaps
): EnrichedScope2IndirekteEnergieemissionen[] {
  return scope2IndirekteEnergieemissionen.map(r => ({
    ...r,
    s2_einheitName: resolveDisplay(r.fields.s2_einheit, maps.konzernstrukturMap, 'einheit_name'),
    s2_berichtsjahrName: resolveDisplay(r.fields.s2_berichtsjahr, maps.berichtsjahrMap, 'anmerkungen_jahr'),
    s2_emissionsfaktorName: resolveDisplay(r.fields.s2_emissionsfaktor, maps.emissionsfaktorenMap, 'ef_bezeichnung'),
  }));
}

interface Scope3WeitereIndirekteEmissionenMaps {
  konzernstrukturMap: Map<string, Konzernstruktur>;
  berichtsjahrMap: Map<string, Berichtsjahr>;
  emissionsfaktorenMap: Map<string, Emissionsfaktoren>;
}

export function enrichScope3WeitereIndirekteEmissionen(
  scope3WeitereIndirekteEmissionen: Scope3WeitereIndirekteEmissionen[],
  maps: Scope3WeitereIndirekteEmissionenMaps
): EnrichedScope3WeitereIndirekteEmissionen[] {
  return scope3WeitereIndirekteEmissionen.map(r => ({
    ...r,
    s3_einheitName: resolveDisplay(r.fields.s3_einheit, maps.konzernstrukturMap, 'einheit_name'),
    s3_berichtsjahrName: resolveDisplay(r.fields.s3_berichtsjahr, maps.berichtsjahrMap, 'anmerkungen_jahr'),
    s3_emissionsfaktorName: resolveDisplay(r.fields.s3_emissionsfaktor, maps.emissionsfaktorenMap, 'ef_bezeichnung'),
  }));
}

interface EmissionenSchnelleingabeMaps {
  konzernstrukturMap: Map<string, Konzernstruktur>;
  berichtsjahrMap: Map<string, Berichtsjahr>;
  emissionsfaktorenMap: Map<string, Emissionsfaktoren>;
}

export function enrichEmissionenSchnelleingabe(
  emissionenSchnelleingabe: EmissionenSchnelleingabe[],
  maps: EmissionenSchnelleingabeMaps
): EnrichedEmissionenSchnelleingabe[] {
  return emissionenSchnelleingabe.map(r => ({
    ...r,
    se_einheitName: resolveDisplay(r.fields.se_einheit, maps.konzernstrukturMap, 'einheit_name'),
    se_berichtsjahrName: resolveDisplay(r.fields.se_berichtsjahr, maps.berichtsjahrMap, 'anmerkungen_jahr'),
    se_emissionsfaktorName: resolveDisplay(r.fields.se_emissionsfaktor, maps.emissionsfaktorenMap, 'ef_bezeichnung'),
  }));
}

interface GhgBerichtsuebersichtMaps {
  berichtsjahrMap: Map<string, Berichtsjahr>;
  konzernstrukturMap: Map<string, Konzernstruktur>;
}

export function enrichGhgBerichtsuebersicht(
  ghgBerichtsuebersicht: GhgBerichtsuebersicht[],
  maps: GhgBerichtsuebersichtMaps
): EnrichedGhgBerichtsuebersicht[] {
  return ghgBerichtsuebersicht.map(r => ({
    ...r,
    gb_berichtsjahrName: resolveDisplay(r.fields.gb_berichtsjahr, maps.berichtsjahrMap, 'anmerkungen_jahr'),
    gb_konzerneinheitName: resolveDisplay(r.fields.gb_konzerneinheit, maps.konzernstrukturMap, 'einheit_name'),
  }));
}
