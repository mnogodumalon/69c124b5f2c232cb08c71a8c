import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import Scope1DirekteEmissionenPage from '@/pages/Scope1DirekteEmissionenPage';
import Scope2IndirekteEnergieemissionenPage from '@/pages/Scope2IndirekteEnergieemissionenPage';
import EmissionenSchnelleingabePage from '@/pages/EmissionenSchnelleingabePage';
import GhgBerichtsuebersichtPage from '@/pages/GhgBerichtsuebersichtPage';
import KonzernstrukturPage from '@/pages/KonzernstrukturPage';
import Scope3WeitereIndirekteEmissionenPage from '@/pages/Scope3WeitereIndirekteEmissionenPage';
import EmissionsfaktorenPage from '@/pages/EmissionsfaktorenPage';
import BerichtsjahrPage from '@/pages/BerichtsjahrPage';
import PublicFormScope1DirekteEmissionen from '@/pages/public/PublicForm_Scope1DirekteEmissionen';
import PublicFormScope2IndirekteEnergieemissionen from '@/pages/public/PublicForm_Scope2IndirekteEnergieemissionen';
import PublicFormEmissionenSchnelleingabe from '@/pages/public/PublicForm_EmissionenSchnelleingabe';
import PublicFormGhgBerichtsuebersicht from '@/pages/public/PublicForm_GhgBerichtsuebersicht';
import PublicFormKonzernstruktur from '@/pages/public/PublicForm_Konzernstruktur';
import PublicFormScope3WeitereIndirekteEmissionen from '@/pages/public/PublicForm_Scope3WeitereIndirekteEmissionen';
import PublicFormEmissionsfaktoren from '@/pages/public/PublicForm_Emissionsfaktoren';
import PublicFormBerichtsjahr from '@/pages/public/PublicForm_Berichtsjahr';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69c1246ff4e0dc2324ed9440" element={<PublicFormScope1DirekteEmissionen />} />
              <Route path="public/69c12470c2204e2aa999bcb8" element={<PublicFormScope2IndirekteEnergieemissionen />} />
              <Route path="public/69c124726ff6d54a56c2e81c" element={<PublicFormEmissionenSchnelleingabe />} />
              <Route path="public/69c124734278d3e6be1ca7c2" element={<PublicFormGhgBerichtsuebersicht />} />
              <Route path="public/69c124661ddc6ec52a6c2836" element={<PublicFormKonzernstruktur />} />
              <Route path="public/69c12471ef7da5f0b841a1a3" element={<PublicFormScope3WeitereIndirekteEmissionen />} />
              <Route path="public/69c1246ebeed0889fed560e2" element={<PublicFormEmissionsfaktoren />} />
              <Route path="public/69c1246d7299804c440448fa" element={<PublicFormBerichtsjahr />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="scope-1-–-direkte-emissionen" element={<Scope1DirekteEmissionenPage />} />
                <Route path="scope-2-–-indirekte-energieemissionen" element={<Scope2IndirekteEnergieemissionenPage />} />
                <Route path="emissionen-schnelleingabe" element={<EmissionenSchnelleingabePage />} />
                <Route path="ghg-berichtsuebersicht" element={<GhgBerichtsuebersichtPage />} />
                <Route path="konzernstruktur" element={<KonzernstrukturPage />} />
                <Route path="scope-3-–-weitere-indirekte-emissionen" element={<Scope3WeitereIndirekteEmissionenPage />} />
                <Route path="emissionsfaktoren" element={<EmissionsfaktorenPage />} />
                <Route path="berichtsjahr" element={<BerichtsjahrPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
              {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
