import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Download,
  ArrowRight,
  Store,
  Clock,
} from 'lucide-react';
import { useCart } from './CartContext';
import { formatCents, addDays, formatDateES } from '../../utils/format';
import LocatorHint from '../../components/qa/LocatorHint';

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { latestOrder } = useCart();

  const estDate = formatDateES(addDays(new Date(), 3));

  return (
    <div data-testid="order-confirmation-page" className="max-w-3xl mx-auto space-y-6">
      {/* Tarjeta de Éxito Principal */}
      <section className="card p-8 text-center" data-testid="order-success-card">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-moss-600/10 text-moss-600 ring-4 ring-moss-600/20">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-moss-500">
          ¡Orden confirmada exitosamente!
        </p>
        <h2 className="mt-1 font-display text-3xl font-extrabold text-moss-900">
          Gracias por tu compra
        </h2>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-sm text-moss-600">Número de Pedido:</span>
          <span
            data-testid="order-confirmation-id"
            className="font-mono text-base font-bold text-moss-900 bg-moss-100 px-3 py-1 rounded-lg"
          >
            {orderId || latestOrder?.orderId || 'ORD-984210'}
          </span>
          <LocatorHint testId="order-confirmation-id" label="ID del pedido" />
        </div>

        <p className="mt-3 text-sm text-moss-600 max-w-md mx-auto">
          Hemos enviado un correo de confirmación con los detalles y el enlace para dar seguimiento
          en tiempo real a tu paquete.
        </p>

        {/* Línea de tiempo de entrega estimada */}
        <div className="mt-8 rounded-2xl bg-moss-50/80 p-4 border border-moss-200/80">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-moss-900">
            <Calendar className="h-4 w-4 text-moss-600" />
            <span>Entrega estimada para:</span>
            <strong data-testid="order-est-delivery" className="text-moss-700">
              {estDate}
            </strong>
          </div>
        </div>
      </section>

      {/* Resumen del pedido si está en contexto */}
      {latestOrder && (
        <section className="card p-6 space-y-5" data-testid="order-details-card">
          <h3 className="text-lg font-bold text-moss-900 border-b border-moss-200/80 pb-3">
            Detalles de la Transacción
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-moss-200 p-3 space-y-1">
              <span className="font-semibold text-moss-500 uppercase tracking-wider">Dirección:</span>
              <p className="font-bold text-moss-900 text-sm">
                {latestOrder.shippingAddress.firstName} {latestOrder.shippingAddress.lastName}
              </p>
              <p className="text-moss-700">{latestOrder.shippingAddress.street}</p>
              <p className="text-moss-700">
                {latestOrder.shippingAddress.city}, {latestOrder.shippingAddress.state} - CP{' '}
                {latestOrder.shippingAddress.postalCode}
              </p>
            </div>

            <div className="rounded-xl border border-moss-200 p-3 space-y-1">
              <span className="font-semibold text-moss-500 uppercase tracking-wider">Pago y Envío:</span>
              <p className="font-bold text-moss-900 text-sm">{latestOrder.paymentMethod}</p>
              <p className="text-moss-700">
                {latestOrder.shippingMethod.name} ({latestOrder.shippingMethod.deliveryTime})
              </p>
            </div>
          </div>

          {/* Tabla de Artículos Comprados */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-moss-500 mb-2">
              Artículos incluidos ({latestOrder.itemCount}):
            </h4>
            <div className="divide-y divide-moss-100 rounded-xl border border-moss-200 overflow-hidden text-xs">
              {latestOrder.items.map(({ product, qty }) => (
                <div
                  key={product.id}
                  data-testid={`order-item-${product.id}`}
                  className="p-3 flex justify-between items-center bg-white"
                >
                  <div>
                    <span className="font-bold text-moss-900">{product.name}</span>
                    <span className="block text-moss-500">
                      Cant: {qty} × {formatCents(product.priceCents)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-moss-900">
                    {formatCents(product.priceCents * qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose Final */}
          <div className="border-t border-moss-200/80 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-moss-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCents(latestOrder.subtotalCents)}</span>
            </div>
            {latestOrder.discountCents > 0 && (
              <div className="flex justify-between text-moss-700">
                <span>Descuento cupón:</span>
                <span className="font-mono">-{formatCents(latestOrder.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-moss-600">
              <span>Costo de envío:</span>
              <span className="font-mono">{formatCents(latestOrder.shippingCents)}</span>
            </div>
            <div className="flex justify-between text-moss-600">
              <span>Impuestos (8%):</span>
              <span className="font-mono">{formatCents(latestOrder.taxCents)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-moss-900 pt-2 border-t border-moss-200">
              <span>Total pagado:</span>
              <span data-testid="order-total-paid" className="font-mono text-moss-900">
                {formatCents(latestOrder.totalCents)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/ecommerce"
          data-testid="order-back-catalog-btn"
          className="btn btn-primary"
        >
          <Store className="h-4 w-4" /> Continuar Comprando
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          data-testid="order-download-receipt-btn"
          className="btn btn-secondary"
        >
          <Download className="h-4 w-4" /> Imprimir Comprobante
        </button>
      </div>
    </div>
  );
}
