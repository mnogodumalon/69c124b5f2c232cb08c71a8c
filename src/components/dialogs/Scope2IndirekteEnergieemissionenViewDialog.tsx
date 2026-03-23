import type { Scope2IndirekteEnergieemissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface Scope2IndirekteEnergieemissionenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Scope2IndirekteEnergieemissionen | null;
  onEdit: (record: Scope2IndirekteEnergieemissionen) => void;
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
}

export function Scope2IndirekteEnergieemissionenViewDialog({ open, onClose, record, onEdit, konzernstrukturList, berichtsjahrList, emissionsfaktorenList }: Scope2IndirekteEnergieemissionenViewDialogProps) {
  function getKonzernstrukturDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return konzernstrukturList.find(r => r.record_id === id)?.fields.einheit_name ?? '—';
  }

  function getBerichtsjahrDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return berichtsjahrList.find(r => r.record_id === id)?.fields.anmerkungen_jahr ?? '—';
  }

  function getEmissionsfaktorenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return emissionsfaktorenList.find(r => r.record_id === id)?.fields.ef_bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scope 2 – Indirekte Energieemissionen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Organisationseinheit</Label>
            <p className="text-sm">{getKonzernstrukturDisplayName(record.fields.s2_einheit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{getBerichtsjahrDisplayName(record.fields.s2_berichtsjahr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Energieart</Label>
            <Badge variant="secondary">{record.fields.s2_energieart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berechnungsmethode</Label>
            <Badge variant="secondary">{record.fields.s2_berechnungsmethode?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbrauchsmenge (kWh)</Label>
            <p className="text-sm">{record.fields.s2_verbrauch_kwh ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissionsfaktor</Label>
            <p className="text-sm">{getEmissionsfaktorenDisplayName(record.fields.s2_emissionsfaktor)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CO2e-Menge marktbasiert (Tonnen)</Label>
            <p className="text-sm">{record.fields.s2_co2e_marktbasiert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CO2e-Menge standortbasiert (Tonnen)</Label>
            <p className="text-sm">{record.fields.s2_co2e_standortbasiert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lieferant / Energieversorger</Label>
            <p className="text-sm">{record.fields.s2_lieferant ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Herkunftsnachweis vorhanden (z. B. Grünstromzertifikat)</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.s2_herkunftsnachweis ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.s2_herkunftsnachweis ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.s2_bemerkungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachweis / Beleg (Datei-Upload)</Label>
            {record.fields.s2_nachweis ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.s2_nachweis} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}