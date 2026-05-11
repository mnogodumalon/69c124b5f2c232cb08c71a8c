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
const APP_ID = '69c124661ddc6ec52a6c2836';
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

export default function PublicFormKonzernstruktur() {
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
          <h1 className="text-2xl font-bold text-foreground">Konzernstruktur — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="einheit_name">Name der Einheit</Label>
            <Input
              id="einheit_name"
              value={fields.einheit_name ?? ''}
              onChange={e => setFields(f => ({ ...f, einheit_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="einheit_typ">Typ der Einheit</Label>
            <Select
              value={lookupKey(fields.einheit_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, einheit_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="einheit_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="konzern">Konzern</SelectItem>
                <SelectItem value="tochtergesellschaft">Tochtergesellschaft</SelectItem>
                <SelectItem value="abteilung">Abteilung</SelectItem>
                <SelectItem value="werk">Werk</SelectItem>
                <SelectItem value="niederlassung">Niederlassung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uebergeordnete_einheit">Übergeordnete Einheit (Name)</Label>
            <Input
              id="uebergeordnete_einheit"
              value={fields.uebergeordnete_einheit ?? ''}
              onChange={e => setFields(f => ({ ...f, uebergeordnete_einheit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="land">Land</Label>
            <Input
              id="land"
              value={fields.land ?? ''}
              onChange={e => setFields(f => ({ ...f, land: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branche">Branche</Label>
            <Select
              value={lookupKey(fields.branche) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, branche: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="branche"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="industrie">Industrie & Fertigung</SelectItem>
                <SelectItem value="energie">Energie & Versorgung</SelectItem>
                <SelectItem value="handel">Handel & Logistik</SelectItem>
                <SelectItem value="dienstleistungen">Dienstleistungen</SelectItem>
                <SelectItem value="bauwesen">Bauwesen</SelectItem>
                <SelectItem value="landwirtschaft">Landwirtschaft</SelectItem>
                <SelectItem value="it">IT & Technologie</SelectItem>
                <SelectItem value="gesundheit">Gesundheitswesen</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="konsolidierungsmethode">Konsolidierungsmethode</Label>
            <Select
              value={lookupKey(fields.konsolidierungsmethode) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, konsolidierungsmethode: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="konsolidierungsmethode"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="operationale_kontrolle">Operationale Kontrolle</SelectItem>
                <SelectItem value="finanzielle_kontrolle">Finanzielle Kontrolle</SelectItem>
                <SelectItem value="equity_anteil">Equity-Anteil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortlich_vorname">Vorname der verantwortlichen Person</Label>
            <Input
              id="verantwortlich_vorname"
              value={fields.verantwortlich_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortlich_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortlich_nachname">Nachname der verantwortlichen Person</Label>
            <Input
              id="verantwortlich_nachname"
              value={fields.verantwortlich_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortlich_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verantwortlich_email">E-Mail der verantwortlichen Person</Label>
            <Input
              id="verantwortlich_email"
              type="email"
              value={fields.verantwortlich_email ?? ''}
              onChange={e => setFields(f => ({ ...f, verantwortlich_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anmerkungen_einheit">Anmerkungen</Label>
            <Textarea
              id="anmerkungen_einheit"
              value={fields.anmerkungen_einheit ?? ''}
              onChange={e => setFields(f => ({ ...f, anmerkungen_einheit: e.target.value }))}
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
