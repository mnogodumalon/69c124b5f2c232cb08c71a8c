import type { Emissionsfaktoren } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface EmissionsfaktorenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Emissionsfaktoren | null;
  onEdit: (record: Emissionsfaktoren) => void;
}

export function EmissionsfaktorenViewDialog({ open, onClose, record, onEdit }: EmissionsfaktorenViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emissionsfaktoren anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezeichnung</Label>
            <p className="text-sm">{record.fields.ef_bezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scope-Zuordnung</Label>
            <Badge variant="secondary">{record.fields.ef_scope?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.ef_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Energieträger / Aktivität</Label>
            <p className="text-sm">{record.fields.ef_energietraeger ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit</Label>
            <Badge variant="secondary">{record.fields.ef_einheit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Emissionsfaktor (kg CO2e pro Einheit)</Label>
            <p className="text-sm">{record.fields.ef_faktor ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Treibhausgase</Label>
            <p className="text-sm">{Array.isArray(record.fields.ef_treibhausgas) ? record.fields.ef_treibhausgas.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Quelle / Referenz</Label>
            <p className="text-sm">{record.fields.ef_quelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gültigkeitsjahr</Label>
            <p className="text-sm">{record.fields.ef_gueltigkeitsjahr ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}