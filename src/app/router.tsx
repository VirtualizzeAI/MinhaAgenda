import { Suspense, lazy } from 'react';
import { Center, Loader } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const PublicBookingPage = lazy(() => import('@/features/agenda/pages/PublicBookingPage').then((module) => ({ default: module.PublicBookingPage })));
const AppShellLayout = lazy(() => import('@/layouts/AppShellLayout').then((module) => ({ default: module.AppShellLayout })));
const AgendaPage = lazy(() => import('@/features/agenda/pages/AgendaPage').then((module) => ({ default: module.AgendaPage })));
const ClientsPage = lazy(() => import('@/features/clients/pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const ServicesPage = lazy(() => import('@/features/services/pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage').then((module) => ({ default: module.BillingPage })));
const ProfessionalsPage = lazy(() => import('@/features/professionals/pages/ProfessionalsPage').then((module) => ({ default: module.ProfessionalsPage })));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const WhatsappPage = lazy(() => import('@/features/whatsapp/pages/WhatsappPage').then((module) => ({ default: module.WhatsappPage })));

function RouteFallback() {
  return (
    <Center h="100dvh">
      <Loader color="teal" />
    </Center>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <Center h="100dvh">
        <Loader color="teal" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShellLayout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/comandas" element={<OrdersPage />} />
          <Route path="/cobrancas" element={<BillingPage />} />
          <Route path="/profissionais" element={<ProfessionalsPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/whatsapp" element={<WhatsappPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/agenda" replace />} />
        </Routes>
      </Suspense>
    </AppShellLayout>
  );
}

export function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/agenda" replace />
            ) : (
              <Suspense fallback={<RouteFallback />}>
                <LoginPage />
              </Suspense>
            )
          }
        />
        <Route
          path="/agendar/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PublicBookingPage />
            </Suspense>
          }
        />
        <Route
          path="/recuperar-senha"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
