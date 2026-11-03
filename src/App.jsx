import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { QAProvider } from './context/QAContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './modules/ecommerce/CartContext';
import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
import Dashboard from './modules/dashboard/Dashboard';
import NotFound from './modules/NotFound';
import { Spinner } from './components/ui/Primitives';

// Code splitting por módulo.
const AuthModule = lazy(() => import('./modules/auth/AuthModule'));
const EcommerceLayout = lazy(() => import('./modules/ecommerce/EcommerceLayout'));
const Catalog = lazy(() => import('./modules/ecommerce/Catalog'));
const CartPage = lazy(() => import('./modules/ecommerce/CartPage'));
const Checkout = lazy(() => import('./modules/ecommerce/Checkout'));
const OrderConfirmation = lazy(() => import('./modules/ecommerce/OrderConfirmation'));
const ControlsModule = lazy(() => import('./modules/controls/ControlsModule'));
const AsyncModule = lazy(() => import('./modules/async/AsyncModule'));
const DataTableModule = lazy(() => import('./modules/tables/DataTableModule'));
const UsersModule = lazy(() => import('./modules/users/UsersModule'));
const RealLoginPage = lazy(() => import('./modules/auth/RealLoginPage'));
const SupabaseUsersModule = lazy(() => import('./modules/portal/SupabaseUsersModule'));
const PortalAuditPage = lazy(() => import('./modules/portal/PortalAuditPage'));
const PortalProfilePage = lazy(() => import('./modules/portal/PortalProfilePage'));
const QaPlansModule = lazy(() => import('./modules/portal/QaPlansModule'));
const QaAutomationSetsModule = lazy(() => import('./modules/portal/QaAutomationSetsModule'));
const QaTestCasesSheetModule = lazy(() => import('./modules/portal/QaTestCasesSheetModule'));
const QaTestExecutionModule = lazy(() => import('./modules/portal/QaTestExecutionModule'));
const DevReleasesModule = lazy(() => import('./modules/portal/DevReleasesModule'));
const DevOpsPipelinesModule = lazy(() => import('./modules/portal/DevOpsPipelinesModule'));
const SecurityComplianceModule = lazy(() => import('./modules/portal/SecurityComplianceModule'));
const SupportTicketsModule = lazy(() => import('./modules/portal/SupportTicketsModule'));
const FileUploadModule = lazy(() => import('./modules/upload/FileUploadModule'));

import ProtectedRoute from './components/auth/ProtectedRoute';

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-moss-600" data-testid="route-loading">
      <Spinner className="h-5 w-5" /> Cargando módulo...
    </div>
  );
}

export default function App() {
  return (
    <QAProvider>
      <SupabaseAuthProvider>
        <ToastProvider>
          <CartProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="login" element={<RealLoginPage />} />

                  {/* Portal Cloud Empresarial (Protegido con Supabase Auth y RBAC estricto por Rol) */}
                  <Route path="portal" element={<ProtectedRoute />}>
                    <Route
                      path="users"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <SupabaseUsersModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="audit"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <PortalAuditPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="qa-plans"
                      element={
                        <ProtectedRoute allowedRoles={['qa_lead']}>
                          <QaPlansModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="qa-automation-sets"
                      element={
                        <ProtectedRoute allowedRoles={['qa_analyst']}>
                          <QaAutomationSetsModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="qa-test-cases"
                      element={
                        <ProtectedRoute allowedRoles={['qa_analyst']}>
                          <QaTestCasesSheetModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="qa-test-execution"
                      element={
                        <ProtectedRoute allowedRoles={['qa_analyst']}>
                          <QaTestExecutionModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="dev-releases"
                      element={
                        <ProtectedRoute allowedRoles={['developer']}>
                          <DevReleasesModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="devops-pipelines"
                      element={
                        <ProtectedRoute allowedRoles={['devops']}>
                          <DevOpsPipelinesModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="security-compliance"
                      element={
                        <ProtectedRoute allowedRoles={['auditor']}>
                          <SecurityComplianceModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="support-tickets"
                      element={
                        <ProtectedRoute allowedRoles={['support']}>
                          <SupportTicketsModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ProtectedRoute allowedRoles={['*']}>
                          <PortalProfilePage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>
                  <Route path="users" element={<UsersModule />} />
                  <Route path="auth" element={<AuthModule />} />
                  <Route path="ecommerce" element={<EcommerceLayout />}>
                    <Route index element={<Catalog />} />
                    <Route path="cart" element={<CartPage />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="order/:orderId" element={<OrderConfirmation />} />
                  </Route>
                  <Route path="controls" element={<ControlsModule />} />
                  <Route path="async" element={<AsyncModule />} />
                  <Route path="tables" element={<DataTableModule />} />
                  <Route path="upload" element={<FileUploadModule />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </CartProvider>
        </ToastProvider>
      </SupabaseAuthProvider>
    </QAProvider>
  );
}
