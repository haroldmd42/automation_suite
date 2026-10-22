/**
 * Datos para el módulo de Controles UI:
 * Cascadas geográficas, árbol de permisos y feriados/fechas reservadas.
 */

export const GEO_DATA = {
  MX: {
    name: 'México',
    code: 'MX',
    states: {
      CDMX: {
        name: 'Ciudad de México',
        cities: ['Cuauhtémoc', 'Benito Juárez', 'Coyoacán', 'Miguel Hidalgo', 'Tlalpan'],
      },
      JAL: {
        name: 'Jalisco',
        cities: ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Puerto Vallarta', 'Tonalá'],
      },
      NL: {
        name: 'Nuevo León',
        cities: ['Monterrey', 'San Pedro Garza García', 'San Nicolás', 'Guadalupe', 'Apodaca'],
      },
    },
  },
  ES: {
    name: 'España',
    code: 'ES',
    states: {
      MD: {
        name: 'Comunidad de Madrid',
        cities: ['Madrid', 'Alcalá de Henares', 'Getafe', 'Leganés', 'Alcorcón'],
      },
      CT: {
        name: 'Cataluña',
        cities: ['Barcelona', 'L\'Hospitalet', 'Badalona', 'Terrassa', 'Sabadell'],
      },
      AN: {
        name: 'Andalucía',
        cities: ['Sevilla', 'Málaga', 'Granada', 'Córdoba', 'Marbella'],
      },
    },
  },
  CO: {
    name: 'Colombia',
    code: 'CO',
    states: {
      DC: {
        name: 'Bogotá D.C.',
        cities: ['Usaquén', 'Chapinero', 'Suba', 'Teusaquillo', 'Kennedy'],
      },
      ANT: {
        name: 'Antioquia',
        cities: ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Rionegro'],
      },
      VAL: {
        name: 'Valle del Cauca',
        cities: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Yumbo'],
      },
    },
  },
  US: {
    name: 'Estados Unidos',
    code: 'US',
    states: {
      CA: {
        name: 'California',
        cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
      },
      TX: {
        name: 'Texas',
        cities: ['Austin', 'Houston', 'Dallas', 'San Antonio', 'Fort Worth'],
      },
      NY: {
        name: 'New York',
        cities: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
      },
    },
  },
};

/** Árbol de Permisos para el control jerárquico */
export const PERMISSIONS_TREE = [
  {
    id: 'admin_all',
    label: 'Administración Global',
    children: [
      {
        id: 'users_manage',
        label: 'Gestión de Usuarios',
        children: [
          { id: 'users_create', label: 'Crear Usuarios' },
          { id: 'users_edit', label: 'Modificar Perfiles' },
          { id: 'users_delete', label: 'Eliminar o Bloquear' },
        ],
      },
      {
        id: 'billing_manage',
        label: 'Facturación y Finanzas',
        children: [
          { id: 'billing_view', label: 'Ver Facturas y Balances' },
          { id: 'billing_refund', label: 'Autorizar Reembolsos' },
          { id: 'billing_export', label: 'Exportar Reportes Fiscales' },
        ],
      },
      {
        id: 'system_settings',
        label: 'Configuración del Sistema',
        children: [
          { id: 'settings_api', label: 'Gestión de API Keys' },
          { id: 'settings_logs', label: 'Auditoría y Logs de Seguridad' },
        ],
      },
    ],
  },
];

/** Feriados bloqueados (formato YYYY-MM-DD) */
export const BLOCKED_HOLIDAYS = [
  '2026-01-01', // Año Nuevo
  '2026-05-01', // Día del Trabajo
  '2026-09-16', // Independencia
  '2026-11-20', // Revolución
  '2026-12-25', // Navidad
];

/** Períodos bloqueados por mantenimiento / reserva (no se pueden seleccionar ni cruzar) */
export const BLACKOUT_RANGES = [
  { start: '2026-11-10', end: '2026-11-15', reason: 'Mantenimiento Anual de Servidores' },
  { start: '2026-12-20', end: '2026-12-31', reason: 'Cierre Fiscal y Auditoría' },
];
