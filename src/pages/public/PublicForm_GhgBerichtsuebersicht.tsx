import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69c124734278d3e6be1ca7c2';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
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

export default function PublicFormGhgBerichtsuebersicht() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
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
          <h1 className="text-2xl font-bold text-foreground">GHG-Berichtsübersicht — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="gb_scope1_gesamt">Gesamtemissionen Scope 1 (Tonnen CO2e)</Label>
            <Input
              id="gb_scope1_gesamt"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_scope1_gesamt ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_scope1_gesamt: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope2_marktbasiert">Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)</Label>
            <Input
              id="gb_scope2_marktbasiert"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_scope2_marktbasiert ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_scope2_marktbasiert: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope2_standortbasiert">Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)</Label>
            <Input
              id="gb_scope2_standortbasiert"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_scope2_standortbasiert ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_scope2_standortbasiert: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_scope3_gesamt">Gesamtemissionen Scope 3 (Tonnen CO2e)</Label>
            <Input
              id="gb_scope3_gesamt"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_scope3_gesamt ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_scope3_gesamt: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_gesamt_co2e">Gesamtemissionen (Tonnen CO2e, alle Scopes)</Label>
            <Input
              id="gb_gesamt_co2e"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_gesamt_co2e ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_gesamt_co2e: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_intensitaet_umsatz">Intensitätskennzahl: CO2e pro Mio. EUR Umsatz</Label>
            <Input
              id="gb_intensitaet_umsatz"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_intensitaet_umsatz ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_intensitaet_umsatz: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_intensitaet_mitarbeiter">Intensitätskennzahl: CO2e pro Mitarbeitenden</Label>
            <Input
              id="gb_intensitaet_mitarbeiter"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_intensitaet_mitarbeiter ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_intensitaet_mitarbeiter: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_basisjahr_vergleich">Veränderung zum Basisjahr (%)</Label>
            <Input
              id="gb_basisjahr_vergleich"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gb_basisjahr_vergleich ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gb_basisjahr_vergleich: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_verifizierungsstatus">Verifizierungsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.gb_verifizierungsstatus) === 'ungeprueft'}
                onClick={() => setFields(f => ({ ...f, gb_verifizierungsstatus: (lookupKey(f.gb_verifizierungsstatus) === 'ungeprueft' ? undefined : 'ungeprueft') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.gb_verifizierungsstatus) === 'ungeprueft'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ungeprüft
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.gb_verifizierungsstatus) === 'intern'}
                onClick={() => setFields(f => ({ ...f, gb_verifizierungsstatus: (lookupKey(f.gb_verifizierungsstatus) === 'intern' ? undefined : 'intern') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.gb_verifizierungsstatus) === 'intern'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Intern geprüft
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.gb_verifizierungsstatus) === 'extern'}
                onClick={() => setFields(f => ({ ...f, gb_verifizierungsstatus: (lookupKey(f.gb_verifizierungsstatus) === 'extern' ? undefined : 'extern') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.gb_verifizierungsstatus) === 'extern'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Extern verifiziert
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefer_vorname">Vorname des Prüfers</Label>
            <Input
              id="gb_pruefer_vorname"
              placeholder=""
              value={fields.gb_pruefer_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_pruefer_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefer_nachname">Nachname des Prüfers</Label>
            <Input
              id="gb_pruefer_nachname"
              placeholder=""
              value={fields.gb_pruefer_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_pruefer_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_pruefdatum">Prüfdatum</Label>
            <DatePicker
              id="gb_pruefdatum"
              placeholder=""
              mode="date"
              value={fields.gb_pruefdatum ?? null}
              onChange={v => setFields(f => ({ ...f, gb_pruefdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gb_kommentare">Kommentare / Erläuterungen</Label>
            <Textarea
              id="gb_kommentare"
              placeholder=""
              value={fields.gb_kommentare ?? ''}
              onChange={e => setFields(f => ({ ...f, gb_kommentare: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

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
