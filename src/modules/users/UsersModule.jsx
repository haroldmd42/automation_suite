import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shield,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Trash2,
  ExternalLink,
  Building,
  KeyRound,
  FileCheck,
  Check,
  X,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { simulateRequest } from '../../services/network';
import { formatDateES, cn } from '../../utils/format';
import { EMAIL_RE, NAME_RE, onlyDigits } from '../../utils/validators';
import { PageHeader, Spinner, Alert } from '../../components/ui/Primitives';
import { Field, Checkbox } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { useToast } from '../../context/ToastContext';
import ValidationRulesPanel from './ValidationRulesPanel';

export const USER_ROLES = [
  { value: 'admin', label: 'Administrador del Sistema', badge: 'Admin', color: 'badge-red', desc: 'Acceso total y configuración de seguridad' },
  { value: 'qa_lead', label: 'Líder de Calidad (QA Lead)', badge: 'QA Lead', color: 'badge-green', desc: 'Ejecución y aprobación de suites de pruebas' },
  { value: 'developer', label: 'Desarrollador Senior', badge: 'Dev Senior', color: 'badge-blue', desc: 'Implementación de módulos y arquitectura' },
  { value: 'devops', label: 'Ingeniero Cloud / DevOps', badge: 'DevOps', color: 'badge-yellow', desc: 'Gestión de infraestructura y pipelines' },
  { value: 'auditor', label: 'Auditor de Seguridad', badge: 'Auditor', color: 'badge-gray', desc: 'Monitoreo y lectura de eventos del sistema' },
  { value: 'support', label: 'Especialista de Soporte L2', badge: 'Soporte', color: 'badge-moss', desc: 'Atención a incidentes y cuentas' },
];

export const DEPARTMENTS = [
  { value: 'engineering', label: 'Ingeniería y Desarrollo de Software' },
  { value: 'qa', label: 'Aseguramiento de Calidad (QA & Testing)' },
  { value: 'cloud_infra', label: 'Infraestructura Cloud & DevOps' },
  { value: 'security', label: 'Ciberseguridad y Cumplimiento' },
  { value: 'product', label: 'Diseño de Producto y UX' },
  { value: 'operations', label: 'Operaciones y Finanzas' },
];

export const AVAILABLE_PERMISSIONS = [
  { id: 'perm_db', label: 'Acceso a Base de Datos (Solo Lectura / Query)' },
  { id: 'perm_automation', label: 'Ejecución de Suites Automatizadas (Playwright / Cypress)' },
  { id: 'perm_deploy', label: 'Aprobación y Despliegue en Staging / Producción' },
  { id: 'perm_users', label: 'Gestión de Cuentas y Asignación de Roles' },
  { id: 'perm_reports', label: 'Descarga y Exportación de Auditorías y Logs' },
];

const INITIAL_FORM = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  hireDate: '',
  status: 'active',
  permissions: ['perm_automation'],
  password: '',
  confirmPassword: '',
};

