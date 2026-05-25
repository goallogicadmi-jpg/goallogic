import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../layout/Layout";
import Leagues from "../pages/Leagues";
import CompetitionDomainPage from "../pages/CompetitionDomainPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import PaymentSuccess from "../pages/PaymentSuccess";
import PaymentCancel from "../pages/PaymentCancel";
import AvisoLegalPage from "../pages/AvisoLegalPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import MiCuenta from "../components/MiCuenta/MiCuenta";
import logoUrl from "../assets/images/goal-logic-logo.png";

const LeagueDetails = lazy(() => import("../pages/LeagueDetails"));
const Teams = lazy(() => import("../pages/Teams"));
const TeamDetails = lazy(() => import("../pages/TeamDetails"));
const EquipoPage = lazy(() => import("../pages/EquipoPage"));
const DomainTeamPage = lazy(() => import("../pages/DomainTeamPage"));
const DomainMatchesPage = lazy(() => import("../pages/DomainMatchesPage"));
const EstadisticasDashboard = lazy(() => import("../components/EstadisticasDashboard"));
const JugadoresList = lazy(() => import("../pages/JugadoresList"));
const JugadorProfile = lazy(() => import("../pages/JugadorProfile"));
const Predicciones = lazy(() => import("../pages/Predicciones"));
const Partidos = lazy(() => import("../pages/Partidos"));
const AdminPanel = lazy(() => import("../components/AdminPanel/AdminPanel"));
const CommunityLayout = lazy(() => import("../pages/community/CommunityLayout"));

const routeFallback = (
  <div
    style={{
      padding: "2.5rem",
      textAlign: "center",
      color: "var(--text-secondary, #aaa)",
      minHeight: "40vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    role="status"
    aria-live="polite"
  >
    <div>
      <img
        src={logoUrl}
        alt=""
        width={48}
        height={48}
        decoding="async"
        style={{ opacity: 0.85, marginBottom: "0.75rem" }}
      />
      <p style={{ margin: 0 }}>Cargando…</p>
    </div>
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/clubes" replace />} />
            <Route path="/ligas" element={<Navigate to="/clubes" replace />} />
            <Route path="/torneos" element={<Leagues />} />
            <Route path="/clubes" element={<CompetitionDomainPage domain="club" />} />
            <Route path="/selecciones" element={<CompetitionDomainPage domain="selection" />} />
            <Route path="/clubes/partidos" element={<DomainMatchesPage domain="club" />} />
            <Route path="/selecciones/partidos" element={<DomainMatchesPage domain="selection" />} />
            <Route path="/clubes/competicion/:leagueId" element={<LeagueDetails domain="club" />} />
            <Route path="/selecciones/competicion/:leagueId" element={<LeagueDetails domain="selection" />} />
            <Route path="/clubes/equipo/:teamId" element={<DomainTeamPage domain="club" />} />
            <Route path="/selecciones/equipo/:teamId" element={<DomainTeamPage domain="selection" />} />
            <Route path="/league/:leagueId" element={<LeagueDetails />} />
            <Route path="/ligas/:liga/teams" element={<Teams />} />
            <Route path="/ligas/:liga/teams/:equipo" element={<TeamDetails />} />
            <Route path="/equipo/:id" element={<EquipoPage />} />
            <Route path="/estadisticas" element={<EstadisticasDashboard />} />
            <Route
              path="/predicciones"
              element={
                <ProtectedRoute>
                  <Predicciones />
                </ProtectedRoute>
              }
            />
            <Route path="/partidos" element={<Partidos />} />
            <Route path="/matches" element={<Navigate to="/partidos" replace />} />
            <Route path="/jugadores/:teamId" element={<JugadoresList />} />
            <Route path="/jugador/:playerId" element={<JugadorProfile />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
            <Route path="/pago-cancelado" element={<PaymentCancel />} />
            {/* Rutas legacy (Stripe antiguo / enlaces guardados) */}
            <Route path="/success" element={<PaymentSuccess />} />
            <Route path="/cancel" element={<PaymentCancel />} />
            <Route path="/aviso-legal" element={<AvisoLegalPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/cuenta" element={<MiCuenta />} />
            <Route path="/micuenta" element={<Navigate to="/cuenta" replace />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route
              path="/comunidad/*"
              element={
                <ProtectedRoute>
                  <CommunityLayout />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
