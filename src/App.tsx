import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KonzernstrukturPage from '@/pages/KonzernstrukturPage';
import BerichtsjahrPage from '@/pages/BerichtsjahrPage';
import EmissionsfaktorenPage from '@/pages/EmissionsfaktorenPage';
import Scope1DirekteEmissionenPage from '@/pages/Scope1DirekteEmissionenPage';
import Scope2IndirekteEnergieemissionenPage from '@/pages/Scope2IndirekteEnergieemissionenPage';
import Scope3WeitereIndirekteEmissionenPage from '@/pages/Scope3WeitereIndirekteEmissionenPage';
import EmissionenSchnelleingabePage from '@/pages/EmissionenSchnelleingabePage';
import GhgBerichtsuebersichtPage from '@/pages/GhgBerichtsuebersichtPage';

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="konzernstruktur" element={<KonzernstrukturPage />} />
            <Route path="berichtsjahr" element={<BerichtsjahrPage />} />
            <Route path="emissionsfaktoren" element={<EmissionsfaktorenPage />} />
            <Route path="scope-1-–-direkte-emissionen" element={<Scope1DirekteEmissionenPage />} />
            <Route path="scope-2-–-indirekte-energieemissionen" element={<Scope2IndirekteEnergieemissionenPage />} />
            <Route path="scope-3-–-weitere-indirekte-emissionen" element={<Scope3WeitereIndirekteEmissionenPage />} />
            <Route path="emissionen-schnelleingabe" element={<EmissionenSchnelleingabePage />} />
            <Route path="ghg-berichtsuebersicht" element={<GhgBerichtsuebersichtPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
