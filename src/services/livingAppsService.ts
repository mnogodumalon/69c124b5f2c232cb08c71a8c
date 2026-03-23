// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Konzernstruktur, Berichtsjahr, Emissionsfaktoren, Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, Scope3WeitereIndirekteEmissionen, EmissionenSchnelleingabe, GhgBerichtsuebersicht } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a working dashboard at /objects/{id}/
  const checks = await Promise.allSettled(
    groups.map(g => fetch(`/objects/${g.id}/`, { method: 'HEAD', credentials: 'include' }))
  );
  checks.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      groups[i].href = `/objects/${groups[i].id}/`;
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- KONZERNSTRUKTUR ---
  static async getKonzernstruktur(): Promise<Konzernstruktur[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.KONZERNSTRUKTUR}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Konzernstruktur[];
    return enrichLookupFields(records, 'konzernstruktur');
  }
  static async getKonzernstrukturEntry(id: string): Promise<Konzernstruktur | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.KONZERNSTRUKTUR}/records/${id}`);
    const record = { record_id: data.id, ...data } as Konzernstruktur;
    return enrichLookupFields([record], 'konzernstruktur')[0];
  }
  static async createKonzernstrukturEntry(fields: Konzernstruktur['fields']) {
    return callApi('POST', `/apps/${APP_IDS.KONZERNSTRUKTUR}/records`, { fields });
  }
  static async updateKonzernstrukturEntry(id: string, fields: Partial<Konzernstruktur['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.KONZERNSTRUKTUR}/records/${id}`, { fields });
  }
  static async deleteKonzernstrukturEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.KONZERNSTRUKTUR}/records/${id}`);
  }

  // --- BERICHTSJAHR ---
  static async getBerichtsjahr(): Promise<Berichtsjahr[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BERICHTSJAHR}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Berichtsjahr[];
    return enrichLookupFields(records, 'berichtsjahr');
  }
  static async getBerichtsjahrEntry(id: string): Promise<Berichtsjahr | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BERICHTSJAHR}/records/${id}`);
    const record = { record_id: data.id, ...data } as Berichtsjahr;
    return enrichLookupFields([record], 'berichtsjahr')[0];
  }
  static async createBerichtsjahrEntry(fields: Berichtsjahr['fields']) {
    return callApi('POST', `/apps/${APP_IDS.BERICHTSJAHR}/records`, { fields });
  }
  static async updateBerichtsjahrEntry(id: string, fields: Partial<Berichtsjahr['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.BERICHTSJAHR}/records/${id}`, { fields });
  }
  static async deleteBerichtsjahrEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BERICHTSJAHR}/records/${id}`);
  }

  // --- EMISSIONSFAKTOREN ---
  static async getEmissionsfaktoren(): Promise<Emissionsfaktoren[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.EMISSIONSFAKTOREN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Emissionsfaktoren[];
    return enrichLookupFields(records, 'emissionsfaktoren');
  }
  static async getEmissionsfaktorenEntry(id: string): Promise<Emissionsfaktoren | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.EMISSIONSFAKTOREN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Emissionsfaktoren;
    return enrichLookupFields([record], 'emissionsfaktoren')[0];
  }
  static async createEmissionsfaktorenEntry(fields: Emissionsfaktoren['fields']) {
    return callApi('POST', `/apps/${APP_IDS.EMISSIONSFAKTOREN}/records`, { fields });
  }
  static async updateEmissionsfaktorenEntry(id: string, fields: Partial<Emissionsfaktoren['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.EMISSIONSFAKTOREN}/records/${id}`, { fields });
  }
  static async deleteEmissionsfaktorenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.EMISSIONSFAKTOREN}/records/${id}`);
  }

  // --- SCOPE_1_DIREKTE_EMISSIONEN ---
  static async getScope1DirekteEmissionen(): Promise<Scope1DirekteEmissionen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_1_DIREKTE_EMISSIONEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Scope1DirekteEmissionen[];
    return enrichLookupFields(records, 'scope_1_direkte_emissionen');
  }
  static async getScope1DirekteEmissionenEntry(id: string): Promise<Scope1DirekteEmissionen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_1_DIREKTE_EMISSIONEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Scope1DirekteEmissionen;
    return enrichLookupFields([record], 'scope_1_direkte_emissionen')[0];
  }
  static async createScope1DirekteEmissionenEntry(fields: Scope1DirekteEmissionen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCOPE_1_DIREKTE_EMISSIONEN}/records`, { fields });
  }
  static async updateScope1DirekteEmissionenEntry(id: string, fields: Partial<Scope1DirekteEmissionen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCOPE_1_DIREKTE_EMISSIONEN}/records/${id}`, { fields });
  }
  static async deleteScope1DirekteEmissionenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCOPE_1_DIREKTE_EMISSIONEN}/records/${id}`);
  }

  // --- SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN ---
  static async getScope2IndirekteEnergieemissionen(): Promise<Scope2IndirekteEnergieemissionen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Scope2IndirekteEnergieemissionen[];
    return enrichLookupFields(records, 'scope_2_indirekte_energieemissionen');
  }
  static async getScope2IndirekteEnergieemissionenEntry(id: string): Promise<Scope2IndirekteEnergieemissionen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Scope2IndirekteEnergieemissionen;
    return enrichLookupFields([record], 'scope_2_indirekte_energieemissionen')[0];
  }
  static async createScope2IndirekteEnergieemissionenEntry(fields: Scope2IndirekteEnergieemissionen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN}/records`, { fields });
  }
  static async updateScope2IndirekteEnergieemissionenEntry(id: string, fields: Partial<Scope2IndirekteEnergieemissionen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN}/records/${id}`, { fields });
  }
  static async deleteScope2IndirekteEnergieemissionenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN}/records/${id}`);
  }

  // --- SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN ---
  static async getScope3WeitereIndirekteEmissionen(): Promise<Scope3WeitereIndirekteEmissionen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Scope3WeitereIndirekteEmissionen[];
    return enrichLookupFields(records, 'scope_3_weitere_indirekte_emissionen');
  }
  static async getScope3WeitereIndirekteEmissionenEntry(id: string): Promise<Scope3WeitereIndirekteEmissionen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Scope3WeitereIndirekteEmissionen;
    return enrichLookupFields([record], 'scope_3_weitere_indirekte_emissionen')[0];
  }
  static async createScope3WeitereIndirekteEmissionenEntry(fields: Scope3WeitereIndirekteEmissionen['fields']) {
    return callApi('POST', `/apps/${APP_IDS.SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN}/records`, { fields });
  }
  static async updateScope3WeitereIndirekteEmissionenEntry(id: string, fields: Partial<Scope3WeitereIndirekteEmissionen['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN}/records/${id}`, { fields });
  }
  static async deleteScope3WeitereIndirekteEmissionenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN}/records/${id}`);
  }

  // --- EMISSIONEN_SCHNELLEINGABE ---
  static async getEmissionenSchnelleingabe(): Promise<EmissionenSchnelleingabe[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.EMISSIONEN_SCHNELLEINGABE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as EmissionenSchnelleingabe[];
    return enrichLookupFields(records, 'emissionen_schnelleingabe');
  }
  static async getEmissionenSchnelleingabeEntry(id: string): Promise<EmissionenSchnelleingabe | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.EMISSIONEN_SCHNELLEINGABE}/records/${id}`);
    const record = { record_id: data.id, ...data } as EmissionenSchnelleingabe;
    return enrichLookupFields([record], 'emissionen_schnelleingabe')[0];
  }
  static async createEmissionenSchnelleingabeEntry(fields: EmissionenSchnelleingabe['fields']) {
    return callApi('POST', `/apps/${APP_IDS.EMISSIONEN_SCHNELLEINGABE}/records`, { fields });
  }
  static async updateEmissionenSchnelleingabeEntry(id: string, fields: Partial<EmissionenSchnelleingabe['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.EMISSIONEN_SCHNELLEINGABE}/records/${id}`, { fields });
  }
  static async deleteEmissionenSchnelleingabeEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.EMISSIONEN_SCHNELLEINGABE}/records/${id}`);
  }

  // --- GHG_BERICHTSUEBERSICHT ---
  static async getGhgBerichtsuebersicht(): Promise<GhgBerichtsuebersicht[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.GHG_BERICHTSUEBERSICHT}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as GhgBerichtsuebersicht[];
    return enrichLookupFields(records, 'ghg_berichtsuebersicht');
  }
  static async getGhgBerichtsuebersichtEntry(id: string): Promise<GhgBerichtsuebersicht | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.GHG_BERICHTSUEBERSICHT}/records/${id}`);
    const record = { record_id: data.id, ...data } as GhgBerichtsuebersicht;
    return enrichLookupFields([record], 'ghg_berichtsuebersicht')[0];
  }
  static async createGhgBerichtsuebersichtEntry(fields: GhgBerichtsuebersicht['fields']) {
    return callApi('POST', `/apps/${APP_IDS.GHG_BERICHTSUEBERSICHT}/records`, { fields });
  }
  static async updateGhgBerichtsuebersichtEntry(id: string, fields: Partial<GhgBerichtsuebersicht['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.GHG_BERICHTSUEBERSICHT}/records/${id}`, { fields });
  }
  static async deleteGhgBerichtsuebersichtEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.GHG_BERICHTSUEBERSICHT}/records/${id}`);
  }

}