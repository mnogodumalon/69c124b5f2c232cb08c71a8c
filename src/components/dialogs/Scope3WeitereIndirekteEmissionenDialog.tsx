import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Scope3WeitereIndirekteEmissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Scope3WeitereIndirekteEmissionen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { KonzernstrukturDialog } from '@/components/dialogs/KonzernstrukturDialog';
import { BerichtsjahrDialog } from '@/components/dialogs/BerichtsjahrDialog';
import { EmissionsfaktorenDialog } from '@/components/dialogs/EmissionsfaktorenDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface Scope3WeitereIndirekteEmissionenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Scope3WeitereIndirekteEmissionen['fields']) => Promise<void>;
  defaultValues?: Scope3WeitereIndirekteEmissionen['fields'];
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function Scope3WeitereIndirekteEmissionenDialog({ open, onClose, onSubmit, defaultValues, recordId, konzernstrukturList, berichtsjahrList, emissionsfaktorenList, enablePhotoScan = true, enablePhotoLocation = true }: Scope3WeitereIndirekteEmissionenDialogProps) {
  const [fields, setFields] = useState<Partial<Scope3WeitereIndirekteEmissionen['fields']>>({});
  const [saving, setSaving] = useState(false);
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!defaultValues) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(defaultValues);
    } catch {
      return true;
    }
  }, [fields, defaultValues]);
  // Inline-Create state for "Konzernstruktur" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraKonzernstruktur` list, and select it in
  // the originating Combobox via the captured `createKonzernstrukturField`.
  const [createKonzernstrukturOpen, setCreateKonzernstrukturOpen] = useState(false);
  const [createKonzernstrukturInitial, setCreateKonzernstrukturInitial] = useState('');
  const [createKonzernstrukturField, setCreateKonzernstrukturField] = useState<string>('');
  const [extraKonzernstruktur, setExtraKonzernstruktur] = useState< Konzernstruktur[]>([]);
  const konzernstrukturListAll = useMemo(
    () => [...konzernstrukturList, ...extraKonzernstruktur],
    [konzernstrukturList, extraKonzernstruktur],
  );
  function openCreateKonzernstruktur(fieldKey: string, q: string) {
    setCreateKonzernstrukturField(fieldKey);
    setCreateKonzernstrukturInitial(q);
    setCreateKonzernstrukturOpen(true);
  }
  // Inline-Create state for "Berichtsjahr" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraBerichtsjahr` list, and select it in
  // the originating Combobox via the captured `createBerichtsjahrField`.
  const [createBerichtsjahrOpen, setCreateBerichtsjahrOpen] = useState(false);
  const [createBerichtsjahrInitial, setCreateBerichtsjahrInitial] = useState('');
  const [createBerichtsjahrField, setCreateBerichtsjahrField] = useState<string>('');
  const [extraBerichtsjahr, setExtraBerichtsjahr] = useState< Berichtsjahr[]>([]);
  const berichtsjahrListAll = useMemo(
    () => [...berichtsjahrList, ...extraBerichtsjahr],
    [berichtsjahrList, extraBerichtsjahr],
  );
  function openCreateBerichtsjahr(fieldKey: string, q: string) {
    setCreateBerichtsjahrField(fieldKey);
    setCreateBerichtsjahrInitial(q);
    setCreateBerichtsjahrOpen(true);
  }
  // Inline-Create state for "Emissionsfaktoren" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraEmissionsfaktoren` list, and select it in
  // the originating Combobox via the captured `createEmissionsfaktorenField`.
  const [createEmissionsfaktorenOpen, setCreateEmissionsfaktorenOpen] = useState(false);
  const [createEmissionsfaktorenInitial, setCreateEmissionsfaktorenInitial] = useState('');
  const [createEmissionsfaktorenField, setCreateEmissionsfaktorenField] = useState<string>('');
  const [extraEmissionsfaktoren, setExtraEmissionsfaktoren] = useState< Emissionsfaktoren[]>([]);
  const emissionsfaktorenListAll = useMemo(
    () => [...emissionsfaktorenList, ...extraEmissionsfaktoren],
    [emissionsfaktorenList, extraEmissionsfaktoren],
  );
  function openCreateEmissionsfaktoren(fieldKey: string, q: string) {
    setCreateEmissionsfaktorenField(fieldKey);
    setCreateEmissionsfaktorenInitial(q);
    setCreateEmissionsfaktorenOpen(true);
  }
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      's3_einheit': konzernstrukturList,
      's3_berichtsjahr': berichtsjahrList,
      's3_emissionsfaktor': emissionsfaktorenList,
    },
  }), [konzernstrukturList, berichtsjahrList, emissionsfaktorenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults((defaultValues ?? {}) as Record<string, unknown>, formEnhancements.defaults) as Partial<Scope3WeitereIndirekteEmissionen['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'scope_3_–_weitere_indirekte_emissionen');
      await onSubmit(clean as Scope3WeitereIndirekteEmissionen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="s3_einheit" entity="Konzernstruktur">\n${JSON.stringify(konzernstrukturList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="s3_berichtsjahr" entity="Berichtsjahr">\n${JSON.stringify(berichtsjahrList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="s3_emissionsfaktor" entity="Emissionsfaktoren">\n${JSON.stringify(emissionsfaktorenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "s3_einheit": string | null, // Display name from Konzernstruktur (see <available-records>)\n  "s3_berichtsjahr": string | null, // Display name from Berichtsjahr (see <available-records>)\n  "s3_kategorie": LookupValue | null, // Scope-3-Kategorie (select one key: "kat1" | "kat2" | "kat3" | "kat4" | "kat5" | "kat6" | "kat7" | "kat8" | "kat9" | "kat10" | "kat11" | "kat12" | "kat13" | "kat14" | "kat15") mapping: kat1=Kat. 1: Eingekaufte Waren und Dienstleistungen, kat2=Kat. 2: Investitionsgüter, kat3=Kat. 3: Brennstoff- und energiebezogene Aktivitäten, kat4=Kat. 4: Vorgelagerter Transport und Vertrieb, kat5=Kat. 5: Abfälle aus dem Betrieb, kat6=Kat. 6: Geschäftsreisen, kat7=Kat. 7: Pendlerverkehr der Mitarbeitenden, kat8=Kat. 8: Vorgelagerte gemietete Anlagen, kat9=Kat. 9: Nachgelagerter Transport und Vertrieb, kat10=Kat. 10: Verarbeitung verkaufter Produkte, kat11=Kat. 11: Nutzung verkaufter Produkte, kat12=Kat. 12: Entsorgung verkaufter Produkte, kat13=Kat. 13: Nachgelagerte gemietete Anlagen, kat14=Kat. 14: Franchises, kat15=Kat. 15: Investitionen\n  "s3_aktivitaet": string | null, // Aktivitätsbeschreibung\n  "s3_berechnungsmethode": LookupValue | null, // Berechnungsmethode (select one key: "ausgabenbasiert" | "aktivitaetsbasiert" | "hybrid" | "lieferantenspezifisch") mapping: ausgabenbasiert=Ausgabenbasiert, aktivitaetsbasiert=Aktivitätsbasiert, hybrid=Hybridmethode, lieferantenspezifisch=Lieferantenspezifisch\n  "s3_aktivitaetsmenge": number | null, // Aktivitätsmenge\n  "s3_einheit_aktivitaet": LookupValue | null, // Einheit der Aktivitätsmenge (select one key: "kwh" | "mwh" | "liter" | "kg" | "tonne" | "tkm" | "pkm" | "eur" | "m3" | "sonstige") mapping: kwh=kWh, mwh=MWh, liter=Liter, kg=kg, tonne=Tonne, tkm=tkm, pkm=Personenkilometer, eur=EUR, m3=m³, sonstige=Sonstige\n  "s3_emissionsfaktor": string | null, // Display name from Emissionsfaktoren (see <available-records>)\n  "s3_co2e_menge": number | null, // Berechnete CO2e-Menge (Tonnen)\n  "s3_datenqualitaet": LookupValue | null, // Datenqualität (select one key: "primaer" | "sekundaer" | "schaetzung") mapping: primaer=Primärdaten, sekundaer=Sekundärdaten, schaetzung=Schätzung\n  "s3_bemerkungen": string | null, // Bemerkungen\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["s3_einheit", "s3_berichtsjahr", "s3_emissionsfaktor"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const s3_einheitName = raw['s3_einheit'] as string | null;
        if (s3_einheitName) {
          const s3_einheitMatch = konzernstrukturList.find(r => matchName(s3_einheitName!, [String(r.fields.einheit_name ?? '')]));
          if (s3_einheitMatch) merged['s3_einheit'] = createRecordUrl(APP_IDS.KONZERNSTRUKTUR, s3_einheitMatch.record_id);
        }
        const s3_berichtsjahrName = raw['s3_berichtsjahr'] as string | null;
        if (s3_berichtsjahrName) {
          const s3_berichtsjahrMatch = berichtsjahrList.find(r => matchName(s3_berichtsjahrName!, [String(r.fields.anmerkungen_jahr ?? '')]));
          if (s3_berichtsjahrMatch) merged['s3_berichtsjahr'] = createRecordUrl(APP_IDS.BERICHTSJAHR, s3_berichtsjahrMatch.record_id);
        }
        const s3_emissionsfaktorName = raw['s3_emissionsfaktor'] as string | null;
        if (s3_emissionsfaktorName) {
          const s3_emissionsfaktorMatch = emissionsfaktorenList.find(r => matchName(s3_emissionsfaktorName!, [String(r.fields.ef_bezeichnung ?? '')]));
          if (s3_emissionsfaktorMatch) merged['s3_emissionsfaktor'] = createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, s3_emissionsfaktorMatch.record_id);
        }
        return merged as Partial<Scope3WeitereIndirekteEmissionen['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, s3_nachweis: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Scope 3 – Weitere indirekte Emissionen bearbeiten' : 'Scope 3 – Weitere indirekte Emissionen hinzufügen';

  const fieldBlocks: Record<string, React.ReactNode> = {
    's3_einheit': (
      <div key="s3_einheit" className="space-y-1.5">
        <Label htmlFor="s3_einheit">Organisationseinheit</Label>
        <Combobox
          id="s3_einheit"
          placeholder=""
          items={konzernstrukturListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.einheit_name ?? r.record_id),
          }))}
          value={extractRecordId(fields.s3_einheit)}
          onChange={id => setFields(f => ({ ...f, s3_einheit: id ? createRecordUrl(APP_IDS.KONZERNSTRUKTUR, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateKonzernstruktur("s3_einheit", q)}
          createLabel="Neu in Konzernstruktur"
        />
      </div>
    ),
    's3_berichtsjahr': (
      <div key="s3_berichtsjahr" className="space-y-1.5">
        <Label htmlFor="s3_berichtsjahr">Berichtsjahr</Label>
        <Combobox
          id="s3_berichtsjahr"
          placeholder=""
          items={berichtsjahrListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.anmerkungen_jahr ?? r.record_id),
          }))}
          value={extractRecordId(fields.s3_berichtsjahr)}
          onChange={id => setFields(f => ({ ...f, s3_berichtsjahr: id ? createRecordUrl(APP_IDS.BERICHTSJAHR, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateBerichtsjahr("s3_berichtsjahr", q)}
          createLabel="Neu in Berichtsjahr"
        />
      </div>
    ),
    's3_kategorie': (
      <div key="s3_kategorie" className="space-y-1.5">
        <Label htmlFor="s3_kategorie">Scope-3-Kategorie</Label>
        <Select
          value={lookupKey(fields.s3_kategorie) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, s3_kategorie: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="s3_kategorie"><SelectValue placeholder="" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="kat1">Kat. 1: Eingekaufte Waren und Dienstleistungen</SelectItem>
            <SelectItem value="kat2">Kat. 2: Investitionsgüter</SelectItem>
            <SelectItem value="kat3">Kat. 3: Brennstoff- und energiebezogene Aktivitäten</SelectItem>
            <SelectItem value="kat4">Kat. 4: Vorgelagerter Transport und Vertrieb</SelectItem>
            <SelectItem value="kat5">Kat. 5: Abfälle aus dem Betrieb</SelectItem>
            <SelectItem value="kat6">Kat. 6: Geschäftsreisen</SelectItem>
            <SelectItem value="kat7">Kat. 7: Pendlerverkehr der Mitarbeitenden</SelectItem>
            <SelectItem value="kat8">Kat. 8: Vorgelagerte gemietete Anlagen</SelectItem>
            <SelectItem value="kat9">Kat. 9: Nachgelagerter Transport und Vertrieb</SelectItem>
            <SelectItem value="kat10">Kat. 10: Verarbeitung verkaufter Produkte</SelectItem>
            <SelectItem value="kat11">Kat. 11: Nutzung verkaufter Produkte</SelectItem>
            <SelectItem value="kat12">Kat. 12: Entsorgung verkaufter Produkte</SelectItem>
            <SelectItem value="kat13">Kat. 13: Nachgelagerte gemietete Anlagen</SelectItem>
            <SelectItem value="kat14">Kat. 14: Franchises</SelectItem>
            <SelectItem value="kat15">Kat. 15: Investitionen</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
    's3_aktivitaet': (
      <div key="s3_aktivitaet" className="space-y-1.5">
        <Label htmlFor="s3_aktivitaet">Aktivitätsbeschreibung</Label>
        <Textarea
          id="s3_aktivitaet"
          placeholder=""
          value={fields.s3_aktivitaet ?? ''}
          onChange={e => setFields(f => ({ ...f, s3_aktivitaet: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    's3_berechnungsmethode': (
      <div key="s3_berechnungsmethode" className="space-y-1.5">
        <Label htmlFor="s3_berechnungsmethode">Berechnungsmethode</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_berechnungsmethode) === 'ausgabenbasiert'}
            onClick={() => setFields(f => ({ ...f, s3_berechnungsmethode: (lookupKey(f.s3_berechnungsmethode) === 'ausgabenbasiert' ? undefined : 'ausgabenbasiert') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_berechnungsmethode) === 'ausgabenbasiert'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Ausgabenbasiert
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_berechnungsmethode) === 'aktivitaetsbasiert'}
            onClick={() => setFields(f => ({ ...f, s3_berechnungsmethode: (lookupKey(f.s3_berechnungsmethode) === 'aktivitaetsbasiert' ? undefined : 'aktivitaetsbasiert') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_berechnungsmethode) === 'aktivitaetsbasiert'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Aktivitätsbasiert
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_berechnungsmethode) === 'hybrid'}
            onClick={() => setFields(f => ({ ...f, s3_berechnungsmethode: (lookupKey(f.s3_berechnungsmethode) === 'hybrid' ? undefined : 'hybrid') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_berechnungsmethode) === 'hybrid'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Hybridmethode
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_berechnungsmethode) === 'lieferantenspezifisch'}
            onClick={() => setFields(f => ({ ...f, s3_berechnungsmethode: (lookupKey(f.s3_berechnungsmethode) === 'lieferantenspezifisch' ? undefined : 'lieferantenspezifisch') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_berechnungsmethode) === 'lieferantenspezifisch'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Lieferantenspezifisch
          </button>
        </div>
      </div>
    ),
    's3_aktivitaetsmenge': (
      <div key="s3_aktivitaetsmenge" className="space-y-1.5">
        <Label htmlFor="s3_aktivitaetsmenge">Aktivitätsmenge</Label>
        <Input
          id="s3_aktivitaetsmenge"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 's3_aktivitaetsmenge')}
          placeholder=""
          value={fields.s3_aktivitaetsmenge !== undefined ? fields.s3_aktivitaetsmenge : (computedValues['s3_aktivitaetsmenge'] ?? '')}
          onChange={e => setFields(f => ({ ...f, s3_aktivitaetsmenge: clampNumberValue(formEnhancements, 's3_aktivitaetsmenge', e.target.value) }))}
        />
      </div>
    ),
    's3_einheit_aktivitaet': (
      <div key="s3_einheit_aktivitaet" className="space-y-1.5">
        <Label htmlFor="s3_einheit_aktivitaet">Einheit der Aktivitätsmenge</Label>
        <Select
          value={lookupKey(fields.s3_einheit_aktivitaet) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, s3_einheit_aktivitaet: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="s3_einheit_aktivitaet"><SelectValue placeholder="" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="kwh">kWh</SelectItem>
            <SelectItem value="mwh">MWh</SelectItem>
            <SelectItem value="liter">Liter</SelectItem>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="tonne">Tonne</SelectItem>
            <SelectItem value="tkm">tkm</SelectItem>
            <SelectItem value="pkm">Personenkilometer</SelectItem>
            <SelectItem value="eur">EUR</SelectItem>
            <SelectItem value="m3">m³</SelectItem>
            <SelectItem value="sonstige">Sonstige</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
    's3_emissionsfaktor': (
      <div key="s3_emissionsfaktor" className="space-y-1.5">
        <Label htmlFor="s3_emissionsfaktor">Emissionsfaktor</Label>
        <Combobox
          id="s3_emissionsfaktor"
          placeholder=""
          items={emissionsfaktorenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.ef_bezeichnung ?? r.record_id),
          }))}
          value={extractRecordId(fields.s3_emissionsfaktor)}
          onChange={id => setFields(f => ({ ...f, s3_emissionsfaktor: id ? createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateEmissionsfaktoren("s3_emissionsfaktor", q)}
          createLabel="Neu in Emissionsfaktoren"
        />
      </div>
    ),
    's3_co2e_menge': (
      <div key="s3_co2e_menge" className="space-y-1.5">
        <Label htmlFor="s3_co2e_menge">Berechnete CO2e-Menge (Tonnen)</Label>
        <Input
          id="s3_co2e_menge"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 's3_co2e_menge')}
          placeholder=""
          value={fields.s3_co2e_menge !== undefined ? fields.s3_co2e_menge : (computedValues['s3_co2e_menge'] ?? '')}
          onChange={e => setFields(f => ({ ...f, s3_co2e_menge: clampNumberValue(formEnhancements, 's3_co2e_menge', e.target.value) }))}
        />
      </div>
    ),
    's3_datenqualitaet': (
      <div key="s3_datenqualitaet" className="space-y-1.5">
        <Label htmlFor="s3_datenqualitaet">Datenqualität</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_datenqualitaet) === 'primaer'}
            onClick={() => setFields(f => ({ ...f, s3_datenqualitaet: (lookupKey(f.s3_datenqualitaet) === 'primaer' ? undefined : 'primaer') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_datenqualitaet) === 'primaer'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Primärdaten
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_datenqualitaet) === 'sekundaer'}
            onClick={() => setFields(f => ({ ...f, s3_datenqualitaet: (lookupKey(f.s3_datenqualitaet) === 'sekundaer' ? undefined : 'sekundaer') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_datenqualitaet) === 'sekundaer'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Sekundärdaten
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.s3_datenqualitaet) === 'schaetzung'}
            onClick={() => setFields(f => ({ ...f, s3_datenqualitaet: (lookupKey(f.s3_datenqualitaet) === 'schaetzung' ? undefined : 'schaetzung') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.s3_datenqualitaet) === 'schaetzung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Schätzung
          </button>
        </div>
      </div>
    ),
    's3_bemerkungen': (
      <div key="s3_bemerkungen" className="space-y-1.5">
        <Label htmlFor="s3_bemerkungen">Bemerkungen</Label>
        <Textarea
          id="s3_bemerkungen"
          placeholder=""
          value={fields.s3_bemerkungen ?? ''}
          onChange={e => setFields(f => ({ ...f, s3_bemerkungen: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    's3_nachweis': (
      <div key="s3_nachweis" className="space-y-1.5">
        <Label htmlFor="s3_nachweis">Nachweis / Beleg (Datei-Upload)</Label>
        {fields.s3_nachweis ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <IconFileText size={20} className="text-muted-foreground" />
              </div>
              <img
                src={fields.s3_nachweis}
                alt=""
                className="relative h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground">{fields.s3_nachweis.split("/").pop()}</p>
              <div className="flex gap-2 mt-1">
                <label
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Ändern
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fileUrl = await uploadFile(file, file.name);
                        setFields(f => ({ ...f, s3_nachweis: fileUrl }));
                      } catch (err) { console.error('Upload failed:', err); }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(f => ({ ...f, s3_nachweis: undefined }))}
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <IconUpload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Datei hochladen</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const fileUrl = await uploadFile(file, file.name);
                  setFields(f => ({ ...f, s3_nachweis: fileUrl }));
                } catch (err) { console.error('Upload failed:', err); }
              }}
            />
          </label>
        )}
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"s3_einheit": "Organisationseinheit", "s3_berichtsjahr": "Berichtsjahr", "s3_kategorie": "Scope-3-Kategorie", "s3_aktivitaet": "Aktivitätsbeschreibung", "s3_berechnungsmethode": "Berechnungsmethode", "s3_aktivitaetsmenge": "Aktivitätsmenge", "s3_einheit_aktivitaet": "Einheit der Aktivitätsmenge", "s3_emissionsfaktor": "Emissionsfaktor", "s3_co2e_menge": "Berechnete CO2e-Menge (Tonnen)", "s3_datenqualitaet": "Datenqualität", "s3_bemerkungen": "Bemerkungen", "s3_nachweis": "Nachweis / Beleg (Datei-Upload)"};
  const CURRENCY_KEYS = new Set<string>([]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"s3_einheit": {"einheit_name": "Name der Einheit", "einheit_typ": "Typ der Einheit", "uebergeordnete_einheit": "Übergeordnete Einheit (Name)", "land": "Land", "branche": "Branche", "konsolidierungsmethode": "Konsolidierungsmethode", "verantwortlich_vorname": "Vorname der verantwortlichen Person", "verantwortlich_nachname": "Nachname der verantwortlichen Person", "verantwortlich_email": "E-Mail der verantwortlichen Person", "anmerkungen_einheit": "Anmerkungen"}, "s3_berichtsjahr": {"jahr": "Berichtsjahr", "startdatum": "Startdatum", "enddatum": "Enddatum", "ist_basisjahr": "Ist Basisjahr", "status_jahr": "Status", "anmerkungen_jahr": "Anmerkungen zum Berichtsjahr"}, "s3_emissionsfaktor": {"ef_bezeichnung": "Bezeichnung", "ef_scope": "Scope-Zuordnung", "ef_kategorie": "Kategorie", "ef_energietraeger": "Energieträger / Aktivität", "ef_einheit": "Einheit", "ef_faktor": "Emissionsfaktor (kg CO2e pro Einheit)", "ef_treibhausgas": "Treibhausgase", "ef_quelle": "Quelle / Referenz", "ef_gueltigkeitsjahr": "Gültigkeitsjahr"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all mr-7 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">KI-Ausfüllen</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS["SCOPE_3_–_WEITERE_INDIREKTE_EMISSIONEN"]} recordId={recordId} />
              </div>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving || !isDirty}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createKonzernstrukturOpen && (
      <KonzernstrukturDialog
        open={createKonzernstrukturOpen}
        onClose={() => setCreateKonzernstrukturOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createKonzernstrukturEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Konzernstruktur;
            setExtraKonzernstruktur(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.KONZERNSTRUKTUR, result.id);
            setFields(prev => ({ ...prev, [createKonzernstrukturField]: url } as any));
          }
          setCreateKonzernstrukturOpen(false);
        }}
        defaultValues={createKonzernstrukturInitial
          ? ({ einheit_name: createKonzernstrukturInitial } as any)
          : undefined}
      />
    )}
    {createBerichtsjahrOpen && (
      <BerichtsjahrDialog
        open={createBerichtsjahrOpen}
        onClose={() => setCreateBerichtsjahrOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createBerichtsjahrEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Berichtsjahr;
            setExtraBerichtsjahr(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.BERICHTSJAHR, result.id);
            setFields(prev => ({ ...prev, [createBerichtsjahrField]: url } as any));
          }
          setCreateBerichtsjahrOpen(false);
        }}
        defaultValues={createBerichtsjahrInitial
          ? ({ anmerkungen_jahr: createBerichtsjahrInitial } as any)
          : undefined}
      />
    )}
    {createEmissionsfaktorenOpen && (
      <EmissionsfaktorenDialog
        open={createEmissionsfaktorenOpen}
        onClose={() => setCreateEmissionsfaktorenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createEmissionsfaktorenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Emissionsfaktoren;
            setExtraEmissionsfaktoren(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, result.id);
            setFields(prev => ({ ...prev, [createEmissionsfaktorenField]: url } as any));
          }
          setCreateEmissionsfaktorenOpen(false);
        }}
        defaultValues={createEmissionsfaktorenInitial
          ? ({ ef_bezeichnung: createEmissionsfaktorenInitial } as any)
          : undefined}
      />
    )}
    </>
  );
}