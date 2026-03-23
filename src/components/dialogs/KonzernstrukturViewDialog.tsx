import type { Konzernstruktur } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface KonzernstrukturViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Konzernstruktur | null;
  onEdit: (record: Konzernstruktur) => void;
}

export function KonzernstrukturViewDialog({ open, onClose, record, onEdit }: KonzernstrukturViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konzernstruktur anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Einheit</Label>
            <p className="text-sm">{record.fields.einheit_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ der Einheit</Label>
            <Badge variant="secondary">{record.fields.einheit_typ?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Übergeordnete Einheit (Name)</Label>
            <p className="text-sm">{record.fields.uebergeordnete_einheit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Land</Label>
            <p className="text-sm">{record.fields.land ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Branche</Label>
            <Badge variant="secondary">{record.fields.branche?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Konsolidierungsmethode</Label>
            <Badge variant="secondary">{record.fields.konsolidierungsmethode?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname der verantwortlichen Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname der verantwortlichen Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail der verantwortlichen Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkungen_einheit ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}