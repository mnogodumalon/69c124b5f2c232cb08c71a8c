import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { GhgBerichtsuebersicht, Berichtsjahr, Konzernstruktur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { GhgBerichtsuebersichtDialog } from '@/components/dialogs/GhgBerichtsuebersichtDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/GhgBerichtsuebersicht';
import { evalComputed } from '@/config/form-enhancements/types';

export default function GhgBerichtsuebersichtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<GhgBerichtsuebersicht | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [berichtsjahrList, setBerichtsjahrList] = useState<Berichtsjahr[]>([]);
  const [konzernstrukturList, setKonzernstrukturList] = useState<Konzernstruktur[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, berichtsjahrData, konzernstrukturData] = await Promise.all([
        LivingAppsService.getGhgBerichtsuebersicht(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getKonzernstruktur(),
      ]);
      setBerichtsjahrList(berichtsjahrData);
      setKonzernstrukturList(konzernstrukturData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: GhgBerichtsuebersicht['fields']) {
    if (!record) return;
    await LivingAppsService.updateGhgBerichtsuebersichtEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteGhgBerichtsuebersichtEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/ghg-berichtsuebersicht');
  }

  function getBerichtsjahrDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return berichtsjahrList.find(r => r.record_id === refId)?.fields.anmerkungen_jahr ?? '—';
  }

  function getKonzernstrukturDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return konzernstrukturList.find(r => r.record_id === refId)?.fields.einheit_name ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/ghg-berichtsuebersicht')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/ghg-berichtsuebersicht')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.gb_pruefer_vorname ?? 'GHG-Berichtsübersicht'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          gb_berichtsjahr: berichtsjahrList,
          gb_konzerneinheit: konzernstrukturList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Berichtsjahr" value={getBerichtsjahrDisplayName(record.fields.gb_berichtsjahr)} format="text" />
        <RecordField label="Konzerneinheit" value={getKonzernstrukturDisplayName(record.fields.gb_konzerneinheit)} format="text" />
        <RecordField label="Gesamtemissionen Scope 1 (Tonnen CO2e)" value={record.fields.gb_scope1_gesamt} format="text" />
        <RecordField label="Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)" value={record.fields.gb_scope2_marktbasiert} format="text" />
        <RecordField label="Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)" value={record.fields.gb_scope2_standortbasiert} format="text" />
        <RecordField label="Gesamtemissionen Scope 3 (Tonnen CO2e)" value={record.fields.gb_scope3_gesamt} format="text" />
        <RecordField label="Gesamtemissionen (Tonnen CO2e, alle Scopes)" value={record.fields.gb_gesamt_co2e} format="text" />
        <RecordField label="Intensitätskennzahl: CO2e pro Mio. EUR Umsatz" value={record.fields.gb_intensitaet_umsatz} format="text" />
        <RecordField label="Intensitätskennzahl: CO2e pro Mitarbeitenden" value={record.fields.gb_intensitaet_mitarbeiter} format="text" />
        <RecordField label="Veränderung zum Basisjahr (%)" value={record.fields.gb_basisjahr_vergleich} format="text" />
        <RecordField label="Verifizierungsstatus" value={record.fields.gb_verifizierungsstatus} format="pill" />
        <RecordField label="Vorname des Prüfers" value={record.fields.gb_pruefer_vorname} format="text" />
        <RecordField label="Nachname des Prüfers" value={record.fields.gb_pruefer_nachname} format="text" />
        <RecordField label="Prüfdatum" value={record.fields.gb_pruefdatum} format="date" />
        <RecordField label="Kommentare / Erläuterungen" value={record.fields.gb_kommentare} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.GHG_BERICHTSUEBERSICHT} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <GhgBerichtsuebersichtDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        berichtsjahrList={berichtsjahrList}
        konzernstrukturList={konzernstrukturList}
        enablePhotoScan={AI_PHOTO_SCAN['GhgBerichtsuebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GhgBerichtsuebersicht']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="GHG-Berichtsübersicht löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
