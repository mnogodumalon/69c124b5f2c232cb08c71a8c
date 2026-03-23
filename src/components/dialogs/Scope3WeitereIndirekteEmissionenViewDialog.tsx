import type { Scope3WeitereIndirekteEmissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface Scope3WeitereIndirekteEmissionenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Scope3WeitereIndirekteEmissionen | null;
  onEdit: (record: Scope3WeitereIndirekteEmissionen) => void;
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
}

export function Scope3WeitereIndirekteEmissionenViewDialog({ open, onClose, record, onEdit, konzernstrukturList, berichtsjahrList, emissionsfaktorenList }: Scope3WeitereIndirekteEmissionenViewDialogProps) {
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
          <DialogTitle>Scope 3 – Weitere indirekte Emissionen anzeigen</DialogTitle>
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
            <p className="text-sm">{getKonzernstrukturDisplayName(record.fields.s3_einheit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{getBerichtsjahrDisplayName(record.fields.s3_berichtsjahr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scope-3-Kategorie</Label>
            <Badge variant="secondary">{record.fields.s3_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktivitätsbeschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.s3_aktivitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berechnungsmethode</Label>
            <Badge variant="secondary">{record.fields.s3_berechnungsmethode?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktivitätsmenge</Label>
            <p className="text-sm">{record.fields.s3_aktivitaetsmenge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit der Aktivitätsmenge</Label>
            <Badge variant="secondary">{record.fields.s3_einheit_aktivitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissionsfaktor</Label>
            <p className="text-sm">{getEmissionsfaktorenDisplayName(record.fields.s3_emissionsfaktor)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berechnete CO2e-Menge (Tonnen)</Label>
            <p className="text-sm">{record.fields.s3_co2e_menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datenqualität</Label>
            <Badge variant="secondary">{record.fields.s3_datenqualitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.s3_bemerkungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachweis / Beleg (Datei-Upload)</Label>
            {record.fields.s3_nachweis ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.s3_nachweis} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}