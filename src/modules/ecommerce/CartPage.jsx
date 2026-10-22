import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useCart } from './CartContext';
import { formatCents, cn } from '../../utils/format';
import { Field } from '../../components/ui/Field';
import LocatorHint from '../../components/qa/LocatorHint';
import { Alert, Spinner } from '../../components/ui/Primitives';

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    couponCode,
    couponResult,
    updateQty,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [inputCode, setInputCode] = useState('');
  const [couponError, setCouponError] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setCouponError('Por favor ingresa un código de cupón.');
      return;
    }
    setIsApplying(true);
    setCouponError(null);

    setTimeout(() => {
      const res = applyCoupon(inputCode);
      if (!res.ok) {
        setCouponError(res.message);
      } else {
        setInputCode('');
      }
      setIsApplying(false);
    }, 400);
  };

  if (items.length === 0) {
    return (
      <div
        className="card flex flex-col items-center justify-center p-12 text-center"
        data-testid="cart-empty"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-moss-100 text-moss-600 shadow-soft">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-moss-900">Tu carrito está vacío</h2>
        <p className="mt-2 max-w-sm text-sm text-moss-600">
          Explora nuestro catálogo y agrega productos para simular flujos de compra, cálculos de
          totales y validaciones de pago.
        </p>
        <Link
          to="/ecommerce"
          data-testid="cart-empty-browse-btn"
          className="btn btn-primary btn-lg mt-6"
        >
          <Package className="h-4 w-4" /> Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* Columna Izquierda: Tabla de Productos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-moss-900">
            Artículos en el carrito ({itemCount})
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCart}
              data-testid="cart-clear-btn"
              className="btn btn-ghost btn-sm text-xs text-danger-600 hover:bg-danger-50 hover:text-danger-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Vaciar carrito
            </button>
            <LocatorHint testId="cart-clear-btn" />
          </div>
        </div>

        {/* Tabla Responsive de Ítems */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="cart-table">
              <thead className="border-b border-moss-200/80 bg-moss-50/60 text-xs font-semibold uppercase text-moss-600">
                <tr>
                  <th className="table-th">Producto</th>
                  <th className="table-th">Precio Unit.</th>
                  <th className="table-th text-center">Cantidad</th>
                  <th className="table-th text-right">Subtotal</th>
                  <th className="table-th text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss-100">
                {items.map(({ product, qty }) => {
                  const isMax = product.maxPerOrder && qty >= product.maxPerOrder;
                  const isStockCap = qty >= product.stock;

                  return (
                    <tr
                      key={product.id}
                      data-testid={`cart-item-${product.id}`}
                      className="transition-colors hover:bg-moss-50/30"
                    >
                      {/* Información del producto */}
                      <td className="table-td max-w-xs">
                        <div className="font-semibold text-moss-900" data-testid={`cart-item-title-${product.id}`}>
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-moss-500 font-mono mt-0.5">
                          <span>SKU: {product.sku}</span>
                          <span>·</span>
                          <span>Stock: {product.stock}</span>
                        </div>
                        {isMax && (
                          <span
                            data-testid={`cart-item-limit-warn-${product.id}`}
                            className="inline-block mt-1 text-[11px] font-medium text-warning-700"
                          >
                            Máximo permitido por orden: {product.maxPerOrder} ud.
                          </span>
                        )}
                      </td>

                      {/* Precio Unitario */}
                      <td
                        className="table-td font-medium text-moss-800"
                        data-testid={`cart-item-unit-price-${product.id}`}
                      >
                        {formatCents(product.priceCents)}
                      </td>

                      {/* Controles de Cantidad */}
                      <td className="table-td">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(product.id, qty - 1)}
                            data-testid={`cart-qty-decrease-${product.id}`}
                            aria-label={`Disminuir cantidad de ${product.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-moss-300 text-moss-700 transition hover:bg-moss-100 disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={product.maxPerOrder || product.stock}
                            value={qty}
                            onChange={(e) => updateQty(product.id, e.target.value)}
                            data-testid={`cart-qty-input-${product.id}`}
                            aria-label={`Cantidad de ${product.name}`}
                            className="h-8 w-12 rounded-lg border border-moss-300 bg-white text-center font-bold text-moss-900 focus:border-moss-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(product.id, qty + 1)}
                            disabled={isMax || isStockCap}
                            data-testid={`cart-qty-increase-${product.id}`}
                            aria-label={`Aumentar cantidad de ${product.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-moss-300 text-moss-700 transition hover:bg-moss-100 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Subtotal del Ítem */}
                      <td
                        className="table-td text-right font-display font-bold text-moss-900"
                        data-testid={`cart-item-total-${product.id}`}
                      >
                        {formatCents(product.priceCents * qty)}
                      </td>

                      {/* Eliminar Ítem */}
                      <td className="table-td text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          data-testid={`cart-item-remove-${product.id}`}
                          aria-label={`Eliminar ${product.name} del carrito`}
                          className="rounded-lg p-1.5 text-moss-400 transition hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección de Cupón de Descuento */}
        <div className="card p-5" data-testid="cart-coupon-section">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-moss-600" />
            <h3 className="font-semibold text-moss-900 text-sm">¿Tienes un cupón de descuento?</h3>
            <LocatorHint testId="coupon-input" />
          </div>

          {couponCode ? (
            <div
              className={cn(
                'flex items-center justify-between rounded-xl p-3 text-sm',
                couponResult.valid
                  ? 'bg-moss-50 border border-moss-300 text-moss-900'
                  : 'bg-warning-50 border border-warning-300 text-warning-800',
              )}
              data-testid="coupon-applied-container"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={cn(
                    'h-4 w-4',
                    couponResult.valid ? 'text-moss-600' : 'text-warning-600',
                  )}
                />
                <div>
                  <span className="font-mono font-bold" data-testid="coupon-applied-badge">
                    {couponCode}
                  </span>
                  {couponResult.valid ? (
                    <span className="ml-2 text-xs text-moss-600">
                      ({couponResult.coupon.description})
                    </span>
                  ) : (
                    <span className="ml-2 text-xs text-warning-700">
                      ({couponResult.reason})
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                data-testid="coupon-remove-btn"
                className="text-xs font-semibold text-danger-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2" noValidate>
              <div className="flex-1">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Ej: DESCUENTO10, SUPER50..."
                  data-testid="coupon-input"
                  className="input uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isApplying}
                data-testid="coupon-apply-btn"
                className="btn btn-secondary shrink-0"
              >
                {isApplying ? <Spinner className="h-4 w-4" /> : 'Aplicar'}
              </button>
            </form>
          )}

          {couponError && (
            <p
              className="mt-2 flex items-center gap-1.5 text-xs text-danger-600"
              data-testid="coupon-error"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{couponError}</span>
            </p>
          )}
        </div>
      </section>

      {/* Columna Derecha: Resumen de la Orden */}
      <section className="space-y-4">
        <div className="card p-6" data-testid="order-summary-panel">
          <div className="flex items-center justify-between border-b border-moss-200/80 pb-4">
            <h3 className="text-lg font-bold text-moss-900">Resumen del Pedido</h3>
            <LocatorHint testId="summary-total" label="total del pedido" />
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {/* Subtotal */}
            <div className="flex justify-between text-moss-700">
              <span>Subtotal ({itemCount} productos)</span>
              <span className="font-semibold text-moss-900" data-testid="summary-subtotal">
                {formatCents(subtotalCents)}
              </span>
            </div>

            {/* Descuento por Cupón */}
            {discountCents > 0 && (
              <div className="flex justify-between text-moss-700">
                <span className="flex items-center gap-1 text-moss-700">
                  <Tag className="h-3.5 w-3.5 text-moss-600" /> Descuento cupón
                </span>
                <span className="font-semibold text-moss-700" data-testid="summary-discount">
                  -{formatCents(discountCents)}
                </span>
              </div>
            )}

            {/* Envío Estimado */}
            <div className="flex justify-between text-moss-700">
              <span>Envío estándar estimado</span>
              <span className="font-semibold text-moss-900" data-testid="summary-shipping">
                {shippingCents === 0 ? (
                  <span className="badge badge-green text-[10px]">GRATIS</span>
                ) : (
                  formatCents(shippingCents)
                )}
              </span>
            </div>

            {/* Impuestos (8%) */}
            <div className="flex justify-between text-moss-700">
              <span>Impuestos estimados (8%)</span>
              <span className="font-semibold text-moss-900" data-testid="summary-tax">
                {formatCents(taxCents)}
              </span>
            </div>

            {/* Total Final */}
            <div className="border-t border-moss-200 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-moss-900">Total</span>
                <span
                  data-testid="summary-total"
                  className="font-display text-2xl font-extrabold text-moss-900"
                >
                  {formatCents(totalCents)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-moss-500 text-right">
                Cálculos protegidos en centavos enteros
              </p>
            </div>
          </div>

          {/* Botón de Checkout */}
          <div className="mt-6 space-y-2">
            <Link
              to="/ecommerce/checkout"
              data-testid="cart-checkout-btn"
              className="btn btn-primary btn-lg w-full"
            >
              <span>Proceder al Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/ecommerce"
              data-testid="cart-continue-shopping-btn"
              className="btn btn-ghost btn-sm w-full text-xs text-moss-700"
            >
              Seguir comprando
            </Link>
          </div>

          {/* Garantías QA */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-moss-50 p-3 text-xs text-moss-600">
            <ShieldCheck className="h-4 w-4 text-moss-600 shrink-0" />
            <span>Simulador seguro: No se realizan cargos reales.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
