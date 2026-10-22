/**
 * Catálogo de productos para el módulo E-commerce.
 * Precios expresados en CENTAVOS para evitar problemas de precisión en punto flotante.
 */
export const PRODUCTS = [
  {
    id: 'P-1001',
    name: 'Teclado Mecánico RGB Pro',
    slug: 'teclado-mecanico-rgb-pro',
    category: 'perifericos',
    categoryLabel: 'Periféricos',
    priceCents: 8999, // $89.99
    originalPriceCents: 11999,
    stock: 8,
    maxPerOrder: 3,
    rating: 4.8,
    reviewsCount: 142,
    badge: 'Oferta',
    description: 'Switches táctiles hot-swap, retroiluminación RGB por tecla y cable USB-C desmontable.',
    sku: 'KB-MEC-01',
    specs: { Conexion: 'USB-C / 2.4GHz', Switches: 'Gateron Brown', Peso: '850g' },
  },
  {
    id: 'P-1002',
    name: 'Mouse Inalámbrico Ultra-Light 60g',
    slug: 'mouse-inalambrico-ultralight',
    category: 'perifericos',
    categoryLabel: 'Periféricos',
    priceCents: 5950, // $59.50
    originalPriceCents: 5950,
    stock: 15,
    maxPerOrder: 5,
    rating: 4.6,
    reviewsCount: 89,
    badge: 'Popular',
    description: 'Sensor óptico de 26,000 DPI, clicks ópticos y batería recargable de hasta 80 horas.',
    sku: 'MS-WRL-02',
    specs: { DPI: '26,000', Peso: '60g', Bateria: '80 horas' },
  },
  {
    id: 'P-1003',
    name: 'Monitor Gaming 27" QHD 165Hz',
    slug: 'monitor-gaming-27-qhd',
    category: 'monitores',
    categoryLabel: 'Monitores',
    priceCents: 27999, // $279.99
    originalPriceCents: 32999,
    stock: 3,
    maxPerOrder: 1, // Caso límite: solo 1 unidad por pedido
    rating: 4.9,
    reviewsCount: 230,
    badge: 'Stock Bajo',
    description: 'Panel Fast-IPS 1ms GTG, resolución 2560x1440, compatible con G-Sync y FreeSync.',
    sku: 'MN-QHD-27',
    specs: { Resolucion: '2560x1440', Refresco: '165Hz', Panel: 'Fast IPS' },
  },
  {
    id: 'P-1004',
    name: 'Auriculares Inalámbricos ANC Studio',
    slug: 'auriculares-inalambricos-anc',
    category: 'audio',
    categoryLabel: 'Audio',
    priceCents: 14900, // $149.00
    originalPriceCents: 18900,
    stock: 12,
    maxPerOrder: 4,
    rating: 4.7,
    reviewsCount: 97,
    badge: 'Recomendado',
    description: 'Cancelación activa de ruido híbrida, drivers de neodimio de 40mm y micrófono con IA.',
    sku: 'AU-ANC-40',
    specs: { Autonomia: '45h', Cancelacion: 'Híbrida ANC', Carga: 'Carga rápida 15min' },
  },
  {
    id: 'P-1005',
    name: 'Cámara Web 4K Pro Streaming',
    slug: 'camara-web-4k-pro',
    category: 'streaming',
    categoryLabel: 'Streaming',
    priceCents: 11999, // $119.99
    originalPriceCents: 11999,
    stock: 0, // Caso límite: Sin stock
    maxPerOrder: 2,
    rating: 4.3,
    reviewsCount: 54,
    badge: 'Agotado',
    description: 'Resolución Ultra HD 4K a 30fps / 1080p a 60fps con autofoco HDR y doble micrófono estéreo.',
    sku: 'CM-4K-STR',
    specs: { Resolucion: '4K @ 30fps', FoV: '90 grados', Montura: 'Trípode + clip' },
  },
  {
    id: 'P-1006',
    name: 'Micrófono USB Cardioide con Brazo',
    slug: 'microfono-usb-cardioide',
    category: 'streaming',
    categoryLabel: 'Streaming',
    priceCents: 7490, // $74.90
    originalPriceCents: 8990,
    stock: 6,
    maxPerOrder: 2,
    rating: 4.5,
    reviewsCount: 76,
    badge: null,
    description: 'Patrón polar cardioide, botón de mute táctil sensible y brazo articulado metálico incluido.',
    sku: 'MC-USB-06',
    specs: { Patron: 'Cardioide', Muestreo: '192kHz/24bit', Conexion: 'USB-C' },
  },
  {
    id: 'P-1007',
    name: 'Silla Ergonómica Pro Mesh',
    slug: 'silla-ergonomica-pro-mesh',
    category: 'ergonomia',
    categoryLabel: 'Ergonomía',
    priceCents: 24900, // $249.00
    originalPriceCents: 29900,
    stock: 4,
    maxPerOrder: 2,
    rating: 4.8,
    reviewsCount: 115,
    badge: 'Ergo Choice',
    description: 'Soporte lumbar dinámico adaptable, reposabrazos 4D y malla transpirable de alta densidad.',
    sku: 'CH-ERG-99',
    specs: { PesoSoporte: 'Hasta 150kg', Ajuste: '4D Brazos + Lumbar', Garantia: '5 años' },
  },
  {
    id: 'P-1008',
    name: 'Lámpara de Monitor Barra LED Asimétrica',
    slug: 'lampara-monitor-led',
    category: 'iluminacion',
    categoryLabel: 'Iluminación',
    priceCents: 4200, // $42.00
    originalPriceCents: 4200,
    stock: 20,
    maxPerOrder: 5,
    rating: 4.7,
    reviewsCount: 168,
    badge: 'Top Ventas',
    description: 'Iluminación frontal sin reflejo en pantalla, sensor de luz ambiental y dial táctil inalámbrico.',
    sku: 'LP-BAR-10',
    specs: { Temperatura: '2700K - 6500K', Alimentacion: 'USB 5V', Control: 'Dial touch' },
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'Todas las categorías' },
  { id: 'perifericos', label: 'Periféricos' },
  { id: 'monitores', label: 'Monitores' },
  { id: 'audio', label: 'Audio' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'ergonomia', label: 'Ergonomía' },
  { id: 'iluminacion', label: 'Iluminación' },
];

