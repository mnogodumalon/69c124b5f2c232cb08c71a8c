import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, EmissionenSchnelleingabe, GhgBerichtsuebersicht, Konzernstruktur, Scope3WeitereIndirekteEmissionen, Emissionsfaktoren, Berichtsjahr } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { Scope1DirekteEmissionenDialog } from '@/components/dialogs/Scope1DirekteEmissionenDialog';
import { Scope1DirekteEmissionenViewDialog } from '@/components/dialogs/Scope1DirekteEmissionenViewDialog';
import { Scope2IndirekteEnergieemissionenDialog } from '@/components/dialogs/Scope2IndirekteEnergieemissionenDialog';
import { Scope2IndirekteEnergieemissionenViewDialog } from '@/components/dialogs/Scope2IndirekteEnergieemissionenViewDialog';
import { EmissionenSchnelleingabeDialog } from '@/components/dialogs/EmissionenSchnelleingabeDialog';
import { EmissionenSchnelleingabeViewDialog } from '@/components/dialogs/EmissionenSchnelleingabeViewDialog';
import { GhgBerichtsuebersichtDialog } from '@/components/dialogs/GhgBerichtsuebersichtDialog';
import { GhgBerichtsuebersichtViewDialog } from '@/components/dialogs/GhgBerichtsuebersichtViewDialog';
import { KonzernstrukturDialog } from '@/components/dialogs/KonzernstrukturDialog';
import { KonzernstrukturViewDialog } from '@/components/dialogs/KonzernstrukturViewDialog';
import { Scope3WeitereIndirekteEmissionenDialog } from '@/components/dialogs/Scope3WeitereIndirekteEmissionenDialog';
import { Scope3WeitereIndirekteEmissionenViewDialog } from '@/components/dialogs/Scope3WeitereIndirekteEmissionenViewDialog';
import { EmissionsfaktorenDialog } from '@/components/dialogs/EmissionsfaktorenDialog';
import { EmissionsfaktorenViewDialog } from '@/components/dialogs/EmissionsfaktorenViewDialog';
import { BerichtsjahrDialog } from '@/components/dialogs/BerichtsjahrDialog';
import { BerichtsjahrViewDialog } from '@/components/dialogs/BerichtsjahrViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const SCOPE1DIREKTEEMISSIONEN_FIELDS = [
  { key: 's1_einheit', label: 'Organisationseinheit', type: 'applookup/select', targetEntity: 'konzernstruktur', targetAppId: 'KONZERNSTRUKTUR', displayField: 'einheit_name' },
  { key: 's1_berichtsjahr', label: 'Berichtsjahr', type: 'applookup/select', targetEntity: 'berichtsjahr', targetAppId: 'BERICHTSJAHR', displayField: 'anmerkungen_jahr' },
  { key: 's1_unterkategorie', label: 'Unterkategorie', type: 'lookup/select', options: [{ key: 'stationaere_verbrennung', label: 'Stationäre Verbrennung' }, { key: 'mobile_verbrennung', label: 'Mobile Verbrennung' }, { key: 'prozessemissionen', label: 'Prozessemissionen' }, { key: 'fluechtige_emissionen', label: 'Flüchtige Emissionen' }] },
  { key: 's1_emissionsfaktor', label: 'Emissionsfaktor / Energieträger', type: 'applookup/select', targetEntity: 'emissionsfaktoren', targetAppId: 'EMISSIONSFAKTOREN', displayField: 'ef_bezeichnung' },
  { key: 's1_verbrauchsmenge', label: 'Verbrauchsmenge', type: 'number' },
  { key: 's1_einheit_verbrauch', label: 'Einheit der Verbrauchsmenge', type: 'lookup/select', options: [{ key: 'kwh', label: 'kWh' }, { key: 'mwh', label: 'MWh' }, { key: 'gj', label: 'GJ' }, { key: 'liter', label: 'Liter' }, { key: 'kg', label: 'kg' }, { key: 'tonne', label: 'Tonne' }, { key: 'm3', label: 'm³' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 's1_co2e_menge', label: 'Berechnete CO2e-Menge (Tonnen)', type: 'number' },
  { key: 's1_datenqualitaet', label: 'Datenqualität', type: 'lookup/radio', options: [{ key: 'primaer', label: 'Primärdaten (gemessen)' }, { key: 'sekundaer', label: 'Sekundärdaten (berechnet)' }, { key: 'schaetzung', label: 'Schätzung' }] },
  { key: 's1_bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
  { key: 's1_nachweis', label: 'Nachweis / Beleg (Datei-Upload)', type: 'file' },
];
const SCOPE2INDIREKTEENERGIEEMISSIONEN_FIELDS = [
  { key: 's2_einheit', label: 'Organisationseinheit', type: 'applookup/select', targetEntity: 'konzernstruktur', targetAppId: 'KONZERNSTRUKTUR', displayField: 'einheit_name' },
  { key: 's2_berichtsjahr', label: 'Berichtsjahr', type: 'applookup/select', targetEntity: 'berichtsjahr', targetAppId: 'BERICHTSJAHR', displayField: 'anmerkungen_jahr' },
  { key: 's2_energieart', label: 'Energieart', type: 'lookup/select', options: [{ key: 'strom', label: 'Strom' }, { key: 'fernwaerme', label: 'Fernwärme' }, { key: 'fernkaelte', label: 'Fernkälte' }, { key: 'dampf', label: 'Dampf' }] },
  { key: 's2_berechnungsmethode', label: 'Berechnungsmethode', type: 'lookup/radio', options: [{ key: 'marktbasiert', label: 'Marktbasiert' }, { key: 'standortbasiert', label: 'Standortbasiert' }, { key: 'beide', label: 'Beide' }] },
  { key: 's2_verbrauch_kwh', label: 'Verbrauchsmenge (kWh)', type: 'number' },
  { key: 's2_emissionsfaktor', label: 'Emissionsfaktor', type: 'applookup/select', targetEntity: 'emissionsfaktoren', targetAppId: 'EMISSIONSFAKTOREN', displayField: 'ef_bezeichnung' },
  { key: 's2_co2e_marktbasiert', label: 'CO2e-Menge marktbasiert (Tonnen)', type: 'number' },
  { key: 's2_co2e_standortbasiert', label: 'CO2e-Menge standortbasiert (Tonnen)', type: 'number' },
  { key: 's2_lieferant', label: 'Lieferant / Energieversorger', type: 'string/text' },
  { key: 's2_herkunftsnachweis', label: 'Herkunftsnachweis vorhanden (z. B. Grünstromzertifikat)', type: 'bool' },
  { key: 's2_bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
  { key: 's2_nachweis', label: 'Nachweis / Beleg (Datei-Upload)', type: 'file' },
];
const EMISSIONENSCHNELLEINGABE_FIELDS = [
  { key: 'se_einheit', label: 'Organisationseinheit', type: 'applookup/select', targetEntity: 'konzernstruktur', targetAppId: 'KONZERNSTRUKTUR', displayField: 'einheit_name' },
  { key: 'se_berichtsjahr', label: 'Berichtsjahr', type: 'applookup/select', targetEntity: 'berichtsjahr', targetAppId: 'BERICHTSJAHR', displayField: 'anmerkungen_jahr' },
  { key: 'se_scope', label: 'Scope', type: 'lookup/radio', options: [{ key: 'scope1', label: 'Scope 1 – Direkte Emissionen' }, { key: 'scope2', label: 'Scope 2 – Indirekte Energieemissionen' }, { key: 'scope3', label: 'Scope 3 – Weitere indirekte Emissionen' }] },
  { key: 'se_unterkategorie', label: 'Unterkategorie / Scope-3-Kategorie', type: 'lookup/select', options: [{ key: 's1_stationaer', label: 'Stationäre Verbrennung (Scope 1)' }, { key: 's1_mobil', label: 'Mobile Verbrennung (Scope 1)' }, { key: 's1_prozess', label: 'Prozessemissionen (Scope 1)' }, { key: 's1_fluechtig', label: 'Flüchtige Emissionen (Scope 1)' }, { key: 's2_strom', label: 'Strom (Scope 2)' }, { key: 's2_waerme', label: 'Fernwärme (Scope 2)' }, { key: 's2_kaelte', label: 'Fernkälte (Scope 2)' }, { key: 's2_dampf', label: 'Dampf (Scope 2)' }, { key: 's3_kat1', label: 'Kat. 1: Eingekaufte Waren und Dienstleistungen (Scope 3)' }, { key: 's3_kat2', label: 'Kat. 2: Investitionsgüter (Scope 3)' }, { key: 's3_kat3', label: 'Kat. 3: Brennstoff- und energiebezogene Aktivitäten (Scope 3)' }, { key: 's3_kat4', label: 'Kat. 4: Vorgelagerter Transport (Scope 3)' }, { key: 's3_kat5', label: 'Kat. 5: Abfälle (Scope 3)' }, { key: 's3_kat6', label: 'Kat. 6: Geschäftsreisen (Scope 3)' }, { key: 's3_kat7', label: 'Kat. 7: Pendlerverkehr (Scope 3)' }, { key: 's3_kat8', label: 'Kat. 8: Vorgelagerte gemietete Anlagen (Scope 3)' }, { key: 's3_kat9', label: 'Kat. 9: Nachgelagerter Transport (Scope 3)' }, { key: 's3_kat10', label: 'Kat. 10: Verarbeitung verkaufter Produkte (Scope 3)' }, { key: 's3_kat11', label: 'Kat. 11: Nutzung verkaufter Produkte (Scope 3)' }, { key: 's3_kat12', label: 'Kat. 12: Entsorgung verkaufter Produkte (Scope 3)' }, { key: 's3_kat13', label: 'Kat. 13: Nachgelagerte gemietete Anlagen (Scope 3)' }, { key: 's3_kat14', label: 'Kat. 14: Franchises (Scope 3)' }, { key: 's3_kat15', label: 'Kat. 15: Investitionen (Scope 3)' }] },
  { key: 'se_aktivitaet', label: 'Aktivitätsbeschreibung', type: 'string/text' },
  { key: 'se_emissionsfaktor', label: 'Emissionsfaktor', type: 'applookup/select', targetEntity: 'emissionsfaktoren', targetAppId: 'EMISSIONSFAKTOREN', displayField: 'ef_bezeichnung' },
  { key: 'se_aktivitaetsmenge', label: 'Aktivitätsmenge / Verbrauchsmenge', type: 'number' },
  { key: 'se_einheit_menge', label: 'Einheit', type: 'lookup/select', options: [{ key: 'kwh', label: 'kWh' }, { key: 'mwh', label: 'MWh' }, { key: 'gj', label: 'GJ' }, { key: 'liter', label: 'Liter' }, { key: 'kg', label: 'kg' }, { key: 'tonne', label: 'Tonne' }, { key: 'm3', label: 'm³' }, { key: 'tkm', label: 'tkm' }, { key: 'pkm', label: 'Personenkilometer' }, { key: 'eur', label: 'EUR' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'se_co2e_menge', label: 'Berechnete CO2e-Menge (Tonnen)', type: 'number' },
  { key: 'se_datenqualitaet', label: 'Datenqualität', type: 'lookup/radio', options: [{ key: 'primaer', label: 'Primärdaten (gemessen)' }, { key: 'sekundaer', label: 'Sekundärdaten (berechnet)' }, { key: 'schaetzung', label: 'Schätzung' }] },
  { key: 'se_bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
  { key: 'se_nachweis', label: 'Nachweis / Beleg (Datei-Upload)', type: 'file' },
];
const GHGBERICHTSUEBERSICHT_FIELDS = [
  { key: 'gb_berichtsjahr', label: 'Berichtsjahr', type: 'applookup/select', targetEntity: 'berichtsjahr', targetAppId: 'BERICHTSJAHR', displayField: 'anmerkungen_jahr' },
  { key: 'gb_konzerneinheit', label: 'Konzerneinheit', type: 'applookup/select', targetEntity: 'konzernstruktur', targetAppId: 'KONZERNSTRUKTUR', displayField: 'einheit_name' },
  { key: 'gb_scope1_gesamt', label: 'Gesamtemissionen Scope 1 (Tonnen CO2e)', type: 'number' },
  { key: 'gb_scope2_marktbasiert', label: 'Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)', type: 'number' },
  { key: 'gb_scope2_standortbasiert', label: 'Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)', type: 'number' },
  { key: 'gb_scope3_gesamt', label: 'Gesamtemissionen Scope 3 (Tonnen CO2e)', type: 'number' },
  { key: 'gb_gesamt_co2e', label: 'Gesamtemissionen (Tonnen CO2e, alle Scopes)', type: 'number' },
  { key: 'gb_intensitaet_umsatz', label: 'Intensitätskennzahl: CO2e pro Mio. EUR Umsatz', type: 'number' },
  { key: 'gb_intensitaet_mitarbeiter', label: 'Intensitätskennzahl: CO2e pro Mitarbeitenden', type: 'number' },
  { key: 'gb_basisjahr_vergleich', label: 'Veränderung zum Basisjahr (%)', type: 'number' },
  { key: 'gb_verifizierungsstatus', label: 'Verifizierungsstatus', type: 'lookup/radio', options: [{ key: 'ungeprueft', label: 'Ungeprüft' }, { key: 'intern', label: 'Intern geprüft' }, { key: 'extern', label: 'Extern verifiziert' }] },
  { key: 'gb_pruefer_vorname', label: 'Vorname des Prüfers', type: 'string/text' },
  { key: 'gb_pruefer_nachname', label: 'Nachname des Prüfers', type: 'string/text' },
  { key: 'gb_pruefdatum', label: 'Prüfdatum', type: 'date/date' },
  { key: 'gb_kommentare', label: 'Kommentare / Erläuterungen', type: 'string/textarea' },
];
const KONZERNSTRUKTUR_FIELDS = [
  { key: 'einheit_name', label: 'Name der Einheit', type: 'string/text' },
  { key: 'einheit_typ', label: 'Typ der Einheit', type: 'lookup/select', options: [{ key: 'konzern', label: 'Konzern' }, { key: 'tochtergesellschaft', label: 'Tochtergesellschaft' }, { key: 'abteilung', label: 'Abteilung' }, { key: 'werk', label: 'Werk' }, { key: 'niederlassung', label: 'Niederlassung' }] },
  { key: 'uebergeordnete_einheit', label: 'Übergeordnete Einheit (Name)', type: 'string/text' },
  { key: 'land', label: 'Land', type: 'lookup/choice' },
  { key: 'branche', label: 'Branche', type: 'lookup/select', options: [{ key: 'industrie', label: 'Industrie & Fertigung' }, { key: 'energie', label: 'Energie & Versorgung' }, { key: 'handel', label: 'Handel & Logistik' }, { key: 'dienstleistungen', label: 'Dienstleistungen' }, { key: 'bauwesen', label: 'Bauwesen' }, { key: 'landwirtschaft', label: 'Landwirtschaft' }, { key: 'it', label: 'IT & Technologie' }, { key: 'gesundheit', label: 'Gesundheitswesen' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'konsolidierungsmethode', label: 'Konsolidierungsmethode', type: 'lookup/radio', options: [{ key: 'operationale_kontrolle', label: 'Operationale Kontrolle' }, { key: 'finanzielle_kontrolle', label: 'Finanzielle Kontrolle' }, { key: 'equity_anteil', label: 'Equity-Anteil' }] },
  { key: 'verantwortlich_vorname', label: 'Vorname der verantwortlichen Person', type: 'string/text' },
  { key: 'verantwortlich_nachname', label: 'Nachname der verantwortlichen Person', type: 'string/text' },
  { key: 'verantwortlich_email', label: 'E-Mail der verantwortlichen Person', type: 'string/email' },
  { key: 'anmerkungen_einheit', label: 'Anmerkungen', type: 'string/textarea' },
];
const SCOPE3WEITEREINDIREKTEEMISSIONEN_FIELDS = [
  { key: 's3_einheit', label: 'Organisationseinheit', type: 'applookup/select', targetEntity: 'konzernstruktur', targetAppId: 'KONZERNSTRUKTUR', displayField: 'einheit_name' },
  { key: 's3_berichtsjahr', label: 'Berichtsjahr', type: 'applookup/select', targetEntity: 'berichtsjahr', targetAppId: 'BERICHTSJAHR', displayField: 'anmerkungen_jahr' },
  { key: 's3_kategorie', label: 'Scope-3-Kategorie', type: 'lookup/select', options: [{ key: 'kat1', label: 'Kat. 1: Eingekaufte Waren und Dienstleistungen' }, { key: 'kat2', label: 'Kat. 2: Investitionsgüter' }, { key: 'kat3', label: 'Kat. 3: Brennstoff- und energiebezogene Aktivitäten' }, { key: 'kat4', label: 'Kat. 4: Vorgelagerter Transport und Vertrieb' }, { key: 'kat5', label: 'Kat. 5: Abfälle aus dem Betrieb' }, { key: 'kat6', label: 'Kat. 6: Geschäftsreisen' }, { key: 'kat7', label: 'Kat. 7: Pendlerverkehr der Mitarbeitenden' }, { key: 'kat8', label: 'Kat. 8: Vorgelagerte gemietete Anlagen' }, { key: 'kat9', label: 'Kat. 9: Nachgelagerter Transport und Vertrieb' }, { key: 'kat10', label: 'Kat. 10: Verarbeitung verkaufter Produkte' }, { key: 'kat11', label: 'Kat. 11: Nutzung verkaufter Produkte' }, { key: 'kat12', label: 'Kat. 12: Entsorgung verkaufter Produkte' }, { key: 'kat13', label: 'Kat. 13: Nachgelagerte gemietete Anlagen' }, { key: 'kat14', label: 'Kat. 14: Franchises' }, { key: 'kat15', label: 'Kat. 15: Investitionen' }] },
  { key: 's3_aktivitaet', label: 'Aktivitätsbeschreibung', type: 'string/textarea' },
  { key: 's3_berechnungsmethode', label: 'Berechnungsmethode', type: 'lookup/radio', options: [{ key: 'ausgabenbasiert', label: 'Ausgabenbasiert' }, { key: 'aktivitaetsbasiert', label: 'Aktivitätsbasiert' }, { key: 'hybrid', label: 'Hybridmethode' }, { key: 'lieferantenspezifisch', label: 'Lieferantenspezifisch' }] },
  { key: 's3_aktivitaetsmenge', label: 'Aktivitätsmenge', type: 'number' },
  { key: 's3_einheit_aktivitaet', label: 'Einheit der Aktivitätsmenge', type: 'lookup/select', options: [{ key: 'kwh', label: 'kWh' }, { key: 'mwh', label: 'MWh' }, { key: 'liter', label: 'Liter' }, { key: 'kg', label: 'kg' }, { key: 'tonne', label: 'Tonne' }, { key: 'tkm', label: 'tkm' }, { key: 'pkm', label: 'Personenkilometer' }, { key: 'eur', label: 'EUR' }, { key: 'm3', label: 'm³' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 's3_emissionsfaktor', label: 'Emissionsfaktor', type: 'applookup/select', targetEntity: 'emissionsfaktoren', targetAppId: 'EMISSIONSFAKTOREN', displayField: 'ef_bezeichnung' },
  { key: 's3_co2e_menge', label: 'Berechnete CO2e-Menge (Tonnen)', type: 'number' },
  { key: 's3_datenqualitaet', label: 'Datenqualität', type: 'lookup/radio', options: [{ key: 'primaer', label: 'Primärdaten' }, { key: 'sekundaer', label: 'Sekundärdaten' }, { key: 'schaetzung', label: 'Schätzung' }] },
  { key: 's3_bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
  { key: 's3_nachweis', label: 'Nachweis / Beleg (Datei-Upload)', type: 'file' },
];
const EMISSIONSFAKTOREN_FIELDS = [
  { key: 'ef_bezeichnung', label: 'Bezeichnung', type: 'string/text' },
  { key: 'ef_scope', label: 'Scope-Zuordnung', type: 'lookup/radio', options: [{ key: 'scope1', label: 'Scope 1' }, { key: 'scope2', label: 'Scope 2' }, { key: 'scope3', label: 'Scope 3' }] },
  { key: 'ef_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'stationaere_verbrennung', label: 'Stationäre Verbrennung' }, { key: 'mobile_verbrennung', label: 'Mobile Verbrennung' }, { key: 'prozessemissionen', label: 'Prozessemissionen' }, { key: 'fluechtige_emissionen', label: 'Flüchtige Emissionen' }, { key: 'strom', label: 'Eingekaufter Strom' }, { key: 'waerme', label: 'Eingekaufte Wärme' }, { key: 'kaelte', label: 'Eingekaufte Kälte' }, { key: 'dampf', label: 'Eingekaufter Dampf' }, { key: 'vorgelagert', label: 'Vorgelagerte Emissionen' }, { key: 'nachgelagert', label: 'Nachgelagerte Emissionen' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'ef_energietraeger', label: 'Energieträger / Aktivität', type: 'string/text' },
  { key: 'ef_einheit', label: 'Einheit', type: 'lookup/select', options: [{ key: 'kwh', label: 'kWh' }, { key: 'mwh', label: 'MWh' }, { key: 'gj', label: 'GJ' }, { key: 'liter', label: 'Liter' }, { key: 'kg', label: 'kg' }, { key: 'tonne', label: 'Tonne' }, { key: 'm3', label: 'm³' }, { key: 'tkm', label: 'tkm' }, { key: 'pkm', label: 'Personenkilometer' }, { key: 'eur', label: 'EUR' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'ef_faktor', label: 'Emissionsfaktor (kg CO2e pro Einheit)', type: 'number' },
  { key: 'ef_treibhausgas', label: 'Treibhausgase', type: 'multiplelookup/checkbox', options: [{ key: 'co2', label: 'CO2' }, { key: 'ch4', label: 'CH4' }, { key: 'n2o', label: 'N2O' }, { key: 'hfc', label: 'HFC' }, { key: 'pfc', label: 'PFC' }, { key: 'sf6', label: 'SF6' }, { key: 'nf3', label: 'NF3' }] },
  { key: 'ef_quelle', label: 'Quelle / Referenz', type: 'string/text' },
  { key: 'ef_gueltigkeitsjahr', label: 'Gültigkeitsjahr', type: 'number' },
];
const BERICHTSJAHR_FIELDS = [
  { key: 'jahr', label: 'Berichtsjahr', type: 'number' },
  { key: 'startdatum', label: 'Startdatum', type: 'date/date' },
  { key: 'enddatum', label: 'Enddatum', type: 'date/date' },
  { key: 'ist_basisjahr', label: 'Ist Basisjahr', type: 'bool' },
  { key: 'status_jahr', label: 'Status', type: 'lookup/radio', options: [{ key: 'geschlossen', label: 'Geschlossen' }, { key: 'archiviert', label: 'Archiviert' }, { key: 'offen', label: 'Offen' }] },
  { key: 'anmerkungen_jahr', label: 'Anmerkungen zum Berichtsjahr', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'scope_1_–_direkte_emissionen', label: 'Scope 1 – Direkte Emissionen', pascal: 'Scope1DirekteEmissionen' },
  { key: 'scope_2_–_indirekte_energieemissionen', label: 'Scope 2 – Indirekte Energieemissionen', pascal: 'Scope2IndirekteEnergieemissionen' },
  { key: 'emissionen_schnelleingabe', label: 'Emissionen Schnelleingabe', pascal: 'EmissionenSchnelleingabe' },
  { key: 'ghg_berichtsuebersicht', label: 'GHG-Berichtsübersicht', pascal: 'GhgBerichtsuebersicht' },
  { key: 'konzernstruktur', label: 'Konzernstruktur', pascal: 'Konzernstruktur' },
  { key: 'scope_3_–_weitere_indirekte_emissionen', label: 'Scope 3 – Weitere indirekte Emissionen', pascal: 'Scope3WeitereIndirekteEmissionen' },
  { key: 'emissionsfaktoren', label: 'Emissionsfaktoren', pascal: 'Emissionsfaktoren' },
  { key: 'berichtsjahr', label: 'Berichtsjahr', pascal: 'Berichtsjahr' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('scope_1_–_direkte_emissionen');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'scope_1_–_direkte_emissionen': new Set(),
    'scope_2_–_indirekte_energieemissionen': new Set(),
    'emissionen_schnelleingabe': new Set(),
    'ghg_berichtsuebersicht': new Set(),
    'konzernstruktur': new Set(),
    'scope_3_–_weitere_indirekte_emissionen': new Set(),
    'emissionsfaktoren': new Set(),
    'berichtsjahr': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'scope_1_–_direkte_emissionen': {},
    'scope_2_–_indirekte_energieemissionen': {},
    'emissionen_schnelleingabe': {},
    'ghg_berichtsuebersicht': {},
    'konzernstruktur': {},
    'scope_3_–_weitere_indirekte_emissionen': {},
    'emissionsfaktoren': {},
    'berichtsjahr': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'scope_1_–_direkte_emissionen': return (data as any).scope1DirekteEmissionen as Scope1DirekteEmissionen[] ?? [];
      case 'scope_2_–_indirekte_energieemissionen': return (data as any).scope2IndirekteEnergieemissionen as Scope2IndirekteEnergieemissionen[] ?? [];
      case 'emissionen_schnelleingabe': return (data as any).emissionenSchnelleingabe as EmissionenSchnelleingabe[] ?? [];
      case 'ghg_berichtsuebersicht': return (data as any).ghgBerichtsuebersicht as GhgBerichtsuebersicht[] ?? [];
      case 'konzernstruktur': return (data as any).konzernstruktur as Konzernstruktur[] ?? [];
      case 'scope_3_–_weitere_indirekte_emissionen': return (data as any).scope3WeitereIndirekteEmissionen as Scope3WeitereIndirekteEmissionen[] ?? [];
      case 'emissionsfaktoren': return (data as any).emissionsfaktoren as Emissionsfaktoren[] ?? [];
      case 'berichtsjahr': return (data as any).berichtsjahr as Berichtsjahr[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'scope_1_–_direkte_emissionen':
        lists.konzernstrukturList = (data as any).konzernstruktur ?? [];
        lists.berichtsjahrList = (data as any).berichtsjahr ?? [];
        lists.emissionsfaktorenList = (data as any).emissionsfaktoren ?? [];
        break;
      case 'scope_2_–_indirekte_energieemissionen':
        lists.konzernstrukturList = (data as any).konzernstruktur ?? [];
        lists.berichtsjahrList = (data as any).berichtsjahr ?? [];
        lists.emissionsfaktorenList = (data as any).emissionsfaktoren ?? [];
        break;
      case 'emissionen_schnelleingabe':
        lists.konzernstrukturList = (data as any).konzernstruktur ?? [];
        lists.berichtsjahrList = (data as any).berichtsjahr ?? [];
        lists.emissionsfaktorenList = (data as any).emissionsfaktoren ?? [];
        break;
      case 'ghg_berichtsuebersicht':
        lists.berichtsjahrList = (data as any).berichtsjahr ?? [];
        lists.konzernstrukturList = (data as any).konzernstruktur ?? [];
        break;
      case 'scope_3_–_weitere_indirekte_emissionen':
        lists.konzernstrukturList = (data as any).konzernstruktur ?? [];
        lists.berichtsjahrList = (data as any).berichtsjahr ?? [];
        lists.emissionsfaktorenList = (data as any).emissionsfaktoren ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'scope_1_–_direkte_emissionen' && fieldKey === 's1_einheit') {
      const match = (lists.konzernstrukturList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.einheit_name ?? '—';
    }
    if (entity === 'scope_1_–_direkte_emissionen' && fieldKey === 's1_berichtsjahr') {
      const match = (lists.berichtsjahrList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anmerkungen_jahr ?? '—';
    }
    if (entity === 'scope_1_–_direkte_emissionen' && fieldKey === 's1_emissionsfaktor') {
      const match = (lists.emissionsfaktorenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.ef_bezeichnung ?? '—';
    }
    if (entity === 'scope_2_–_indirekte_energieemissionen' && fieldKey === 's2_einheit') {
      const match = (lists.konzernstrukturList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.einheit_name ?? '—';
    }
    if (entity === 'scope_2_–_indirekte_energieemissionen' && fieldKey === 's2_berichtsjahr') {
      const match = (lists.berichtsjahrList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anmerkungen_jahr ?? '—';
    }
    if (entity === 'scope_2_–_indirekte_energieemissionen' && fieldKey === 's2_emissionsfaktor') {
      const match = (lists.emissionsfaktorenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.ef_bezeichnung ?? '—';
    }
    if (entity === 'emissionen_schnelleingabe' && fieldKey === 'se_einheit') {
      const match = (lists.konzernstrukturList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.einheit_name ?? '—';
    }
    if (entity === 'emissionen_schnelleingabe' && fieldKey === 'se_berichtsjahr') {
      const match = (lists.berichtsjahrList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anmerkungen_jahr ?? '—';
    }
    if (entity === 'emissionen_schnelleingabe' && fieldKey === 'se_emissionsfaktor') {
      const match = (lists.emissionsfaktorenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.ef_bezeichnung ?? '—';
    }
    if (entity === 'ghg_berichtsuebersicht' && fieldKey === 'gb_berichtsjahr') {
      const match = (lists.berichtsjahrList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anmerkungen_jahr ?? '—';
    }
    if (entity === 'ghg_berichtsuebersicht' && fieldKey === 'gb_konzerneinheit') {
      const match = (lists.konzernstrukturList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.einheit_name ?? '—';
    }
    if (entity === 'scope_3_–_weitere_indirekte_emissionen' && fieldKey === 's3_einheit') {
      const match = (lists.konzernstrukturList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.einheit_name ?? '—';
    }
    if (entity === 'scope_3_–_weitere_indirekte_emissionen' && fieldKey === 's3_berichtsjahr') {
      const match = (lists.berichtsjahrList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anmerkungen_jahr ?? '—';
    }
    if (entity === 'scope_3_–_weitere_indirekte_emissionen' && fieldKey === 's3_emissionsfaktor') {
      const match = (lists.emissionsfaktorenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.ef_bezeichnung ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'scope_1_–_direkte_emissionen': return SCOPE1DIREKTEEMISSIONEN_FIELDS;
      case 'scope_2_–_indirekte_energieemissionen': return SCOPE2INDIREKTEENERGIEEMISSIONEN_FIELDS;
      case 'emissionen_schnelleingabe': return EMISSIONENSCHNELLEINGABE_FIELDS;
      case 'ghg_berichtsuebersicht': return GHGBERICHTSUEBERSICHT_FIELDS;
      case 'konzernstruktur': return KONZERNSTRUKTUR_FIELDS;
      case 'scope_3_–_weitere_indirekte_emissionen': return SCOPE3WEITEREINDIREKTEEMISSIONEN_FIELDS;
      case 'emissionsfaktoren': return EMISSIONSFAKTOREN_FIELDS;
      case 'berichtsjahr': return BERICHTSJAHR_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'scope_1_–_direkte_emissionen': return {
        create: (fields: any) => LivingAppsService.createScope1DirekteEmissionenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateScope1DirekteEmissionenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteScope1DirekteEmissionenEntry(id),
      };
      case 'scope_2_–_indirekte_energieemissionen': return {
        create: (fields: any) => LivingAppsService.createScope2IndirekteEnergieemissionenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateScope2IndirekteEnergieemissionenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteScope2IndirekteEnergieemissionenEntry(id),
      };
      case 'emissionen_schnelleingabe': return {
        create: (fields: any) => LivingAppsService.createEmissionenSchnelleingabeEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateEmissionenSchnelleingabeEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteEmissionenSchnelleingabeEntry(id),
      };
      case 'ghg_berichtsuebersicht': return {
        create: (fields: any) => LivingAppsService.createGhgBerichtsuebersichtEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateGhgBerichtsuebersichtEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteGhgBerichtsuebersichtEntry(id),
      };
      case 'konzernstruktur': return {
        create: (fields: any) => LivingAppsService.createKonzernstrukturEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKonzernstrukturEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKonzernstrukturEntry(id),
      };
      case 'scope_3_–_weitere_indirekte_emissionen': return {
        create: (fields: any) => LivingAppsService.createScope3WeitereIndirekteEmissionenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateScope3WeitereIndirekteEmissionenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteScope3WeitereIndirekteEmissionenEntry(id),
      };
      case 'emissionsfaktoren': return {
        create: (fields: any) => LivingAppsService.createEmissionsfaktorenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateEmissionsfaktorenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteEmissionsfaktorenEntry(id),
      };
      case 'berichtsjahr': return {
        create: (fields: any) => LivingAppsService.createBerichtsjahrEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBerichtsjahrEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBerichtsjahrEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'scope_1_–_direkte_emissionen' || dialogState?.entity === 'scope_1_–_direkte_emissionen') && (
        <Scope1DirekteEmissionenDialog
          open={createEntity === 'scope_1_–_direkte_emissionen' || dialogState?.entity === 'scope_1_–_direkte_emissionen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'scope_1_–_direkte_emissionen' ? handleUpdate : (fields: any) => handleCreate('scope_1_–_direkte_emissionen', fields)}
          defaultValues={dialogState?.entity === 'scope_1_–_direkte_emissionen' ? dialogState.record?.fields : undefined}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Scope1DirekteEmissionen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Scope1DirekteEmissionen']}
        />
      )}
      {(createEntity === 'scope_2_–_indirekte_energieemissionen' || dialogState?.entity === 'scope_2_–_indirekte_energieemissionen') && (
        <Scope2IndirekteEnergieemissionenDialog
          open={createEntity === 'scope_2_–_indirekte_energieemissionen' || dialogState?.entity === 'scope_2_–_indirekte_energieemissionen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'scope_2_–_indirekte_energieemissionen' ? handleUpdate : (fields: any) => handleCreate('scope_2_–_indirekte_energieemissionen', fields)}
          defaultValues={dialogState?.entity === 'scope_2_–_indirekte_energieemissionen' ? dialogState.record?.fields : undefined}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Scope2IndirekteEnergieemissionen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Scope2IndirekteEnergieemissionen']}
        />
      )}
      {(createEntity === 'emissionen_schnelleingabe' || dialogState?.entity === 'emissionen_schnelleingabe') && (
        <EmissionenSchnelleingabeDialog
          open={createEntity === 'emissionen_schnelleingabe' || dialogState?.entity === 'emissionen_schnelleingabe'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'emissionen_schnelleingabe' ? handleUpdate : (fields: any) => handleCreate('emissionen_schnelleingabe', fields)}
          defaultValues={dialogState?.entity === 'emissionen_schnelleingabe' ? dialogState.record?.fields : undefined}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['EmissionenSchnelleingabe']}
          enablePhotoLocation={AI_PHOTO_LOCATION['EmissionenSchnelleingabe']}
        />
      )}
      {(createEntity === 'ghg_berichtsuebersicht' || dialogState?.entity === 'ghg_berichtsuebersicht') && (
        <GhgBerichtsuebersichtDialog
          open={createEntity === 'ghg_berichtsuebersicht' || dialogState?.entity === 'ghg_berichtsuebersicht'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'ghg_berichtsuebersicht' ? handleUpdate : (fields: any) => handleCreate('ghg_berichtsuebersicht', fields)}
          defaultValues={dialogState?.entity === 'ghg_berichtsuebersicht' ? dialogState.record?.fields : undefined}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['GhgBerichtsuebersicht']}
          enablePhotoLocation={AI_PHOTO_LOCATION['GhgBerichtsuebersicht']}
        />
      )}
      {(createEntity === 'konzernstruktur' || dialogState?.entity === 'konzernstruktur') && (
        <KonzernstrukturDialog
          open={createEntity === 'konzernstruktur' || dialogState?.entity === 'konzernstruktur'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'konzernstruktur' ? handleUpdate : (fields: any) => handleCreate('konzernstruktur', fields)}
          defaultValues={dialogState?.entity === 'konzernstruktur' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Konzernstruktur']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Konzernstruktur']}
        />
      )}
      {(createEntity === 'scope_3_–_weitere_indirekte_emissionen' || dialogState?.entity === 'scope_3_–_weitere_indirekte_emissionen') && (
        <Scope3WeitereIndirekteEmissionenDialog
          open={createEntity === 'scope_3_–_weitere_indirekte_emissionen' || dialogState?.entity === 'scope_3_–_weitere_indirekte_emissionen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'scope_3_–_weitere_indirekte_emissionen' ? handleUpdate : (fields: any) => handleCreate('scope_3_–_weitere_indirekte_emissionen', fields)}
          defaultValues={dialogState?.entity === 'scope_3_–_weitere_indirekte_emissionen' ? dialogState.record?.fields : undefined}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Scope3WeitereIndirekteEmissionen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Scope3WeitereIndirekteEmissionen']}
        />
      )}
      {(createEntity === 'emissionsfaktoren' || dialogState?.entity === 'emissionsfaktoren') && (
        <EmissionsfaktorenDialog
          open={createEntity === 'emissionsfaktoren' || dialogState?.entity === 'emissionsfaktoren'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'emissionsfaktoren' ? handleUpdate : (fields: any) => handleCreate('emissionsfaktoren', fields)}
          defaultValues={dialogState?.entity === 'emissionsfaktoren' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Emissionsfaktoren']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Emissionsfaktoren']}
        />
      )}
      {(createEntity === 'berichtsjahr' || dialogState?.entity === 'berichtsjahr') && (
        <BerichtsjahrDialog
          open={createEntity === 'berichtsjahr' || dialogState?.entity === 'berichtsjahr'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'berichtsjahr' ? handleUpdate : (fields: any) => handleCreate('berichtsjahr', fields)}
          defaultValues={dialogState?.entity === 'berichtsjahr' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Berichtsjahr']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Berichtsjahr']}
        />
      )}
      {viewState?.entity === 'scope_1_–_direkte_emissionen' && (
        <Scope1DirekteEmissionenViewDialog
          open={viewState?.entity === 'scope_1_–_direkte_emissionen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'scope_1_–_direkte_emissionen', record: r }); }}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
        />
      )}
      {viewState?.entity === 'scope_2_–_indirekte_energieemissionen' && (
        <Scope2IndirekteEnergieemissionenViewDialog
          open={viewState?.entity === 'scope_2_–_indirekte_energieemissionen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'scope_2_–_indirekte_energieemissionen', record: r }); }}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
        />
      )}
      {viewState?.entity === 'emissionen_schnelleingabe' && (
        <EmissionenSchnelleingabeViewDialog
          open={viewState?.entity === 'emissionen_schnelleingabe'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'emissionen_schnelleingabe', record: r }); }}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
        />
      )}
      {viewState?.entity === 'ghg_berichtsuebersicht' && (
        <GhgBerichtsuebersichtViewDialog
          open={viewState?.entity === 'ghg_berichtsuebersicht'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'ghg_berichtsuebersicht', record: r }); }}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
        />
      )}
      {viewState?.entity === 'konzernstruktur' && (
        <KonzernstrukturViewDialog
          open={viewState?.entity === 'konzernstruktur'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'konzernstruktur', record: r }); }}
        />
      )}
      {viewState?.entity === 'scope_3_–_weitere_indirekte_emissionen' && (
        <Scope3WeitereIndirekteEmissionenViewDialog
          open={viewState?.entity === 'scope_3_–_weitere_indirekte_emissionen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'scope_3_–_weitere_indirekte_emissionen', record: r }); }}
          konzernstrukturList={(data as any).konzernstruktur ?? []}
          berichtsjahrList={(data as any).berichtsjahr ?? []}
          emissionsfaktorenList={(data as any).emissionsfaktoren ?? []}
        />
      )}
      {viewState?.entity === 'emissionsfaktoren' && (
        <EmissionsfaktorenViewDialog
          open={viewState?.entity === 'emissionsfaktoren'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'emissionsfaktoren', record: r }); }}
        />
      )}
      {viewState?.entity === 'berichtsjahr' && (
        <BerichtsjahrViewDialog
          open={viewState?.entity === 'berichtsjahr'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'berichtsjahr', record: r }); }}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}