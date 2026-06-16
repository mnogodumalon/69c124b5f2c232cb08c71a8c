import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import Scope3WeitereIndirekteEmissionenPage from '@/pages/Scope3WeitereIndirekteEmissionenPage';
import Scope3WeitereIndirekteEmissionenDetailPage from '@/pages/Scope3WeitereIndirekteEmissionenDetailPage';
import EmissionsfaktorenPage from '@/pages/EmissionsfaktorenPage';
import EmissionsfaktorenDetailPage from '@/pages/EmissionsfaktorenDetailPage';
import BerichtsjahrPage from '@/pages/BerichtsjahrPage';
import BerichtsjahrDetailPage from '@/pages/BerichtsjahrDetailPage';
import Scope1DirekteEmissionenPage from '@/pages/Scope1DirekteEmissionenPage';
import Scope1DirekteEmissionenDetailPage from '@/pages/Scope1DirekteEmissionenDetailPage';
import Scope2IndirekteEnergieemissionenPage from '@/pages/Scope2IndirekteEnergieemissionenPage';
import Scope2IndirekteEnergieemissionenDetailPage from '@/pages/Scope2IndirekteEnergieemissionenDetailPage';
import EmissionenSchnelleingabePage from '@/pages/EmissionenSchnelleingabePage';
import EmissionenSchnelleingabeDetailPage from '@/pages/EmissionenSchnelleingabeDetailPage';
import GhgBerichtsuebersichtPage from '@/pages/GhgBerichtsuebersichtPage';
import GhgBerichtsuebersichtDetailPage from '@/pages/GhgBerichtsuebersichtDetailPage';
import KonzernstrukturPage from '@/pages/KonzernstrukturPage';
import KonzernstrukturDetailPage from '@/pages/KonzernstrukturDetailPage';
import PublicFormScope3WeitereIndirekteEmissionen from '@/pages/public/PublicForm_Scope3WeitereIndirekteEmissionen';
import PublicFormEmissionsfaktoren from '@/pages/public/PublicForm_Emissionsfaktoren';
import PublicFormBerichtsjahr from '@/pages/public/PublicForm_Berichtsjahr';
import PublicFormScope1DirekteEmissionen from '@/pages/public/PublicForm_Scope1DirekteEmissionen';
import PublicFormScope2IndirekteEnergieemissionen from '@/pages/public/PublicForm_Scope2IndirekteEnergieemissionen';
import PublicFormEmissionenSchnelleingabe from '@/pages/public/PublicForm_EmissionenSchnelleingabe';
import PublicFormGhgBerichtsuebersicht from '@/pages/public/PublicForm_GhgBerichtsuebersicht';
import PublicFormKonzernstruktur from '@/pages/public/PublicForm_Konzernstruktur';
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
              <Route path="public/69c12471ef7da5f0b841a1a3" element={<PublicFormScope3WeitereIndirekteEmissionen />} />
              <Route path="public/69c1246ebeed0889fed560e2" element={<PublicFormEmissionsfaktoren />} />
              <Route path="public/69c1246d7299804c440448fa" element={<PublicFormBerichtsjahr />} />
              <Route path="public/69c1246ff4e0dc2324ed9440" element={<PublicFormScope1DirekteEmissionen />} />
              <Route path="public/69c12470c2204e2aa999bcb8" element={<PublicFormScope2IndirekteEnergieemissionen />} />
              <Route path="public/69c124726ff6d54a56c2e81c" element={<PublicFormEmissionenSchnelleingabe />} />
              <Route path="public/69c124734278d3e6be1ca7c2" element={<PublicFormGhgBerichtsuebersicht />} />
              <Route path="public/69c124661ddc6ec52a6c2836" element={<PublicFormKonzernstruktur />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="scope-3-–-weitere-indirekte-emissionen" element={<Scope3WeitereIndirekteEmissionenPage />} />
                <Route path="scope-3-–-weitere-indirekte-emissionen/:id" element={<Scope3WeitereIndirekteEmissionenDetailPage />} />
                <Route path="emissionsfaktoren" element={<EmissionsfaktorenPage />} />
                <Route path="emissionsfaktoren/:id" element={<EmissionsfaktorenDetailPage />} />
                <Route path="berichtsjahr" element={<BerichtsjahrPage />} />
                <Route path="berichtsjahr/:id" element={<BerichtsjahrDetailPage />} />
                <Route path="scope-1-–-direkte-emissionen" element={<Scope1DirekteEmissionenPage />} />
                <Route path="scope-1-–-direkte-emissionen/:id" element={<Scope1DirekteEmissionenDetailPage />} />
                <Route path="scope-2-–-indirekte-energieemissionen" element={<Scope2IndirekteEnergieemissionenPage />} />
                <Route path="scope-2-–-indirekte-energieemissionen/:id" element={<Scope2IndirekteEnergieemissionenDetailPage />} />
                <Route path="emissionen-schnelleingabe" element={<EmissionenSchnelleingabePage />} />
                <Route path="emissionen-schnelleingabe/:id" element={<EmissionenSchnelleingabeDetailPage />} />
                <Route path="ghg-berichtsuebersicht" element={<GhgBerichtsuebersichtPage />} />
                <Route path="ghg-berichtsuebersicht/:id" element={<GhgBerichtsuebersichtDetailPage />} />
                <Route path="konzernstruktur" element={<KonzernstrukturPage />} />
                <Route path="konzernstruktur/:id" element={<KonzernstrukturDetailPage />} />
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
