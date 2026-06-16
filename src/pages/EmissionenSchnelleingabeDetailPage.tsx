import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { EmissionenSchnelleingabe, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { EmissionenSchnelleingabeDialog } from '@/components/dialogs/EmissionenSchnelleingabeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/EmissionenSchnelleingabe';
import { evalComputed } from '@/config/form-enhancements/types';

export default function EmissionenSchnelleingabeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EmissionenSchnelleingabe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [konzernstrukturList, setKonzernstrukturList] = useState<Konzernstruktur[]>([]);
  const [berichtsjahrList, setBerichtsjahrList] = useState<Berichtsjahr[]>([]);
  const [emissionsfaktorenList, setEmissionsfaktorenList] = useState<Emissionsfaktoren[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, konzernstrukturData, berichtsjahrData, emissionsfaktorenData] = await Promise.all([
        LivingAppsService.getEmissionenSchnelleingabe(),
        LivingAppsService.getKonzernstruktur(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getEmissionsfaktoren(),
      ]);
      setKonzernstrukturList(konzernstrukturData);
      setBerichtsjahrList(berichtsjahrData);
      setEmissionsfaktorenList(emissionsfaktorenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: EmissionenSchnelleingabe['fields']) {
    if (!record) return;
    await LivingAppsService.updateEmissionenSchnelleingabeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteEmissionenSchnelleingabeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/emissionen-schnelleingabe');
  }

  function getKonzernstrukturDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return konzernstrukturList.find(r => r.record_id === refId)?.fields.einheit_name ?? '—';
  }

  function getBerichtsjahrDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return berichtsjahrList.find(r => r.record_id === refId)?.fields.anmerkungen_jahr ?? '—';
  }

  function getEmissionsfaktorenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return emissionsfaktorenList.find(r => r.record_id === refId)?.fields.ef_bezeichnung ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/emissionen-schnelleingabe')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/emissionen-schnelleingabe')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.se_aktivitaet ?? 'Emissionen Schnelleingabe'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          se_einheit: konzernstrukturList,
          se_berichtsjahr: berichtsjahrList,
          se_emissionsfaktor: emissionsfaktorenList,
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
        <RecordField label="Organisationseinheit" value={getKonzernstrukturDisplayName(record.fields.se_einheit)} format="text" />
        <RecordField label="Berichtsjahr" value={getBerichtsjahrDisplayName(record.fields.se_berichtsjahr)} format="text" />
        <RecordField label="Scope" value={record.fields.se_scope} format="pill" />
        <RecordField label="Unterkategorie / Scope-3-Kategorie" value={record.fields.se_unterkategorie} format="pill" />
        <RecordField label="Aktivitätsbeschreibung" value={record.fields.se_aktivitaet} format="text" />
        <RecordField label="Emissionsfaktor" value={getEmissionsfaktorenDisplayName(record.fields.se_emissionsfaktor)} format="text" />
        <RecordField label="Aktivitätsmenge / Verbrauchsmenge" value={record.fields.se_aktivitaetsmenge} format="text" />
        <RecordField label="Einheit" value={record.fields.se_einheit_menge} format="pill" />
        <RecordField label="Berechnete CO2e-Menge (Tonnen)" value={record.fields.se_co2e_menge} format="text" />
        <RecordField label="Datenqualität" value={record.fields.se_datenqualitaet} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.se_bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.EMISSIONEN_SCHNELLEINGABE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <EmissionenSchnelleingabeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        konzernstrukturList={konzernstrukturList}
        berichtsjahrList={berichtsjahrList}
        emissionsfaktorenList={emissionsfaktorenList}
        enablePhotoScan={AI_PHOTO_SCAN['EmissionenSchnelleingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EmissionenSchnelleingabe']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Emissionen Schnelleingabe löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
