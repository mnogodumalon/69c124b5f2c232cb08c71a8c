import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Konzernstruktur, Berichtsjahr, Emissionsfaktoren, Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, Scope3WeitereIndirekteEmissionen, EmissionenSchnelleingabe, GhgBerichtsuebersicht } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [konzernstruktur, setKonzernstruktur] = useState<Konzernstruktur[]>([]);
  const [berichtsjahr, setBerichtsjahr] = useState<Berichtsjahr[]>([]);
  const [emissionsfaktoren, setEmissionsfaktoren] = useState<Emissionsfaktoren[]>([]);
  const [scope1DirekteEmissionen, setScope1DirekteEmissionen] = useState<Scope1DirekteEmissionen[]>([]);
  const [scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen] = useState<Scope2IndirekteEnergieemissionen[]>([]);
  const [scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen] = useState<Scope3WeitereIndirekteEmissionen[]>([]);
  const [emissionenSchnelleingabe, setEmissionenSchnelleingabe] = useState<EmissionenSchnelleingabe[]>([]);
  const [ghgBerichtsuebersicht, setGhgBerichtsuebersicht] = useState<GhgBerichtsuebersicht[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [konzernstrukturData, berichtsjahrData, emissionsfaktorenData, scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, scope3WeitereIndirekteEmissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData] = await Promise.all([
        LivingAppsService.getKonzernstruktur(),
        LivingAppsService.getBerichtsjahr(),
        LivingAppsService.getEmissionsfaktoren(),
        LivingAppsService.getScope1DirekteEmissionen(),
        LivingAppsService.getScope2IndirekteEnergieemissionen(),
        LivingAppsService.getScope3WeitereIndirekteEmissionen(),
        LivingAppsService.getEmissionenSchnelleingabe(),
        LivingAppsService.getGhgBerichtsuebersicht(),
      ]);
      setKonzernstruktur(konzernstrukturData);
      setBerichtsjahr(berichtsjahrData);
      setEmissionsfaktoren(emissionsfaktorenData);
      setScope1DirekteEmissionen(scope1DirekteEmissionenData);
      setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
      setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
      setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
      setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
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
        const [konzernstrukturData, berichtsjahrData, emissionsfaktorenData, scope1DirekteEmissionenData, scope2IndirekteEnergieemissionenData, scope3WeitereIndirekteEmissionenData, emissionenSchnelleingabeData, ghgBerichtsuebersichtData] = await Promise.all([
          LivingAppsService.getKonzernstruktur(),
          LivingAppsService.getBerichtsjahr(),
          LivingAppsService.getEmissionsfaktoren(),
          LivingAppsService.getScope1DirekteEmissionen(),
          LivingAppsService.getScope2IndirekteEnergieemissionen(),
          LivingAppsService.getScope3WeitereIndirekteEmissionen(),
          LivingAppsService.getEmissionenSchnelleingabe(),
          LivingAppsService.getGhgBerichtsuebersicht(),
        ]);
        setKonzernstruktur(konzernstrukturData);
        setBerichtsjahr(berichtsjahrData);
        setEmissionsfaktoren(emissionsfaktorenData);
        setScope1DirekteEmissionen(scope1DirekteEmissionenData);
        setScope2IndirekteEnergieemissionen(scope2IndirekteEnergieemissionenData);
        setScope3WeitereIndirekteEmissionen(scope3WeitereIndirekteEmissionenData);
        setEmissionenSchnelleingabe(emissionenSchnelleingabeData);
        setGhgBerichtsuebersicht(ghgBerichtsuebersichtData);
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

  const berichtsjahrMap = useMemo(() => {
    const m = new Map<string, Berichtsjahr>();
    berichtsjahr.forEach(r => m.set(r.record_id, r));
    return m;
  }, [berichtsjahr]);

  const emissionsfaktorenMap = useMemo(() => {
    const m = new Map<string, Emissionsfaktoren>();
    emissionsfaktoren.forEach(r => m.set(r.record_id, r));
    return m;
  }, [emissionsfaktoren]);

  return { konzernstruktur, setKonzernstruktur, berichtsjahr, setBerichtsjahr, emissionsfaktoren, setEmissionsfaktoren, scope1DirekteEmissionen, setScope1DirekteEmissionen, scope2IndirekteEnergieemissionen, setScope2IndirekteEnergieemissionen, scope3WeitereIndirekteEmissionen, setScope3WeitereIndirekteEmissionen, emissionenSchnelleingabe, setEmissionenSchnelleingabe, ghgBerichtsuebersicht, setGhgBerichtsuebersicht, loading, error, fetchAll, konzernstrukturMap, berichtsjahrMap, emissionsfaktorenMap };
}