export default function UsersModule() {
  const toast = useToast();

  // 1. Estado inicial: Listado de usuarios VACÍO según requerimiento
  const [users, setUsers] = useState([]);

  // Estados de interfaz y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showModalRulesGuide, setShowModalRulesGuide] = useState(false);

  // Panel lateral de especificaciones y reglas de validación QA
  const [showRulesPanel, setShowRulesPanel] = useState(() => {
    const saved = localStorage.getItem('qa_users_rules_panel_visible');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleRulesPanel = () => {
    setShowRulesPanel((prev) => {
      const next = !prev;
      localStorage.setItem('qa_users_rules_panel_visible', String(next));
      return next;
    });
  };

  // Formulario de creación / edición
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});

  // Cálculo de requisitos de contraseña
  const passwordRules = useMemo(() => {
    const pwd = formData.password || '';
    return {
      minLength: pwd.length >= 8,
      maxLength: pwd.length <= 30 && pwd.length >= 1,
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // Validaciones del formulario
  const validateForm = () => {
    const errs = {};

    // 1. Nombre completo (mínimo 4 y máximo 45 caracteres)
    if (!formData.fullName.trim()) {
      errs.fullName = 'El nombre completo es obligatorio';
    } else if (formData.fullName.trim().length < 4) {
      errs.fullName = 'Mínimo 4 caracteres requeridos';
    } else if (formData.fullName.trim().length > 45) {
      errs.fullName = `El nombre no puede exceder 45 caracteres (actual: ${formData.fullName.trim().length})`;
    } else if (!NAME_RE.test(formData.fullName.trim())) {
      errs.fullName = 'Solo se permiten letras y espacios';
    }

    // 2. Nombre de usuario (unicidad y límite estricto de 3 a 15 caracteres)
    if (!formData.username.trim()) {
      errs.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.trim().length < 3) {
      errs.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.trim().length > 15) {
      errs.username = `El nombre de usuario no puede exceder 15 caracteres (actual: ${formData.username.trim().length})`;
    } else if (!/^[a-z0-9_]{3,15}$/.test(formData.username.trim())) {
      errs.username = 'Solo se permiten letras minúsculas, números o guion bajo';
    } else if (users.some((u) => u.id !== editingUser?.id && u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
      errs.username = 'Este nombre de usuario ya está registrado en el sistema';
    }

    // 3. Correo electrónico (formato y límite máximo de 50 caracteres)
    if (!formData.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio';
    } else if (formData.email.trim().length > 50) {
      errs.email = `El correo no puede exceder 50 caracteres (actual: ${formData.email.trim().length})`;
    } else if (!EMAIL_RE.test(formData.email.trim())) {
      errs.email = 'Formato de correo no válido (ej. usuario@dominio.com)';
    } else if (users.some((u) => u.id !== editingUser?.id && u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
      errs.email = 'Este correo electrónico ya está en uso por otro usuario';
    }

    // 4. Teléfono (exactamente 10 dígitos)
    const phoneDigits = onlyDigits(formData.phone);
    if (!formData.phone.trim()) {
      errs.phone = 'El número de teléfono móvil es obligatorio';
    } else if (phoneDigits.length !== 10) {
      errs.phone = `El teléfono debe contener exactamente 10 dígitos (actual: ${phoneDigits.length})`;
    }

    // 5. Rol
    if (!formData.role) {
      errs.role = 'Debes asignar un rol al usuario';
    }

    // 6. Departamento
    if (!formData.department) {
      errs.department = 'Debes seleccionar el departamento correspondiente';
    }

    // 7. Fecha de ingreso
    if (!formData.hireDate) {
      errs.hireDate = 'La fecha de contratación / ingreso es obligatoria';
    }

    // 8. Permisos
    if (!formData.permissions || formData.permissions.length === 0) {
      errs.permissions = 'Debes otorgar al menos un permiso o privilegio al usuario';
    }

    // 9. Contraseña (en edición es opcional; máximo 30 caracteres)
    const isEditing = !!editingUser;
    if (!isEditing) {
      if (!formData.password) {
        errs.password = 'La contraseña temporal es obligatoria';
      } else if (formData.password.length > 30) {
        errs.password = 'La contraseña no puede exceder 30 caracteres';
      } else if (!isPasswordValid) {
        errs.password = 'La contraseña no cumple con todas las políticas de seguridad';
      }

      if (!formData.confirmPassword) {
        errs.confirmPassword = 'Debes confirmar la contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else if (formData.password) {
      if (formData.password.length > 30) {
        errs.password = 'La nueva contraseña no puede exceder 30 caracteres';
      } else if (!isPasswordValid) {
        errs.password = 'La nueva contraseña no cumple con las políticas de seguridad';
      }

      if (!formData.confirmPassword) {
        errs.confirmPassword = 'Debes confirmar la nueva contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    return errs;
  };

  const errors = useMemo(() => validateForm(), [formData, users, isPasswordValid, editingUser]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setTouched({});
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      hireDate: user.hireDate,
      status: user.status,
      permissions: [...(user.permissions || [])],
      password: '',
      confirmPassword: '',
    });
    setTouched({});
    setCreateModalOpen(true);
  };

  const handleResetToEmpty = () => {
    setUsers([]);
    setSelectedUser(null);
    setEditingUser(null);
    toast.info('Listado restablecido a estado inicial vacío');
  };

  const handleTogglePermission = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      const nextPerms = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: nextPerms };
    });
    setTouched((t) => ({ ...t, permissions: true }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (Object.keys(errors).length > 0) {
      toast.error('Corrige los errores del formulario antes de continuar');
      return;
    }

    setSubmitting(true);
    try {
      await simulateRequest(() => {}, { minDelay: 350, maxDelay: 750, canFail: false });

      if (editingUser) {
        // ACTUALIZACIÓN DE USUARIO EXISTENTE
        const updatedUser = {
          ...editingUser,
          fullName: formData.fullName.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          department: formData.department,
          hireDate: formData.hireDate,
          status: formData.status,
          permissions: [...formData.permissions],
          updatedAt: new Date().toISOString(),
        };

        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
        if (selectedUser?.id === editingUser.id) {
          setSelectedUser(updatedUser);
        }
        setEditingUser(null);
        setCreateModalOpen(false);
        toast.success(`Usuario ${updatedUser.fullName} (${updatedUser.id}) actualizado exitosamente`);
      } else {
        // CREACIÓN DE NUEVO USUARIO
        const newId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
        const newUser = {
          id: newId,
          fullName: formData.fullName.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          department: formData.department,
          hireDate: formData.hireDate,
          status: formData.status,
          permissions: [...formData.permissions],
          createdAt: new Date().toISOString(),
        };

        setUsers((prev) => [newUser, ...prev]);
        setCreateModalOpen(false);
        toast.success(`Usuario ${newUser.fullName} (${newUser.id}) creado exitosamente`);
      }
    } catch {
      toast.error('Error al guardar datos del usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (selectedUser?.id === userId) {
      setSelectedUser(null);
    }
    setDeleteConfirmUser(null);
    toast.success('Usuario eliminado del directorio');
  };

  // Filtrado de la lista de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = u.fullName.toLowerCase().includes(q);
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesId = u.id.toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesId) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchTerm]);

  return (
    <div className="space-y-8" data-testid="users-module-container">
      {/* CABECERA PRINCIPAL */}
      <PageHeader
        title="Gestión y Directorio de Usuarios"
        description="Listado inicial vacío, formulario de alta con validación estricta de roles, credenciales y permisos, y vista de detalle profundo para verificación QA."
        badge="QA Lab · Módulo de Usuarios"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleRulesPanel}
              data-testid="toggle-rules-panel-btn"
              className={cn(
                'btn btn-sm shadow-sm transition-all',
                showRulesPanel
                  ? 'bg-moss-700 text-white hover:bg-moss-800 ring-2 ring-moss-400/40'
                  : 'btn-secondary text-moss-800 border-moss-300 hover:bg-moss-100',
              )}
              title={showRulesPanel ? 'Ocultar panel lateral de reglas QA' : 'Mostrar panel lateral con todas las reglas de validación'}
            >
              {showRulesPanel ? <EyeOff className="h-4 w-4" /> : <BookOpen className="h-4 w-4 text-moss-600" />}
              <span>{showRulesPanel ? 'Ocultar Reglas QA' : 'Ver Reglas de Validación'}</span>
              <span className="badge badge-moss !text-[10px] !py-0 !px-1.5 ml-1">QA Lab</span>
            </button>
            <LocatorHint testId="toggle-rules-panel-btn" label="Alternar Reglas de Validación" />

            {users.length > 0 && (
              <button
                type="button"
                onClick={handleResetToEmpty}
                data-testid="users-reset-empty-btn"
                className="btn btn-secondary btn-sm"
                title="Vaciar la lista para reiniciar pruebas de estado vacío"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Vaciar Directorio
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              data-testid="create-user-btn"
              className="btn btn-primary shadow-soft"
            >
              <UserPlus className="h-4 w-4" /> Crear Usuario
            </button>
            <LocatorHint testId="create-user-btn" label="Botón Crear Usuario" />
          </div>
        }
      />

      {/* CONTENEDOR PRINCIPAL: DIRECTORIO + PANEL LATERAL DE REGLAS QA */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* COLUMNA PRINCIPAL */}
        <div className="flex-1 min-w-0 w-full space-y-6">

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <section className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
            {/* Buscador de usuarios */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
              <input
                id="users-search-input"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, @username, correo o ID..."
                data-testid="users-search-input"
                className="input pl-10"
              />
            </div>

            {/* Filtro de rol con CustomSelect */}
            <div className="w-full sm:w-64">
              <CustomSelect
                id="users-role-filter"
                testId="users-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Todos los Roles' },
                  ...USER_ROLES.map((r) => ({ value: r.value, label: r.label })),
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-semibold text-moss-700">
            {!showRulesPanel && (
              <button
                type="button"
                onClick={() => setShowRulesPanel(true)}
                data-testid="toolbar-show-rules-btn"
                className="btn btn-secondary btn-sm !text-xs !py-1 gap-1.5"
                title="Mostrar especificación de reglas de validación QA"
              >
                <BookOpen className="h-3.5 w-3.5 text-moss-600" />
                <span>Ver Reglas QA</span>
              </button>
            )}
            <span
              data-testid="users-count-badge"
              className="rounded-xl bg-moss-100 px-3 py-1.5 border border-moss-200 text-moss-800"
            >
              Total: <strong>{users.length}</strong> {users.length === 1 ? 'usuario' : 'usuarios'}
            </span>
          </div>
        </div>
      </section>

      {/* LISTADO DE USUARIOS (ESTADO VACÍO O TABLA DE REGISTROS) */}
      {users.length === 0 ? (
        /* ESTADO VACÍO INICIAL */
        <div
          data-testid="users-empty-state"
          className="card p-12 text-center flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-moss-300 bg-white/60"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-200/80 text-moss-700 shadow-soft ring-8 ring-moss-100">
            <Users className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-moss-900" data-testid="empty-state-title">
              No hay usuarios registrados
            </h3>
            <p className="text-sm text-moss-600 leading-relaxed" data-testid="empty-state-desc">
              El directorio de usuarios está actualmente vacío. Comienza creando el primer usuario
              con sus roles y credenciales para comprobar los datos creados en el detalle.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            data-testid="create-first-user-btn"
            className="btn btn-primary btn-lg shadow-lift mt-2"
          >
            <UserPlus className="h-4 w-4" /> Crear Primer Usuario
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        /* FILTRO SIN RESULTADOS */
        <div
          data-testid="users-no-results"
          className="card p-8 text-center space-y-3 border-moss-200"
        >
          <p className="text-sm font-semibold text-moss-800">
            No se encontraron usuarios que coincidan con los filtros aplicados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
            }}
            data-testid="clear-filters-btn"
            className="btn btn-secondary btn-sm"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : (
        /* TABLA DE USUARIOS CREADOS */
        <section
          className="card overflow-hidden"
          data-testid="users-table-container"
        >
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs text-moss-800">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[13%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[6%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead className="border-b border-moss-200 bg-moss-50/80 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                <tr>
                  <th scope="col" className="px-3.5 py-3 text-left">Usuario</th>
                  <th scope="col" className="px-2.5 py-3 text-left">Rol Asignado</th>
                  <th scope="col" className="px-2.5 py-3 text-left">Departamento</th>
                  <th scope="col" className="px-2.5 py-3 text-left">Contacto</th>
                  <th scope="col" className="px-2 py-3 text-left">Fecha Ingreso</th>
                  <th scope="col" className="px-2 py-3 text-left">Estado</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss-100">
                {filteredUsers.map((user) => {
                  const roleObj = USER_ROLES.find((r) => r.value === user.role) || {
                    label: user.role,
                    badge: user.role,
                    color: 'badge-moss',
                  };
                  const deptObj = DEPARTMENTS.find((d) => d.value === user.department);
                  const initials = user.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={user.id}
                      data-testid={`user-row-${user.id}`}
                      onClick={() => setSelectedUser(user)}
                      className="cursor-pointer hover:bg-moss-50/70 transition-colors group"
                    >
                      {/* Usuario */}
                      <td className="px-3.5 py-3 align-top">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-moss-600 to-moss-800 font-display font-bold text-white text-xs shadow-soft ring-1 ring-moss-200 mt-0.5">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-bold text-moss-900 group-hover:text-moss-700 transition-colors text-xs sm:text-sm break-words leading-tight"
                              data-testid={`user-name-${user.id}`}
                            >
                              <span>{user.fullName}</span>
                              {user.updatedAt && (
                                <span
                                  data-testid={`user-updated-badge-${user.id}`}
                                  className="badge badge-moss text-[9px] py-0 px-1 font-mono font-normal ml-1.5 align-middle inline-flex"
                                  title={`Modificado: ${user.updatedAt}`}
                                >
                                  editado
                                </span>
                              )}
                            </div>
                            <p
                              className="font-mono text-[11px] text-moss-500 break-words mt-0.5"
                              data-testid={`user-username-${user.id}`}
                            >
                              @{user.username} · <span className="font-semibold text-moss-600">{user.id}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-2.5 py-3 align-top">
                        <span
                          className={cn('badge text-[11px] font-semibold inline-flex items-center gap-1 max-w-full', roleObj.color)}
                          data-testid={`user-role-${user.id}`}
                          title={roleObj.label}
                        >
                          <Shield className="h-3 w-3 shrink-0" />
                          <span className="truncate">{roleObj.badge || roleObj.label}</span>
                        </span>
                      </td>

                      {/* Departamento */}
                      <td className="px-2.5 py-3 align-top text-xs font-medium text-moss-800 leading-snug">
                        <span className="break-words line-clamp-2" title={deptObj?.label || user.department}>
                          {deptObj?.label || user.department}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="px-2.5 py-3 align-top">
                        <div className="space-y-0.5 min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-moss-900 text-xs min-w-0" title={user.email}>
                            <Mail className="h-3 w-3 text-moss-500 shrink-0" />
                            <span data-testid={`user-email-${user.id}`} className="break-all leading-tight">{user.email}</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-mono text-[11px] text-moss-500">
                            <Phone className="h-3 w-3 text-moss-400 shrink-0" />
                            <span data-testid={`user-phone-${user.id}`}>{user.phone}</span>
                          </p>
                        </div>
                      </td>

                      {/* Fecha Ingreso */}
                      <td className="px-2 py-3 align-top font-mono text-xs text-moss-700 whitespace-nowrap" data-testid={`user-hire-date-${user.id}`}>
                        {user.hireDate}
                      </td>

                      {/* Estado */}
                      <td className="px-2 py-3 align-top">
                        <span
                          data-testid={`user-status-${user.id}`}
                          className={cn(
                            'badge text-[11px] whitespace-nowrap',
                            user.status === 'active' && 'badge-green',
                            user.status === 'pending' && 'badge-yellow',
                            user.status === 'suspended' && 'badge-red',
                          )}
                        >
                          {user.status === 'active' && 'Activo'}
                          {user.status === 'pending' && 'Pendiente'}
                          {user.status === 'suspended' && 'Suspendido'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-3.5 py-3 align-top text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            data-testid={`user-view-btn-${user.id}`}
                            className="btn btn-secondary !px-2.5 !py-1 text-xs"
                            title="Ver detalles completos del usuario"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span>Detalle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            data-testid={`user-edit-btn-${user.id}`}
                            className="btn btn-secondary !px-2.5 !py-1 text-xs"
                            title="Editar datos del usuario"
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0 text-moss-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(user)}
                            data-testid={`user-delete-btn-${user.id}`}
                            className="btn btn-ghost !h-7 !w-7 !p-0 text-moss-400 hover:text-danger-600 rounded-lg shrink-0"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
        </div>

        {/* COLUMNA DERECHA: PANEL DE REGLAS DE VALIDACIÓN QA (CORRESPONDE AL RECUADRO ROJO) */}
        {showRulesPanel && (
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-24">
            <ValidationRulesPanel
              onClose={() => setShowRulesPanel(false)}
              onOpenCreateModal={handleOpenCreateModal}
            />
          </div>
        )}
      </div>

      {/* MODAL 1: FORMULARIO DE CREACIÓN / EDICIÓN DE USUARIO */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingUser ? `Editar Usuario: ${editingUser.fullName} (${editingUser.id})` : 'Crear Nuevo Usuario'}
        description={
          editingUser
            ? 'Modifica los datos del usuario y guarda los cambios para comprobar la actualización en el listado y detalle.'
            : 'Ingresa la información personal, asignación de rol, departamento y credenciales de acceso.'
        }
        testId={editingUser ? 'edit-user-modal' : 'create-user-modal'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              data-testid={editingUser ? 'cancel-edit-user-btn' : 'cancel-create-user-btn'}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-user-form"
              disabled={submitting}
              data-testid={editingUser ? 'submit-edit-user-btn' : 'submit-create-user-btn'}
              className="btn btn-primary"
            >
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Guardando...
                </>
              ) : editingUser ? (
                <>
                  <Check className="h-4 w-4" /> Guardar Cambios
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Guardar y Registrar
                </>
              )}
            </button>
          </div>
        }
      >
        <form
          id="create-user-form"
          onSubmit={handleFormSubmit}
          noValidate
          data-testid={editingUser ? 'edit-user-form' : 'create-user-form'}
          className="space-y-6"
        >
          {/* BANNER EXPANDIBLE DE REGLAS Y LÍMITES EN EL FORMULARIO */}
          <div
            data-testid="modal-rules-guide-banner"
            className="rounded-xl border border-moss-200 bg-moss-50/70 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold text-moss-800">
                <BookOpen className="h-4 w-4 text-moss-600 shrink-0" />
                <span>Guía Rápida de Validación y Límites (QA):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowModalRulesGuide((v) => !v)}
                data-testid="toggle-modal-rules-guide-btn"
                className="text-xs font-semibold text-moss-700 hover:text-moss-900 underline underline-offset-2 shrink-0 inline-flex items-center gap-1"
              >
                {showModalRulesGuide ? 'Ocultar reglas' : 'Ver reglas y límites'}
              </button>
            </div>
            {showModalRulesGuide && (
              <div
                data-testid="modal-rules-guide-details"
                className="mt-2.5 pt-2.5 border-t border-moss-200 grid gap-2 sm:grid-cols-2 text-[11px] text-moss-700 font-medium"
              >
                <div>
                  <strong className="text-moss-900">1. Nombre Completo:</strong> 4 a 45 caracteres (solo letras y espacios).
                </div>
                <div>
                  <strong className="text-moss-900">2. Username:</strong> 3 a 15 caracteres (minúsculas, números, _, único).
                </div>
                <div>
                  <strong className="text-moss-900">3. Correo Corporativo:</strong> Máximo 50 caracteres (formato válido, único).
                </div>
                <div>
                  <strong className="text-moss-900">4. Teléfono:</strong> Exactamente 10 dígitos numéricos.
                </div>
                <div>
                  <strong className="text-moss-900">5. Contraseña:</strong> 8 a 30 caracteres (1 mayúscula, 1 número, 1 símbolo).
                </div>
                <div>
                  <strong className="text-moss-900">6. Organización:</strong> Rol, Departamento, Fecha y al menos 1 Permiso.
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="form-section">
            <div className="form-section-header">
              <Users className="h-4 w-4 text-moss-600" />
              <span>1. Identidad y Datos de Acceso</span>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {/* Nombre Completo */}
              <Field
                label="Nombre Completo"
                htmlFor="user-fullname"
                testId="user-fullname-input"
                error={touched.fullName && errors.fullName}
                hint="Mínimo 4 y máximo 45 caracteres"
                required
                labelExtra={
                  <span
                    data-testid="user-fullname-counter"
                    className={cn(
                      'font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors',
                      formData.fullName.trim().length > 45
                        ? 'bg-danger-100 text-danger-700 font-bold'
                        : formData.fullName.trim().length >= 40
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-moss-100/70 text-moss-600',
                    )}
                  >
                    {formData.fullName.length}/45
                  </span>
                }
              >
                <input
                  id="user-fullname"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                  placeholder="Ej. Alejandra Morales Ramos"
                  data-testid="user-fullname-input"
                  className="input"
                />
              </Field>

              {/* Nombre de Usuario */}
              <Field
                label="Nombre de Usuario (Username)"
                htmlFor="user-username"
                testId="user-username-input"
                error={touched.username && errors.username}
                hint="Minúsculas, números o guion bajo (3 a 15 caracteres)"
                required
                labelExtra={
                  <span
                    data-testid="user-username-counter"
                    className={cn(
                      'font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors',
                      formData.username.trim().length > 15
                        ? 'bg-danger-100 text-danger-700 font-bold'
                        : 'bg-moss-100/70 text-moss-600',
                    )}
                  >
                    {formData.username.length}/15
                  </span>
                }
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-moss-400">
                    @
                  </span>
                  <input
                    id="user-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                    placeholder="alejandra_qa"
                    data-testid="user-username-input"
                    className="input pl-8 font-mono text-xs"
                  />
                </div>
              </Field>

              {/* Correo Electrónico */}
              <Field
                label="Correo Electrónico Corporativo"
                htmlFor="user-email"
                testId="user-email-input"
                error={touched.email && errors.email}
                hint="Máximo 50 caracteres (ej. usuario@corporativo.com)"
                required
                labelExtra={
                  <span
                    data-testid="user-email-counter"
                    className={cn(
                      'font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors',
                      formData.email.trim().length > 50
                        ? 'bg-danger-100 text-danger-700 font-bold'
                        : 'bg-moss-100/70 text-moss-600',
                    )}
                  >
                    {formData.email.length}/50
                  </span>
                }
              >
                <input
                  id="user-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="alejandra@corporativo.com"
                  data-testid="user-email-input"
                  className="input"
                />
              </Field>

              {/* Teléfono Móvil */}
              <Field
                label="Número de Teléfono Móvil"
                htmlFor="user-phone"
                testId="user-phone-input"
                error={touched.phone && errors.phone}
                hint="Exactamente 10 dígitos numéricos"
                required
                labelExtra={
                  <span
                    data-testid="user-phone-counter"
                    className={cn(
                      'font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors',
                      onlyDigits(formData.phone).length > 10
                        ? 'bg-danger-100 text-danger-700 font-bold'
                        : onlyDigits(formData.phone).length === 10
                        ? 'bg-green-100 text-green-700 font-bold'
                        : 'bg-moss-100/70 text-moss-600',
                    )}
                  >
                    {onlyDigits(formData.phone).length}/10
                  </span>
                }
              >
                <input
                  id="user-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="5587654321"
                  data-testid="user-phone-input"
                  className="input font-mono"
                />
              </Field>
            </div>
          </div>

          {/* SECCIÓN 2: ROL, DEPARTAMENTO Y CONTRATACIÓN */}
          <div className="form-section">
            <div className="form-section-header">
              <Briefcase className="h-4 w-4 text-moss-600" />
              <span>2. Rol Organizacional y Contratación</span>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {/* Rol */}
              <div className="space-y-2">
                <label htmlFor="user-role" className="label flex items-center justify-between">
                  <span className="font-medium text-moss-800">
                    Rol Asignado <span className="text-danger-600">*</span>
                  </span>
                  <LocatorHint testId="user-role-select" />
                </label>
                <CustomSelect
                  id="user-role"
                  testId="user-role-select"
                  value={formData.role}
                  onChange={(e) => {
                    setFormData({ ...formData, role: e.target.value });
                    setTouched((t) => ({ ...t, role: true }));
                  }}
                  placeholder="-- Selecciona un Rol --"
                  options={USER_ROLES.map((r) => ({
                    value: r.value,
                    label: `${r.label} (${r.badge})`,
                  }))}
                  error={touched.role && !!errors.role}
                />
                {touched.role && errors.role && (
                  <p className="field-error" data-testid="user-role-select-error">
                    {errors.role}
                  </p>
                )}
              </div>

              {/* Departamento */}
              <div className="space-y-2">
                <label htmlFor="user-department" className="label flex items-center justify-between">
                  <span className="font-medium text-moss-800">
                    Departamento <span className="text-danger-600">*</span>
                  </span>
                  <LocatorHint testId="user-department-select" />
                </label>
                <CustomSelect
                  id="user-department"
                  testId="user-department-select"
                  value={formData.department}
                  onChange={(e) => {
                    setFormData({ ...formData, department: e.target.value });
                    setTouched((t) => ({ ...t, department: true }));
                  }}
                  placeholder="-- Selecciona un Área --"
                  options={DEPARTMENTS.map((d) => ({
                    value: d.value,
                    label: d.label,
                  }))}
                  error={touched.department && !!errors.department}
                />
                {touched.department && errors.department && (
                  <p className="field-error" data-testid="user-department-select-error">
                    {errors.department}
                  </p>
                )}
              </div>

              {/* Fecha de Contratación con CustomDatePicker */}
              <div className="space-y-2">
                <label htmlFor="user-hire-date" className="label flex items-center justify-between">
                  <span className="font-medium text-moss-800">
                    Fecha de Ingreso / Contratación <span className="text-danger-600">*</span>
                  </span>
                  <LocatorHint testId="user-hire-date-input" />
                </label>
                <CustomDatePicker
                  id="user-hire-date"
                  testId="user-hire-date-input"
                  value={formData.hireDate}
                  onChange={(e) => {
                    setFormData({ ...formData, hireDate: e.target.value });
                    setTouched((t) => ({ ...t, hireDate: true }));
                  }}
                  placeholder="dd/mm/aaaa"
                  error={touched.hireDate && !!errors.hireDate}
                />
                {touched.hireDate && errors.hireDate && (
                  <p className="field-error" data-testid="user-hire-date-input-error">
                    {errors.hireDate}
                  </p>
                )}
              </div>

              {/* Estado Inicial */}
              <div className="space-y-2">
                <label htmlFor="user-status" className="label flex items-center justify-between">
                  <span className="font-medium text-moss-800">Estado Inicial</span>
                  <LocatorHint testId="user-status-select" />
                </label>
                <CustomSelect
                  id="user-status"
                  testId="user-status-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'active', label: 'Activo (Acceso Inmediato)' },
                    { value: 'pending', label: 'Pendiente de Aprobación' },
                    { value: 'suspended', label: 'Suspendido / En Pausa' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: PERMISOS Y PRIVILEGIOS */}
          <div className="form-section">
            <div className="form-section-header">
              <KeyRound className="h-4 w-4 text-moss-600" />
              <span>3. Permisos y Privilegios Específicos</span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-moss-600">
                Selecciona al menos una facultad que tendrá el usuario dentro de la suite:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {AVAILABLE_PERMISSIONS.map((p) => {
                  const isChecked = formData.permissions.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleTogglePermission(p.id)}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                        isChecked
                          ? 'border-moss-600 bg-moss-50/70 text-moss-900 shadow-sm'
                          : 'border-moss-200 bg-white hover:bg-moss-50/40 text-moss-700',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        data-testid={`perm-checkbox-${p.id}`}
                        className="checkbox mt-0.5"
                      />
                      <span className="text-xs font-semibold leading-relaxed">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {touched.permissions && errors.permissions && (
                <p className="field-error" data-testid="user-permissions-error">
                  {errors.permissions}
                </p>
              )}
            </div>
          </div>

          {/* SECCIÓN 4: CONTRASEÑA TEMPORAL Y CONFIRMACIÓN */}
          <div className="form-section">
            <div className="form-section-header">
              <Lock className="h-4 w-4 text-moss-600" />
              <span>4. Credenciales de Seguridad</span>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {/* Contraseña */}
              <Field
                label={editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}
                htmlFor="user-password"
                testId="user-password-input"
                error={touched.password && errors.password}
                hint={editingUser ? 'Dejar en blanco para conservar la actual' : 'De 8 a 30 caracteres con mayúscula, número y símbolo'}
                required={!editingUser}
                labelExtra={
                  formData.password ? (
                    <span
                      data-testid="user-password-counter"
                      className={cn(
                        'font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors',
                        formData.password.length > 30
                          ? 'bg-danger-100 text-danger-700 font-bold'
                          : 'bg-moss-100/70 text-moss-600',
                      )}
                    >
                      {formData.password.length}/30
                    </span>
                  ) : null
                }
              >
                <input
                  id="user-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder={editingUser ? 'Sin cambios (conservar)' : '••••••••••••'}
                  data-testid="user-password-input"
                  className="input font-mono"
                />
              </Field>

              {/* Confirmar Contraseña */}
              <Field
                label={editingUser ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña'}
                htmlFor="user-confirm-password"
                testId="user-confirm-password-input"
                error={touched.confirmPassword && errors.confirmPassword}
                required={!editingUser || !!formData.password}
              >
                <input
                  id="user-confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                  placeholder={editingUser ? 'Sin cambios (conservar)' : '••••••••••••'}
                  data-testid="user-confirm-password-input"
                  className="input font-mono"
                />
              </Field>
            </div>

            {/* Checklist de requisitos de contraseña en vivo (visible si es nuevo o si escribió password) */}
            {(!editingUser || !!formData.password) && (
              <div className="mt-4 rounded-xl border border-moss-200 bg-moss-50/60 p-3.5 space-y-2">
                <p className="text-xs font-bold text-moss-800">Políticas de seguridad de contraseña:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.minLength ? 'text-moss-700 font-bold' : 'text-moss-400',
                    )}
                    data-testid="pwd-rule-minlength"
                  >
                    {passwordRules.minLength ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    Mínimo 8 caracteres
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      formData.password.length > 30 ? 'text-danger-600 font-bold' : passwordRules.maxLength ? 'text-moss-700 font-bold' : 'text-moss-400',
                    )}
                    data-testid="pwd-rule-maxlength"
                  >
                    {formData.password.length > 30 ? (
                      <X className="h-3.5 w-3.5 text-danger-600" />
                    ) : passwordRules.maxLength ? (
                      <Check className="h-3.5 w-3.5 text-moss-600" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-moss-400" />
                    )}
                    Máximo 30 caracteres
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.hasUpper ? 'text-moss-700 font-bold' : 'text-moss-400',
                    )}
                    data-testid="pwd-rule-upper"
                  >
                    {passwordRules.hasUpper ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 letra mayúscula
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.hasNumber ? 'text-moss-700 font-bold' : 'text-moss-400',
                    )}
                    data-testid="pwd-rule-number"
                  >
                    {passwordRules.hasNumber ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 número
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.hasSpecial ? 'text-moss-700 font-bold' : 'text-moss-400',
                    )}
                    data-testid="pwd-rule-special"
                  >
                    {passwordRules.hasSpecial ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 caracter especial (!@#$%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VISTA DE DETALLE PROFUNDO DEL USUARIO (PARA COMPROBACIÓN QA) */}
      {selectedUser && (
        <Modal
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Ficha Detallada del Usuario"
          description="Comprueba que todos los datos capturados en el formulario de creación coinciden fielmente con el registro del sistema."
          testId="user-detail-modal"
          size="lg"
          footer={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <span className="text-xs text-moss-500 font-mono">
                ID Registro: <strong data-testid="detail-user-id">{selectedUser.id}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(selectedUser);
                  }}
                  data-testid="detail-edit-user-btn"
                  className="btn btn-secondary btn-sm"
                  title="Editar este usuario"
                >
                  <Pencil className="h-3.5 w-3.5 text-moss-600" />
                  <span>Editar Usuario</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  data-testid="close-detail-modal-btn"
                  className="btn btn-primary btn-sm"
                >
                  Entendido / Cerrar
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6" data-testid="user-detail-content">
            {/* Encabezado del perfil con Avatar e Identidad */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-moss-50 to-moss-100/60 p-5 border border-moss-200">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-600 to-moss-800 font-display text-xl font-bold text-white shadow-soft ring-4 ring-white">
                  {selectedUser.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-lg font-bold text-moss-900 break-words leading-tight"
                    data-testid="detail-user-fullname"
                  >
                    {selectedUser.fullName}
                  </h3>
                  <p
                    className="font-mono text-xs font-semibold text-moss-600 break-words mt-0.5"
                    data-testid="detail-user-username"
                  >
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Badge de Rol */}
                {(() => {
                  const roleObj = USER_ROLES.find((r) => r.value === selectedUser.role);
                  return (
                    <span
                      data-testid="detail-user-role"
                      data-role-value={selectedUser.role}
                      className={cn('badge text-xs font-semibold', roleObj?.color || 'badge-moss')}
                    >
                      <Shield className="h-3 w-3" /> {roleObj?.label || selectedUser.role}
                    </span>
                  );
                })()}

                {/* Badge de Estado */}
                <span
                  data-testid="detail-user-status"
                  data-status-value={selectedUser.status}
                  className={cn(
                    'badge text-xs font-semibold',
                    selectedUser.status === 'active' && 'badge-green',
                    selectedUser.status === 'pending' && 'badge-yellow',
                    selectedUser.status === 'suspended' && 'badge-red',
                  )}
                >
                  {selectedUser.status === 'active' && 'Activo'}
                  {selectedUser.status === 'pending' && 'Pendiente'}
                  {selectedUser.status === 'suspended' && 'Suspendido'}
                </span>

                {/* Badge de Editado si existe updatedAt */}
                {selectedUser.updatedAt && (
                  <span
                    data-testid="detail-user-updated-badge"
                    className="badge badge-moss text-[11px] font-mono"
                    title={`Modificado el: ${selectedUser.updatedAt}`}
                  >
                    <Sparkles className="h-3 w-3 text-moss-600" />
                    <span>EDITADO</span>
                  </span>
                )}
              </div>
            </div>

            {/* Cuadrícula de Datos Personales y Corporativos */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Correo Electrónico */}
              <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-500">
                  Correo Electrónico
                </span>
                <p
                  className="mt-1 font-semibold text-sm text-moss-900 flex items-start gap-2 min-w-0"
                >
                  <Mail className="h-4 w-4 text-moss-600 shrink-0 mt-0.5" />
                  <span data-testid="detail-user-email" className="break-all">{selectedUser.email}</span>
                </p>
              </div>

              {/* Teléfono Móvil */}
              <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-500">
                  Teléfono Móvil
                </span>
                <p
                  className="mt-1 font-mono font-semibold text-sm text-moss-900 flex items-center gap-2"
                  data-testid="detail-user-phone"
                >
                  <Phone className="h-4 w-4 text-moss-600 shrink-0" />
                  {selectedUser.phone}
                </p>
              </div>

              {/* Departamento */}
              <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-500">
                  Departamento Asignado
                </span>
                <p
                  className="mt-1 font-semibold text-sm text-moss-900 flex items-center gap-2"
                  data-testid="detail-user-department"
                  data-department-value={selectedUser.department}
                >
                  <Building className="h-4 w-4 text-moss-600 shrink-0" />
                  {DEPARTMENTS.find((d) => d.value === selectedUser.department)?.label || selectedUser.department}
                </p>
              </div>

              {/* Fecha de Ingreso */}
              <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-500">
                  Fecha de Contratación
                </span>
                <p
                  className="mt-1 font-mono font-semibold text-sm text-moss-900 flex items-center gap-2"
                  data-testid="detail-user-hire-date"
                >
                  <Calendar className="h-4 w-4 text-moss-600 shrink-0" />
                  {selectedUser.hireDate}
                </p>
              </div>

              {/* Fecha de Creación */}
              <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-moss-500">
                  Fecha de Creación
                </span>
                <p
                  className="mt-1 font-mono font-semibold text-xs text-moss-800 flex items-center gap-2"
                  data-testid="detail-user-created-at"
                >
                  <Calendar className="h-4 w-4 text-moss-600 shrink-0" />
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Fecha de Última Modificación (si fue editado) */}
              {selectedUser.updatedAt && (
                <div className="rounded-xl border border-moss-300 bg-moss-50/60 p-4 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-moss-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-moss-600" />
                    Última Modificación
                  </span>
                  <p
                    className="mt-1 font-mono font-semibold text-xs text-moss-900 flex items-center gap-2"
                    data-testid="detail-user-updated-at"
                  >
                    <Calendar className="h-4 w-4 text-moss-600 shrink-0" />
                    {new Date(selectedUser.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Permisos Otorgados */}
            <div className="rounded-xl border border-moss-200 bg-white p-4 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-moss-500 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-moss-600" />
                Permisos y Privilegios Concedidos ({selectedUser.permissions?.length || 0})
              </span>
              <div
                className="flex flex-wrap gap-2"
                data-testid="detail-user-permissions"
              >
                {selectedUser.permissions?.map((pId) => {
                  const perm = AVAILABLE_PERMISSIONS.find((p) => p.id === pId);
                  return (
                    <span
                      key={pId}
                      data-testid={`detail-perm-${pId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-moss-300 bg-moss-50 px-2.5 py-1 text-xs font-semibold text-moss-800"
                    >
                      <Check className="h-3 w-3 text-moss-600" />
                      {perm?.label || pId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Verificación de Integridad JSON (Ideal para pruebas automatizadas con Playwright / Cypress) */}
            <div className="rounded-xl border border-moss-200 bg-moss-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-moss-700">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-moss-600" />
                  Payload de Auditoría para Pruebas Automatizadas
                </span>
                <span className="badge badge-green font-mono text-[10px]">VERIFIED</span>
              </div>
              <pre
                data-testid="detail-user-json"
                className="max-h-40 overflow-y-auto rounded-lg bg-white p-3 font-mono text-[11px] text-moss-900 border border-moss-200"
              >
                {JSON.stringify(selectedUser, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmUser && (
        <Modal
          open={!!deleteConfirmUser}
          onClose={() => setDeleteConfirmUser(null)}
          title="Eliminar Usuario"
          description={`¿Estás seguro de que deseas eliminar la cuenta de ${deleteConfirmUser.fullName}?`}
          testId="user-delete-confirm-modal"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                data-testid="cancel-delete-user-btn"
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteConfirmUser.id)}
                data-testid="confirm-delete-user-btn"
                className="btn btn-danger btn-sm"
              >
                Sí, Eliminar Registro
              </button>
            </div>
          }
        >
          <p className="text-xs text-moss-600">
            Esta acción removerá a <strong>{deleteConfirmUser.fullName}</strong> ({deleteConfirmUser.id}) del directorio y podrás volver a comprobar el estado vacío si no restan usuarios.
          </p>
        </Modal>
      )}
    </div>
  );
}
