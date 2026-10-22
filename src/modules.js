import { LayoutDashboard, Lock, ShoppingCart, SlidersHorizontal, Timer, Table2 } from 'lucide-react';

/** Metadatos de módulos: usados por el sidebar, el dashboard y el breadcrumb. */
export const MODULES = [
  {
    key: 'dashboard',
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    testId: 'nav-dashboard',
  },
  {
    key: 'auth',
    path: '/auth',
    label: 'Autenticación',
    icon: Lock,
    testId: 'nav-auth',
    difficulty: 'Intermedio',
    description:
      'Login con bloqueo tras 3 intentos fallidos, MFA con OTP y expiración, contraseña caducada, sesión con timeout y reintentos ante 503.',
    challenges: [
      'Bloqueo temporal (30 s) con cuenta regresiva persistente',
      'Flujo MFA con OTP de 6 dígitos y reenvío con cooldown',
      'Cambio forzado de contraseña con reglas en vivo',
      'Sesión que expira con modal de advertencia',
      'Detección de Bloq Mayús y doble envío',
    ],
    scenarios: 18,
  },
  {
    key: 'ecommerce',
    path: '/ecommerce',
    label: 'E-commerce',
    icon: ShoppingCart,
    testId: 'nav-ecommerce',
    difficulty: 'Avanzado',
    description:
      'Catálogo con filtros, carrito persistente con límites de stock, cupones con reglas y checkout de 4 pasos con validación Luhn.',
    challenges: [
      'Límites de stock y máximo por pedido',
      'Cupones: porcentaje, tope, mínimo de compra y expirados',
      'Totales en centavos (sin errores de punto flotante)',
      'Checkout multi-paso con reglas por país',
      'Tarjetas de prueba: aprobada, rechazada y timeout',
    ],
    scenarios: 26,
  },
  {
    key: 'controls',
    path: '/controls',
    label: 'Controles UI',
    icon: SlidersHorizontal,
    testId: 'nav-controls',
    difficulty: 'Avanzado',
    description:
      'Selectores en cascada asíncronos, combobox personalizado, árbol de checkboxes, date pickers con rangos bloqueados y validaciones cruzadas.',
    challenges: [
      'Cascada País → Estado → Ciudad con carga asíncrona',
      'Calendario custom con fines de semana y feriados deshabilitados',
      'Rango de fechas que no puede cruzar fechas reservadas',
      'Formulario con 12+ reglas de validación cruzada',
      'Drag & drop, sliders dobles, carga de archivos',
    ],
    scenarios: 30,
  },
  {
    key: 'async',
    path: '/async',
    label: 'Elementos asíncronos',
    icon: Timer,
    testId: 'nav-async',
    difficulty: 'Experto',
    description:
      'Modales apilados, tooltips con contenido remoto, toasts efímeros, esperas dinámicas, polling, iframes, Shadow DOM y diálogos nativos.',
    challenges: [
      'Tres niveles de modales superpuestos',
      'Tooltips con retardo, carga asíncrona y auto-ocultado',
      'Toasts con pausa al pasar el cursor y acción Deshacer',
      'Elementos que aparecen, desaparecen y cambian de ID',
      'iframe, Shadow DOM, alert/confirm/prompt',
    ],
    scenarios: 28,
  },
  {
    key: 'tables',
    path: '/tables',
    label: 'Data Tables',
    icon: Table2,
    testId: 'nav-tables',
    difficulty: 'Experto',
    description:
      'Paginación del lado del servidor, filtros combinados, ordenamiento multi-columna, selección entre páginas, acciones masivas y estado en la URL.',
    challenges: [
      'Paginación real con salto a página y tamaño variable',
      'Filtros combinados con validación de rangos',
      'Orden multi-columna (Shift + clic)',
      'Selección persistente entre páginas',
      'Estado sincronizado con la URL (deep linking)',
    ],
    scenarios: 24,
  },
];

export const TEST_MODULES = MODULES.filter((m) => m.key !== 'dashboard');
