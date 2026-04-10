import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, EmissionenSchnelleingabe, GhgBerichtsuebersicht, Konzernstruktur, Scope3WeitereIndirekteEmissionen, Emissionsfaktoren, Berichtsjahr } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [scope1DirekteEmissionen, setScope1DirekteEmissionen] = useState<Scope1DirekteEmissionen[]>([]);
  const [scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen] = useState<Scope2IndirekteEnergieemissionen[]>([]);
  const [emissionenSchnelleingabe, setEmissionenSchnelleingabe] = useState<EmissionenSchnelleingabe[]>([]);
  const [ghgBerichtsuebersicht, setGhgBerichtsuebersicht] = useState<GhgBerichtsuebersicht[]>([]);
  const [konzernstruktur, setKonzernstruktur] = useState<Konzernstruktur[]>([]);
  const [scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen] = useState<Scope3WeitereIndirekteEmissionen[]>([]);
  const [emissionsfaktoren, setEmissionsfaktoren] = useState<Emissionsfaktoren[]>([]);
  const [berichtsjahr, setBerichtsjahr] = useState<Berichtsjahr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData, konzernstrukturData, scope3WeitereIndirekteEmissionenData, emissionsfaktorenData, berichtsjahrData] = await Promise.all([
        LivingAppsService.getScope1DirekteEmissionen(),
        LivingAppsService.getScope2IndirekteEnergieemissionen(),
        LivingAppsService.getEmissionenSchnelleingabe(),
        LivingAppsService.getGhgBerichtsuebersicht(),
        LivingAppsService.getKonzernstruktur(),
        LivingAppsService.getScope3WeitereIndirekteEmissionen(),
        LivingAppsService.getEmissionsfaktoren(),
        LivingAppsService.getBerichtsjahr(),
      ]);
      setScope1DirekteEmissionen(scope1DirekteEmissionenData);
      setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
      setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
      setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
      setKonzernstruktur(konzernstrukturData);
      setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
      setEmissionsfaktoren(emissionsfaktorenData);
      setBerichtsjahr(berichtsjahrData);
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
        const [scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData, konzernstrukturData, scope3WeitereIndirekteEmissionenData, emissionsfaktorenData, berichtsjahrData] = await Promise.all([
          LivingAppsService.getScope1DirekteEmissionen(),
          LivingAppsService.getScope2IndirekteEnergieemissionen(),
          LivingAppsService.getEmissionenSchnelleingabe(),
          LivingAppsService.getGhgBerichtsuebersicht(),
          LivingAppsService.getKonzernstruktur(),
          LivingAppsService.getScope3WeitereIndirekteEmissionen(),
          LivingAppsService.getEmissionsfaktoren(),
          LivingAppsService.getBerichtsjahr(),
        ]);
        setScope1DirekteEmissionen(scope1DirekteEmissionenData);
        setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
        setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
        setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
        setKonzernstruktur(konzernstrukturData);
        setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
        setEmissionsfaktoren(emissionsfaktorenData);
        setBerichtsjahr(berichtsjahrData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const konzernstrukturMap = useMemo(() => {
    const m = new Map<string, Konzernstruktur>();
    konzernstruktur.forEach(r => m.set(r.record_id, r));
    return m;
  }, [konzernstruktur]);

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

  return { scope1DirekteEmissionen, setScope1DirekteEmissionen, scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen, emissionenSchnelleingabe, setEmissionenSchnelleingabe, ghgBerichtsuebersicht, setGhgBerichtsuebersicht, konzernstruktur, setKonzernstruktur, scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen, emissionsfaktoren, setEmissionsfaktoren, berichtsjahr, setBerichtsjahr, loading, error, fetchAll, konzernstrukturMap, emissionsfaktorenMap, berichtsjahrMap };
}