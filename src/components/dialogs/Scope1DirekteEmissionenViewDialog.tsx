import type { Scope1DirekteEmissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface Scope1DirekteEmissionenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Scope1DirekteEmissionen | null;
  onEdit: (record: Scope1DirekteEmissionen) => void;
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
}

export function Scope1DirekteEmissionenViewDialog({ open, onClose, record, onEdit, konzernstrukturList, berichtsjahrList, emissionsfaktorenList }: Scope1DirekteEmissionenViewDialogProps) {
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
          <DialogTitle>Scope 1 – Direkte Emissionen anzeigen</DialogTitle>
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
            <p className="text-sm">{getKonzernstrukturDisplayName(record.fields.s1_einheit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{getBerichtsjahrDisplayName(record.fields.s1_berichtsjahr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unterkategorie</Label>
            <Badge variant="secondary">{record.fields.s1_unterkategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissionsfaktor / Energieträger</Label>
            <p className="text-sm">{getEmissionsfaktorenDisplayName(record.fields.s1_emissionsfaktor)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbrauchsmenge</Label>
            <p className="text-sm">{record.fields.s1_verbrauchsmenge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit der Verbrauchsmenge</Label>
            <Badge variant="secondary">{record.fields.s1_einheit_verbrauch?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berechnete CO2e-Menge (Tonnen)</Label>
            <p className="text-sm">{record.fields.s1_co2e_menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datenqualität</Label>
            <Badge variant="secondary">{record.fields.s1_datenqualitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.s1_bemerkungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachweis / Beleg (Datei-Upload)</Label>
            {record.fields.s1_nachweis ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.s1_nachweis} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}