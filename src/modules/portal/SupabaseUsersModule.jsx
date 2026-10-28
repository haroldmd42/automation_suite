import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Trash2,
  ExternalLink,
  Building,
  KeyRound,
  FileCheck,
  Check,
  X,
  Sparkles,
  Pencil,
  FileCode2,
  Database,
  RefreshCw,
  LogOut,
  Layers,
  BookOpen,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, translateAuthError, createIsolatedSupabaseClient } from '../../services/supabaseClient';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateES, cn } from '../../utils/format';
import { EMAIL_RE, NAME_RE, onlyDigits } from '../../utils/validators';
import { PageHeader, Spinner, Alert, Panel } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';

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

export default function SupabaseUsersModule() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile: currentProfile, isConfigured, logAudit } = useSupabaseAuth();

  // Estados de lista
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showModalRulesGuide, setShowModalRulesGuide] = useState(false);

  // Formulario y estado de campos tocados
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});

  // Cargar usuarios reales desde Supabase PostgreSQL
  const loadUsers = useCallback(async () => {
    if (!isConfigured || !supabase) {
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error cargando perfiles:', err);
      toast.error('Error al cargar usuarios', err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [isConfigured, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Validación de requisitos de contraseña
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

  // Validaciones completas del formulario (idénticas a la sección de pruebas)
  const errors = useMemo(() => {
    const errs = {};

    // 1. Nombre completo
    if (!formData.fullName.trim()) {
      errs.fullName = 'El nombre completo es obligatorio';
    } else if (formData.fullName.trim().length < 4) {
      errs.fullName = 'Mínimo 4 caracteres requeridos';
    } else if (formData.fullName.trim().length > 45) {
      errs.fullName = `El nombre no puede exceder 45 caracteres (actual: ${formData.fullName.trim().length})`;
    } else if (!NAME_RE.test(formData.fullName.trim())) {
      errs.fullName = 'Solo se permiten letras y espacios';
    }

    // 2. Nombre de usuario
    if (!formData.username.trim()) {
      errs.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.trim().length < 3) {
      errs.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.trim().length > 15) {
      errs.username = `El nombre de usuario no puede exceder 15 caracteres (actual: ${formData.username.trim().length})`;
    } else if (!/^[a-z0-9_]{3,15}$/.test(formData.username.trim())) {
      errs.username = 'Solo se permiten letras minúsculas, números o guion bajo';
    } else if (
      users.some(
        (u) =>
          u.id !== editingUser?.id &&
          (u.username || '').toLowerCase() === formData.username.trim().toLowerCase()
      )
    ) {
      errs.username = 'Este nombre de usuario ya está registrado en el sistema';
    }

    // 3. Correo electrónico
    if (!formData.email.trim()) {
      errs.email = 'El correo electrónico es obligatorio';
    } else if (formData.email.trim().length > 50) {
      errs.email = `El correo no puede exceder 50 caracteres (actual: ${formData.email.trim().length})`;
    } else if (!EMAIL_RE.test(formData.email.trim())) {
      errs.email = 'Formato de correo no válido (ej. usuario@dominio.com)';
    } else if (
      users.some(
        (u) =>
          u.id !== editingUser?.id &&
          u.email.toLowerCase() === formData.email.trim().toLowerCase()
      )
    ) {
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

    // 9. Contraseña (en edición es opcional)
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
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    return errs;
  }, [formData, users, editingUser, isPasswordValid]);

  const hasErrors = Object.keys(errors).length > 0;

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q);

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Métricas
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      qa: users.filter((u) => u.role === 'qa_lead').length,
      engineering: users.filter((u) => u.department === 'engineering').length,
    };
  }, [users]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setTouched({});
    setShowModalRulesGuide(false);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      fullName: u.full_name || '',
      username: u.username || u.email?.split('@')[0] || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'qa_lead',
      department: u.department || 'qa',
      hireDate: u.hire_date || '',
      status: u.status || 'active',
      permissions: Array.isArray(u.permissions) ? u.permissions : ['perm_automation'],
      password: '',
      confirmPassword: '',
    });
    setTouched({});
    setShowModalRulesGuide(false);
    setCreateModalOpen(true);
  };

  const handleTogglePermission = (id) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(id);
      const next = exists ? prev.permissions.filter((p) => p !== id) : [...prev.permissions, id];
      return { ...prev, permissions: next };
    });
    setTouched((t) => ({ ...t, permissions: true }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    setTouched({
      fullName: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      hireDate: true,
      permissions: true,
      password: true,
      confirmPassword: true,
    });

    if (hasErrors) {
      toast.error('Formulario incompleto', 'Por favor corrige los campos señalados en rojo.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        // MODO EDICIÓN
        const updatePayload = {
          full_name: formData.fullName.trim(),
          username: formData.username.trim(),
          role: formData.role,
          department: formData.department,
          phone: onlyDigits(formData.phone),
          hire_date: formData.hireDate,
          status: formData.status,
          permissions: formData.permissions,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', editingUser.id);

        if (updateErr) throw updateErr;

        await logAudit('update_user', 'profiles', {
          user_id: editingUser.id,
          email: formData.email,
          role: formData.role,
        });

        toast.success('Usuario actualizado', `Los datos de ${formData.fullName} se guardaron en PostgreSQL.`);
      } else {
        // MODO CREACIÓN
        // Se usa un cliente efímero e independiente sin almacenamiento para evitar
        // que Supabase sustituya la sesión activa del Administrador por la del nuevo usuario
        const authClient = createIsolatedSupabaseClient() || supabase;
        const { data: authData, error: authErr } = await authClient.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              username: formData.username.trim(),
              role: formData.role,
              department: formData.department,
              phone: onlyDigits(formData.phone),
              hire_date: formData.hireDate,
              status: formData.status,
              permissions: formData.permissions,
            },
          },
        });

        if (authErr) throw authErr;

        // Si se generó el usuario, asegurar campos en tabla profiles
        if (authData?.user?.id) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: formData.email.trim(),
            full_name: formData.fullName.trim(),
            username: formData.username.trim(),
            role: formData.role,
            department: formData.department,
            phone: onlyDigits(formData.phone),
            hire_date: formData.hireDate,
            status: formData.status,
            permissions: formData.permissions,
            updated_at: new Date().toISOString(),
          });
        }

        await logAudit('create_user', 'profiles', {
          email: formData.email,
          username: formData.username,
          role: formData.role,
        });

        toast.success('Usuario registrado', `Usuario ${formData.fullName} creado exitosamente en Supabase.`);
      }

      setCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      await loadUsers();
    } catch (err) {
      console.error('Error guardando usuario:', err);
      toast.error('Error al guardar', translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteConfirmUser.id);

      if (error) throw error;

      await logAudit('delete_user', 'profiles', {
        deleted_id: deleteConfirmUser.id,
        email: deleteConfirmUser.email,
      });

      toast.info('Usuario eliminado', `Se eliminó el perfil de ${deleteConfirmUser.full_name || deleteConfirmUser.email}`);
      setDeleteConfirmUser(null);
      await loadUsers();
    } catch (err) {
      toast.error('Error al eliminar', translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Si no está autenticado, mostrar aviso amigable
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-slide-up" data-testid="portal-unauthenticated">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-100 text-moss-700 shadow-soft">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold text-moss-900">Módulo Protegido: Portal Cloud</h2>
        <p className="mt-2 max-w-md text-sm text-moss-600">
          Para ver y administrar la base de datos real de usuarios en Supabase PostgreSQL, primero debes iniciar sesión.
        </p>
        <div className="mt-6">
          <Link to="/login" className="btn btn-primary" data-testid="portal-login-redirect-btn">
            <KeyRound className="h-4 w-4" /> Iniciar Sesión en Supabase
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="supabase-users-module">
      <PageHeader
        icon={Database}
        eyebrow="Portal Cloud Supabase"
        title="Gestión de Usuarios (PostgreSQL Real)"
        description="Módulo administrativo conectado en vivo a PostgreSQL en Supabase Cloud. Formulario con validaciones estrictas de roles, departamentos, teléfono y credenciales."
        testId="supabase-users-header"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              disabled={loadingUsers}
              className="btn btn-secondary btn-sm"
              title="Refrescar datos desde PostgreSQL"
              data-testid="refresh-supabase-users-btn"
            >
              <RefreshCw className={cn('h-4 w-4', loadingUsers && 'animate-spin')} />
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm shadow-lift"
              data-testid="create-supabase-user-btn"
            >
              <UserPlus className="h-4 w-4" />
              <span>Nuevo Usuario Cloud</span>
            </button>
          </div>
        }
      />

      {/* MÉTRICAS SUPERIORES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="supabase-users-stats">
        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Total en PostgreSQL</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="stat-total-users">
            {stats.total}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Registros en tabla profiles</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Administradores</span>
            <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-red-600" data-testid="stat-admins">
            {stats.admins}
          </p>
          <p className="text-[11px] text-red-700 mt-1 font-medium">Acceso total y gestión RBAC</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Líderes de Calidad (QA)</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-600" data-testid="stat-qa">
            {stats.qa}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Suites & automatización</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Ingeniería & Devs</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-blue-600" data-testid="stat-devs">
            {stats.engineering}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Releases & Pipelines Cloud</p>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-moss-200 bg-white p-4 shadow-soft">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, username, correo o departamento..."
            className="input pl-10 w-full"
            data-testid="supabase-users-search-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-moss-700">Rol:</span>
          <div className="w-44">
            <CustomSelect
              id="filter-supabase-role"
              testId="filter-supabase-role-select"
              size="sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[{ value: 'all', label: 'Todos los roles' }, ...USER_ROLES.map((r) => ({ value: r.value, label: r.badge }))]}
            />
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE USUARIOS */}
      <div className="table-container shadow-soft" data-testid="supabase-users-table-card">
        {loadingUsers ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 text-moss-600">
            <Spinner className="h-6 w-6" />
            <p className="text-xs font-medium">Consultando tabla profiles en PostgreSQL...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center text-moss-600">
            <Users className="h-10 w-10 text-moss-300 mb-2" />
            <p className="font-semibold text-moss-900">No se encontraron usuarios en la base de datos</p>
            <p className="text-xs text-moss-500 mt-1 max-w-sm">
              {searchTerm || roleFilter !== 'all'
                ? 'Intenta cambiar los términos de búsqueda o filtros.'
                : 'Crea tu primer usuario en Supabase haciendo clic en "Nuevo Usuario Cloud".'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm mt-4"
              data-testid="empty-cta-create-btn"
            >
              <UserPlus className="h-4 w-4" /> Crear Usuario Ahora
            </button>
          </div>
        ) : (
          <table className="table min-w-[1000px]" data-testid="supabase-users-table">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Usuario & Nombre</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Rol en Plataforma</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Departamento</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Teléfono Móvil</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estado</th>
                <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Fecha Ingreso</th>
                <th scope="col" className="px-5 py-4 text-right font-bold text-moss-800">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const roleMeta = USER_ROLES.find((r) => r.value === u.role) || {
                  badge: u.role || 'Usuario',
                  color: 'badge-gray',
                };
                const deptMeta = DEPARTMENTS.find((d) => d.value === u.department);
                const isCurrent = user.id === u.id;
                const displayUsername = u.username || u.email?.split('@')[0];

                return (
                  <tr
                    key={u.id}
                    className={cn('transition hover:bg-moss-50/50', isCurrent && 'bg-moss-50/30')}
                    data-testid={`supabase-user-row-${u.id}`}
                  >
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-800 font-bold text-white shadow-soft text-xs">
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-moss-900 text-sm" data-testid={`user-name-${u.id}`}>
                              {u.full_name || 'Sin nombre'}
                            </span>
                            {isCurrent && (
                              <span className="badge badge-green text-[10px] py-0 px-1.5" title="Tu sesión actual">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <span className="font-mono text-moss-600 font-bold">@{displayUsername}</span>
                            <span className="text-moss-300">·</span>
                            <span className="font-mono text-moss-400 truncate max-w-[150px]" data-testid={`user-email-${u.id}`} title={u.email}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <span className={cn('badge text-xs font-semibold py-1 px-2.5', roleMeta.color)} data-testid={`user-role-${u.id}`}>
                        {roleMeta.badge}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-middle text-xs text-moss-800 font-medium">
                      {deptMeta?.label || u.department || '—'}
                    </td>

                    <td className="px-4 py-4 align-middle font-mono text-xs text-moss-600">
                      {u.phone || '—'}
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <span
                        className={cn(
                          'badge text-[11px] font-semibold py-1 px-2.5 inline-flex items-center gap-1.5 shadow-xs',
                          u.status === 'suspended'
                            ? 'badge-red'
                            : u.status === 'pending'
                            ? 'badge-yellow'
                            : 'badge-green'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            u.status === 'suspended'
                              ? 'bg-danger-600'
                              : u.status === 'pending'
                              ? 'bg-warning-500'
                              : 'bg-moss-600'
                          )}
                        />
                        {u.status === 'suspended'
                          ? 'Suspendido'
                          : u.status === 'pending'
                          ? 'Pendiente'
                          : 'Activo'}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-middle text-xs text-moss-500 font-mono">
                      {u.hire_date || (u.created_at ? new Date(u.created_at).toLocaleDateString() : '—')}
                    </td>

                    <td className="px-5 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="btn btn-ghost btn-sm text-moss-600 hover:text-moss-900"
                          title="Ver ficha técnica"
                          data-testid={`user-view-btn-${u.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="btn btn-ghost btn-sm text-moss-600 hover:text-moss-900"
                          title="Editar usuario"
                          data-testid={`user-edit-btn-${u.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmUser(u)}
                          disabled={isCurrent}
                          className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50 hover:text-danger-700 disabled:opacity-30"
                          title={isCurrent ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                          data-testid={`user-delete-btn-${u.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL COMPLETO: CREACIÓN / EDICIÓN (IDÉNTICO AL MÓDULO DE PRUEBAS) */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingUser ? 'Editar Usuario Cloud' : 'Crear Nuevo Usuario'}
        description={
          editingUser
            ? 'Modifica los datos del usuario y guarda los cambios para comprobar la actualización en PostgreSQL.'
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
              form="create-supabase-user-form"
              disabled={submitting}
              data-testid={editingUser ? 'submit-edit-user-btn' : 'submit-create-user-btn'}
              className="btn btn-primary"
            >
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Guardando en Supabase...
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
          id="create-supabase-user-form"
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
                        : 'bg-moss-100/70 text-moss-600'
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
                        : 'bg-moss-100/70 text-moss-600'
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
                        : 'bg-moss-100/70 text-moss-600'
                    )}
                  >
                    {formData.email.length}/50
                  </span>
                }
              >
                <input
                  id="user-email"
                  type="email"
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="alejandra@corporativo.com"
                  data-testid="user-email-input"
                  className={cn('input', editingUser && 'bg-moss-50 text-moss-500 cursor-not-allowed')}
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
                        : 'bg-moss-100/70 text-moss-600'
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
                          : 'border-moss-200 bg-white hover:bg-moss-50/40 text-moss-700'
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
                          : 'bg-moss-100/70 text-moss-600'
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

            {/* Checklist de requisitos de contraseña en vivo */}
            {(!editingUser || !!formData.password) && (
              <div className="mt-4 rounded-xl border border-moss-200 bg-moss-50/60 p-3.5 space-y-2">
                <p className="text-xs font-bold text-moss-800">Políticas de seguridad de contraseña:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.minLength ? 'text-moss-700 font-bold' : 'text-moss-400'
                    )}
                    data-testid="pwd-rule-minlength"
                  >
                    {passwordRules.minLength ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    Mínimo 8 caracteres
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      formData.password.length > 30 ? 'text-danger-600 font-bold' : passwordRules.maxLength ? 'text-moss-700 font-bold' : 'text-moss-400'
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
                      passwordRules.hasUpper ? 'text-moss-700 font-bold' : 'text-moss-400'
                    )}
                    data-testid="pwd-rule-upper"
                  >
                    {passwordRules.hasUpper ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 letra mayúscula
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.hasNumber ? 'text-moss-700 font-bold' : 'text-moss-400'
                    )}
                    data-testid="pwd-rule-number"
                  >
                    {passwordRules.hasNumber ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 número
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      passwordRules.hasSpecial ? 'text-moss-700 font-bold' : 'text-moss-400'
                    )}
                    data-testid="pwd-rule-special"
                  >
                    {passwordRules.hasSpecial ? <Check className="h-3.5 w-3.5 text-moss-600" /> : <X className="h-3.5 w-3.5" />}
                    1 caracter especial (!@#$%)
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-medium transition-colors',
                      formData.password && formData.password === formData.confirmPassword ? 'text-moss-700 font-bold' : 'text-moss-400'
                    )}
                    data-testid="pwd-rule-match"
                  >
                    {formData.password && formData.password === formData.confirmPassword ? (
                      <Check className="h-3.5 w-3.5 text-moss-600" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Coinciden las contraseñas
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL FICHA DE DETALLE PROFUNDO */}
      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Ficha Detallada del Usuario"
        description="Comprueba que todos los datos capturados en el formulario coinciden fielmente con el registro en Supabase PostgreSQL."
        testId="user-detail-modal"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4" data-testid="user-details-modal">
            <div className="flex items-center gap-4 rounded-xl bg-moss-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-500 to-moss-800 text-2xl font-bold text-white shadow-soft">
                {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-xl font-bold text-moss-900">{selectedUser.full_name}</h4>
                  <span
                    className={cn(
                      'badge text-[10px]',
                      selectedUser.status === 'suspended'
                        ? 'badge-red'
                        : selectedUser.status === 'pending'
                        ? 'badge-yellow'
                        : 'badge-green'
                    )}
                  >
                    {selectedUser.status === 'suspended'
                      ? 'Suspendido'
                      : selectedUser.status === 'pending'
                      ? 'Pendiente'
                      : 'Activo'}
                  </span>
                </div>
                <p className="font-mono text-xs text-moss-600 font-bold">
                  @{selectedUser.username || selectedUser.email?.split('@')[0]} · {selectedUser.email}
                </p>
                <span className="badge badge-green">
                  {USER_ROLES.find((r) => r.value === selectedUser.role)?.label || selectedUser.role}
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-xs">
              <div className="rounded-lg border border-moss-200 p-3">
                <span className="font-semibold text-moss-500">ID de Usuario (UUID Supabase):</span>
                <p className="mt-0.5 font-mono text-moss-900 break-all">{selectedUser.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-moss-200 p-3">
                  <span className="font-semibold text-moss-500">Departamento:</span>
                  <p className="mt-0.5 font-medium text-moss-900">
                    {DEPARTMENTS.find((d) => d.value === selectedUser.department)?.label || selectedUser.department}
                  </p>
                </div>
                <div className="rounded-lg border border-moss-200 p-3">
                  <span className="font-semibold text-moss-500">Teléfono Móvil:</span>
                  <p className="mt-0.5 font-mono text-moss-900">{selectedUser.phone || 'No registrado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-moss-200 p-3">
                  <span className="font-semibold text-moss-500">Fecha de Ingreso / Contratación:</span>
                  <p className="mt-0.5 font-mono text-moss-900">{selectedUser.hire_date || 'No registrada'}</p>
                </div>
                <div className="rounded-lg border border-moss-200 p-3">
                  <span className="font-semibold text-moss-500">Fecha de Creación en Supabase:</span>
                  <p className="mt-0.5 text-moss-900">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Permisos */}
              <div className="rounded-lg border border-moss-200 p-3">
                <span className="font-semibold text-moss-500">Permisos Asignados:</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(selectedUser.permissions || ['perm_automation']).map((pId) => {
                    const pMeta = AVAILABLE_PERMISSIONS.find((p) => p.id === pId);
                    return (
                      <span key={pId} className="badge badge-gray text-[11px]">
                        <Check className="h-3 w-3 text-moss-600" /> {pMeta?.label || pId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedUser;
                  setSelectedUser(null);
                  handleOpenEdit(target);
                }}
                className="btn btn-primary btn-sm"
              >
                <Pencil className="h-4 w-4" /> Editar Usuario
              </button>
              <button type="button" onClick={() => setSelectedUser(null)} className="btn btn-secondary btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal
        open={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title="Confirmar Eliminación"
      >
        {deleteConfirmUser && (
          <div className="space-y-4" data-testid="delete-user-confirm-modal">
            <p className="text-sm text-moss-700">
              ¿Estás seguro de que deseas eliminar permanentemente a{' '}
              <strong className="text-moss-900">{deleteConfirmUser.full_name || deleteConfirmUser.email}</strong> de la base de datos de Supabase?
            </p>
            <p className="text-xs text-danger-600 font-semibold">
              Esta acción no se puede deshacer. Se removerá su registro de la tabla profiles.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="btn btn-danger"
                data-testid="confirm-delete-user-btn"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : 'Sí, Eliminar de PostgreSQL'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
