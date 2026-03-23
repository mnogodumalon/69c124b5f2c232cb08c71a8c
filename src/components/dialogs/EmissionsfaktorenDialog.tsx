import { useState, useEffect, useRef, useCallback } from 'react';
import type { Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface EmissionsfaktorenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Emissionsfaktoren['fields']) => Promise<void>;
  defaultValues?: Emissionsfaktoren['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function EmissionsfaktorenDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = false, enablePhotoLocation = true }: EmissionsfaktorenDialogProps) {
  const [fields, setFields] = useState<Partial<Emissionsfaktoren['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'emissionsfaktoren');
      await onSubmit(clean as Emissionsfaktoren['fields']);
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
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "ef_bezeichnung": string | null, // Bezeichnung\n  "ef_scope": LookupValue | null, // Scope-Zuordnung (select one key: "scope1" | "scope2" | "scope3") mapping: scope1=Scope 1, scope2=Scope 2, scope3=Scope 3\n  "ef_kategorie": LookupValue | null, // Kategorie (select one key: "stationaere_verbrennung" | "mobile_verbrennung" | "prozessemissionen" | "fluechtige_emissionen" | "strom" | "waerme" | "kaelte" | "dampf" | "vorgelagert" | "nachgelagert" | "sonstige") mapping: stationaere_verbrennung=Stationäre Verbrennung, mobile_verbrennung=Mobile Verbrennung, prozessemissionen=Prozessemissionen, fluechtige_emissionen=Flüchtige Emissionen, strom=Eingekaufter Strom, waerme=Eingekaufte Wärme, kaelte=Eingekaufte Kälte, dampf=Eingekaufter Dampf, vorgelagert=Vorgelagerte Emissionen, nachgelagert=Nachgelagerte Emissionen, sonstige=Sonstige\n  "ef_energietraeger": string | null, // Energieträger / Aktivität\n  "ef_einheit": LookupValue | null, // Einheit (select one key: "kwh" | "mwh" | "gj" | "liter" | "kg" | "tonne" | "m3" | "tkm" | "pkm" | "eur" | "sonstige") mapping: kwh=kWh, mwh=MWh, gj=GJ, liter=Liter, kg=kg, tonne=Tonne, m3=m³, tkm=tkm, pkm=Personenkilometer, eur=EUR, sonstige=Sonstige\n  "ef_faktor": number | null, // Emissionsfaktor (kg CO2e pro Einheit)\n  "ef_treibhausgas": LookupValue[] | null, // Treibhausgase (select one or more keys: "co2" | "ch4" | "n2o" | "hfc" | "pfc" | "sf6" | "nf3") mapping: co2=CO2, ch4=CH4, n2o=N2O, hfc=HFC, pfc=PFC, sf6=SF6, nf3=NF3\n  "ef_quelle": string | null, // Quelle / Referenz\n  "ef_gueltigkeitsjahr": number | null, // Gültigkeitsjahr\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Emissionsfaktoren['fields']>;
      });
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

  const DIALOG_INTENT = defaultValues ? 'Emissionsfaktoren bearbeiten' : 'Emissionsfaktoren hinzufügen';

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
            <Label htmlFor="ef_bezeichnung">Bezeichnung</Label>
            <Input
              id="ef_bezeichnung"
              value={fields.ef_bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, ef_bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_scope">Scope-Zuordnung</Label>
            <Select
              value={lookupKey(fields.ef_scope) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, ef_scope: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="ef_scope"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="scope1">Scope 1</SelectItem>
                <SelectItem value="scope2">Scope 2</SelectItem>
                <SelectItem value="scope3">Scope 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_kategorie">Kategorie</Label>
            <Select
              value={lookupKey(fields.ef_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, ef_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="ef_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="stationaere_verbrennung">Stationäre Verbrennung</SelectItem>
                <SelectItem value="mobile_verbrennung">Mobile Verbrennung</SelectItem>
                <SelectItem value="prozessemissionen">Prozessemissionen</SelectItem>
                <SelectItem value="fluechtige_emissionen">Flüchtige Emissionen</SelectItem>
                <SelectItem value="strom">Eingekaufter Strom</SelectItem>
                <SelectItem value="waerme">Eingekaufte Wärme</SelectItem>
                <SelectItem value="kaelte">Eingekaufte Kälte</SelectItem>
                <SelectItem value="dampf">Eingekaufter Dampf</SelectItem>
                <SelectItem value="vorgelagert">Vorgelagerte Emissionen</SelectItem>
                <SelectItem value="nachgelagert">Nachgelagerte Emissionen</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_energietraeger">Energieträger / Aktivität</Label>
            <Input
              id="ef_energietraeger"
              value={fields.ef_energietraeger ?? ''}
              onChange={e => setFields(f => ({ ...f, ef_energietraeger: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_einheit">Einheit</Label>
            <Select
              value={lookupKey(fields.ef_einheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, ef_einheit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="ef_einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="ef_faktor">Emissionsfaktor (kg CO2e pro Einheit)</Label>
            <Input
              id="ef_faktor"
              type="number"
              value={fields.ef_faktor ?? ''}
              onChange={e => setFields(f => ({ ...f, ef_faktor: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_treibhausgas">Treibhausgase</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_co2"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('co2')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'co2'] : current.filter(k => k !== 'co2');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_co2" className="font-normal">CO2</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_ch4"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('ch4')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'ch4'] : current.filter(k => k !== 'ch4');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_ch4" className="font-normal">CH4</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_n2o"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('n2o')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'n2o'] : current.filter(k => k !== 'n2o');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_n2o" className="font-normal">N2O</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_hfc"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('hfc')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'hfc'] : current.filter(k => k !== 'hfc');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_hfc" className="font-normal">HFC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_pfc"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('pfc')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'pfc'] : current.filter(k => k !== 'pfc');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_pfc" className="font-normal">PFC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_sf6"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('sf6')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'sf6'] : current.filter(k => k !== 'sf6');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_sf6" className="font-normal">SF6</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ef_treibhausgas_nf3"
                  checked={lookupKeys(fields.ef_treibhausgas).includes('nf3')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ef_treibhausgas);
                      const next = checked ? [...current, 'nf3'] : current.filter(k => k !== 'nf3');
                      return { ...f, ef_treibhausgas: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ef_treibhausgas_nf3" className="font-normal">NF3</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_quelle">Quelle / Referenz</Label>
            <Input
              id="ef_quelle"
              value={fields.ef_quelle ?? ''}
              onChange={e => setFields(f => ({ ...f, ef_quelle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ef_gueltigkeitsjahr">Gültigkeitsjahr</Label>
            <Input
              id="ef_gueltigkeitsjahr"
              type="number"
              value={fields.ef_gueltigkeitsjahr ?? ''}
              onChange={e => setFields(f => ({ ...f, ef_gueltigkeitsjahr: e.target.value ? Number(e.target.value) : undefined }))}
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