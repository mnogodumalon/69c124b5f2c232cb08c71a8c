// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Konzernstruktur {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    einheit_name?: string;
    einheit_typ?: LookupValue;
    uebergeordnete_einheit?: string;
    land?: string;
    branche?: LookupValue;
    konsolidierungsmethode?: LookupValue;
    verantwortlich_vorname?: string;
    verantwortlich_nachname?: string;
    verantwortlich_email?: string;
    anmerkungen_einheit?: string;
  };
}

export interface Berichtsjahr {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    jahr?: number;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    ist_basisjahr?: boolean;
    status_jahr?: LookupValue;
    anmerkungen_jahr?: string;
  };
}

export interface Emissionsfaktoren {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ef_bezeichnung?: string;
    ef_scope?: LookupValue;
    ef_kategorie?: LookupValue;
    ef_energietraeger?: string;
    ef_einheit?: LookupValue;
    ef_faktor?: number;
    ef_treibhausgas?: LookupValue[];
    ef_quelle?: string;
    ef_gueltigkeitsjahr?: number;
  };
}

export interface Scope1DirekteEmissionen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    s1_einheit?: string; // applookup -> URL zu 'Konzernstruktur' Record
    s1_berichtsjahr?: string; // applookup -> URL zu 'Berichtsjahr' Record
    s1_unterkategorie?: LookupValue;
    s1_emissionsfaktor?: string; // applookup -> URL zu 'Emissionsfaktoren' Record
    s1_verbrauchsmenge?: number;
    s1_einheit_verbrauch?: LookupValue;
    s1_co2e_menge?: number;
    s1_datenqualitaet?: LookupValue;
    s1_bemerkungen?: string;
    s1_nachweis?: string;
  };
}

export interface Scope2IndirekteEnergieemissionen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    s2_einheit?: string; // applookup -> URL zu 'Konzernstruktur' Record
    s2_berichtsjahr?: string; // applookup -> URL zu 'Berichtsjahr' Record
    s2_energieart?: LookupValue;
    s2_berechnungsmethode?: LookupValue;
    s2_verbrauch_kwh?: number;
    s2_emissionsfaktor?: string; // applookup -> URL zu 'Emissionsfaktoren' Record
    s2_co2e_marktbasiert?: number;
    s2_co2e_standortbasiert?: number;
    s2_lieferant?: string;
    s2_herkunftsnachweis?: boolean;
    s2_bemerkungen?: string;
    s2_nachweis?: string;
  };
}

export interface Scope3WeitereIndirekteEmissionen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    s3_einheit?: string; // applookup -> URL zu 'Konzernstruktur' Record
    s3_berichtsjahr?: string; // applookup -> URL zu 'Berichtsjahr' Record
    s3_kategorie?: LookupValue;
    s3_aktivitaet?: string;
    s3_berechnungsmethode?: LookupValue;
    s3_aktivitaetsmenge?: number;
    s3_einheit_aktivitaet?: LookupValue;
    s3_emissionsfaktor?: string; // applookup -> URL zu 'Emissionsfaktoren' Record
    s3_co2e_menge?: number;
    s3_datenqualitaet?: LookupValue;
    s3_bemerkungen?: string;
    s3_nachweis?: string;
  };
}

export interface EmissionenSchnelleingabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    se_einheit?: string; // applookup -> URL zu 'Konzernstruktur' Record
    se_berichtsjahr?: string; // applookup -> URL zu 'Berichtsjahr' Record
    se_scope?: LookupValue;
    se_unterkategorie?: LookupValue;
    se_aktivitaet?: string;
    se_emissionsfaktor?: string; // applookup -> URL zu 'Emissionsfaktoren' Record
    se_aktivitaetsmenge?: number;
    se_einheit_menge?: LookupValue;
    se_co2e_menge?: number;
    se_datenqualitaet?: LookupValue;
    se_bemerkungen?: string;
    se_nachweis?: string;
  };
}

