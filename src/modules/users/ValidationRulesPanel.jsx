import { useState } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  User,
  AtSign,
  Mail,
  Phone,
  Shield,
  Building,
  Calendar,
  Lock,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  Code,
} from 'lucide-react';
import { cn } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

export const FORM_VALIDATION_SPECS = [
  {
    fieldId: 'fullName',
    label: 'Nombre Completo',
    icon: User,
    required: true,
    selector: '[data-testid="user-fullname-input"]',
    errorSelector: '[data-testid="user-fullname-input-error"]',
    counterSelector: '[data-testid="user-fullname-counter"]',
    minLen: 4,
    maxLen: 45,
    pattern: 'Solo letras (con acentos/ñ) y espacios',
    rules: [
      'Obligatorio (no puede estar vacío ni contener solo espacios).',
      'Mínimo 4 caracteres requeridos.',
      'Límite máximo estricto de 45 caracteres.',
      'Expresión regular: Solo letras y espacios. No números ni símbolos especiales.',
    ],
    edgeCases: [
      'Menos de 4 caracteres (ej. "Ana")',
      'Más de 45 caracteres (ej. 46+ letras consecutivas)',
      'Espacios al inicio o final',
      'Números (ej. "Juan 2")',
    ],
  },
  {
    fieldId: 'username',
    label: 'Nombre de Usuario (Username)',
    icon: AtSign,
    required: true,
    selector: '[data-testid="user-username-input"]',
    errorSelector: '[data-testid="user-username-input-error"]',
    counterSelector: '[data-testid="user-username-counter"]',
    minLen: 3,
    maxLen: 15,
    pattern: '^[a-z0-9_]{3,15}$',
    rules: [
      'Obligatorio.',
      'Longitud: de 3 a 15 caracteres.',
      'Solo minúsculas, dígitos o guion bajo (_).',
      'Regla de negocio: Unicidad estricta en el directorio (no sensible a mayúsculas).',
    ],
    edgeCases: [
      'Username repetido con usuario existente',
      'Mayúsculas (ej. "Admin_User")',
      'Menos de 3 o más de 15 caracteres',
      'Espacios o caracteres especiales (ej. "user@qa")',
    ],
  },
  {
    fieldId: 'email',
    label: 'Correo Electrónico Corporativo',
    icon: Mail,
    required: true,
    selector: '[data-testid="user-email-input"]',
    errorSelector: '[data-testid="user-email-input-error"]',
    counterSelector: '[data-testid="user-email-counter"]',
    maxLen: 50,
    pattern: 'usuario@dominio.com',
    rules: [
      'Obligatorio.',
      'Máximo 50 caracteres permitidos.',
      'Formato estándar de correo corporativo.',
      'Regla de negocio: Unicidad (no duplicados en la lista).',
    ],
    edgeCases: [
      'Correo existente de otro usuario',
      'Sin símbolo "@" o sin dominio (".com")',
      'Longitud mayor a 50 caracteres',
      'Espacios en medio del correo',
    ],
  },
  {
    fieldId: 'phone',
    label: 'Teléfono Móvil',
    icon: Phone,
    required: true,
    selector: '[data-testid="user-phone-input"]',
    errorSelector: '[data-testid="user-phone-input-error"]',
    counterSelector: '[data-testid="user-phone-counter"]',
    minLen: 10,
    maxLen: 10,
    pattern: '10 dígitos numéricos exactos',
    rules: [
      'Obligatorio.',
      'Debe contener exactamente 10 dígitos numéricos.',
      'Los caracteres no numéricos se limpian o validan.',
    ],
    edgeCases: [
      '9 dígitos (incompleto)',
      '11 o más dígitos (excede)',
      'Letras o caracteres alfanuméricos',
      'Campo vacío',
    ],
  },
  {
    fieldId: 'role',
    label: 'Rol Asignado',
    icon: Shield,
    required: true,
    selector: '[data-testid="user-role-select"]',
    errorSelector: '[data-testid="user-role-select-error"]',
    rules: [
      'Obligatorio.',
      'Debe seleccionarse una opción válida: Admin, QA Lead, Dev Senior, DevOps, Auditor o Soporte.',
    ],
    edgeCases: [
      'Sin seleccionar rol al enviar el formulario',
    ],
  },
  {
    fieldId: 'department',
    label: 'Departamento',
    icon: Building,
    required: true,
    selector: '[data-testid="user-department-select"]',
    errorSelector: '[data-testid="user-department-select-error"]',
    rules: [
      'Obligatorio.',
      'Selección de área organizacional correspondiente.',
    ],
    edgeCases: [
      'No seleccionar departamento',
    ],
  },
  {
    fieldId: 'hireDate',
    label: 'Fecha de Ingreso / Contratación',
    icon: Calendar,
    required: true,
    selector: '[data-testid="user-hire-date-input"]',
    errorSelector: '[data-testid="user-hire-date-input-error"]',
    pattern: 'Formato dd/mm/aaaa o YYYY-MM-DD',
    rules: [
      'Obligatorio.',
      'Fecha válida seleccionada mediante el componente CustomDatePicker.',
    ],
    edgeCases: [
      'Campo de fecha vacío al enviar',
    ],
  },
  {
    fieldId: 'permissions',
    label: 'Permisos y Privilegios',
    icon: CheckSquare,
    required: true,
    selector: '[data-testid^="user-perm-"]',
    errorSelector: '[data-testid="user-permissions-error"]',
    rules: [
      'Obligatorio otorgar al menos un permiso (Base de datos, automatización, despliegues, etc.).',
    ],
    edgeCases: [
      'Desmarcar todos los checkboxes de permisos',
    ],
  },
  {
    fieldId: 'password',
    label: 'Contraseña de Seguridad',
    icon: Lock,
    required: true,
    selector: '[data-testid="user-password-input"]',
    errorSelector: '[data-testid="user-password-input-error"]',
    counterSelector: '[data-testid="user-password-counter"]',
    minLen: 8,
    maxLen: 30,
    rules: [
      'Obligatorio al crear nuevo usuario (en edición es opcional para conservar la anterior).',
      'Mínimo 8 y máximo 30 caracteres.',
      'Al menos 1 letra mayúscula (A-Z).',
      'Al menos 1 número (0-9).',
      'Al menos 1 símbolo especial (!@#$%^&*...).',
      'Confirmar contraseña debe ser idéntica a la contraseña.',
    ],
    edgeCases: [
      'Contraseña sin mayúscula o sin número',
      'Contraseña de 7 caracteres (menor al mínimo)',
      'Contraseña mayor a 30 caracteres',
      'Discrepancia entre contraseña y confirmación',
    ],
  },
];

