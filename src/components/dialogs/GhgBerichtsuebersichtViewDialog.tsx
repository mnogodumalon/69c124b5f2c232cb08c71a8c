import type { GhgBerichtsuebersicht, Berichtsjahr, Konzernstruktur } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface GhgBerichtsuebersichtViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: GhgBerichtsuebersicht | null;
  onEdit: (record: GhgBerichtsuebersicht) => void;
  berichtsjahrList: Berichtsjahr[];
  konzernstrukturList: Konzernstruktur[];
}

export function GhgBerichtsuebersichtViewDialog({ open, onClose, record, onEdit, berichtsjahrList, konzernstrukturList }: GhgBerichtsuebersichtViewDialogProps) {
  function getBerichtsjahrDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return berichtsjahrList.find(r => r.record_id === id)?.fields.anmerkungen_jahr ?? '—';
  }

  function getKonzernstrukturDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return konzernstrukturList.find(r => r.record_id === id)?.fields.einheit_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>GHG-Berichtsübersicht anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{getBerichtsjahrDisplayName(record.fields.gb_berichtsjahr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Konzerneinheit</Label>
            <p className="text-sm">{getKonzernstrukturDisplayName(record.fields.gb_konzerneinheit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtemissionen Scope 1 (Tonnen CO2e)</Label>
            <p className="text-sm">{record.fields.gb_scope1_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)</Label>
            <p className="text-sm">{record.fields.gb_scope2_marktbasiert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)</Label>
            <p className="text-sm">{record.fields.gb_scope2_standortbasiert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtemissionen Scope 3 (Tonnen CO2e)</Label>
            <p className="text-sm">{record.fields.gb_scope3_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtemissionen (Tonnen CO2e, alle Scopes)</Label>
            <p className="text-sm">{record.fields.gb_gesamt_co2e ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Intensitätskennzahl: CO2e pro Mio. EUR Umsatz</Label>
            <p className="text-sm">{record.fields.gb_intensitaet_umsatz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Intensitätskennzahl: CO2e pro Mitarbeitenden</Label>
            <p className="text-sm">{record.fields.gb_intensitaet_mitarbeiter ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Veränderung zum Basisjahr (%)</Label>
            <p className="text-sm">{record.fields.gb_basisjahr_vergleich ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verifizierungsstatus</Label>
            <Badge variant="secondary">{record.fields.gb_verifizierungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Prüfers</Label>
            <p className="text-sm">{record.fields.gb_pruefer_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Prüfers</Label>
            <p className="text-sm">{record.fields.gb_pruefer_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prüfdatum</Label>
            <p className="text-sm">{formatDate(record.fields.gb_pruefdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kommentare / Erläuterungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.gb_kommentare ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}