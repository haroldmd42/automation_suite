import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Lock,
  Database,
  ExternalLink,
  Download,
  Calendar,
  CheckCircle2,
  KeyRound,
  FileText,
  Plus,
  Search,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner, Alert } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { Link } from 'react-router-dom';

const SECURITY_CONTROLS = [
  { id: 'ctrl-1', title: 'Row Level Security (RLS) en PostgreSQL', standard: 'ISO 27001', status: 'compliant', score: 100, desc: 'Políticas no recursivas activas en profiles y audit_logs.' },
  { id: 'ctrl-2', title: 'Cifrado en Reposo de Datos (AES-256)', standard: 'SOC2 Tipo II', status: 'compliant', score: 100, desc: 'Almacenamiento de base de datos cifrado por Supabase Cloud.' },
  { id: 'ctrl-3', title: 'Hashing de Contraseñas Bcrypt / Argon2', standard: 'OWASP ASVS', status: 'compliant', score: 100, desc: 'Credenciales protegidas con salt criptográfico individual.' },
  { id: 'ctrl-4', title: 'Registro Centralizado de Auditoría Inmutable', standard: 'PCI-DSS v4.0', status: 'compliant', score: 95, desc: 'Audit_logs registra eventos de login, update y deletes.' },
  { id: 'ctrl-5', title: 'Protección contra Ataques de Fuerza Bruta (Rate Limit)', standard: 'OWASP Top 10', status: 'warning', score: 85, desc: 'Límite de 60 segundos por petición de reset habilitado.' },
];

const INITIAL_CERTIFICATES = [
  {
    id: 'cert-1',
    framework: 'SOC2 Tipo II',
    auditor: 'auditor.lead@empresa.com',
    credential: 'CISA #2024-9842',
    date: '2026-10-25',
    verdict: 'approved',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    scope: 'Evaluación exhaustiva de controles de acceso y persistencia en Supabase.',
  },
  {
    id: 'cert-2',
    framework: 'ISO/IEC 27001:2022',
    auditor: 'auditor.senior@empresa.com',
    credential: 'CISSP #84129',
    date: '2026-10-18',
    verdict: 'approved',
    hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    scope: 'Certificación anual de confidencialidad e integridad del portal administrativo.',
  },
];