export interface GhgBerichtsuebersicht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gb_berichtsjahr?: string; // applookup -> URL zu 'Berichtsjahr' Record
    gb_konzerneinheit?: string; // applookup -> URL zu 'Konzernstruktur' Record
    gb_scope1_gesamt?: number;
    gb_scope2_marktbasiert?: number;
    gb_scope2_standortbasiert?: number;
    gb_scope3_gesamt?: number;
    gb_gesamt_co2e?: number;
    gb_intensitaet_umsatz?: number;
    gb_intensitaet_mitarbeiter?: number;
    gb_basisjahr_vergleich?: number;
    gb_verifizierungsstatus?: LookupValue;
    gb_pruefer_vorname?: string;
    gb_pruefer_nachname?: string;
    gb_pruefdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gb_kommentare?: string;
  };
}

export const APP_IDS = {
  KONZERNSTRUKTUR: '69c124661ddc6ec52a6c2836',
  BERICHTSJAHR: '69c1246d7299804c440448fa',
  EMISSIONSFAKTOREN: '69c1246ebeed0889fed560e2',
  SCOPE_1_DIREKTE_EMISSIONEN: '69c1246ff4e0dc2324ed9440',
  SCOPE_2_INDIREKTE_ENERGIEEMISSIONEN: '69c12470c2204e2aa999bcb8',
  SCOPE_3_WEITERE_INDIREKTE_EMISSIONEN: '69c12471ef7da5f0b841a1a3',
  EMISSIONEN_SCHNELLEINGABE: '69c124726ff6d54a56c2e81c',
  GHG_BERICHTSUEBERSICHT: '69c124734278d3e6be1ca7c2',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  konzernstruktur: {
    einheit_typ: [{ key: "konzern", label: "Konzern" }, { key: "tochtergesellschaft", label: "Tochtergesellschaft" }, { key: "abteilung", label: "Abteilung" }, { key: "werk", label: "Werk" }, { key: "niederlassung", label: "Niederlassung" }],
    branche: [{ key: "industrie", label: "Industrie & Fertigung" }, { key: "energie", label: "Energie & Versorgung" }, { key: "handel", label: "Handel & Logistik" }, { key: "dienstleistungen", label: "Dienstleistungen" }, { key: "bauwesen", label: "Bauwesen" }, { key: "landwirtschaft", label: "Landwirtschaft" }, { key: "it", label: "IT & Technologie" }, { key: "gesundheit", label: "Gesundheitswesen" }, { key: "sonstige", label: "Sonstige" }],
    konsolidierungsmethode: [{ key: "operationale_kontrolle", label: "Operationale Kontrolle" }, { key: "finanzielle_kontrolle", label: "Finanzielle Kontrolle" }, { key: "equity_anteil", label: "Equity-Anteil" }],
  },
  berichtsjahr: {
    status_jahr: [{ key: "geschlossen", label: "Geschlossen" }, { key: "archiviert", label: "Archiviert" }, { key: "offen", label: "Offen" }],
  },
  emissionsfaktoren: {
    ef_scope: [{ key: "scope1", label: "Scope 1" }, { key: "scope2", label: "Scope 2" }, { key: "scope3", label: "Scope 3" }],
    ef_kategorie: [{ key: "stationaere_verbrennung", label: "Stationäre Verbrennung" }, { key: "mobile_verbrennung", label: "Mobile Verbrennung" }, { key: "prozessemissionen", label: "Prozessemissionen" }, { key: "fluechtige_emissionen", label: "Flüchtige Emissionen" }, { key: "strom", label: "Eingekaufter Strom" }, { key: "waerme", label: "Eingekaufte Wärme" }, { key: "kaelte", label: "Eingekaufte Kälte" }, { key: "dampf", label: "Eingekaufter Dampf" }, { key: "vorgelagert", label: "Vorgelagerte Emissionen" }, { key: "nachgelagert", label: "Nachgelagerte Emissionen" }, { key: "sonstige", label: "Sonstige" }],
    ef_einheit: [{ key: "kwh", label: "kWh" }, { key: "mwh", label: "MWh" }, { key: "gj", label: "GJ" }, { key: "liter", label: "Liter" }, { key: "kg", label: "kg" }, { key: "tonne", label: "Tonne" }, { key: "m3", label: "m³" }, { key: "tkm", label: "tkm" }, { key: "pkm", label: "Personenkilometer" }, { key: "eur", label: "EUR" }, { key: "sonstige", label: "Sonstige" }],
    ef_treibhausgas: [{ key: "co2", label: "CO2" }, { key: "ch4", label: "CH4" }, { key: "n2o", label: "N2O" }, { key: "hfc", label: "HFC" }, { key: "pfc", label: "PFC" }, { key: "sf6", label: "SF6" }, { key: "nf3", label: "NF3" }],
  },
  scope_1_direkte_emissionen: {
    s1_unterkategorie: [{ key: "stationaere_verbrennung", label: "Stationäre Verbrennung" }, { key: "mobile_verbrennung", label: "Mobile Verbrennung" }, { key: "prozessemissionen", label: "Prozessemissionen" }, { key: "fluechtige_emissionen", label: "Flüchtige Emissionen" }],
    s1_einheit_verbrauch: [{ key: "kwh", label: "kWh" }, { key: "mwh", label: "MWh" }, { key: "gj", label: "GJ" }, { key: "liter", label: "Liter" }, { key: "kg", label: "kg" }, { key: "tonne", label: "Tonne" }, { key: "m3", label: "m³" }, { key: "sonstige", label: "Sonstige" }],
    s1_datenqualitaet: [{ key: "primaer", label: "Primärdaten (gemessen)" }, { key: "sekundaer", label: "Sekundärdaten (berechnet)" }, { key: "schaetzung", label: "Schätzung" }],
  },
  scope_2_indirekte_energieemissionen: {
    s2_energieart: [{ key: "strom", label: "Strom" }, { key: "fernwaerme", label: "Fernwärme" }, { key: "fernkaelte", label: "Fernkälte" }, { key: "dampf", label: "Dampf" }],
    s2_berechnungsmethode: [{ key: "marktbasiert", label: "Marktbasiert" }, { key: "standortbasiert", label: "Standortbasiert" }, { key: "beide", label: "Beide" }],
  },
  scope_3_weitere_indirekte_emissionen: {
    s3_kategorie: [{ key: "kat1", label: "Kat. 1: Eingekaufte Waren und Dienstleistungen" }, { key: "kat2", label: "Kat. 2: Investitionsgüter" }, { key: "kat3", label: "Kat. 3: Brennstoff- und energiebezogene Aktivitäten" }, { key: "kat4", label: "Kat. 4: Vorgelagerter Transport und Vertrieb" }, { key: "kat5", label: "Kat. 5: Abfälle aus dem Betrieb" }, { key: "kat6", label: "Kat. 6: Geschäftsreisen" }, { key: "kat7", label: "Kat. 7: Pendlerverkehr der Mitarbeitenden" }, { key: "kat8", label: "Kat. 8: Vorgelagerte gemietete Anlagen" }, { key: "kat9", label: "Kat. 9: Nachgelagerter Transport und Vertrieb" }, { key: "kat10", label: "Kat. 10: Verarbeitung verkaufter Produkte" }, { key: "kat11", label: "Kat. 11: Nutzung verkaufter Produkte" }, { key: "kat12", label: "Kat. 12: Entsorgung verkaufter Produkte" }, { key: "kat13", label: "Kat. 13: Nachgelagerte gemietete Anlagen" }, { key: "kat14", label: "Kat. 14: Franchises" }, { key: "kat15", label: "Kat. 15: Investitionen" }],
    s3_berechnungsmethode: [{ key: "ausgabenbasiert", label: "Ausgabenbasiert" }, { key: "aktivitaetsbasiert", label: "Aktivitätsbasiert" }, { key: "hybrid", label: "Hybridmethode" }, { key: "lieferantenspezifisch", label: "Lieferantenspezifisch" }],
    s3_einheit_aktivitaet: [{ key: "kwh", label: "kWh" }, { key: "mwh", label: "MWh" }, { key: "liter", label: "Liter" }, { key: "kg", label: "kg" }, { key: "tonne", label: "Tonne" }, { key: "tkm", label: "tkm" }, { key: "pkm", label: "Personenkilometer" }, { key: "eur", label: "EUR" }, { key: "m3", label: "m³" }, { key: "sonstige", label: "Sonstige" }],
    s3_datenqualitaet: [{ key: "primaer", label: "Primärdaten" }, { key: "sekundaer", label: "Sekundärdaten" }, { key: "schaetzung", label: "Schätzung" }],
  },
  emissionen_schnelleingabe: {
    se_scope: [{ key: "scope1", label: "Scope 1 – Direkte Emissionen" }, { key: "scope2", label: "Scope 2 – Indirekte Energieemissionen" }, { key: "scope3", label: "Scope 3 – Weitere indirekte Emissionen" }],
    se_unterkategorie: [{ key: "s1_stationaer", label: "Stationäre Verbrennung (Scope 1)" }, { key: "s1_mobil", label: "Mobile Verbrennung (Scope 1)" }, { key: "s1_prozess", label: "Prozessemissionen (Scope 1)" }, { key: "s1_fluechtig", label: "Flüchtige Emissionen (Scope 1)" }, { key: "s2_strom", label: "Strom (Scope 2)" }, { key: "s2_waerme", label: "Fernwärme (Scope 2)" }, { key: "s2_kaelte", label: "Fernkälte (Scope 2)" }, { key: "s2_dampf", label: "Dampf (Scope 2)" }, { key: "s3_kat1", label: "Kat. 1: Eingekaufte Waren und Dienstleistungen (Scope 3)" }, { key: "s3_kat2", label: "Kat. 2: Investitionsgüter (Scope 3)" }, { key: "s3_kat3", label: "Kat. 3: Brennstoff- und energiebezogene Aktivitäten (Scope 3)" }, { key: "s3_kat4", label: "Kat. 4: Vorgelagerter Transport (Scope 3)" }, { key: "s3_kat5", label: "Kat. 5: Abfälle (Scope 3)" }, { key: "s3_kat6", label: "Kat. 6: Geschäftsreisen (Scope 3)" }, { key: "s3_kat7", label: "Kat. 7: Pendlerverkehr (Scope 3)" }, { key: "s3_kat8", label: "Kat. 8: Vorgelagerte gemietete Anlagen (Scope 3)" }, { key: "s3_kat9", label: "Kat. 9: Nachgelagerter Transport (Scope 3)" }, { key: "s3_kat10", label: "Kat. 10: Verarbeitung verkaufter Produkte (Scope 3)" }, { key: "s3_kat11", label: "Kat. 11: Nutzung verkaufter Produkte (Scope 3)" }, { key: "s3_kat12", label: "Kat. 12: Entsorgung verkaufter Produkte (Scope 3)" }, { key: "s3_kat13", label: "Kat. 13: Nachgelagerte gemietete Anlagen (Scope 3)" }, { key: "s3_kat14", label: "Kat. 14: Franchises (Scope 3)" }, { key: "s3_kat15", label: "Kat. 15: Investitionen (Scope 3)" }],
    se_einheit_menge: [{ key: "kwh", label: "kWh" }, { key: "mwh", label: "MWh" }, { key: "gj", label: "GJ" }, { key: "liter", label: "Liter" }, { key: "kg", label: "kg" }, { key: "tonne", label: "Tonne" }, { key: "m3", label: "m³" }, { key: "tkm", label: "tkm" }, { key: "pkm", label: "Personenkilometer" }, { key: "eur", label: "EUR" }, { key: "sonstige", label: "Sonstige" }],
    se_datenqualitaet: [{ key: "primaer", label: "Primärdaten (gemessen)" }, { key: "sekundaer", label: "Sekundärdaten (berechnet)" }, { key: "schaetzung", label: "Schätzung" }],
  },
  ghg_berichtsuebersicht: {
    gb_verifizierungsstatus: [{ key: "ungeprueft", label: "Ungeprüft" }, { key: "intern", label: "Intern geprüft" }, { key: "extern", label: "Extern verifiziert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'konzernstruktur': {
    'einheit_name': 'string/text',
    'einheit_typ': 'lookup/select',
    'uebergeordnete_einheit': 'string/text',
    'land': 'lookup/choice',
    'branche': 'lookup/select',
    'konsolidierungsmethode': 'lookup/radio',
    'verantwortlich_vorname': 'string/text',
    'verantwortlich_nachname': 'string/text',
    'verantwortlich_email': 'string/email',
    'anmerkungen_einheit': 'string/textarea',
  },
  'berichtsjahr': {
    'jahr': 'number',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'ist_basisjahr': 'bool',
    'status_jahr': 'lookup/radio',
    'anmerkungen_jahr': 'string/textarea',
  },
  'emissionsfaktoren': {
    'ef_bezeichnung': 'string/text',
    'ef_scope': 'lookup/radio',
    'ef_kategorie': 'lookup/select',
    'ef_energietraeger': 'string/text',
    'ef_einheit': 'lookup/select',
    'ef_faktor': 'number',
    'ef_treibhausgas': 'multiplelookup/checkbox',
    'ef_quelle': 'string/text',
    'ef_gueltigkeitsjahr': 'number',
  },
  'scope_1_direkte_emissionen': {
    's1_einheit': 'applookup/select',
    's1_berichtsjahr': 'applookup/select',
    's1_unterkategorie': 'lookup/select',
    's1_emissionsfaktor': 'applookup/select',
    's1_verbrauchsmenge': 'number',
    's1_einheit_verbrauch': 'lookup/select',
    's1_co2e_menge': 'number',
    's1_datenqualitaet': 'lookup/radio',
    's1_bemerkungen': 'string/textarea',
    's1_nachweis': 'file',
  },
  'scope_2_indirekte_energieemissionen': {
    's2_einheit': 'applookup/select',
    's2_berichtsjahr': 'applookup/select',
    's2_energieart': 'lookup/select',
    's2_berechnungsmethode': 'lookup/radio',
    's2_verbrauch_kwh': 'number',
    's2_emissionsfaktor': 'applookup/select',
    's2_co2e_marktbasiert': 'number',
    's2_co2e_standortbasiert': 'number',
    's2_lieferant': 'string/text',
    's2_herkunftsnachweis': 'bool',
    's2_bemerkungen': 'string/textarea',
    's2_nachweis': 'file',
  },
  'scope_3_weitere_indirekte_emissionen': {
    's3_einheit': 'applookup/select',
    's3_berichtsjahr': 'applookup/select',
    's3_kategorie': 'lookup/select',
    's3_aktivitaet': 'string/textarea',
    's3_berechnungsmethode': 'lookup/radio',
    's3_aktivitaetsmenge': 'number',
    's3_einheit_aktivitaet': 'lookup/select',
    's3_emissionsfaktor': 'applookup/select',
    's3_co2e_menge': 'number',
    's3_datenqualitaet': 'lookup/radio',
    's3_bemerkungen': 'string/textarea',
    's3_nachweis': 'file',
  },
  'emissionen_schnelleingabe': {
    'se_einheit': 'applookup/select',
    'se_berichtsjahr': 'applookup/select',
    'se_scope': 'lookup/radio',
    'se_unterkategorie': 'lookup/select',
    'se_aktivitaet': 'string/text',
    'se_emissionsfaktor': 'applookup/select',
    'se_aktivitaetsmenge': 'number',
    'se_einheit_menge': 'lookup/select',
    'se_co2e_menge': 'number',
    'se_datenqualitaet': 'lookup/radio',
    'se_bemerkungen': 'string/textarea',
    'se_nachweis': 'file',
  },
  'ghg_berichtsuebersicht': {
    'gb_berichtsjahr': 'applookup/select',
    'gb_konzerneinheit': 'applookup/select',
    'gb_scope1_gesamt': 'number',
    'gb_scope2_marktbasiert': 'number',
    'gb_scope2_standortbasiert': 'number',
    'gb_scope3_gesamt': 'number',
    'gb_gesamt_co2e': 'number',
    'gb_intensitaet_umsatz': 'number',
    'gb_intensitaet_mitarbeiter': 'number',
    'gb_basisjahr_vergleich': 'number',
    'gb_verifizierungsstatus': 'lookup/radio',
    'gb_pruefer_vorname': 'string/text',
    'gb_pruefer_nachname': 'string/text',
    'gb_pruefdatum': 'date/date',
    'gb_kommentare': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKonzernstruktur = StripLookup<Konzernstruktur['fields']>;
export type CreateBerichtsjahr = StripLookup<Berichtsjahr['fields']>;
export type CreateEmissionsfaktoren = StripLookup<Emissionsfaktoren['fields']>;
export type CreateScope1DirekteEmissionen = StripLookup<Scope1DirekteEmissionen['fields']>;
export type CreateScope2IndirekteEnergieemissionen = StripLookup<Scope2IndirekteEnergieemissionen['fields']>;
export type CreateScope3WeitereIndirekteEmissionen = StripLookup<Scope3WeitereIndirekteEmissionen['fields']>;
export type CreateEmissionenSchnelleingabe = StripLookup<EmissionenSchnelleingabe['fields']>;
export type CreateGhgBerichtsuebersicht = StripLookup<GhgBerichtsuebersicht['fields']>;