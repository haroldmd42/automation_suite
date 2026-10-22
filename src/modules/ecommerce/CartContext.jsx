import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { PRODUCTS, COUPONS, SHIPPING_METHODS } from './products';
import { useToast } from '../../context/ToastContext';

const CartContext = createContext(null);
const STORAGE_KEY = 'qa_ecommerce_cart';
const COUPON_KEY = 'qa_ecommerce_coupon';
const SHIPPING_KEY = 'qa_ecommerce_shipping';

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    // Verificar que los productos aún existan
    return items
      .map((item) => {
        const prod = PRODUCTS.find((p) => p.id === item.id);
        return prod ? { product: prod, qty: Math.min(item.qty, prod.stock) } : null;
      })
      .filter((x) => x && x.qty > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const toast = useToast();
  const [items, setItems] = useState(loadInitialCart);
  const [couponCode, setCouponCode] = useState(() => {
    try {
      return localStorage.getItem(COUPON_KEY) || null;
    } catch {
      return null;
    }
  });
  const [shippingId, setShippingId] = useState(() => {
    try {
      return localStorage.getItem(SHIPPING_KEY) || 'standard';
    } catch {
      return 'standard';
    }
  });
  const [latestOrder, setLatestOrder] = useState(null);

  // Sincronizar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.map((i) => ({ id: i.product.id, qty: i.qty }))),
      );
    } catch {
      /* ignore */
    }
  }, [items]);

  useEffect(() => {
    try {
      if (couponCode) localStorage.setItem(COUPON_KEY, couponCode);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, [couponCode]);

  useEffect(() => {
    try {
      localStorage.setItem(SHIPPING_KEY, shippingId);
    } catch {
      /* ignore */
    }
  }, [shippingId]);

  const addToCart = useCallback(
    (product, qtyToAdd = 1) => {
      if (product.stock <= 0) {
        toast.error('Producto agotado', `"${product.name}" no tiene existencias.`);
        return false;
      }

      let success = true;
      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        const currentQty = existing ? existing.qty : 0;
        let newQty = currentQty + qtyToAdd;

        // Validar límite por pedido
        if (product.maxPerOrder && newQty > product.maxPerOrder) {
          toast.warning(
            'Límite por pedido alcanzado',
            `Máximo ${product.maxPerOrder} unidades de "${product.name}" por compra.`,
          );
          newQty = product.maxPerOrder;
          if (newQty === currentQty) {
            success = false;
            return prev;
          }
        }

        // Validar stock disponible
        if (newQty > product.stock) {
          toast.warning(
            'Stock limitado',
            `Solo hay ${product.stock} unidades disponibles de "${product.name}".`,
          );
          newQty = product.stock;
          if (newQty === currentQty) {
            success = false;
            return prev;
          }
        }

        if (existing) {
          return prev.map((i) => (i.product.id === product.id ? { ...i, qty: newQty } : i));
        }
        return [...prev, { product, qty: newQty }];
      });

      if (success) {
        toast.success(
          'Agregado al carrito',
          `Se añadió "${product.name}" (${qtyToAdd} ud.)`,
          { duration: 2500 },
        );
      }
      return success;
    },
    [toast],
  );

  const updateQty = useCallback(
    (productId, targetQty) => {
      const parsedQty = parseInt(targetQty, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        // Remover del carrito si es 0 o negativo
        setItems((prev) => prev.filter((i) => i.product.id !== productId));
        toast.info('Producto removido del carrito');
        return;
      }

      setItems((prev) =>
        prev.map((i) => {
          if (i.product.id !== productId) return i;
          let newQty = parsedQty;
          if (newQty > i.product.stock) {
            toast.warning('Stock máximo alcanzado', `Solo hay ${i.product.stock} unidades.`);
            newQty = i.product.stock;
          }
          if (i.product.maxPerOrder && newQty > i.product.maxPerOrder) {
            toast.warning(
              'Límite por pedido',
              `Máximo permitido: ${i.product.maxPerOrder} unidades.`,
            );
            newQty = i.product.maxPerOrder;
          }
          return { ...i, qty: newQty };
        }),
      );
    },
    [toast],
  );

  const removeFromCart = useCallback(
    (productId) => {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      toast.info('Artículo eliminado del carrito');
    },
    [toast],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COUPON_KEY);
  }, []);

  // Cálculos matemáticos en centavos
  const subtotalCents = useMemo(() => {
    return items.reduce((acc, item) => acc + item.product.priceCents * item.qty, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.qty, 0);
  }, [items]);

  // Validación de cupón aplicado
  const couponResult = useMemo(() => {
    if (!couponCode) return { valid: false, coupon: null, discountCents: 0, reason: null };
    const found = COUPONS[couponCode.toUpperCase().trim()];
    if (!found) {
      return { valid: false, coupon: null, discountCents: 0, reason: 'Cupón no existe o código inválido' };
    }
    if (found.expired) {
      return { valid: false, coupon: found, discountCents: 0, reason: 'El cupón ha expirado' };
    }
    if (found.minSpendCents && subtotalCents < found.minSpendCents) {
      return {
        valid: false,
        coupon: found,
        discountCents: 0,
        reason: `Requiere una compra mínima de $${(found.minSpendCents / 100).toFixed(2)}`,
      };
    }

    let discount = 0;
    if (found.type === 'percent') {
      discount = Math.round((subtotalCents * found.percent) / 100);
      if (found.maxDiscountCents && discount > found.maxDiscountCents) {
        discount = found.maxDiscountCents;
      }
    } else if (found.type === 'fixed') {
      discount = Math.min(found.amountCents, subtotalCents);
    }

    return { valid: true, coupon: found, discountCents: discount, reason: null };
  }, [couponCode, subtotalCents]);

  const applyCoupon = useCallback((code) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return { ok: false, message: 'Ingresa un código de cupón' };
    const c = COUPONS[clean];
    if (!c) return { ok: false, message: 'Cupón inválido o inexistente' };
    if (c.expired) return { ok: false, message: 'Este cupón ha expirado' };
    setCouponCode(clean);
    return { ok: true, coupon: c };
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponCode(null);
  }, []);

  // Método de envío seleccionado
  const selectedShipping = useMemo(() => {
    return SHIPPING_METHODS.find((s) => s.id === shippingId) || SHIPPING_METHODS[0];
  }, [shippingId]);

  const shippingCents = useMemo(() => {
    if (items.length === 0) return 0;
    // Si tiene cupón ENVIOFREE y cumple condiciones
    if (
      couponResult.valid &&
      couponResult.coupon?.type === 'free_shipping' &&
      shippingId === 'standard'
    ) {
      return 0;
    }
    return selectedShipping.costCents;
  }, [items.length, couponResult, shippingId, selectedShipping]);

  // Impuestos (8% sobre base imponible)
  const taxableBase = Math.max(0, subtotalCents - couponResult.discountCents);
  const taxCents = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round(taxableBase * 0.08);
  }, [items.length, taxableBase]);

  const totalCents = useMemo(() => {
    if (items.length === 0) return 0;
    return taxableBase + shippingCents + taxCents;
  }, [items.length, taxableBase, shippingCents, taxCents]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotalCents,
      discountCents: couponResult.discountCents,
      shippingCents,
      taxCents,
      totalCents,
      couponCode,
      couponResult,
      shippingId,
      selectedShipping,
      latestOrder,
      setLatestOrder,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
      setShippingId,
    }),
    [
      items,
      itemCount,
      subtotalCents,
      couponResult,
      shippingCents,
      taxCents,
      totalCents,
      couponCode,
      shippingId,
      selectedShipping,
      latestOrder,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
