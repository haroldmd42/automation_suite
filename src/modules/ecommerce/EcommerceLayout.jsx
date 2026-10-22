import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Store, CreditCard, Tag, Copy, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/Primitives';
import { useCart } from './CartContext';
import { cn, copyToClipboard } from '../../utils/format';
import { useState } from 'react';
import LocatorHint from '../../components/qa/LocatorHint';

export default function EcommerceLayout() {
  const { itemCount } = useCart();
  const location = useLocation();
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCoupon = async (code) => {
    if (await copyToClipboard(code)) {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    }
  };

  const navLinks = [
    { to: '/ecommerce', label: 'Catálogo de Productos', icon: Store, end: true, testId: 'ecom-nav-catalog' },
    {
      to: '/ecommerce/cart',
      label: `Carrito de Compras (${itemCount})`,
      icon: ShoppingCart,
      testId: 'ecom-nav-cart',
    },
    { to: '/ecommerce/checkout', label: 'Checkout Multi-Paso', icon: CreditCard, testId: 'ecom-nav-checkout' },
  ];

  return (
    <div data-testid="ecommerce-module-root">
      <PageHeader
        icon={ShoppingCart}
        eyebrow="Módulo 02"
        title="E-commerce y Carrito Dinámico"
        description="Práctica integral de flujos de compra: límites de stock, cupones con reglas de compra mínima/tope, cálculos precisos de impuestos y checkout multi-paso con validación de tarjetas bancarias (algoritmo de Luhn)."
        testId="ecommerce-header"
      >
        {/* Banner de cupones de prueba para automatizadores */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/10 p-3 text-xs text-moss-200">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Tag className="h-4 w-4 text-moss-400" /> Cupones de prueba:
          </span>
          {[
            { code: 'DESCUENTO10', label: '10% OFF' },
            { code: 'SUPER50', label: '50% (Tope $30, Min $100)' },
            { code: 'ENVIOFREE', label: 'Envío Gratis (Min $50)' },
            { code: 'EXPIRADO', label: 'Expirado' },
          ].map((c) => (
            <button
              key={c.code}
              type="button"
              data-testid={`coupon-badge-${c.code}`}
              onClick={() => copyCoupon(c.code)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black/30 px-2.5 py-1 font-mono text-[11px] font-medium text-moss-100 transition hover:bg-black/50 hover:text-white"
              title={`Copiar código ${c.code}`}
            >
              <span>{c.code}</span>
              <span className="text-moss-400">({c.label})</span>
              {copiedCode === c.code ? (
                <Check className="h-3 w-3 text-moss-400" />
              ) : (
                <Copy className="h-3 w-3 text-moss-400 opacity-70" />
              )}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Subnavegación de comercio */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-moss-200/80 pb-3">
        <nav className="flex items-center gap-2" aria-label="Secciones de tienda">
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.end
              ? location.pathname === tab.to
              : location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                data-testid={tab.testId}
                className={cn(
                  'btn btn-sm transition-all',
                  isActive ? 'btn-primary' : 'btn-secondary',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <LocatorHint testId="ecom-nav-cart" label="navegación al carrito" />
      </div>

      <Outlet />
    </div>
  );
}
