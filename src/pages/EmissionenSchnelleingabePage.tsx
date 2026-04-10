import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { EmissionenSchnelleingabe, Konzernstruktur, Berichtsjahr, Emissionsfaktoren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconFileText } from '@tabler/icons-react';
import { EmissionenSchnelleingabeDialog } from '@/components/dialogs/EmissionenSchnelleingabeDialog';
import { EmissionenSchnelleingabeViewDialog } from '@/components/dialogs/EmissionenSchnelleingabeViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function EmissionenSchnelleingabePage() {
  const [records, setRecords] = useState<EmissionenSchnelleingabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmissionenSchnelleingabe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmissionenSchnelleingabe | null>(null);
  const [viewingRecord, setViewingRecord] = useState<EmissionenSchnelleingabe | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [konzernstrukturList, setKonzernstrukturList] = useState<Konzernstruktur[]>([]);
  const [berichtsjahrList, setBerichtsjahrList] = useState<Berichtsjahr[]>([]);
  const [emissionsfaktorenList, setEmissionsfaktorenList] = useState<Emissionsfaktoren[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, konzernstrukturData, berichtsjahrData, emissionsfaktorenData] = await Promise.all([
        LivingAppsService.getEmissionenSchnelleingabe(),
        LivingAppsService.getKonzernstruktur(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getEmissionsfaktoren(),
      ]);
      setRecords(mainData);
      setKonzernstrukturList(konzernstrukturData);
      setBerichtsjahrList(berichtsjahrData);
      setEmissionsfaktorenList(emissionsfaktorenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: EmissionenSchnelleingabe['fields']) {
    await LivingAppsService.createEmissionenSchnelleingabeEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: EmissionenSchnelleingabe['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateEmissionenSchnelleingabeEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteEmissionenSchnelleingabeEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

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

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Emissionen Schnelleingabe"
      subtitle={`${records.length} Emissionen Schnelleingabe im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Emissionen Schnelleingabe suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_einheit')}>
                <span className="inline-flex items-center gap-1">
                  Organisationseinheit
                  {sortKey === 'se_einheit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_berichtsjahr')}>
                <span className="inline-flex items-center gap-1">
                  Berichtsjahr
                  {sortKey === 'se_berichtsjahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_scope')}>
                <span className="inline-flex items-center gap-1">
                  Scope
                  {sortKey === 'se_scope' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_unterkategorie')}>
                <span className="inline-flex items-center gap-1">
                  Unterkategorie / Scope-3-Kategorie
                  {sortKey === 'se_unterkategorie' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_aktivitaet')}>
                <span className="inline-flex items-center gap-1">
                  Aktivitätsbeschreibung
                  {sortKey === 'se_aktivitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_emissionsfaktor')}>
                <span className="inline-flex items-center gap-1">
                  Emissionsfaktor
                  {sortKey === 'se_emissionsfaktor' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_aktivitaetsmenge')}>
                <span className="inline-flex items-center gap-1">
                  Aktivitätsmenge / Verbrauchsmenge
                  {sortKey === 'se_aktivitaetsmenge' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_einheit_menge')}>
                <span className="inline-flex items-center gap-1">
                  Einheit
                  {sortKey === 'se_einheit_menge' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_co2e_menge')}>
                <span className="inline-flex items-center gap-1">
                  Berechnete CO2e-Menge (Tonnen)
                  {sortKey === 'se_co2e_menge' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_datenqualitaet')}>
                <span className="inline-flex items-center gap-1">
                  Datenqualität
                  {sortKey === 'se_datenqualitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_bemerkungen')}>
                <span className="inline-flex items-center gap-1">
                  Bemerkungen
                  {sortKey === 'se_bemerkungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('se_nachweis')}>
                <span className="inline-flex items-center gap-1">
                  Nachweis / Beleg (Datei-Upload)
                  {sortKey === 'se_nachweis' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getKonzernstrukturDisplayName(record.fields.se_einheit)}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBerichtsjahrDisplayName(record.fields.se_berichtsjahr)}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.se_scope?.label ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.se_unterkategorie?.label ?? '—'}</span></TableCell>
                <TableCell className="font-medium">{record.fields.se_aktivitaet ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getEmissionsfaktorenDisplayName(record.fields.se_emissionsfaktor)}</span></TableCell>
                <TableCell>{record.fields.se_aktivitaetsmenge ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.se_einheit_menge?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.se_co2e_menge ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.se_datenqualitaet?.label ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.se_bemerkungen ?? '—'}</span></TableCell>
                <TableCell>{record.fields.se_nachweis ? <div className="relative h-8 w-8 rounded bg-muted overflow-hidden"><div className="absolute inset-0 flex items-center justify-center"><IconFileText size={14} className="text-muted-foreground" /></div><img src={record.fields.se_nachweis} alt="" className="relative h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div> : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Emissionen Schnelleingabe. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EmissionenSchnelleingabeDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        konzernstrukturList={konzernstrukturList}
        berichtsjahrList={berichtsjahrList}
        emissionsfaktorenList={emissionsfaktorenList}
        enablePhotoScan={AI_PHOTO_SCAN['EmissionenSchnelleingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EmissionenSchnelleingabe']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Emissionen Schnelleingabe löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <EmissionenSchnelleingabeViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        konzernstrukturList={konzernstrukturList}
        berichtsjahrList={berichtsjahrList}
        emissionsfaktorenList={emissionsfaktorenList}
      />
    </PageShell>
  );
}