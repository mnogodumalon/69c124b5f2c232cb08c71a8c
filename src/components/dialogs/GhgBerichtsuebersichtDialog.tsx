import { useState, useEffect, useRef, useCallback } from 'react';
import type { GhgBerichtsuebersicht, Berichtsjahr, Konzernstruktur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
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
import { IconArrowBigDownLinesFilled, IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface GhgBerichtsuebersichtDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: GhgBerichtsuebersicht['fields']) => Promise<void>;
  defaultValues?: GhgBerichtsuebersicht['fields'];
  berichtsjahrList: Berichtsjahr[];
  konzernstrukturList: Konzernstruktur[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function GhgBerichtsuebersichtDialog({ open, onClose, onSubmit, defaultValues, berichtsjahrList, konzernstrukturList, enablePhotoScan = true, enablePhotoLocation = true }: GhgBerichtsuebersichtDialogProps) {
  const [fields, setFields] = useState<Partial<GhgBerichtsuebersicht['fields']>>({});
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
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
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
      const clean = cleanFieldsForApi({ ...fields }, 'ghg_berichtsuebersicht');
      await onSubmit(clean as GhgBerichtsuebersicht['fields']);
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
      contextParts.push(`<available-records field="gb_berichtsjahr" entity="Berichtsjahr">\n${JSON.stringify(berichtsjahrList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="gb_konzerneinheit" entity="Konzernstruktur">\n${JSON.stringify(konzernstrukturList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "gb_berichtsjahr": string | null, // Display name from Berichtsjahr (see <available-records>)\n  "gb_konzerneinheit": string | null, // Display name from Konzernstruktur (see <available-records>)\n  "gb_scope1_gesamt": number | null, // Gesamtemissionen Scope 1 (Tonnen CO2e)\n  "gb_scope2_marktbasiert": number | null, // Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)\n  "gb_scope2_standortbasiert": number | null, // Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)\n  "gb_scope3_gesamt": number | null, // Gesamtemissionen Scope 3 (Tonnen CO2e)\n  "gb_gesamt_co2e": number | null, // Gesamtemissionen (Tonnen CO2e, alle Scopes)\n  "gb_intensitaet_umsatz": number | null, // Intensitätskennzahl: CO2e pro Mio. EUR Umsatz\n  "gb_intensitaet_mitarbeiter": number | null, // Intensitätskennzahl: CO2e pro Mitarbeitenden\n  "gb_basisjahr_vergleich": number | null, // Veränderung zum Basisjahr (%)\n  "gb_verifizierungsstatus": LookupValue | null, // Verifizierungsstatus (select one key: "ungeprueft" | "intern" | "extern") mapping: ungeprueft=Ungeprüft, intern=Intern geprüft, extern=Extern verifiziert\n  "gb_pruefer_vorname": string | null, // Vorname des Prüfers\n  "gb_pruefer_nachname": string | null, // Nachname des Prüfers\n  "gb_pruefdatum": string | null, // YYYY-MM-DD\n  "gb_kommentare": string | null, // Kommentare / Erläuterungen\n}`;
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
        const applookupKeys = new Set<string>(["gb_berichtsjahr", "gb_konzerneinheit"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const gb_berichtsjahrName = raw['gb_berichtsjahr'] as string | null;
        if (gb_berichtsjahrName) {
          const gb_berichtsjahrMatch = berichtsjahrList.find(r => matchName(gb_berichtsjahrName!, [String(r.fields.anmerkungen_jahr ?? '')]));
          if (gb_berichtsjahrMatch) merged['gb_berichtsjahr'] = createRecordUrl(APP_IDS.BERICHTSJAHR, gb_berichtsjahrMatch.record_id);
        }
        const gb_konzerneinheitName = raw['gb_konzerneinheit'] as string | null;
        if (gb_konzerneinheitName) {
          const gb_konzerneinheitMatch = konzernstrukturList.find(r => matchName(gb_konzerneinheitName!, [String(r.fields.einheit_name ?? '')]));
          if (gb_konzerneinheitMatch) merged['gb_konzerneinheit'] = createRecordUrl(APP_IDS.KONZERNSTRUKTUR, gb_konzerneinheitMatch.record_id);
        }
        return merged as Partial<GhgBerichtsuebersicht['fields']>;
      });
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

  const DIALOG_INTENT = defaultValues ? 'GHG-Berichtsübersicht bearbeiten' : 'GHG-Berichtsübersicht hinzufügen';

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
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
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
            <div className="flex justify-center pt-1">
              <IconArrowBigDownLinesFilled className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gb_berichtsjahr">Berichtsjahr</Label>
            <Select
              value={extractRecordId(fields.gb_berichtsjahr) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, gb_berichtsjahr: v === 'none' ? undefined : createRecordUrl(APP_IDS.BERICHTSJAHR, v) }))}
            >
              <SelectTrigger id="gb_berichtsjahr"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="gb_konzerneinheit">Konzerneinheit</Label>
            <Select
              value={extractRecordId(fields.gb_konzerneinheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, gb_konzerneinheit: v === 'none' ? undefined : createRecordUrl(APP_IDS.KONZERNSTRUKTUR, v) }))}
            >
              <SelectTrigger id="gb_konzerneinheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="gb_scope1_gesamt">Gesamtemissionen Scope 1 (Tonnen CO2e)</Label>
            <Input
              id="gb_scope1_gesamt"
              type="number"
              value={fields.gb_scope1_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_scope1_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope2_marktbasiert">Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)</Label>
            <Input
              id="gb_scope2_marktbasiert"
              type="number"
              value={fields.gb_scope2_marktbasiert ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_scope2_marktbasiert: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope2_standortbasiert">Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)</Label>
            <Input
              id="gb_scope2_standortbasiert"
              type="number"
              value={fields.gb_scope2_standortbasiert ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_scope2_standortbasiert: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope3_gesamt">Gesamtemissionen Scope 3 (Tonnen CO2e)</Label>
            <Input
              id="gb_scope3_gesamt"
              type="number"
              value={fields.gb_scope3_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_scope3_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_gesamt_co2e">Gesamtemissionen (Tonnen CO2e, alle Scopes)</Label>
            <Input
              id="gb_gesamt_co2e"
              type="number"
              value={fields.gb_gesamt_co2e ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_gesamt_co2e: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_intensitaet_umsatz">Intensitätskennzahl: CO2e pro Mio. EUR Umsatz</Label>
            <Input
              id="gb_intensitaet_umsatz"
              type="number"
              value={fields.gb_intensitaet_umsatz ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_intensitaet_umsatz: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_intensitaet_mitarbeiter">Intensitätskennzahl: CO2e pro Mitarbeitenden</Label>
            <Input
              id="gb_intensitaet_mitarbeiter"
              type="number"
              value={fields.gb_intensitaet_mitarbeiter ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_intensitaet_mitarbeiter: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_basisjahr_vergleich">Veränderung zum Basisjahr (%)</Label>
            <Input
              id="gb_basisjahr_vergleich"
              type="number"
              value={fields.gb_basisjahr_vergleich ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_basisjahr_vergleich: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_verifizierungsstatus">Verifizierungsstatus</Label>
            <Select
              value={lookupKey(fields.gb_verifizierungsstatus) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, gb_verifizierungsstatus: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="gb_verifizierungsstatus"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="ungeprueft">Ungeprüft</SelectItem>
                <SelectItem value="intern">Intern geprüft</SelectItem>
                <SelectItem value="extern">Extern verifiziert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefer_vorname">Vorname des Prüfers</Label>
            <Input
              id="gb_pruefer_vorname"
              value={fields.gb_pruefer_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_pruefer_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefer_nachname">Nachname des Prüfers</Label>
            <Input
              id="gb_pruefer_nachname"
              value={fields.gb_pruefer_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_pruefer_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefdatum">Prüfdatum</Label>
            <Input
              id="gb_pruefdatum"
              type="date"
              value={fields.gb_pruefdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_pruefdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_kommentare">Kommentare / Erläuterungen</Label>
            <Textarea
              id="gb_kommentare"
              value={fields.gb_kommentare ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_kommentare: e.target.value }))}
              rows={3}
            />
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