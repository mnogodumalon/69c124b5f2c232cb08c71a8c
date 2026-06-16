import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Scope3WeitereIndirekteEmissionen, Emissionsfaktoren, Berichtsjahr, Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, EmissionenSchnelleingabe, GhgBerichtsuebersicht, Konzernstruktur } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen] = useState<Scope3WeitereIndirekteEmissionen[]>([]);
  const [emissionsfaktoren, setEmissionsfaktoren] = useState<Emissionsfaktoren[]>([]);
  const [berichtsjahr, setBerichtsjahr] = useState<Berichtsjahr[]>([]);
  const [scope1DirekteEmissionen, setScope1DirekteEmissionen] = useState<Scope1DirekteEmissionen[]>([]);
  const [scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen] = useState<Scope2IndirekteEnergieemissionen[]>([]);
  const [emissionenSchnelleingabe, setEmissionenSchnelleingabe] = useState<EmissionenSchnelleingabe[]>([]);
  const [ghgBerichtsuebersicht, setGhgBerichtsuebersicht] = useState<GhgBerichtsuebersicht[]>([]);
  const [konzernstruktur, setKonzernstruktur] = useState<Konzernstruktur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [scope3WeitereIndirekteEmissionenData, emissionsfaktorenData, berichtsjahrData, scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData, konzernstrukturData] = await Promise.all([
        LivingAppsService.getScope3WeitereIndirekteEmissionen(),
        LivingAppsService.getEmissionsfaktoren(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getScope1DirekteEmissionen(),
        LivingAppsService.getScope2IndirekteEnergieemissionen(),
        LivingAppsService.getEmissionenSchnelleingabe(),
        LivingAppsService.getGhgBerichtsuebersicht(),
        LivingAppsService.getKonzernstruktur(),
      ]);
      setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
      setEmissionsfaktoren(emissionsfaktorenData);
      setBerichtsjahr(berichtsjahrData);
      setScope1DirekteEmissionen(scope1DirekteEmissionenData);
      setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
      setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
      setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
      setKonzernstruktur(konzernstrukturData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [scope3WeitereIndirekteEmissionenData, emissionsfaktorenData, berichtsjahrData, scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData, konzernstrukturData] = await Promise.all([
          LivingAppsService.getScope3WeitereIndirekteEmissionen(),
          LivingAppsService.getEmissionsfaktoren(),
          LivingAppsService.getBerichtsjahr(),
          LivingAppsService.getScope1DirekteEmissionen(),
          LivingAppsService.getScope2IndirekteEnergieemissionen(),
          LivingAppsService.getEmissionenSchnelleingabe(),
          LivingAppsService.getGhgBerichtsuebersicht(),
          LivingAppsService.getKonzernstruktur(),
        ]);
        setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
        setEmissionsfaktoren(emissionsfaktorenData);
        setBerichtsjahr(berichtsjahrData);
        setScope1DirekteEmissionen(scope1DirekteEmissionenData);
        setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
        setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
        setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
        setKonzernstruktur(konzernstrukturData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const emissionsfaktorenMap = useMemo(() => {
    const m = new Map<string, Emissionsfaktoren>();
    emissionsfaktoren.forEach(r => m.set(r.record_id, r));
    return m;
  }, [emissionsfaktoren]);

  const berichtsjahrMap = useMemo(() => {
    const m = new Map<string, Berichtsjahr>();
    berichtsjahr.forEach(r => m.set(r.record_id, r));
    return m;
  }, [berichtsjahr]);

  const konzernstrukturMap = useMemo(() => {
    const m = new Map<string, Konzernstruktur>();
    konzernstruktur.forEach(r => m.set(r.record_id, r));
    return m;
  }, [konzernstruktur]);

  return { scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen, emissionsfaktoren, setEmissionsfaktoren, berichtsjahr, setBerichtsjahr, scope1DirekteEmissionen, setScope1DirekteEmissionen, scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen, emissionenSchnelleingabe, setEmissionenSchnelleingabe, ghgBerichtsuebersicht, setGhgBerichtsuebersicht, konzernstruktur, setKonzernstruktur, loading, error, fetchAll, emissionsfaktorenMap, berichtsjahrMap, konzernstrukturMap };
}