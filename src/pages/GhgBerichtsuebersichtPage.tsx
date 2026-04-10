import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { GhgBerichtsuebersicht, Berichtsjahr, Konzernstruktur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { GhgBerichtsuebersichtDialog } from '@/components/dialogs/GhgBerichtsuebersichtDialog';
import { GhgBerichtsuebersichtViewDialog } from '@/components/dialogs/GhgBerichtsuebersichtViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function GhgBerichtsuebersichtPage() {
  const [records, setRecords] = useState<GhgBerichtsuebersicht[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GhgBerichtsuebersicht | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GhgBerichtsuebersicht | null>(null);
  const [viewingRecord, setViewingRecord] = useState<GhgBerichtsuebersicht | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [berichtsjahrList, setBerichtsjahrList] = useState<Berichtsjahr[]>([]);
  const [konzernstrukturList, setKonzernstrukturList] = useState<Konzernstruktur[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, berichtsjahrData, konzernstrukturData] = await Promise.all([
        LivingAppsService.getGhgBerichtsuebersicht(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getKonzernstruktur(),
      ]);
      setRecords(mainData);
      setBerichtsjahrList(berichtsjahrData);
      setKonzernstrukturList(konzernstrukturData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: GhgBerichtsuebersicht['fields']) {
    await LivingAppsService.createGhgBerichtsuebersichtEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: GhgBerichtsuebersicht['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateGhgBerichtsuebersichtEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteGhgBerichtsuebersichtEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getBerichtsjahrDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return berichtsjahrList.find(r => r.record_id === id)?.fields.anmerkungen_jahr ?? '—';
  }

  function getKonzernstrukturDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return konzernstrukturList.find(r => r.record_id === id)?.fields.einheit_name ?? '—';
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
      title="GHG-Berichtsübersicht"
      subtitle={`${records.length} GHG-Berichtsübersicht im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="GHG-Berichtsübersicht suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_berichtsjahr')}>
                <span className="inline-flex items-center gap-1">
                  Berichtsjahr
                  {sortKey === 'gb_berichtsjahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_konzerneinheit')}>
                <span className="inline-flex items-center gap-1">
                  Konzerneinheit
                  {sortKey === 'gb_konzerneinheit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_scope1_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtemissionen Scope 1 (Tonnen CO2e)
                  {sortKey === 'gb_scope1_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_scope2_marktbasiert')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtemissionen Scope 2 marktbasiert (Tonnen CO2e)
                  {sortKey === 'gb_scope2_marktbasiert' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_scope2_standortbasiert')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtemissionen Scope 2 standortbasiert (Tonnen CO2e)
                  {sortKey === 'gb_scope2_standortbasiert' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_scope3_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtemissionen Scope 3 (Tonnen CO2e)
                  {sortKey === 'gb_scope3_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_gesamt_co2e')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtemissionen (Tonnen CO2e, alle Scopes)
                  {sortKey === 'gb_gesamt_co2e' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_intensitaet_umsatz')}>
                <span className="inline-flex items-center gap-1">
                  Intensitätskennzahl: CO2e pro Mio. EUR Umsatz
                  {sortKey === 'gb_intensitaet_umsatz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_intensitaet_mitarbeiter')}>
                <span className="inline-flex items-center gap-1">
                  Intensitätskennzahl: CO2e pro Mitarbeitenden
                  {sortKey === 'gb_intensitaet_mitarbeiter' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_basisjahr_vergleich')}>
                <span className="inline-flex items-center gap-1">
                  Veränderung zum Basisjahr (%)
                  {sortKey === 'gb_basisjahr_vergleich' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_verifizierungsstatus')}>
                <span className="inline-flex items-center gap-1">
                  Verifizierungsstatus
                  {sortKey === 'gb_verifizierungsstatus' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_pruefer_vorname')}>
                <span className="inline-flex items-center gap-1">
                  Vorname des Prüfers
                  {sortKey === 'gb_pruefer_vorname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_pruefer_nachname')}>
                <span className="inline-flex items-center gap-1">
                  Nachname des Prüfers
                  {sortKey === 'gb_pruefer_nachname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_pruefdatum')}>
                <span className="inline-flex items-center gap-1">
                  Prüfdatum
                  {sortKey === 'gb_pruefdatum' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gb_kommentare')}>
                <span className="inline-flex items-center gap-1">
                  Kommentare / Erläuterungen
                  {sortKey === 'gb_kommentare' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBerichtsjahrDisplayName(record.fields.gb_berichtsjahr)}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getKonzernstrukturDisplayName(record.fields.gb_konzerneinheit)}</span></TableCell>
                <TableCell>{record.fields.gb_scope1_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_scope2_marktbasiert ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_scope2_standortbasiert ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_scope3_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_gesamt_co2e ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_intensitaet_umsatz ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_intensitaet_mitarbeiter ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_basisjahr_vergleich ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.gb_verifizierungsstatus?.label ?? '—'}</span></TableCell>
                <TableCell className="font-medium">{record.fields.gb_pruefer_vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.gb_pruefer_nachname ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.gb_pruefdatum)}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.gb_kommentare ?? '—'}</span></TableCell>
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
                <TableCell colSpan={16} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine GHG-Berichtsübersicht. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <GhgBerichtsuebersichtDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        berichtsjahrList={berichtsjahrList}
        konzernstrukturList={konzernstrukturList}
        enablePhotoScan={AI_PHOTO_SCAN['GhgBerichtsuebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GhgBerichtsuebersicht']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="GHG-Berichtsübersicht löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <GhgBerichtsuebersichtViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        berichtsjahrList={berichtsjahrList}
        konzernstrukturList={konzernstrukturList}
      />
    </PageShell>
  );
}