/**
 * Cupones de descuento para validación estricta en checkout.
 */
export const COUPONS = {
  DESCUENTO10: {
    code: 'DESCUENTO10',
    type: 'percent',
    percent: 10,
    minSpendCents: 0,
    maxDiscountCents: 5000,
    description: '10% de descuento en tu compra',
  },
  SUPER50: {
    code: 'SUPER50',
    type: 'percent',
    percent: 50,
    minSpendCents: 10000, // $100.00 mínimo
    maxDiscountCents: 3000, // Tope máximo $30.00
    description: '50% de descuento con tope de $30 (mínimo $100 de compra)',
  },
  ENVIOFREE: {
    code: 'ENVIOFREE',
    type: 'free_shipping',
    minSpendCents: 5000, // $50.00 mínimo
    description: 'Envío estándar gratuito (mínimo $50)',
  },
  FIJO20: {
    code: 'FIJO20',
    type: 'fixed',
    amountCents: 2000, // $20.00
    minSpendCents: 8000, // $80.00 mínimo
    description: '$20.00 de descuento en compras mayores a $80',
  },
  EXPIRADO: {
    code: 'EXPIRADO',
    expired: true,
    description: 'Cupón de campaña anterior (inactivo)',
  },
};

/**
 * Opciones de envío.
 */
export const SHIPPING_METHODS = [
  {
    id: 'standard',
    name: 'Envío Estándar',
    deliveryTime: '3 a 5 días hábiles',
    costCents: 599, // $5.99
    carrier: 'Postal Express',
  },
  {
    id: 'express',
    name: 'Envío Prioritario Express',
    deliveryTime: '1 a 2 días hábiles',
    costCents: 1499, // $14.99
    carrier: 'Courier Air Prime',
  },
  {
    id: 'overnight',
    name: 'Entrega Día Siguiente Garantizada',
    deliveryTime: '24 horas',
    costCents: 2499, // $24.99
    carrier: 'Overnight VIP',
  },
];

/** Tarjetas de prueba preconfiguradas para pruebas de QA */
export const TEST_CARDS = [
  {
    number: '4532000000000000',
    label: 'Visa - Aprobada',
    expiry: '12/28',
    cvv: '123',
    outcome: 'success',
  },
  {
    number: '5424000000000000',
    label: 'Mastercard - Aprobada',
    expiry: '09/27',
    cvv: '456',
    outcome: 'success',
  },
  {
    number: '378282246310005',
    label: 'Amex - Aprobada',
    expiry: '11/29',
    cvv: '1234',
    outcome: 'success',
  },
  {
    number: '4000000000000002',
    label: 'Visa - Fondos Insuficientes',
    expiry: '05/27',
    cvv: '789',
    outcome: 'insufficient_funds',
  },
  {
    number: '4000000000000003',
    label: 'Visa - Timeout / Fallo 504',
    expiry: '08/28',
    cvv: '999',
    outcome: 'timeout',
  },
];
