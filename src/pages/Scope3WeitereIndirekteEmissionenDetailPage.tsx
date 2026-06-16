import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Scope3WeitereIndirekteEmissionen, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { Scope3WeitereIndirekteEmissionenDialog } from '@/components/dialogs/Scope3WeitereIndirekteEmissionenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Scope3WeitereIndirekteEmissionen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function Scope3WeitereIndirekteEmissionenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Scope3WeitereIndirekteEmissionen | null>(null);
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
        LivingAppsService.getScope3WeitereIndirekteEmissionen(),
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

  async function handleUpdate(fields: Scope3WeitereIndirekteEmissionen['fields']) {
    if (!record) return;
    await LivingAppsService.updateScope3WeitereIndirekteEmissionenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteScope3WeitereIndirekteEmissionenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/scope-3-–-weitere-indirekte-emissionen');
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
          <Button variant="ghost" onClick={() => navigate('/scope-3-–-weitere-indirekte-emissionen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/scope-3-–-weitere-indirekte-emissionen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={'Scope 3 – Weitere indirekte Emissionen'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          s3_einheit: konzernstrukturList,
          s3_berichtsjahr: berichtsjahrList,
          s3_emissionsfaktor: emissionsfaktorenList,
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
        <RecordField label="Organisationseinheit" value={getKonzernstrukturDisplayName(record.fields.s3_einheit)} format="text" />
        <RecordField label="Berichtsjahr" value={getBerichtsjahrDisplayName(record.fields.s3_berichtsjahr)} format="text" />
        <RecordField label="Scope-3-Kategorie" value={record.fields.s3_kategorie} format="pill" />
        <RecordField label="Aktivitätsbeschreibung" value={record.fields.s3_aktivitaet} format="longtext" className="md:col-span-2" />
        <RecordField label="Berechnungsmethode" value={record.fields.s3_berechnungsmethode} format="pill" />
        <RecordField label="Aktivitätsmenge" value={record.fields.s3_aktivitaetsmenge} format="text" />
        <RecordField label="Einheit der Aktivitätsmenge" value={record.fields.s3_einheit_aktivitaet} format="pill" />
        <RecordField label="Emissionsfaktor" value={getEmissionsfaktorenDisplayName(record.fields.s3_emissionsfaktor)} format="text" />
        <RecordField label="Berechnete CO2e-Menge (Tonnen)" value={record.fields.s3_co2e_menge} format="text" />
        <RecordField label="Datenqualität" value={record.fields.s3_datenqualitaet} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.s3_bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS["SCOPE_3_–_WEITERE_INDIREKTE_EMISSIONEN"]} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <Scope3WeitereIndirekteEmissionenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        konzernstrukturList={konzernstrukturList}
        berichtsjahrList={berichtsjahrList}
        emissionsfaktorenList={emissionsfaktorenList}
        enablePhotoScan={AI_PHOTO_SCAN['Scope3WeitereIndirekteEmissionen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Scope3WeitereIndirekteEmissionen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Scope 3 – Weitere indirekte Emissionen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
