import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

const KLAR_BASE = 'http://localhost:8000/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69c124b5f2c232cb08c71a8c/69c1246ebeed0889fed560e2/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormEmissionsfaktoren() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Emissionsfaktoren — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
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

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
