import { useState, useEffect, useRef, useCallback } from 'react';
import type { EmissionenSchnelleingabe, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
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

interface EmissionenSchnelleingabeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: EmissionenSchnelleingabe['fields']) => Promise<void>;
  defaultValues?: EmissionenSchnelleingabe['fields'];
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function EmissionenSchnelleingabeDialog({ open, onClose, onSubmit, defaultValues, konzernstrukturList, berichtsjahrList, emissionsfaktorenList, enablePhotoScan = true, enablePhotoLocation = true }: EmissionenSchnelleingabeDialogProps) {
  const [fields, setFields] = useState<Partial<EmissionenSchnelleingabe['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'emissionen_schnelleingabe');
      await onSubmit(clean as EmissionenSchnelleingabe['fields']);
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
      contextParts.push(`<available-records field="se_einheit" entity="Konzernstruktur">\n${JSON.stringify(konzernstrukturList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="se_berichtsjahr" entity="Berichtsjahr">\n${JSON.stringify(berichtsjahrList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="se_emissionsfaktor" entity="Emissionsfaktoren">\n${JSON.stringify(emissionsfaktorenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "se_einheit": string | null, // Display name from Konzernstruktur (see <available-records>)\n  "se_berichtsjahr": string | null, // Display name from Berichtsjahr (see <available-records>)\n  "se_scope": LookupValue | null, // Scope (select one key: "scope1" | "scope2" | "scope3") mapping: scope1=Scope 1 – Direkte Emissionen, scope2=Scope 2 – Indirekte Energieemissionen, scope3=Scope 3 – Weitere indirekte Emissionen\n  "se_unterkategorie": LookupValue | null, // Unterkategorie / Scope-3-Kategorie (select one key: "s1_stationaer" | "s1_mobil" | "s1_prozess" | "s1_fluechtig" | "s2_strom" | "s2_waerme" | "s2_kaelte" | "s2_dampf" | "s3_kat1" | "s3_kat2" | "s3_kat3" | "s3_kat4" | "s3_kat5" | "s3_kat6" | "s3_kat7" | "s3_kat8" | "s3_kat9" | "s3_kat10" | "s3_kat11" | "s3_kat12" | "s3_kat13" | "s3_kat14" | "s3_kat15") mapping: s1_stationaer=Stationäre Verbrennung (Scope 1), s1_mobil=Mobile Verbrennung (Scope 1), s1_prozess=Prozessemissionen (Scope 1), s1_fluechtig=Flüchtige Emissionen (Scope 1), s2_strom=Strom (Scope 2), s2_waerme=Fernwärme (Scope 2), s2_kaelte=Fernkälte (Scope 2), s2_dampf=Dampf (Scope 2), s3_kat1=Kat. 1: Eingekaufte Waren und Dienstleistungen (Scope 3), s3_kat2=Kat. 2: Investitionsgüter (Scope 3), s3_kat3=Kat. 3: Brennstoff- und energiebezogene Aktivitäten (Scope 3), s3_kat4=Kat. 4: Vorgelagerter Transport (Scope 3), s3_kat5=Kat. 5: Abfälle (Scope 3), s3_kat6=Kat. 6: Geschäftsreisen (Scope 3), s3_kat7=Kat. 7: Pendlerverkehr (Scope 3), s3_kat8=Kat. 8: Vorgelagerte gemietete Anlagen (Scope 3), s3_kat9=Kat. 9: Nachgelagerter Transport (Scope 3), s3_kat10=Kat. 10: Verarbeitung verkaufter Produkte (Scope 3), s3_kat11=Kat. 11: Nutzung verkaufter Produkte (Scope 3), s3_kat12=Kat. 12: Entsorgung verkaufter Produkte (Scope 3), s3_kat13=Kat. 13: Nachgelagerte gemietete Anlagen (Scope 3), s3_kat14=Kat. 14: Franchises (Scope 3), s3_kat15=Kat. 15: Investitionen (Scope 3)\n  "se_aktivitaet": string | null, // Aktivitätsbeschreibung\n  "se_emissionsfaktor": string | null, // Display name from Emissionsfaktoren (see <available-records>)\n  "se_aktivitaetsmenge": number | null, // Aktivitätsmenge / Verbrauchsmenge\n  "se_einheit_menge": LookupValue | null, // Einheit (select one key: "kwh" | "mwh" | "gj" | "liter" | "kg" | "tonne" | "m3" | "tkm" | "pkm" | "eur" | "sonstige") mapping: kwh=kWh, mwh=MWh, gj=GJ, liter=Liter, kg=kg, tonne=Tonne, m3=m³, tkm=tkm, pkm=Personenkilometer, eur=EUR, sonstige=Sonstige\n  "se_co2e_menge": number | null, // Berechnete CO2e-Menge (Tonnen)\n  "se_datenqualitaet": LookupValue | null, // Datenqualität (select one key: "primaer" | "sekundaer" | "schaetzung") mapping: primaer=Primärdaten (gemessen), sekundaer=Sekundärdaten (berechnet), schaetzung=Schätzung\n  "se_bemerkungen": string | null, // Bemerkungen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["se_einheit", "se_berichtsjahr", "se_emissionsfaktor"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const se_einheitName = raw['se_einheit'] as string | null;
        if (se_einheitName) {
          const se_einheitMatch = konzernstrukturList.find(r => matchName(se_einheitName!, [String(r.fields.einheit_name ?? '')]));
          if (se_einheitMatch) merged['se_einheit'] = createRecordUrl(APP_IDS.KONZERNSTRUKTUR, se_einheitMatch.record_id);
        }
        const se_berichtsjahrName = raw['se_berichtsjahr'] as string | null;
        if (se_berichtsjahrName) {
          const se_berichtsjahrMatch = berichtsjahrList.find(r => matchName(se_berichtsjahrName!, [String(r.fields.anmerkungen_jahr ?? '')]));
          if (se_berichtsjahrMatch) merged['se_berichtsjahr'] = createRecordUrl(APP_IDS.BERICHTSJAHR, se_berichtsjahrMatch.record_id);
        }
        const se_emissionsfaktorName = raw['se_emissionsfaktor'] as string | null;
        if (se_emissionsfaktorName) {
          const se_emissionsfaktorMatch = emissionsfaktorenList.find(r => matchName(se_emissionsfaktorName!, [String(r.fields.ef_bezeichnung ?? '')]));
          if (se_emissionsfaktorMatch) merged['se_emissionsfaktor'] = createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, se_emissionsfaktorMatch.record_id);
        }
        return merged as Partial<EmissionenSchnelleingabe['fields']>;
      });
      // Upload scanned file to file fields
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const blob = dataUriToBlob(uri);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, se_nachweis: fileUrl }));
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

  const DIALOG_INTENT = defaultValues ? 'Emissionen Schnelleingabe bearbeiten' : 'Emissionen Schnelleingabe hinzufügen';

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
            <Label htmlFor="se_einheit">Organisationseinheit</Label>
            <Select
              value={extractRecordId(fields.se_einheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_einheit: v === 'none' ? undefined : createRecordUrl(APP_IDS.KONZERNSTRUKTUR, v) }))}
            >
              <SelectTrigger id="se_einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="se_berichtsjahr">Berichtsjahr</Label>
            <Select
              value={extractRecordId(fields.se_berichtsjahr) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_berichtsjahr: v === 'none' ? undefined : createRecordUrl(APP_IDS.BERICHTSJAHR, v) }))}
            >
              <SelectTrigger id="se_berichtsjahr"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="se_scope">Scope</Label>
            <Select
              value={lookupKey(fields.se_scope) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_scope: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="se_scope"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="scope1">Scope 1 – Direkte Emissionen</SelectItem>
                <SelectItem value="scope2">Scope 2 – Indirekte Energieemissionen</SelectItem>
                <SelectItem value="scope3">Scope 3 – Weitere indirekte Emissionen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_unterkategorie">Unterkategorie / Scope-3-Kategorie</Label>
            <Select
              value={lookupKey(fields.se_unterkategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_unterkategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="se_unterkategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="s1_stationaer">Stationäre Verbrennung (Scope 1)</SelectItem>
                <SelectItem value="s1_mobil">Mobile Verbrennung (Scope 1)</SelectItem>
                <SelectItem value="s1_prozess">Prozessemissionen (Scope 1)</SelectItem>
                <SelectItem value="s1_fluechtig">Flüchtige Emissionen (Scope 1)</SelectItem>
                <SelectItem value="s2_strom">Strom (Scope 2)</SelectItem>
                <SelectItem value="s2_waerme">Fernwärme (Scope 2)</SelectItem>
                <SelectItem value="s2_kaelte">Fernkälte (Scope 2)</SelectItem>
                <SelectItem value="s2_dampf">Dampf (Scope 2)</SelectItem>
                <SelectItem value="s3_kat1">Kat. 1: Eingekaufte Waren und Dienstleistungen (Scope 3)</SelectItem>
                <SelectItem value="s3_kat2">Kat. 2: Investitionsgüter (Scope 3)</SelectItem>
                <SelectItem value="s3_kat3">Kat. 3: Brennstoff- und energiebezogene Aktivitäten (Scope 3)</SelectItem>
                <SelectItem value="s3_kat4">Kat. 4: Vorgelagerter Transport (Scope 3)</SelectItem>
                <SelectItem value="s3_kat5">Kat. 5: Abfälle (Scope 3)</SelectItem>
                <SelectItem value="s3_kat6">Kat. 6: Geschäftsreisen (Scope 3)</SelectItem>
                <SelectItem value="s3_kat7">Kat. 7: Pendlerverkehr (Scope 3)</SelectItem>
                <SelectItem value="s3_kat8">Kat. 8: Vorgelagerte gemietete Anlagen (Scope 3)</SelectItem>
                <SelectItem value="s3_kat9">Kat. 9: Nachgelagerter Transport (Scope 3)</SelectItem>
                <SelectItem value="s3_kat10">Kat. 10: Verarbeitung verkaufter Produkte (Scope 3)</SelectItem>
                <SelectItem value="s3_kat11">Kat. 11: Nutzung verkaufter Produkte (Scope 3)</SelectItem>
                <SelectItem value="s3_kat12">Kat. 12: Entsorgung verkaufter Produkte (Scope 3)</SelectItem>
                <SelectItem value="s3_kat13">Kat. 13: Nachgelagerte gemietete Anlagen (Scope 3)</SelectItem>
                <SelectItem value="s3_kat14">Kat. 14: Franchises (Scope 3)</SelectItem>
                <SelectItem value="s3_kat15">Kat. 15: Investitionen (Scope 3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_aktivitaet">Aktivitätsbeschreibung</Label>
            <Input
              id="se_aktivitaet"
              value={fields.se_aktivitaet ?? ''}
              onChange={e => setFields(f => ({ ...f, se_aktivitaet: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_emissionsfaktor">Emissionsfaktor</Label>
            <Select
              value={extractRecordId(fields.se_emissionsfaktor) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_emissionsfaktor: v === 'none' ? undefined : createRecordUrl(APP_IDS.EMISSIONSFAKTOREN, v) }))}
            >
              <SelectTrigger id="se_emissionsfaktor"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="se_aktivitaetsmenge">Aktivitätsmenge / Verbrauchsmenge</Label>
            <Input
              id="se_aktivitaetsmenge"
              type="number"
              value={fields.se_aktivitaetsmenge ?? ''}
              onChange={e => setFields(f => ({ ...f, se_aktivitaetsmenge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_einheit_menge">Einheit</Label>
            <Select
              value={lookupKey(fields.se_einheit_menge) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_einheit_menge: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="se_einheit_menge"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kwh">kWh</SelectItem>
                <SelectItem value="mwh">MWh</SelectItem>
                <SelectItem value="gj">GJ</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="tonne">Tonne</SelectItem>
                <SelectItem value="m3">m³</SelectItem>
                <SelectItem value="tkm">tkm</SelectItem>
                <SelectItem value="pkm">Personenkilometer</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_co2e_menge">Berechnete CO2e-Menge (Tonnen)</Label>
            <Input
              id="se_co2e_menge"
              type="number"
              value={fields.se_co2e_menge ?? ''}
              onChange={e => setFields(f => ({ ...f, se_co2e_menge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_datenqualitaet">Datenqualität</Label>
            <Select
              value={lookupKey(fields.se_datenqualitaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, se_datenqualitaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="se_datenqualitaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="primaer">Primärdaten (gemessen)</SelectItem>
                <SelectItem value="sekundaer">Sekundärdaten (berechnet)</SelectItem>
                <SelectItem value="schaetzung">Schätzung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_bemerkungen">Bemerkungen</Label>
            <Textarea
              id="se_bemerkungen"
              value={fields.se_bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, se_bemerkungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="se_nachweis">Nachweis / Beleg (Datei-Upload)</Label>
            {fields.se_nachweis ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.se_nachweis}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.se_nachweis.split("/").pop()}</p>
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
                            setFields(f => ({ ...f, se_nachweis: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, se_nachweis: undefined }))}
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
                      setFields(f => ({ ...f, se_nachweis: fileUrl }));
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