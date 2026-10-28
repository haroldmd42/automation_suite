import { useState, useMemo } from 'react';
import {
  Headphones,
  LifeBuoy,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Mail,
  User,
  ShieldAlert,
  Send,
  ExternalLink,
  Copy,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { EMAIL_RE } from '../../utils/validators';

const CATEGORIES = [
  { value: 'account_access', label: 'Acceso a Cuenta y Contraseñas Bloqueadas' },
  { value: 'payment_checkout', label: 'Fallo en Checkout / Pasarela de Pagos' },
  { value: 'data_discrepancy', label: 'Discrepancia en Datos de Usuarios / Permisos' },
  { value: 'platform_latency', label: 'Lentitud o Timeout en Peticiones API' },
  { value: 'functional_bug', label: 'Error Funcional en Módulo o Interfaz' },
];

const PRIORITIES = [
  { value: 'critical', label: 'P1 - Crítica (SLA: 1 hora)', badge: 'badge-red' },
  { value: 'high', label: 'P2 - Alta (SLA: 4 horas)', badge: 'badge-yellow' },
  { value: 'medium', label: 'P3 - Media (SLA: 24 horas)', badge: 'badge-blue' },
  { value: 'low', label: 'P4 - Baja (SLA: 72 horas)', badge: 'badge-gray' },
];

const INITIAL_TICKETS = [
  {
    id: 'tkt-1',
    ticket_number: 'TKT-1082',
    subject: 'Usuario bloqueado tras 5 intentos fallidos de autenticación',
    user_email: 'cliente.corp@empresa.com',
    category: 'account_access',
    priority: 'high',
    status: 'in_progress',
    sla_hours: 4,
    description: 'El usuario intentó ingresar desde una IP nueva y el sistema bloqueó temporalmente su cuenta corporativa.',
    resolution_notes: '',
    assigned_to: 'soporte.l2@empresa.com',
    created_at: '2026-10-28T09:30:00Z',
  },
  {
    id: 'tkt-2',
    ticket_number: 'TKT-1081',
    subject: 'Error 504 Gateway Timeout al generar reporte mensual de usuarios',
    user_email: 'gerencia.qa@empresa.com',
    category: 'platform_latency',
    priority: 'critical',
    status: 'open',
    sla_hours: 1,
    description: 'Al filtrar más de 500 registros con fecha histórica la consulta en PostgreSQL supera los 30 segundos.',
    resolution_notes: '',
    assigned_to: 'soporte.l2@empresa.com',
    created_at: '2026-10-28T10:15:00Z',
  },
  {
    id: 'tkt-3',
    ticket_number: 'TKT-1080',
    subject: 'Cupón de descuento no se refleja en el resumen del carrito',
    user_email: 'comprador@gmail.com',
    category: 'payment_checkout',
    priority: 'medium',
    status: 'resolved',
    sla_hours: 24,
    description: 'El cliente aplicó el código VERANO20 pero no se descontó el monto antes de la confirmación.',
    resolution_notes: 'Se actualizó la caché del motor de cupones y se reintentó la transacción exitosamente.',
    assigned_to: 'soporte.l2@empresa.com',
    created_at: '2026-10-27T16:00:00Z',
  },
];

export default function SupportTicketsModule() {
  const { user, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('portal_support_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal Nuevo Ticket
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    user_email: '',
    category: 'account_access',
    priority: 'medium',
    description: '',
  });

  // Modal Gestionar / Resolver Ticket
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [manageStatus, setManageStatus] = useState('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const persistTickets = (data) => {
    setTickets(data);
    localStorage.setItem('portal_support_tickets', JSON.stringify(data));
  };

  // Validaciones
  const isSubjectValid = formData.subject.trim().length >= 10;
  const isEmailValid = EMAIL_RE.test(formData.user_email.trim());
  const isDescriptionValid = formData.description.trim().length >= 15;
  const isFormValid = isSubjectValid && isEmailValid && isDescriptionValid;

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const sla = formData.priority === 'critical' ? 1 : formData.priority === 'high' ? 4 : formData.priority === 'medium' ? 24 : 72;

    const newTicket = {
      id: `tkt-${Date.now()}`,
      ticket_number: ticketNumber,
      subject: formData.subject.trim(),
      user_email: formData.user_email.trim(),
      category: formData.category,
      priority: formData.priority,
      status: 'open',
      sla_hours: sla,
      description: formData.description.trim(),
      resolution_notes: '',
      assigned_to: user?.email || 'soporte.l2@empresa.com',
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('support_tickets').insert([newTicket]);
      }
      await logAudit('create_support_ticket', 'support_tickets', {
        ticket: ticketNumber,
        user_email: newTicket.user_email,
        priority: newTicket.priority,
      });
    } catch (err) {
      console.warn('Guardado en local:', err.message);
    }

    const updated = [newTicket, ...tickets];
    persistTickets(updated);
    toast.success('Ticket Registrado', `Incidente ${ticketNumber} abierto con SLA de ${sla} horas.`);
    setCreateModalOpen(false);
    setFormData({
      subject: '',
      user_email: '',
      category: 'account_access',
      priority: 'medium',
      description: '',
    });
  };

  const handleUpdateTicketStatus = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    if (manageStatus === 'resolved' && resolutionNotes.trim().length < 10) {
      toast.error('Resolución Requerida', 'Debes escribir al menos 10 caracteres explicando la solución aplicada.');
      return;
    }

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: manageStatus,
          resolution_notes: resolutionNotes.trim() || t.resolution_notes,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });

    persistTickets(updated);
    logAudit('update_ticket_status', 'support_tickets', {
      ticket: selectedTicket.ticket_number,
      status: manageStatus,
    });
    toast.info('Ticket Actualizado', `El ticket ${selectedTicket.ticket_number} ahora está en estado ${manageStatus.toUpperCase()}.`);
    setSelectedTicket(null);
  };

  const handleSendUnlockLink = (email) => {
    navigator.clipboard.writeText(`https://portal.empresa.com/auth/unlock?account=${encodeURIComponent(email)}`);
    toast.success('Enlace Copiado', `Enlace de desbloqueo copiado al portapapeles para ${email}.`);
    logAudit('generate_unlock_link', 'support_tools', { user_email: email });
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [tickets, searchTerm, filterPriority, filterStatus]);

  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const criticalCount = tickets.filter((t) => t.priority === 'critical' && t.status !== 'resolved').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="space-y-6 animate-slide-up" data-testid="support-tickets-module">
      <PageHeader
        icon={Headphones}
        eyebrow="Portal Cloud · Rol Especialista de Soporte L2"
        title="Mesa de Ayuda & Diagnóstico de Incidentes L2"
        description="Atención a requerimientos de usuarios, desbloqueo de credenciales y resolución de fallos."
        badge={<span className="badge badge-moss">Soporte L2</span>}
      >
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary gap-2 shadow-soft"
          data-testid="create-ticket-btn"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Incidente / Ticket</span>
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Incidentes Activos</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <Headphones className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-open-tickets">
            {openCount}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Requieren atención L2</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Tickets Críticos (P1)</span>
            <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center text-danger-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-danger-600" data-testid="kpi-critical-tickets">
            {criticalCount}
          </p>
          <p className="text-[11px] text-danger-700 mt-1 font-medium">SLA menor a 1 hora</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Casos Resueltos</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900">{resolvedCount}</p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">94.2% ratio de satisfacción</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Tiempo Medio</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900">1.8 h</p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Dentro del acuerdo SLA</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 shadow-soft space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por #ticket, asunto o correo del usuario..."
              className="input pl-10 text-sm"
              data-testid="search-tickets-input"
            />
          </div>

          <div>
            <CustomSelect
              id="filter-ticket-priority"
              testId="filter-ticket-priority-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              ariaLabel="Filtrar por prioridad"
              options={[{ value: 'all', label: 'Todas las prioridades' }, ...PRIORITIES]}
            />
          </div>

          <div>
            <CustomSelect
              id="filter-ticket-status"
              testId="filter-ticket-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              ariaLabel="Filtrar por estado"
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'open', label: 'Abierto (Open)' },
                { value: 'in_progress', label: 'En Diagnóstico' },
                { value: 'resolved', label: 'Resuelto (Resolved)' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tabla de Tickets */}
      <div className="table-container shadow-soft" data-testid="support-tickets-table-container">
        <table className="table min-w-[1000px]" data-testid="support-tickets-table">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
              <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Ticket & Asunto</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Usuario Afectado</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Prioridad</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">SLA Restante</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Estado</th>
              <th scope="col" className="px-5 py-4 text-right font-bold text-moss-800">Herramientas</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((tkt) => (
              <tr key={tkt.id} data-testid={`ticket-row-${tkt.ticket_number}`}>
                <td className="px-5 py-4 align-middle">
                  <div className="space-y-1">
                    <span
                      className="font-mono text-xs font-bold text-moss-900 bg-moss-100 px-2 py-0.5 rounded border border-moss-300 shadow-xs"
                      data-testid={`ticket-num-${tkt.ticket_number}`}
                    >
                      {tkt.ticket_number}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-moss-900 leading-snug">{tkt.subject}</p>
                  </div>
                </td>

                <td className="px-4 py-4 align-middle">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700 text-xs font-bold text-white shadow-xs">
                      {(tkt.user_email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-medium text-moss-800 block truncate max-w-[170px]" title={tkt.user_email}>
                        {tkt.user_email}
                      </span>
                      <span className="text-[10px] rounded bg-moss-100 px-1.5 py-0.5 font-bold uppercase tracking-wider text-moss-700 border border-moss-200 inline-block mt-0.5">
                        {CATEGORIES.find((c) => c.value === tkt.category)?.label.split(' ')[0] || tkt.category}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 align-middle">
                  {tkt.priority === 'critical' ? (
                    <span className="badge badge-red text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                      <AlertTriangle className="h-3 w-3" /> P1 Crítica
                    </span>
                  ) : tkt.priority === 'high' ? (
                    <span className="badge badge-yellow text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                      <Clock className="h-3 w-3" /> P2 Alta
                    </span>
                  ) : (
                    <span className="badge badge-blue text-xs font-bold inline-flex items-center gap-1 py-1 px-2.5">
                      P3 Media
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 align-middle">
                  <span className="text-xs font-mono font-bold text-moss-800 bg-moss-50 border border-moss-200 px-2 py-0.5 rounded">
                    {tkt.sla_hours}h
                  </span>
                </td>

                <td className="px-4 py-4 align-middle">
                  {tkt.status === 'resolved' ? (
                    <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resuelto
                    </span>
                  ) : tkt.status === 'in_progress' ? (
                    <span className="badge badge-yellow text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                      <Clock className="h-3.5 w-3.5" /> En Análisis
                    </span>
                  ) : (
                    <span className="badge badge-gray text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                      <AlertCircle className="h-3.5 w-3.5" /> Abierto
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 align-middle text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendUnlockLink(tkt.user_email)}
                      className="btn btn-ghost btn-sm text-moss-700 hover:text-moss-900 border border-moss-200 hover:border-moss-400 gap-1 shadow-xs"
                      title="Copiar enlace de recuperación/desbloqueo"
                      data-testid={`unlock-link-btn-${tkt.ticket_number}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Desbloquear</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(tkt);
                        setManageStatus(tkt.status);
                        setResolutionNotes(tkt.resolution_notes || '');
                      }}
                      className="btn btn-secondary btn-sm hover:border-moss-500 hover:text-moss-900 shadow-sm"
                      data-testid={`manage-ticket-btn-${tkt.ticket_number}`}
                    >
                      Gestionar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Ticket */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Ticket de Soporte L2"
        description="Ingresa los datos del incidente reportado por el cliente o usuario."
        size="md"
        data-testid="create-ticket-modal"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4" data-testid="create-ticket-form">
          <Field
            label="Asunto / Título del Incidente *"
            id="ticket-subject-input"
            help="Describe brevemente el problema (mínimo 10 caracteres)"
            error={formData.subject && !isSubjectValid ? 'Mínimo 10 caracteres requeridos.' : ''}
          >
            <input
              id="ticket-subject-input"
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Error al procesar pago o cuenta bloqueada..."
              className="input"
              data-testid="ticket-subject-input"
            />
          </Field>

          <Field
            label="Correo del Usuario Afectado *"
            id="ticket-user-email-input"
            help="Correo corporativo o personal del cliente"
            error={formData.user_email && !isEmailValid ? 'Ingresa un correo electrónico válido.' : ''}
          >
            <input
              id="ticket-user-email-input"
              type="email"
              required
              value={formData.user_email}
              onChange={(e) => setFormData((p) => ({ ...p, user_email: e.target.value }))}
              placeholder="usuario@cliente.com"
              className="input font-mono text-xs"
              data-testid="ticket-user-email-input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Categoría del Problema" id="ticket-category-select">
              <CustomSelect
                id="ticket-category-select"
                testId="ticket-category-select"
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                options={CATEGORIES}
              />
            </Field>

            <Field label="Nivel de Prioridad & SLA" id="ticket-priority-select">
              <CustomSelect
                id="ticket-priority-select"
                testId="ticket-priority-select"
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                options={PRIORITIES}
              />
            </Field>
          </div>

          <Field
            label="Descripción del Fallo & Pasos para Reproducir *"
            id="ticket-desc-textarea"
            help={`${formData.description.length}/15 caracteres requeridos`}
            error={formData.description && !isDescriptionValid ? 'Describe al menos 15 caracteres con el comportamiento erróneo.' : ''}
          >
            <textarea
              id="ticket-desc-textarea"
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Detalla los pasos realizados por el usuario y los mensajes de error observados..."
              className="input resize-none"
              data-testid="ticket-description-textarea"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!isFormValid} className="btn btn-primary" data-testid="submit-ticket-btn">
              Abrir Ticket L2
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Gestionar Ticket */}
      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={`Gestionar: ${selectedTicket?.ticket_number || ''}`}
        description={selectedTicket?.subject || ''}
        size="md"
        data-testid="manage-ticket-modal"
      >
        <form onSubmit={handleUpdateTicketStatus} className="space-y-4" data-testid="manage-ticket-form">
          <div className="rounded-xl border border-moss-200 bg-moss-50/50 p-3 text-xs space-y-1">
            <p><strong>Usuario Afectado:</strong> <span className="font-mono">{selectedTicket?.user_email}</span></p>
            <p><strong>Descripción:</strong> {selectedTicket?.description}</p>
          </div>

          <Field label="Actualizar Estado del Incidente" id="manage-status-select">
            <CustomSelect
              id="manage-status-select"
              testId="manage-status-select"
              value={manageStatus}
              onChange={(e) => setManageStatus(e.target.value)}
              options={[
                { value: 'open', label: 'Abierto (Pendiente)' },
                { value: 'in_progress', label: 'En Diagnóstico / Atención' },
                { value: 'resolved', label: 'Resuelto (Solución Verificada)' },
              ]}
            />
          </Field>

          <Field
            label="Notas de Resolución / Solución Aplicada *"
            id="ticket-resolution-input"
            help={manageStatus === 'resolved' ? 'Obligatorio para cerrar el ticket (mínimo 10 caracteres)' : 'Opcional'}
          >
            <textarea
              id="ticket-resolution-input"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detalla la corrección aplicada o instrucciones brindadas al cliente..."
              className="input resize-none"
              data-testid="ticket-resolution-textarea"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setSelectedTicket(null)} className="btn btn-secondary">
              Cerrar
            </button>
            <button type="submit" className="btn btn-primary" data-testid="save-ticket-status-btn">
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
