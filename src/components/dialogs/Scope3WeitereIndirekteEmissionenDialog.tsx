import { useState, useEffect, useRef, useCallback } from 'react';
import type { Scope3WeitereIndirekteEmissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface Scope3WeitereIndirekteEmissionenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Scope3WeitereIndirekteEmissionen['fields']) => Promise<void>;
  defaultValues?: Scope3WeitereIndirekteEmissionen['fields'];
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function Scope3WeitereIndirekteEmissionenDialog({ open, onClose, onSubmit, defaultValues, konzernstrukturList, berichtsjahrList, emissionsfaktorenList, enablePhotoScan = false, enablePhotoLocation = true }: Scope3WeitereIndirekteEmissionenDialogProps) {
  const [fields, setFields] = useState<Partial<Scope3WeitereIndirekteEmissionen['fields']>>({});
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
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
      const clean = cleanFieldsForApi({ ...fields }, 'scope_3_weitere_indirekte_emissionen');
      await onSubmit(clean as Scope3WeitereIndirekteEmissionen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
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
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
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
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const blob = dataUriToBlob(uri);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, s3_nachweis: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
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
    if (f) handlePhotoScan(f);
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
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Scope 3 – Weitere indirekte Emissionen bearbeiten' : 'Scope 3 – Weitere indirekte Emissionen hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s3_einheit">Organisationseinheit</Label>
            <Select
              value={extractRecordId(fields.s3_einheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_einheit: v === 'none' ? undefined : createRecordUrl(APP_IDS.KONZERNSTRUKTUR, v) }))}
            >
              <SelectTrigger id="s3_einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {konzernstrukturList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.einheit_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_berichtsjahr">Berichtsjahr</Label>
            <Select
              value={extractRecordId(fields.s3_berichtsjahr) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_berichtsjahr: v === 'none' ? undefined : createRecordUrl(APP_IDS.BERICHTSJAHR, v) }))}
            >
              <SelectTrigger id="s3_berichtsjahr"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {berichtsjahrList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.anmerkungen_jahr ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_kategorie">Scope-3-Kategorie</Label>
            <Select
              value={lookupKey(fields.s3_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="s3_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="s3_aktivitaet">Aktivitätsbeschreibung</Label>
            <Textarea
              id="s3_aktivitaet"
              value={fields.s3_aktivitaet ?? ''}
              onChange={e => setFields(f => ({ ...f, s3_aktivitaet: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_berechnungsmethode">Berechnungsmethode</Label>
            <Select
              value={lookupKey(fields.s3_berechnungsmethode) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_berechnungsmethode: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="s3_berechnungsmethode"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ausgabenbasiert">Ausgabenbasiert</SelectItem>
                <SelectItem value="aktivitaetsbasiert">Aktivitätsbasiert</SelectItem>
                <SelectItem value="hybrid">Hybridmethode</SelectItem>
                <SelectItem value="lieferantenspezifisch">Lieferantenspezifisch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_aktivitaetsmenge">Aktivitätsmenge</Label>
            <Input
              id="s3_aktivitaetsmenge"
              type="number"
              value={fields.s3_aktivitaetsmenge ?? ''}
              onChange={e => setFields(f => ({ ...f, s3_aktivitaetsmenge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_einheit_aktivitaet">Einheit der Aktivitätsmenge</Label>
            <Select
              value={lookupKey(fields.s3_einheit_aktivitaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_einheit_aktivitaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="s3_einheit_aktivitaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="s3_emissionsfaktor">Emissionsfaktor</Label>
            <Select
              value={extractRecordId(fields.s3_emissionsfaktor) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_emissionsfaktor: v === 'none' ? undefined : createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, v) }))}
            >
              <SelectTrigger id="s3_emissionsfaktor"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {emissionsfaktorenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.ef_bezeichnung ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_co2e_menge">Berechnete CO2e-Menge (Tonnen)</Label>
            <Input
              id="s3_co2e_menge"
              type="number"
              value={fields.s3_co2e_menge ?? ''}
              onChange={e => setFields(f => ({ ...f, s3_co2e_menge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_datenqualitaet">Datenqualität</Label>
            <Select
              value={lookupKey(fields.s3_datenqualitaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, s3_datenqualitaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="s3_datenqualitaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="primaer">Primärdaten</SelectItem>
                <SelectItem value="sekundaer">Sekundärdaten</SelectItem>
                <SelectItem value="schaetzung">Schätzung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_bemerkungen">Bemerkungen</Label>
            <Textarea
              id="s3_bemerkungen"
              value={fields.s3_bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, s3_bemerkungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}