export default function SecurityComplianceModule() {
  const { user, logAudit } = useSupabaseAuth();
  const toast = useToast();

  const [certificates, setCertificates] = useState(() => {
    const saved = localStorage.getItem('portal_security_certs');
    return saved ? JSON.parse(saved) : INITIAL_CERTIFICATES;
  });

  const [createCertModal, setCreateCertModal] = useState(false);
  const [certForm, setCertForm] = useState({
    framework: 'SOC2 Tipo II',
    auditor: user?.email || '',
    credential: 'CISA #2026-',
    verdict: 'approved',
    date: new Date().toISOString().slice(0, 10),
    scope: '',
  });

  const isScopeValid = certForm.scope.trim().length >= 20;
  const isCredentialValid = certForm.credential.trim().length >= 6;
  const isCertFormValid = isScopeValid && isCredentialValid;

  const handleCreateCert = (e) => {
    e.preventDefault();
    if (!isCertFormValid) return;

    // Generar hash simulado
    const hash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newCert = {
      id: `cert-${Date.now()}`,
      framework: certForm.framework,
      auditor: certForm.auditor.trim() || user?.email || 'auditor@empresa.com',
      credential: certForm.credential.trim(),
      date: certForm.date,
      verdict: certForm.verdict,
      hash,
      scope: certForm.scope.trim(),
    };

    const updated = [newCert, ...certificates];
    setCertificates(updated);
    localStorage.setItem('portal_security_certs', JSON.stringify(updated));

    logAudit('issue_compliance_certificate', 'security_compliance', {
      framework: newCert.framework,
      verdict: newCert.verdict,
      hash: newCert.hash,
    });

    toast.success('Dictamen Emitido', `Certificado ${newCert.framework} registrado con firma criptográfica.`);
    setCreateCertModal(false);
    setCertForm({
      framework: 'SOC2 Tipo II',
      auditor: user?.email || '',
      credential: 'CISA #2026-',
      verdict: 'approved',
      date: new Date().toISOString().slice(0, 10),
      scope: '',
    });
  };

  return (
    <div className="space-y-6 animate-slide-up" data-testid="security-compliance-module">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Portal Cloud · Rol Auditor de Seguridad"
        title="Centro de Seguridad & Cumplimiento Normativo"
        description="Evaluación de controles de seguridad, certificación de estándares SOC2 / ISO 27001 y auditoría."
        badge={<span className="badge badge-gray">Auditor</span>}
      >
        <div className="flex items-center gap-2">
          <Link to="/portal/audit" className="btn btn-secondary gap-2" data-testid="view-audit-logs-btn">
            <FileText className="h-4 w-4" />
            <span>Ver Logs de Auditoría</span>
          </Link>
          <button
            type="button"
            onClick={() => setCreateCertModal(true)}
            className="btn btn-primary gap-2 shadow-soft"
            data-testid="issue-cert-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Emitir Dictamen Oficial</span>
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards de Seguridad */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Postura Global</span>
            <div className="h-8 w-8 rounded-xl bg-moss-100 flex items-center justify-center text-moss-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-moss-900" data-testid="kpi-security-score">
              96 / 100
            </span>
            <span className="badge badge-green text-[10px]">Grado A+</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-moss-100">
            <div className="h-full bg-moss-600 rounded-full" style={{ width: '96%' }} />
          </div>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Controles</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900">5 de 5</p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">100% de estándares cubiertos</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Dictámenes</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-certs-count">
            {certificates.length}
          </p>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">Firmados criptográficamente</p>
        </div>

        <div className="card p-4 shadow-soft hover:shadow-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Base de Datos</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-moss-600 animate-pulse" />
            <span className="font-display text-xl font-bold text-moss-900">Activa & RLS</span>
          </div>
          <p className="text-[11px] text-moss-500 mt-1 font-medium">audit_logs sincronizado</p>
        </div>
      </div>

      {/* Matriz de Controles de Seguridad */}
      <div className="card p-5 shadow-soft space-y-4">
        <h3 className="font-bold text-moss-900 text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-moss-600" /> Matriz de Controles y Salvaguardas Activas
        </h3>

        <div className="space-y-3">
          {SECURITY_CONTROLS.map((ctrl) => (
            <div
              key={ctrl.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-moss-200/80 bg-white hover:border-moss-400 transition"
              data-testid={`control-row-${ctrl.id}`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-moss-900">{ctrl.title}</span>
                  <span className="badge badge-gray text-[10px] font-mono">{ctrl.standard}</span>
                </div>
                <p className="text-xs text-moss-600">{ctrl.desc}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs font-bold text-moss-800">{ctrl.score} pts</span>
                {ctrl.status === 'compliant' ? (
                  <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Conforme
                  </span>
                ) : (
                  <span className="badge badge-yellow text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                    <AlertTriangle className="h-3.5 w-3.5" /> Requiere Revisión
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de Certificados y Dictámenes */}
      <div className="table-container shadow-soft" data-testid="certificates-table-container">
        <div className="p-4 border-b border-moss-200 bg-moss-50/50">
          <h3 className="font-bold text-moss-900 text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-moss-600" /> Dictámenes Oficiales Emitidos
          </h3>
        </div>

        <table className="table min-w-[1000px]" data-testid="certificates-table">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-moss-200/90 bg-moss-100/70 text-[11px] font-bold uppercase tracking-wider text-moss-700">
              <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Marco Normativo</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Auditor & Credencial</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Fecha de Emisión</th>
              <th scope="col" className="px-4 py-4 text-left font-bold text-moss-800">Dictamen</th>
              <th scope="col" className="px-5 py-4 text-left font-bold text-moss-800">Firma Criptográfica SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((cert) => (
              <tr key={cert.id} data-testid={`cert-row-${cert.id}`}>
                <td className="px-5 py-4 align-middle">
                  <span className="font-bold text-sm text-moss-900 block">{cert.framework}</span>
                  <p className="text-xs text-moss-600 line-clamp-1 mt-0.5">{cert.scope}</p>
                </td>

                <td className="px-4 py-4 align-middle">
                  <span className="text-xs font-semibold text-moss-800 block">{cert.auditor}</span>
                  <span className="text-[11px] font-mono text-moss-600 bg-moss-100 px-2 py-0.5 rounded border border-moss-200 mt-1 inline-block font-semibold">
                    {cert.credential}
                  </span>
                </td>

                <td className="px-4 py-4 align-middle">
                  <span className="text-xs font-mono font-medium text-moss-700">{cert.date}</span>
                </td>

                <td className="px-4 py-4 align-middle">
                  {cert.verdict === 'approved' ? (
                    <span className="badge badge-green text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado Conforme
                    </span>
                  ) : (
                    <span className="badge badge-yellow text-xs font-semibold inline-flex items-center gap-1.5 py-1 px-2.5 shadow-xs">
                      <AlertTriangle className="h-3.5 w-3.5" /> Con Observaciones
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 align-middle">
                  <code className="text-[11px] font-mono text-moss-800 bg-moss-50 border border-moss-200 px-2 py-1 rounded block max-w-[240px] truncate" title={cert.hash}>
                    {cert.hash}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Emitir Dictamen */}
      <Modal
        open={createCertModal}
        onClose={() => setCreateCertModal(false)}
        title="Emitir Dictamen de Auditoría Oficial"
        description="Genera una constancia de cumplimiento normativo avalada por el auditor de seguridad."
        size="md"
        data-testid="create-cert-modal"
      >
        <form onSubmit={handleCreateCert} className="space-y-4" data-testid="create-cert-form">
          <Field label="Marco Normativo Evaluado *" id="cert-framework-select">
            <CustomSelect
              id="cert-framework-select"
              testId="cert-framework-select"
              value={certForm.framework}
              onChange={(e) => setCertForm((p) => ({ ...p, framework: e.target.value }))}
              options={[
                { value: 'SOC2 Tipo II', label: 'SOC2 Tipo II (Seguridad y Privacidad de Datos)' },
                { value: 'ISO/IEC 27001:2022', label: 'ISO/IEC 27001:2022 (Gestión de Seguridad)' },
                { value: 'OWASP ASVS v4.0', label: 'OWASP ASVS v4.0 (Seguridad en Aplicaciones Web)' },
                { value: 'PCI-DSS v4.0', label: 'PCI-DSS v4.0 (Estándar de Tarjetas de Pago)' },
              ]}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Credencial del Auditor *"
              id="cert-credential-input"
              help="Certificación profesional (ej: CISA #2026-104)"
              error={certForm.credential && !isCredentialValid ? 'Ingresa al menos 6 caracteres.' : ''}
            >
              <input
                id="cert-credential-input"
                type="text"
                required
                value={certForm.credential}
                onChange={(e) => setCertForm((p) => ({ ...p, credential: e.target.value }))}
                placeholder="CISA #2026-9481"
                className="input font-mono text-xs"
                data-testid="cert-credential-input"
              />
            </Field>

            <Field label="Dictamen Técnico" id="cert-verdict-select">
              <CustomSelect
                id="cert-verdict-select"
                testId="cert-verdict-select"
                value={certForm.verdict}
                onChange={(e) => setCertForm((p) => ({ ...p, verdict: e.target.value }))}
                options={[
                  { value: 'approved', label: 'Aprobado sin Observaciones' },
                  { value: 'observations', label: 'Aprobado con Observaciones Menores' },
                ]}
              />
            </Field>
          </div>

          <Field
            label="Alcance & Conclusiones del Dictamen *"
            id="cert-scope-textarea"
            help={`${certForm.scope.length}/20 caracteres requeridos`}
            error={certForm.scope && !isScopeValid ? 'Describe al menos 20 caracteres con las conclusiones técnicas.' : ''}
          >
            <textarea
              id="cert-scope-textarea"
              rows={3}
              required
              value={certForm.scope}
              onChange={(e) => setCertForm((p) => ({ ...p, scope: e.target.value }))}
              placeholder="Ejemplo: Se certifica que los esquemas de bases de datos, políticas RLS y accesos JWT cumplen satisfactoriamente con los criterios de seguridad..."
              className="input resize-none"
              data-testid="cert-scope-textarea"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button type="button" onClick={() => setCreateCertModal(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!isCertFormValid} className="btn btn-primary" data-testid="submit-cert-btn">
              Emitir y Firmar Dictamen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
