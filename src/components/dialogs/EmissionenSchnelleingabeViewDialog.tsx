import type { EmissionenSchnelleingabe, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface EmissionenSchnelleingabeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: EmissionenSchnelleingabe | null;
  onEdit: (record: EmissionenSchnelleingabe) => void;
  konzernstrukturList: Konzernstruktur[];
  berichtsjahrList: Berichtsjahr[];
  emissionsfaktorenList: Emissionsfaktoren[];
}

export function EmissionenSchnelleingabeViewDialog({ open, onClose, record, onEdit, konzernstrukturList, berichtsjahrList, emissionsfaktorenList }: EmissionenSchnelleingabeViewDialogProps) {
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
          <DialogTitle>Emissionen Schnelleingabe anzeigen</DialogTitle>
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
            <p className="text-sm">{getKonzernstrukturDisplayName(record.fields.se_einheit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{getBerichtsjahrDisplayName(record.fields.se_berichtsjahr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scope</Label>
            <Badge variant="secondary">{record.fields.se_scope?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unterkategorie / Scope-3-Kategorie</Label>
            <Badge variant="secondary">{record.fields.se_unterkategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktivitätsbeschreibung</Label>
            <p className="text-sm">{record.fields.se_aktivitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissionsfaktor</Label>
            <p className="text-sm">{getEmissionsfaktorenDisplayName(record.fields.se_emissionsfaktor)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktivitätsmenge / Verbrauchsmenge</Label>
            <p className="text-sm">{record.fields.se_aktivitaetsmenge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit</Label>
            <Badge variant="secondary">{record.fields.se_einheit_menge?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berechnete CO2e-Menge (Tonnen)</Label>
            <p className="text-sm">{record.fields.se_co2e_menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datenqualität</Label>
            <Badge variant="secondary">{record.fields.se_datenqualitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.se_bemerkungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachweis / Beleg (Datei-Upload)</Label>
            {record.fields.se_nachweis ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.se_nachweis} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}