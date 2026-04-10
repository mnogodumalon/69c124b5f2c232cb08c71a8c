import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichScope1DirekteEmissionen, enrichScope2IndirekteEnergieemissionen, enrichScope3WeitereIndirekteEmissionen, enrichEmissionenSchnelleingabe, enrichGhgBerichtsuebersicht } from '@/lib/enrich';
import type { EnrichedEmissionenSchnelleingabe } from '@/types/enriched';
import type { Berichtsjahr, EmissionenSchnelleingabe, GhgBerichtsuebersicht } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmissionenSchnelleingabeDialog } from '@/components/dialogs/EmissionenSchnelleingabeDialog';
import { GhgBerichtsuebersichtDialog } from '@/components/dialogs/GhgBerichtsuebersichtDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconPlus, IconPencil, IconTrash, IconLeaf,
  IconFlame, IconBolt, IconWorld, IconChartBar, IconCalendar,
  IconBuilding, IconCheck, IconX, IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function DashboardOverview() {
  const {
    konzernstruktur, berichtsjahr, emissionsfaktoren,
    scope1DirekteEmissionen, scope2IndirekteEnergieemissionen, scope3WeitereIndirekteEmissionen,
    emissionenSchnelleingabe, ghgBerichtsuebersicht,
    konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedScope1 = enrichScope1DirekteEmissionen(scope1DirekteEmissionen, { konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap });
  const enrichedScope2 = enrichScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionen, { konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap });
  const enrichedScope3 = enrichScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionen, { konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap });
  const enrichedSchnell = enrichEmissionenSchnelleingabe(emissionenSchnelleingabe, { konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap });
  const enrichedGhg = enrichGhgBerichtsuebersicht(ghgBerichtsuebersicht, { berichtsjahrMap, konzernstrukturMap });

  // Year selector state
  const sortedYears = useMemo(() => {
    return [...berichtsjahr].sort((a, b) => (b.fields.jahr ?? 0) - (a.fields.jahr ?? 0));
  }, [berichtsjahr]);

  const [selectedYearId, setSelectedYearId] = useState<string>('all');

  const activeYear: Berichtsjahr | null = useMemo(() => {
    if (selectedYearId === 'all') return null;
    return berichtsjahr.find(y => y.record_id === selectedYearId) ?? null;
  }, [selectedYearId, berichtsjahr]);

  // Filter emissions by year
  const matchYear = (url: string | undefined) => {
    if (!activeYear) return true;
    return url ? url.includes(activeYear.record_id) : false;
  };

  const filteredS1 = useMemo(() => enrichedScope1.filter(e => matchYear(e.fields.s1_berichtsjahr)), [enrichedScope1, activeYear]);
  const filteredS2 = useMemo(() => enrichedScope2.filter(e => matchYear(e.fields.s2_berichtsjahr)), [enrichedScope2, activeYear]);
  const filteredS3 = useMemo(() => enrichedScope3.filter(e => matchYear(e.fields.s3_berichtsjahr)), [enrichedScope3, activeYear]);
  const filteredSchnell = useMemo(() => enrichedSchnell.filter(e => matchYear(e.fields.se_berichtsjahr)), [enrichedSchnell, activeYear]);

  const totalS1 = useMemo(() => filteredS1.reduce((s, e) => s + (e.fields.s1_co2e_menge ?? 0), 0), [filteredS1]);
  const totalS2 = useMemo(() => filteredS2.reduce((s, e) => s + (e.fields.s2_co2e_marktbasiert ?? e.fields.s2_co2e_standortbasiert ?? 0), 0), [filteredS2]);
  const totalS3 = useMemo(() => filteredS3.reduce((s, e) => s + (e.fields.s3_co2e_menge ?? 0), 0), [filteredS3]);
  const totalSchnell = useMemo(() => filteredSchnell.reduce((s, e) => s + (e.fields.se_co2e_menge ?? 0), 0), [filteredSchnell]);

  const grandTotal = totalS1 + totalS2 + totalS3 + totalSchnell;

  // GHG reports for selected year
  const yearReports = useMemo(() => {
    if (!activeYear) return enrichedGhg;
    return enrichedGhg.filter(r => r.fields.gb_berichtsjahr?.includes(activeYear.record_id));
  }, [enrichedGhg, activeYear]);

  // Scope breakdown chart data
  const scopeChartData = [
    { name: 'Scope 1', value: totalS1, color: '#f97316' },
    { name: 'Scope 2', value: totalS2, color: '#3b82f6' },
    { name: 'Scope 3', value: totalS3, color: '#8b5cf6' },
    { name: 'Schnell', value: totalSchnell, color: '#10b981' },
  ].filter(d => d.value > 0);

  // S1 by category
  const s1ByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredS1.forEach(e => {
      const k = e.fields.s1_unterkategorie?.label ?? 'Sonstige';
      map[k] = (map[k] ?? 0) + (e.fields.s1_co2e_menge ?? 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredS1]);

  // S3 by category
  const s3ByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredS3.forEach(e => {
      const raw = e.fields.s3_kategorie?.label ?? 'Sonstige';
      const name = raw.replace(/^Kat\. \d+: /, '').substring(0, 22);
      map[name] = (map[name] ?? 0) + (e.fields.s3_co2e_menge ?? 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredS3]);

  // Dialogs
  const [schnellDialog, setSchnellDialog] = useState(false);
  const [editSchnell, setEditSchnell] = useState<EnrichedEmissionenSchnelleingabe | null>(null);
  const [deleteSchnell, setDeleteSchnell] = useState<EnrichedEmissionenSchnelleingabe | null>(null);

  const [ghgDialog, setGhgDialog] = useState(false);
  const [editGhg, setEditGhg] = useState<(typeof enrichedGhg)[0] | null>(null);
  const [deleteGhg, setDeleteGhg] = useState<(typeof enrichedGhg)[0] | null>(null);

  const handleSchnellSubmit = async (fields: EmissionenSchnelleingabe['fields']) => {
    if (editSchnell) {
      await LivingAppsService.updateEmissionenSchnelleingabeEntry(editSchnell.record_id, fields);
    } else {
      await LivingAppsService.createEmissionenSchnelleingabeEntry(fields);
    }
    setEditSchnell(null);
    fetchAll();
  };

  const handleDeleteSchnell = async () => {
    if (!deleteSchnell) return;
    await LivingAppsService.deleteEmissionenSchnelleingabeEntry(deleteSchnell.record_id);
    setDeleteSchnell(null);
    fetchAll();
  };

  const handleGhgSubmit = async (fields: GhgBerichtsuebersicht['fields']) => {
    if (editGhg) {
      await LivingAppsService.updateGhgBerichtsuebersichtEntry(editGhg.record_id, fields);
    } else {
      await LivingAppsService.createGhgBerichtsuebersichtEntry(fields);
    }
    setEditGhg(null);
    fetchAll();
  };

  const handleDeleteGhg = async () => {
    if (!deleteGhg) return;
    await LivingAppsService.deleteGhgBerichtsuebersichtEntry(deleteGhg.record_id);
    setDeleteGhg(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="space-y-6 pb-8">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GHG-Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Treibhausgasemissionen nach GHG Protocol</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedYearId} onValueChange={setSelectedYearId}>
            <SelectTrigger className="w-40 h-9">
              <IconCalendar size={14} className="shrink-0 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Alle Jahre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Jahre</SelectItem>
              {sortedYears.map(y => (
                <SelectItem key={y.record_id} value={y.record_id}>
                  {y.fields.jahr ?? y.record_id}
                  {y.fields.ist_basisjahr && ' (Basis)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setEditSchnell(null); setSchnellDialog(true); }}>
            <IconPlus size={15} className="shrink-0 mr-1" />
            Emission erfassen
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt CO₂e"
          value={`${fmt(grandTotal)} t`}
          description="Alle Scopes"
          icon={<IconLeaf size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Scope 1"
          value={`${fmt(totalS1)} t`}
          description="Direkte Emissionen"
          icon={<IconFlame size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Scope 2"
          value={`${fmt(totalS2)} t`}
          description="Indirekte Energieem."
          icon={<IconBolt size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Scope 3"
          value={`${fmt(totalS3 + totalSchnell)} t`}
          description="Weitere ind. Emissionen"
          icon={<IconWorld size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Scope distribution + S1 breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scope Distribution Pie */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <IconChartBar size={16} className="text-muted-foreground shrink-0" />
            <h2 className="font-semibold text-sm">Emissionsverteilung nach Scope</h2>
          </div>
          {grandTotal === 0 ? (
            <EmptyChart message="Noch keine Emissionsdaten erfasst" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={scopeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {scopeChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${fmt(v)} t CO₂e`, '']}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* S1 by category */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <IconFlame size={16} className="text-muted-foreground shrink-0" />
            <h2 className="font-semibold text-sm">Scope 1 nach Kategorie (t CO₂e)</h2>
          </div>
          {s1ByCategory.length === 0 ? (
            <EmptyChart message="Keine Scope-1-Daten" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s1ByCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => [`${fmt(v)} t CO₂e`, '']}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* S3 top categories */}
      {s3ByCategory.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <IconWorld size={16} className="text-muted-foreground shrink-0" />
            <h2 className="font-semibold text-sm">Scope 3 – Top-Kategorien (t CO₂e)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s3ByCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)} t CO₂e`, '']}
                contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Schnelleingabe entries list */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <IconFlame size={16} className="text-muted-foreground shrink-0" />
            <h2 className="font-semibold text-sm">Emissionen Schnelleingabe</h2>
            <Badge variant="secondary" className="text-xs">{filteredSchnell.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditSchnell(null); setSchnellDialog(true); }}>
            <IconPlus size={14} className="mr-1 shrink-0" />
            Neu
          </Button>
        </div>
        {filteredSchnell.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <IconFlame size={36} stroke={1.5} />
            <p className="text-sm">Noch keine Einträge</p>
            <Button size="sm" variant="outline" onClick={() => { setEditSchnell(null); setSchnellDialog(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              Ersten Eintrag erfassen
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Einheit</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Scope</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Aktivität</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">CO₂e (t)</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Qualität</th>
                  <th className="w-20 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSchnell.map(e => (
                  <tr key={e.record_id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium truncate max-w-[120px] block">{e.se_einheitName || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ScopeBadge scope={e.fields.se_scope?.key} />
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="truncate block text-muted-foreground">{e.fields.se_aktivitaet || e.fields.se_unterkategorie?.label || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {e.fields.se_co2e_menge != null ? fmt(e.fields.se_co2e_menge) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <QualityBadge q={e.fields.se_datenqualitaet?.key} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditSchnell(e); setSchnellDialog(true); }}>
                          <IconPencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSchnell(e)}>
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GHG Reports */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <IconBuilding size={16} className="text-muted-foreground shrink-0" />
            <h2 className="font-semibold text-sm">GHG-Berichtsübersicht</h2>
            <Badge variant="secondary" className="text-xs">{yearReports.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditGhg(null); setGhgDialog(true); }}>
            <IconPlus size={14} className="mr-1 shrink-0" />
            Neu
          </Button>
        </div>
        {yearReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <IconBuilding size={36} stroke={1.5} />
            <p className="text-sm">Noch keine Berichte</p>
            <Button size="sm" variant="outline" onClick={() => { setEditGhg(null); setGhgDialog(true); }}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              Ersten Bericht anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {yearReports.map(r => (
              <div key={r.record_id} className="rounded-xl border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.gb_berichtsjahrName || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.gb_konzerneinheitName || '—'}</p>
                  </div>
                  <VerifBadge status={r.fields.gb_verifizierungsstatus?.key} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2">
                    <p className="text-xs text-muted-foreground">S1</p>
                    <p className="text-sm font-bold">{r.fields.gb_scope1_gesamt != null ? fmt(r.fields.gb_scope1_gesamt) : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
                    <p className="text-xs text-muted-foreground">S2</p>
                    <p className="text-sm font-bold">{r.fields.gb_scope2_marktbasiert != null ? fmt(r.fields.gb_scope2_marktbasiert) : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-2">
                    <p className="text-xs text-muted-foreground">S3</p>
                    <p className="text-sm font-bold">{r.fields.gb_scope3_gesamt != null ? fmt(r.fields.gb_scope3_gesamt) : '—'}</p>
                  </div>
                </div>
                {r.fields.gb_gesamt_co2e != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">Gesamt CO₂e</span>
                    <span className="font-bold">{fmt(r.fields.gb_gesamt_co2e)} t</span>
                  </div>
                )}
                {r.fields.gb_basisjahr_vergleich != null && (
                  <div className="flex items-center gap-1 text-xs">
                    {r.fields.gb_basisjahr_vergleich < 0 ? (
                      <><IconTrendingDown size={14} className="text-emerald-500 shrink-0" /><span className="text-emerald-600">{r.fields.gb_basisjahr_vergleich}% zum Basisjahr</span></>
                    ) : (
                      <><IconTrendingUp size={14} className="text-rose-500 shrink-0" /><span className="text-rose-600">+{r.fields.gb_basisjahr_vergleich}% zum Basisjahr</span></>
                    )}
                  </div>
                )}
                {r.fields.gb_pruefdatum && (
                  <p className="text-xs text-muted-foreground">Geprüft: {formatDate(r.fields.gb_pruefdatum)}</p>
                )}
                <div className="flex justify-end gap-1 pt-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditGhg(r); setGhgDialog(true); }}>
                    <IconPencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteGhg(r)}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EmissionenSchnelleingabeDialog
        open={schnellDialog}
        onClose={() => { setSchnellDialog(false); setEditSchnell(null); }}
        onSubmit={handleSchnellSubmit}
        defaultValues={editSchnell?.fields}
        konzernstrukturList={konzernstruktur}
        berichtsjahrList={berichtsjahr}
        emissionsfaktorenList={emissionsfaktoren}
        enablePhotoScan={AI_PHOTO_SCAN['EmissionenSchnelleingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EmissionenSchnelleingabe']}
      />

      <GhgBerichtsuebersichtDialog
        open={ghgDialog}
        onClose={() => { setGhgDialog(false); setEditGhg(null); }}
        onSubmit={handleGhgSubmit}
        defaultValues={editGhg
          ? {
              ...editGhg.fields,
              gb_berichtsjahr: editGhg.fields.gb_berichtsjahr
                ? editGhg.fields.gb_berichtsjahr
                : activeYear ? createRecordUrl(APP_IDS.BERICHTSJAHR, activeYear.record_id) : undefined,
            }
          : activeYear
            ? { gb_berichtsjahr: createRecordUrl(APP_IDS.BERICHTSJAHR, activeYear.record_id) }
            : undefined
        }
        berichtsjahrList={berichtsjahr}
        konzernstrukturList={konzernstruktur}
        enablePhotoScan={AI_PHOTO_SCAN['GhgBerichtsuebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GhgBerichtsuebersicht']}
      />

      <ConfirmDialog
        open={!!deleteSchnell}
        title="Eintrag löschen"
        description="Diesen Emissionseintrag wirklich löschen?"
        onConfirm={handleDeleteSchnell}
        onClose={() => setDeleteSchnell(null)}
      />

      <ConfirmDialog
        open={!!deleteGhg}
        title="Bericht löschen"
        description="Diesen GHG-Bericht wirklich löschen?"
        onConfirm={handleDeleteGhg}
        onClose={() => setDeleteGhg(null)}
      />
    </div>
  );
}

function ScopeBadge({ scope }: { scope?: string }) {
  if (!scope) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    scope1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    scope2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    scope3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  };
  const labels: Record<string, string> = { scope1: 'Scope 1', scope2: 'Scope 2', scope3: 'Scope 3' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[scope] ?? 'bg-muted text-muted-foreground'}`}>
      {labels[scope] ?? scope}
    </span>
  );
}

function QualityBadge({ q }: { q?: string }) {
  if (!q) return <span className="text-muted-foreground text-xs">—</span>;
  if (q === 'primaer') return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><IconCheck size={12} />Primär</span>;
  if (q === 'sekundaer') return <span className="inline-flex items-center gap-1 text-xs text-blue-600"><IconCheck size={12} />Sekundär</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-amber-600"><IconX size={12} />Schätzung</span>;
}

function VerifBadge({ status }: { status?: string }) {
  if (status === 'extern') return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">Extern verifiziert</Badge>;
  if (status === 'intern') return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs shrink-0">Intern geprüft</Badge>;
  return <Badge variant="outline" className="text-xs shrink-0">Ungeprüft</Badge>;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">{message}</div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
