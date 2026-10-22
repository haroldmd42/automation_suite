import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { QAProvider } from './context/QAContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './modules/ecommerce/CartContext';
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
      <ToastProvider>
        <CartProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
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
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </CartProvider>
      </ToastProvider>
    </QAProvider>
  );
}
