import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  ShoppingCart,
  Star,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Package,
} from 'lucide-react';
import { PRODUCTS, CATEGORIES } from './products';
import { useCart } from './CartContext';
import { formatCents, cn } from '../../utils/format';
import { useDebounce } from '../../hooks/common';
import { simulateRequest } from '../../services/network';
import Modal from '../../components/ui/Modal';
import { Field, Checkbox } from '../../components/ui/Field';
import LocatorHint from '../../components/qa/LocatorHint';
import { Spinner, Skeleton } from '../../components/ui/Primitives';

export default function Catalog() {
  const { addToCart, items } = useCart();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(false);

  // Modal de detalles de producto
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [addingId, setAddingId] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 350);

  // Filtrado síncrono inicial derivado
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (inStockOnly && p.stock <= 0) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesSku) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceCents - b.priceCents;
      if (sortBy === 'price_desc') return b.priceCents - a.priceCents;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // featured
    });
  }, [selectedCategory, inStockOnly, debouncedSearch, sortBy]);

  // Simular pequeña latencia de consulta al cambiar filtros clave
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    simulateRequest(() => {}, { minDelay: 300, maxDelay: 600, canFail: false }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [debouncedSearch, selectedCategory, inStockOnly, sortBy]);

  const handleAddToCart = async (product, qty = 1) => {
    setAddingId(product.id);
    await simulateRequest(() => {}, { minDelay: 400, maxDelay: 800, canFail: false });
    addToCart(product, qty);
    setAddingId(null);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setInStockOnly(false);
    setSortBy('featured');
  };

  // Cuántas unidades ya tiene el usuario en su carrito
  const getCartQtyFor = (productId) => {
    const found = items.find((i) => i.product.id === productId);
    return found ? found.qty : 0;
  };

  return (
    <div data-testid="catalog-page" className="space-y-6">
      {/* Barra de Filtros y Búsqueda */}
      <section
        className="card p-4 sm:p-5"
        data-testid="catalog-filter-bar"
        aria-label="Filtros del catálogo"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda */}
          <div className="relative">
            <label htmlFor="catalog-search" className="label">
              <span>Buscar producto</span>
              <LocatorHint testId="catalog-search-input" />
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-500" />
              <input
                id="catalog-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, descripción o SKU..."
                data-testid="catalog-search-input"
                className="input pl-10"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="catalog-category" className="label">
              <span>Categoría</span>
              <LocatorHint testId="catalog-category-select" />
            </label>
            <select
              id="catalog-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              data-testid="catalog-category-select"
              className="input cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <label htmlFor="catalog-sort" className="label">
              <span>Ordenar por</span>
              <LocatorHint testId="catalog-sort-select" />
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              data-testid="catalog-sort-select"
              className="input cursor-pointer"
            >
              <option value="featured">Destacados</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="rating">Mejor Calificados</option>
              <option value="name">Alfabético (A-Z)</option>
            </select>
          </div>

          {/* Checkbox solo en stock & Reset */}
          <div className="flex flex-col justify-end gap-2 pt-1">
            <Checkbox
              id="catalog-in-stock"
              label="Solo con stock disponible"
              checked={inStockOnly}
              onChange={(c) => setInStockOnly(c)}
              testId="catalog-in-stock-checkbox"
            />
            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="catalog-reset-filters-btn"
              className="btn btn-secondary btn-sm self-start text-xs text-moss-700"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar filtros
            </button>
          </div>
        </div>

        {/* Resumen de resultados */}
        <div className="mt-4 flex items-center justify-between border-t border-moss-200/60 pt-3 text-xs text-moss-600">
          <span>
            Mostrando{' '}
            <strong data-testid="catalog-results-count" className="text-moss-900">
              {filteredProducts.length}
            </strong>{' '}
            de {PRODUCTS.length} productos
          </span>
          {loading && (
            <span className="flex items-center gap-1.5 text-moss-600" data-testid="catalog-loading">
              <Spinner className="h-3.5 w-3.5" /> Actualizando catálogo...
            </span>
          )}
        </div>
      </section>

      {/* Grid de Productos */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="catalog-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="card flex flex-col items-center justify-center p-12 text-center"
          data-testid="catalog-empty-results"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-100 text-moss-600">
            <Package className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-moss-900">
            No encontramos productos con estos filtros
          </h3>
          <p className="mt-1 text-sm text-moss-600 max-w-sm">
            Prueba ajustando los términos de búsqueda o eliminando los filtros activos.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-primary btn-sm mt-5"
            data-testid="catalog-empty-reset-btn"
          >
            Ver todos los productos
          </button>
        </div>
      ) : (
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-testid="catalog-product-grid"
        >
          {filteredProducts.map((p) => {
            const inCart = getCartQtyFor(p.id);
            const isOut = p.stock <= 0;
            const isLimit = p.maxPerOrder && inCart >= p.maxPerOrder;
            const isAdding = addingId === p.id;

            return (
              <article
                key={p.id}
                data-testid={`product-card-${p.id}`}
                className="card flex flex-col justify-between overflow-hidden p-5 transition-all duration-200 hover:shadow-lift hover:border-moss-300"
              >
                <div>
                  {/* Badges y Stock */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="badge badge-gray font-mono text-[11px]">{p.sku}</span>
                    <div className="flex items-center gap-1.5">
                      {p.badge && (
                        <span
                          className={cn(
                            'badge text-[10px]',
                            p.badge === 'Agotado'
                              ? 'badge-red'
                              : p.badge === 'Stock Bajo'
                              ? 'badge-yellow'
                              : 'badge-green',
                          )}
                          data-testid={`product-badge-${p.id}`}
                        >
                          {p.badge}
                        </span>
                      )}
                      <LocatorHint testId={`product-card-${p.id}`} label={p.name} />
                    </div>
                  </div>

                  {/* Nombre y categoría */}
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-moss-500">
                      {p.categoryLabel}
                    </span>
                    <h3
                      className="mt-1 text-base font-bold text-moss-900 line-clamp-2"
                      data-testid={`product-title-${p.id}`}
                    >
                      {p.name}
                    </h3>
                  </div>

                  {/* Calificación */}
                  <div
                    className="mt-2 flex items-center gap-1.5 text-xs text-moss-600"
                    data-testid={`product-rating-${p.id}`}
                  >
                    <div className="flex items-center text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="ml-1 font-semibold text-moss-900">{p.rating}</span>
                    </div>
                    <span>({p.reviewsCount} reseñas)</span>
                  </div>

                  {/* Descripción corta */}
                  <p className="mt-2.5 text-xs leading-relaxed text-moss-600 line-clamp-2">
                    {p.description}
                  </p>

                  {/* Estado de Stock y límite */}
                  <div className="mt-4 rounded-xl bg-moss-50/80 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-moss-600">Disponibilidad:</span>
                      <span
                        data-testid={`product-stock-${p.id}`}
                        className={cn(
                          'font-semibold',
                          isOut
                            ? 'text-danger-600'
                            : p.stock <= 3
                            ? 'text-warning-600'
                            : 'text-moss-700',
                        )}
                      >
                        {isOut ? 'Agotado' : `${p.stock} en stock`}
                      </span>
                    </div>
                    {p.maxPerOrder && (
                      <div className="flex items-center justify-between text-[11px] text-moss-500">
                        <span>Máx. por orden:</span>
                        <span data-testid={`product-max-order-${p.id}`} className="font-semibold">
                          {p.maxPerOrder} ud.
                        </span>
                      </div>
                    )}
                    {inCart > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-moss-700 font-medium pt-1 border-t border-moss-200/50">
                        <span>En tu carrito:</span>
                        <span data-testid={`product-in-cart-${p.id}`} className="badge badge-moss">
                          {inCart} ud.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precios y Botones */}
                <div className="mt-5 border-t border-moss-100 pt-4">
                  <div className="mb-3 flex items-baseline gap-2">
                    <span
                      data-testid={`product-price-${p.id}`}
                      className="font-display text-xl font-bold text-moss-900"
                    >
                      {formatCents(p.priceCents)}
                    </span>
                    {p.originalPriceCents > p.priceCents && (
                      <span className="text-xs text-moss-400 line-through">
                        {formatCents(p.originalPriceCents)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p, 1)}
                      disabled={isOut || isLimit || isAdding}
                      data-testid={`add-to-cart-btn-${p.id}`}
                      className="btn btn-primary btn-sm flex-1"
                      title={
                        isOut
                          ? 'Producto sin existencias'
                          : isLimit
                          ? 'Has alcanzado el límite máximo permitido para este producto'
                          : 'Añadir 1 unidad al carrito'
                      }
                    >
                      {isAdding ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      <span>
                        {isOut ? 'Agotado' : isLimit ? 'Límite alcanzado' : 'Agregar'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailProduct(p);
                        setDetailQty(1);
                      }}
                      data-testid={`view-details-btn-${p.id}`}
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Ver detalles y especificaciones"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Detalles del Producto */}
      {detailProduct && (
        <Modal
          open={!!detailProduct}
          onClose={() => setDetailProduct(null)}
          title={detailProduct.name}
          description={`SKU: ${detailProduct.sku} · ${detailProduct.categoryLabel}`}
          testId="product-detail-modal"
          size="md"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailProduct(null)}
                data-testid="detail-close-btn"
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  detailProduct.stock <= 0 ||
                  detailQty <= 0 ||
                  detailQty > detailProduct.stock ||
                  (detailProduct.maxPerOrder &&
                    getCartQtyFor(detailProduct.id) + detailQty > detailProduct.maxPerOrder)
                }
                onClick={async () => {
                  await handleAddToCart(detailProduct, detailQty);
                  setDetailProduct(null);
                }}
                data-testid="detail-add-btn"
              >
                <ShoppingCart className="h-4 w-4" /> Agregar al Carrito (
                {formatCents(detailProduct.priceCents * detailQty)})
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-moss-50 p-4">
              <p className="text-sm leading-relaxed text-moss-800">{detailProduct.description}</p>
            </div>

            {/* Especificaciones Técnicas */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-moss-500 mb-2">
                Especificaciones Técnicas
              </h4>
              <div className="divide-y divide-moss-200/60 rounded-xl border border-moss-200 bg-white text-xs">
                {Object.entries(detailProduct.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3.5 py-2.5">
                    <span className="font-medium text-moss-600">{k}</span>
                    <span className="font-semibold text-moss-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selector de Cantidad */}
            {detailProduct.stock > 0 && (
              <Field
                label="Cantidad a ordenar"
                htmlFor="detail-qty"
                testId="detail-qty-input"
                hint={`Máximo ${detailProduct.maxPerOrder || detailProduct.stock} unidades por orden.`}
              >
                <div className="flex items-center gap-3">
                  <input
                    id="detail-qty"
                    type="number"
                    min="1"
                    max={detailProduct.maxPerOrder || detailProduct.stock}
                    value={detailQty}
                    onChange={(e) => setDetailQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    data-testid="detail-qty-input"
                    className="input w-28 text-center font-bold"
                  />
                  <span className="text-xs text-moss-600">
                    Total:{' '}
                    <strong className="text-moss-900 font-mono">
                      {formatCents(detailProduct.priceCents * detailQty)}
                    </strong>
                  </span>
                </div>
              </Field>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
