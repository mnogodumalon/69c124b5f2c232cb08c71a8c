import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69c12471ef7da5f0b841a1a3';
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

export default function PublicFormScope3WeitereIndirekteEmissionen() {
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
          <h1 className="text-2xl font-bold text-foreground">Scope 3 – Weitere indirekte Emissionen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
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
