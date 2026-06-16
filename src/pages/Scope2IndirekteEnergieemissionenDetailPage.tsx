import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Scope2IndirekteEnergieemissionen, Berichtsjahr, Emissionsfaktoren, Konzernstruktur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { Scope2IndirekteEnergieemissionenDialog } from '@/components/dialogs/Scope2IndirekteEnergieemissionenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Scope2IndirekteEnergieemissionen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function Scope2IndirekteEnergieemissionenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Scope2IndirekteEnergieemissionen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [berichtsjahrList, setBerichtsjahrList] = useState<Berichtsjahr[]>([]);
  const [emissionsfaktorenList, setEmissionsfaktorenList] = useState<Emissionsfaktoren[]>([]);
  const [konzernstrukturList, setKonzernstrukturList] = useState<Konzernstruktur[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, berichtsjahrData, emissionsfaktorenData, konzernstrukturData] = await Promise.all([
        LivingAppsService.getScope2IndirekteEnergieemissionen(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getEmissionsfaktoren(),
        LivingAppsService.getKonzernstruktur(),
      ]);
      setBerichtsjahrList(berichtsjahrData);
      setEmissionsfaktorenList(emissionsfaktorenData);
      setKonzernstrukturList(konzernstrukturData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Scope2IndirekteEnergieemissionen['fields']) {
    if (!record) return;
    await LivingAppsService.updateScope2IndirekteEnergieemissionenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteScope2IndirekteEnergieemissionenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/scope-2-–-indirekte-energieemissionen');
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
          <Button variant="ghost" onClick={() => navigate('/scope-2-–-indirekte-energieemissionen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/scope-2-–-indirekte-energieemissionen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.s2_lieferant ?? 'Scope 2 – Indirekte Energieemissionen'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          s2_berichtsjahr: berichtsjahrList,
          s2_emissionsfaktor: emissionsfaktorenList,
          s2_einheit: konzernstrukturList,
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
        <RecordField label="Berichtsjahr" value={getBerichtsjahrDisplayName(record.fields.s2_berichtsjahr)} format="text" />
        <RecordField label="Energieart" value={record.fields.s2_energieart} format="pill" />
        <RecordField label="Berechnungsmethode" value={record.fields.s2_berechnungsmethode} format="pill" />
        <RecordField label="Verbrauchsmenge (kWh)" value={record.fields.s2_verbrauch_kwh} format="text" />
        <RecordField label="Emissionsfaktor" value={getEmissionsfaktorenDisplayName(record.fields.s2_emissionsfaktor)} format="text" />
        <RecordField label="CO2e-Menge marktbasiert (Tonnen)" value={record.fields.s2_co2e_marktbasiert} format="text" />
        <RecordField label="CO2e-Menge standortbasiert (Tonnen)" value={record.fields.s2_co2e_standortbasiert} format="text" />
        <RecordField label="Lieferant / Energieversorger" value={record.fields.s2_lieferant} format="text" />
        <RecordField label="Herkunftsnachweis vorhanden (z. B. Grünstromzertifikat)" value={record.fields.s2_herkunftsnachweis} format="bool" />
        <RecordField label="Bemerkungen" value={record.fields.s2_bemerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label="Organisationseinheit" value={getKonzernstrukturDisplayName(record.fields.s2_einheit)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS["SCOPE_2_–_INDIREKTE_ENERGIEEMISSIONEN"]} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <Scope2IndirekteEnergieemissionenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        berichtsjahrList={berichtsjahrList}
        emissionsfaktorenList={emissionsfaktorenList}
        konzernstrukturList={konzernstrukturList}
        enablePhotoScan={AI_PHOTO_SCAN['Scope2IndirekteEnergieemissionen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Scope2IndirekteEnergieemissionen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Scope 2 – Indirekte Energieemissionen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