export default function ValidationRulesPanel({ onClose, onOpenCreateModal }) {
  const toast = useToast();
  const [filterType, setFilterType] = useState('all'); // all, limits, security
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    toast.success(`Selector copiado: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSpecs = FORM_VALIDATION_SPECS.filter((spec) => {
    if (filterType === 'limits') {
      return spec.minLen !== undefined || spec.maxLen !== undefined;
    }
    if (filterType === 'security') {
      return spec.fieldId === 'password' || spec.fieldId === 'role' || spec.fieldId === 'permissions';
    }
    return true;
  });

  return (
    <aside
      data-testid="users-validation-rules-panel"
      className="card flex flex-col border-moss-300/80 bg-white shadow-soft overflow-hidden animate-fade-in"
    >
      {/* CABECERA DEL PANEL */}
      <div className="border-b border-moss-200/90 bg-gradient-to-r from-moss-50 via-moss-50/70 to-moss-100/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white shadow-sm ring-2 ring-moss-200">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-moss-900 text-sm">
                  Reglas de Validación QA
                </h3>
                <span className="badge badge-moss text-[10px] py-0 px-1.5 font-mono">
                  Guía Oficial
                </span>
              </div>
              <p className="text-[11px] text-moss-600 mt-0.5">
                Criterios de aceptación, límites y selectores para automatización.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="close-rules-panel-btn"
            className="btn btn-ghost !h-7 !w-7 !p-0 text-moss-500 hover:text-moss-900 rounded-lg shrink-0"
            title="Ocultar panel de reglas"
            aria-label="Cerrar panel de reglas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* FILTROS RÁPIDOS DENTRO DEL PANEL */}
        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-moss-200/60">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            data-testid="filter-rules-all-btn"
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
              filterType === 'all'
                ? 'bg-moss-700 text-white shadow-xs'
                : 'text-moss-700 hover:bg-moss-200/60 bg-moss-100/60',
            )}
          >
            Todas ({FORM_VALIDATION_SPECS.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('limits')}
            data-testid="filter-rules-limits-btn"
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
              filterType === 'limits'
                ? 'bg-moss-700 text-white shadow-xs'
                : 'text-moss-700 hover:bg-moss-200/60 bg-moss-100/60',
            )}
          >
            Límites y Caracteres (5)
          </button>
          <button
            type="button"
            onClick={() => setFilterType('security')}
            data-testid="filter-rules-security-btn"
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
              filterType === 'security'
                ? 'bg-moss-700 text-white shadow-xs'
                : 'text-moss-700 hover:bg-moss-200/60 bg-moss-100/60',
            )}
          >
            Seguridad & Roles (3)
          </button>
        </div>
      </div>

      {/* CUERPO CON EL LISTADO DE REGLAS */}
      <div className="p-3.5 space-y-3.5 max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-moss-100">
        {filteredSpecs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div
              key={spec.fieldId}
              data-testid={`rule-item-${spec.fieldId}`}
              className="pt-3.5 first:pt-0 space-y-2"
            >
              {/* Título de campo + Badges de Límites */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-moss-600 shrink-0" />
                  <span className="font-bold text-xs text-moss-900 truncate">
                    {spec.label}
                  </span>
                  {spec.required && (
                    <span className="text-danger-600 font-bold text-xs" title="Campo obligatorio">*</span>
                  )}
                </div>

                {/* Badges de Límite / Longitud */}
                <div className="flex flex-wrap items-center gap-1 shrink-0">
                  {spec.minLen !== undefined && spec.maxLen !== undefined && spec.minLen === spec.maxLen ? (
                    <span className="badge badge-moss text-[10px] py-0 px-1 font-mono font-bold">
                      Exacto: {spec.maxLen} dígitos
                    </span>
                  ) : (
                    <>
                      {spec.minLen !== undefined && (
                        <span className="badge badge-moss text-[10px] py-0 px-1 font-mono">
                          Mín: {spec.minLen}
                        </span>
                      )}
                      {spec.maxLen !== undefined && (
                        <span className="badge bg-amber-100 text-amber-900 border border-amber-300 text-[10px] py-0 px-1 font-mono font-bold">
                          Máx: {spec.maxLen}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Lista de Criterios y Reglas */}
              <ul className="space-y-1 text-[11px] text-moss-700 list-disc pl-4 leading-relaxed">
                {spec.rules.map((rule, idx) => (
                  <li key={idx}>
                    {rule}
                  </li>
                ))}
              </ul>

              {/* Casos Límite para Pruebas Automatizadas */}
              {spec.edgeCases && (
                <div className="rounded-lg bg-moss-50/70 p-2 border border-moss-200/70 text-[10.5px]">
                  <p className="font-semibold text-moss-800 flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3 text-moss-600 shrink-0" />
                    Casos de Prueba Sugeridos (QA Edge Cases):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {spec.edgeCases.map((ec, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-white px-1.5 py-0.5 rounded border border-moss-200 text-moss-600 font-mono text-[10px]"
                      >
                        • {ec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Selectores de Automatización (Copiables) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10.5px] font-mono">
                <span className="text-moss-400 font-sans text-[10px] font-medium">Selectores:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(spec.selector, `${spec.fieldId}-input`)}
                  data-testid={`copy-selector-${spec.fieldId}-input`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-moss-100/80 hover:bg-moss-200 text-moss-800 transition-colors"
                  title="Copiar selector del input"
                >
                  <Code className="h-2.5 w-2.5 text-moss-500" />
                  <span>Input</span>
                  {copiedId === `${spec.fieldId}-input` ? (
                    <Check className="h-2.5 w-2.5 text-green-600" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 text-moss-400" />
                  )}
                </button>

                {spec.errorSelector && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(spec.errorSelector, `${spec.fieldId}-error`)}
                    data-testid={`copy-selector-${spec.fieldId}-error`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-50 hover:bg-danger-100 text-danger-800 border border-danger-200 transition-colors"
                    title="Copiar selector del mensaje de error"
                  >
                    <AlertCircle className="h-2.5 w-2.5 text-danger-500" />
                    <span>Error</span>
                    {copiedId === `${spec.fieldId}-error` ? (
                      <Check className="h-2.5 w-2.5 text-green-600" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 text-danger-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PIE DEL PANEL CON ACCIONES RÁPIDAS */}
      <div className="border-t border-moss-200 bg-moss-50/50 p-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-moss-600 font-medium">
          ¿Listo para probar?
        </span>
        {onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            data-testid="rules-panel-open-modal-btn"
            className="btn btn-primary btn-sm !text-xs !py-1"
          >
            Abrir Formulario de Pruebas
          </button>
        )}
      </div>
    </aside>
  );
}
