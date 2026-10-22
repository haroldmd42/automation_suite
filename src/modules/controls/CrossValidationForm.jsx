import { useState } from 'react';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Bell,
  UserCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Paperclip,
  X,
  Briefcase,
  DollarSign,
  FileCheck2,
} from 'lucide-react';
import {
  EMAIL_RE,
  NAME_RE,
  onlyDigits,
  ageFrom,
} from '../../utils/validators';
import { fromISODate, cn } from '../../utils/format';
import { Field, Checkbox } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import LocatorHint from '../../components/qa/LocatorHint';
import Modal from '../../components/ui/Modal';
import { Alert, Spinner } from '../../components/ui/Primitives';
import { useToast } from '../../context/ToastContext';
import { simulateRequest } from '../../services/network';

export default function CrossValidationForm() {
  const toast = useToast();

  const [formData, setFormData] = useState({
    fullName: 'Mariana Rivera Solís',
    email: 'mariana.rivera@corp.net',
    phone: '5541982341',
    birthDate: '2009-06-15', // Edad aprox 17 años -> dispara regla de tutor menor de edad
    tutorName: 'Roberto Rivera Morales',
    tutorPhone: '5541982300',
    employmentType: 'contractor', // dispara regla de empresa y meses
    contractorCompany: 'TechStaffing Global SA',
    contractDuration: '6',
    minSalary: 3000,
    maxSalary: 4500,
    notifyEmail: true,
    notifySms: true,
    notifyPush: false,
    budgetMin: 2000,
    budgetMax: 8000,
    termsRead: false,
    termsAccepted: false,
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const [fileError, setFileError] = useState(null);

  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [touched, setTouched] = useState({});

  // Calcular edad derivada
  const currentAge = formData.birthDate ? ageFrom(fromISODate(formData.birthDate)) : null;
  const isMinor = currentAge !== null && currentAge < 18;

  // Validaciones Cruzadas Estrictas
  const validateForm = () => {
    const errs = {};

    // 1. Nombre completo
    if (!formData.fullName.trim()) errs.fullName = 'El nombre completo es obligatorio';
    else if (formData.fullName.trim().length < 5) errs.fullName = 'Mínimo 5 caracteres requeridos';
    else if (!NAME_RE.test(formData.fullName.trim())) errs.fullName = 'Solo se permiten letras y espacios';

    // 2. Correo
    if (!formData.email.trim()) errs.email = 'El correo electrónico es obligatorio';
    else if (!EMAIL_RE.test(formData.email.trim())) errs.email = 'Formato de correo no válido';

    // 3. Fecha de nacimiento & Edad
    if (!formData.birthDate) errs.birthDate = 'La fecha de nacimiento es obligatoria';
    else if (currentAge < 14) errs.birthDate = 'Edad mínima legal requerida: 14 años';

    // 4. Regla cruzada: Si es menor de 18 años, requiere Tutor
    if (isMinor) {
      if (!formData.tutorName.trim()) {
        errs.tutorName = 'Obligatorio: Los menores de 18 años requieren registrar un tutor legal.';
      }
      if (!formData.tutorPhone.trim()) {
        errs.tutorPhone = 'Obligatorio: Teléfono de contacto del tutor legal.';
      } else if (onlyDigits(formData.tutorPhone).length !== 10) {
        errs.tutorPhone = 'El teléfono del tutor debe tener 10 dígitos.';
      }
    }

    // 5. Regla cruzada: Tipo de contratación
    if (formData.employmentType === 'contractor') {
      if (!formData.contractorCompany.trim()) {
        errs.contractorCompany = 'Obligatorio: Especificar la empresa proveedora de servicios.';
      }
      const dur = parseInt(formData.contractDuration, 10);
      if (isNaN(dur) || dur < 1 || dur > 12) {
        errs.contractDuration = 'La duración debe ser entre 1 y 12 meses.';
      }
    }

    // 6. Regla cruzada: Salario Mínimo vs Salario Máximo
    const minS = Number(formData.minSalary);
    const maxS = Number(formData.maxSalary);
    if (isNaN(minS) || minS < 1000) {
      errs.minSalary = 'El salario mínimo no puede ser inferior a $1,000.';
    }
    if (isNaN(maxS) || maxS > 30000) {
      errs.maxSalary = 'El salario máximo no puede exceder $30,000.';
    }
    if (!errs.minSalary && !errs.maxSalary && minS > maxS) {
      errs.minSalary = 'El salario mínimo no puede ser mayor que el salario máximo.';
      errs.maxSalary = 'El salario máximo debe ser mayor o igual al salario mínimo.';
    }

    // 7. Canales de notificación cruzados
    const anyChannel = formData.notifyEmail || formData.notifySms || formData.notifyPush;
    if (!anyChannel) {
      errs.notifyChannel = 'Debes seleccionar al menos un canal de notificación.';
    }
    // Si SMS está activo, el teléfono es estrictamente obligatorio
    if (formData.notifySms) {
      if (!formData.phone.trim()) {
        errs.phone = 'Teléfono requerido al activar notificaciones por SMS.';
      } else if (onlyDigits(formData.phone).length !== 10) {
        errs.phone = 'El teléfono móvil debe tener 10 dígitos.';
      }
    }

    // 8. Términos y condiciones aceptados
    if (!formData.termsAccepted) {
      errs.termsAccepted = 'Debes aceptar los términos y condiciones para enviar el formulario.';
    }

    return errs;
  };

  const errors = validateForm();

  // Subida de Archivo simulada
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      setFileError('Formato inválido. Solo se admiten archivos PDF, PNG o JPG.');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setFileError('Archivo demasiado grande. El límite máximo es de 2 MB.');
      return;
    }

    // Simular subida con progreso
    setUploadedFile({ name: file.name, size: file.size, type: file.type });
    setFileProgress(15);
    const timer = setInterval(() => {
      setFileProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      birthDate: true,
      tutorName: true,
      tutorPhone: true,
      contractorCompany: true,
      contractDuration: true,
      minSalary: true,
      maxSalary: true,
      notifyChannel: true,
      termsAccepted: true,
    });

    if (Object.keys(errors).length > 0) {
      toast.error('Errores en el formulario', 'Por favor corrige los campos destacados en rojo.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(null);

    await simulateRequest(() => {}, { minDelay: 1500, maxDelay: 2500, canFail: false });

    setSubmitting(false);
    setSubmitSuccess({
      ...formData,
      uploadedFile: uploadedFile ? uploadedFile.name : 'Ninguno',
      submittedAt: new Date().toISOString(),
    });
    toast.success('Formulario validado y enviado con éxito');
  };

  const handleResetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      tutorName: '',
      tutorPhone: '',
      employmentType: 'permanent',
      contractorCompany: '',
      contractDuration: '1',
      minSalary: 2000,
      maxSalary: 5000,
      notifyEmail: true,
      notifySms: false,
      notifyPush: false,
      budgetMin: 1000,
      budgetMax: 5000,
      termsRead: false,
      termsAccepted: false,
    });
    setUploadedFile(null);
    setFileProgress(0);
    setFileError(null);
    setTouched({});
    setSubmitSuccess(null);
  };

  return (
    <div data-testid="cross-validation-root" className="space-y-8">
      {/* Cabecera explicativa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-moss-900">
            Formulario con 12+ Reglas de Validación Cruzada
          </h3>
          <p className="mt-1 text-sm text-moss-600 max-w-2xl">
            Casos límite: campos condicionales por edad, subordinación laboral, rangos
            numéricos interdependientes y candado de lectura obligatoria de términos.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetForm}
          data-testid="cross-reset-btn"
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Limpiar Formulario
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        data-testid="cross-validation-form"
        className="space-y-6"
      >
        {/* SECCIÓN 1: IDENTIDAD Y EDAD */}
        <section className="form-section">
          <div className="form-section-header">
            <UserCheck className="h-4 w-4 text-moss-600" />
            <span>1. Datos Personales y Validación de Edad</span>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Nombre Completo"
              htmlFor="cross-fullname"
              testId="cross-fullname-input"
              error={touched.fullName && errors.fullName}
              required
            >
              <input
                id="cross-fullname"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                data-testid="cross-fullname-input"
                className="input"
                placeholder="Nombre y Apellidos"
              />
            </Field>

            <Field
              label="Correo Electrónico"
              htmlFor="cross-email"
              testId="cross-email-input"
              error={touched.email && errors.email}
              required
            >
              <input
                id="cross-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                data-testid="cross-email-input"
                className="input"
                placeholder="usuario@dominio.com"
              />
            </Field>

            <Field
              label="Fecha de Nacimiento"
              htmlFor="cross-birthdate"
              testId="cross-birthdate-input"
              error={touched.birthDate && errors.birthDate}
              labelExtra={
                currentAge !== null && (
                  <span
                    data-testid="cross-computed-age"
                    className={cn(
                      'badge text-[10px]',
                      isMinor ? 'badge-yellow' : 'badge-green',
                    )}
                  >
                    {currentAge} años ({isMinor ? 'Menor' : 'Mayor de edad'})
                  </span>
                )
              }
              required
            >
              <CustomDatePicker
                id="cross-birthdate"
                value={formData.birthDate}
                onChange={(e) => {
                  setFormData({ ...formData, birthDate: e.target.value });
                  setTouched((t) => ({ ...t, birthDate: true }));
                }}
                testId="cross-birthdate-input"
                error={!!(touched.birthDate && errors.birthDate)}
                placeholder="dd/mm/aaaa"
              />
            </Field>
          </div>

          {/* SUBSECCIÓN CONDICIONAL: SI ES MENOR DE EDAD */}
          {isMinor && (
            <div
              data-testid="cross-tutor-container"
              className="mt-6 rounded-2xl border border-warning-300 bg-warning-50/70 p-5 space-y-4 animate-fade-in shadow-soft"
            >
              <div className="flex items-center gap-2 text-warning-800 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 text-warning-600 shrink-0" />
                <span>REGLA CRUZADA ACTIVADA: Requiere datos del Tutor Legal (Menor de 18 años)</span>
                <LocatorHint testId="cross-tutor-name-input" />
              </div>

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field
                  label="Nombre del Tutor Legal"
                  htmlFor="cross-tutor-name"
                  testId="cross-tutor-name-input"
                  error={touched.tutorName && errors.tutorName}
                  required
                >
                  <input
                    id="cross-tutor-name"
                    value={formData.tutorName}
                    onChange={(e) => setFormData({ ...formData, tutorName: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, tutorName: true }))}
                    data-testid="cross-tutor-name-input"
                    className="input bg-white"
                    placeholder="Nombre completo del tutor"
                  />
                </Field>

                <Field
                  label="Teléfono del Tutor Legal"
                  htmlFor="cross-tutor-phone"
                  testId="cross-tutor-phone-input"
                  error={touched.tutorPhone && errors.tutorPhone}
                  required
                >
                  <input
                    id="cross-tutor-phone"
                    value={formData.tutorPhone}
                    onChange={(e) => setFormData({ ...formData, tutorPhone: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, tutorPhone: true }))}
                    data-testid="cross-tutor-phone-input"
                    className="input bg-white font-mono"
                    placeholder="10 dígitos"
                  />
                </Field>
              </div>
            </div>
          )}
        </section>

        {/* SECCIÓN 2: TIPO DE EMPLEO Y SUBORDINACIÓN */}
        <section className="form-section">
          <div className="form-section-header">
            <Briefcase className="h-4 w-4 text-moss-600" />
            <span>2. Modalidad de Contratación</span>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <label htmlFor="cross-employment-type" className="label">
                <span>Tipo de Empleado</span>
                <LocatorHint testId="cross-employment-type-select" />
              </label>
              <CustomSelect
                id="cross-employment-type"
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                testId="cross-employment-type-select"
                options={[
                  { value: 'permanent', label: 'Empleado Permanente (Fijo)' },
                  { value: 'contractor', label: 'Contratista Externo (Freelance / Vendor)' },
                ]}
              />
            </div>

            {/* Condicionales si es Contratista */}
            {formData.employmentType === 'contractor' && (
              <>
                <Field
                  label="Empresa Proveedora"
                  htmlFor="cross-contractor-company"
                  testId="cross-contractor-company-input"
                  error={touched.contractorCompany && errors.contractorCompany}
                  required
                >
                  <input
                    id="cross-contractor-company"
                    value={formData.contractorCompany}
                    onChange={(e) => setFormData({ ...formData, contractorCompany: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, contractorCompany: true }))}
                    data-testid="cross-contractor-company-input"
                    className="input"
                    placeholder="TechStaffing SA"
                  />
                </Field>

                <Field
                  label="Duración (Meses 1-12)"
                  htmlFor="cross-contract-duration"
                  testId="cross-contract-duration-input"
                  error={touched.contractDuration && errors.contractDuration}
                  required
                >
                  <input
                    id="cross-contract-duration"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.contractDuration}
                    onChange={(e) => setFormData({ ...formData, contractDuration: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, contractDuration: true }))}
                    data-testid="cross-contract-duration-input"
                    className="input font-mono"
                  />
                </Field>
              </>
            )}
          </div>
        </section>

        {/* SECCIÓN 3: RANGOS SALARIALES CON VALIDACIÓN MUTUA */}
        <section className="form-section">
          <div className="form-section-header">
            <DollarSign className="h-4 w-4 text-moss-600" />
            <span>3. Expectativa Salarial (Mínimo vs Máximo)</span>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field
              label="Salario Mínimo Aceptable ($)"
              htmlFor="cross-min-salary"
              testId="cross-min-salary-input"
              error={touched.minSalary && errors.minSalary}
              hint="Mínimo $1,000"
              required
            >
              <input
                id="cross-min-salary"
                type="number"
                step="100"
                value={formData.minSalary}
                onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, minSalary: true, maxSalary: true }))}
                data-testid="cross-min-salary-input"
                className="input font-mono"
              />
            </Field>

            <Field
              label="Salario Máximo Pretendido ($)"
              htmlFor="cross-max-salary"
              testId="cross-max-salary-input"
              error={touched.maxSalary && errors.maxSalary}
              hint="Debe ser mayor o igual al salario mínimo"
              required
            >
              <input
                id="cross-max-salary"
                type="number"
                step="100"
                value={formData.maxSalary}
                onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, maxSalary: true, minSalary: true }))}
                data-testid="cross-max-salary-input"
                className="input font-mono"
              />
            </Field>
          </div>
        </section>

        {/* SECCIÓN 4: CANALES DE NOTIFICACIÓN Y TELÉFONO CONDICIONAL */}
        <section className="form-section">
          <div className="form-section-header">
            <Bell className="h-4 w-4 text-moss-600" />
            <span>4. Canales de Notificación</span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-moss-600">
              Selecciona tus canales preferidos. Si seleccionas SMS, el número de teléfono móvil es
              obligatorio.
            </p>

            <div className="flex flex-wrap gap-6 py-1">
              <Checkbox
                id="cross-notify-email"
                checked={formData.notifyEmail}
                onChange={(c) => setFormData({ ...formData, notifyEmail: c })}
                label="Notificaciones por Correo"
                testId="cross-notify-email-checkbox"
              />
              <Checkbox
                id="cross-notify-sms"
                checked={formData.notifySms}
                onChange={(c) => setFormData({ ...formData, notifySms: c })}
                label="Notificaciones por SMS (Requiere Teléfono)"
                testId="cross-notify-sms-checkbox"
              />
              <Checkbox
                id="cross-notify-push"
                checked={formData.notifyPush}
                onChange={(c) => setFormData({ ...formData, notifyPush: c })}
                label="Notificaciones Push"
                testId="cross-notify-push-checkbox"
              />
            </div>

            {errors.notifyChannel && touched.notifyChannel && (
              <p className="field-error" data-testid="cross-notify-channel-error">
                {errors.notifyChannel}
              </p>
            )}

            {/* Teléfono obligatorio si SMS está marcado */}
            <div className="max-w-md pt-2">
              <Field
                label="Número de Teléfono Móvil"
                htmlFor="cross-phone"
                testId="cross-phone-input"
                error={touched.phone && errors.phone}
                hint="10 dígitos obligatorios si activas notificaciones por SMS"
                required={formData.notifySms}
                optional={!formData.notifySms}
              >
                <input
                  id="cross-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  data-testid="cross-phone-input"
                  className="input font-mono"
                  placeholder="5512345678"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* SECCIÓN 5: CARGA DE ARCHIVO CON VALIDACIÓN DE TIPO Y TAMAÑO */}
        <section className="form-section">
          <div className="form-section-header">
            <Upload className="h-4 w-4 text-moss-600" />
            <span>5. Carga de Documento (PDF/PNG/JPG máx 2MB)</span>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-moss-300 p-8 text-center hover:border-moss-500 transition-colors bg-moss-50/40">
            <input
              type="file"
              id="cross-file-upload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              data-testid="cross-file-input"
              className="hidden"
            />
            <label
              htmlFor="cross-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-200 text-moss-700 shadow-soft">
                <Upload className="h-7 w-7" />
              </div>
              <span className="text-sm font-bold text-moss-900">
                Haz clic para seleccionar o arrastra tu archivo aquí
              </span>
              <span className="text-xs text-moss-500">Formatos: PDF, PNG, JPG (Hasta 2MB)</span>
            </label>

            {fileError && (
              <p className="mt-3 text-xs text-danger-600 font-semibold" data-testid="cross-file-error">
                {fileError}
              </p>
            )}

            {uploadedFile && (
              <div
                className="mt-5 rounded-xl bg-white p-4 border border-moss-200 text-left flex items-center justify-between shadow-sm"
                data-testid="cross-file-preview"
              >
                <div className="flex items-center gap-3">
                  <Paperclip className="h-5 w-5 text-moss-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-moss-900 truncate max-w-sm">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-moss-500 font-mono">
                      {(uploadedFile.size / 1024).toFixed(1)} KB · Estado: {fileProgress}%
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setFileProgress(0);
                  }}
                  data-testid="cross-file-remove-btn"
                  className="rounded-lg p-1.5 text-moss-400 hover:text-danger-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SECCIÓN 6: CANDADO DE TÉRMINOS Y CONDICIONES */}
        <section className="form-section bg-moss-50/70 border-moss-300">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-moss-800">
                Candado de Términos Legales
              </p>
              <p className="text-xs text-moss-600 mt-0.5">
                La casilla de aceptación solo se habilitará una vez que abras y leas el documento
                completo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              data-testid="view-terms-modal-btn"
              className="btn btn-secondary btn-sm"
            >
              <FileCheck2 className="h-4 w-4" /> Leer Términos y Condiciones
            </button>
          </div>

          <Checkbox
            id="cross-terms-cb"
            checked={formData.termsAccepted}
            disabled={!formData.termsRead}
            onChange={(c) => setFormData({ ...formData, termsAccepted: c })}
            label={
              formData.termsRead
                ? 'He leído y acepto los términos y condiciones de contratación.'
                : 'Debes hacer clic en "Leer Términos" antes de poder marcar esta casilla.'
            }
            testId="cross-terms-checkbox"
            error={touched.termsAccepted && errors.termsAccepted}
          />
        </section>

        {/* BOTÓN SUBMIT */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-moss-200">
          <button
            type="submit"
            disabled={submitting}
            data-testid="cross-submit-btn"
            className="btn btn-primary btn-lg shadow-lift"
          >
            {submitting ? (
              <>
                <Spinner className="h-4 w-4" testId="cross-submit-spinner" />
                <span>Validando reglas de servidor...</span>
              </>
            ) : (
              <span>Validar y Enviar Registro</span>
            )}
          </button>
          <LocatorHint testId="cross-submit-btn" />
        </div>
      </form>

      {/* Salida JSON del formulario enviado exitosamente */}
      {submitSuccess && (
        <div
          data-testid="cross-submit-success-card"
          className="rounded-2xl border border-moss-600/30 bg-moss-600/10 p-6 space-y-3 animate-slide-up shadow-soft"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-moss-600" />
            <h4 className="font-bold text-moss-900 text-sm">
              ¡Formulario Validado y Aceptado Exitosamente!
            </h4>
          </div>
          <pre
            data-testid="cross-submit-payload"
            className="font-mono text-xs text-moss-900 bg-white/90 p-4 rounded-xl overflow-x-auto shadow-sm"
          >
            {JSON.stringify(submitSuccess, null, 2)}
          </pre>
        </div>
      )}

      {/* Modal de Términos y Condiciones */}
      <Modal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Términos y Condiciones de Contratación"
        description="Lee las cláusulas legales antes de continuar."
        testId="terms-conditions-modal"
        size="md"
        footer={
          <button
            type="button"
            data-testid="terms-modal-accept-btn"
            className="btn btn-primary"
            onClick={() => {
              setFormData((prev) => ({ ...prev, termsRead: true, termsAccepted: true }));
              setTermsModalOpen(false);
              toast.success('Términos leídos', 'Casilla de aceptación habilitada.');
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> He Leído y Acepto las Cláusulas
          </button>
        }
      >
        <div className="max-h-64 overflow-y-auto space-y-3 text-xs leading-relaxed text-moss-800 pr-2">
          <p className="font-bold text-sm text-moss-900">1. Objeto y Alcance</p>
          <p>
            El presente instrumento establece las condiciones aplicables a la postulación y registro
            en la plataforma Automation Suite para fines de evaluación técnica de habilidades en
            automatización de pruebas de software.
          </p>
          <p className="font-bold text-sm text-moss-900">2. Menores de Edad</p>
          <p>
            En estricto cumplimiento con la legislación laboral aplicable, los postulantes menores
            de 18 años requieren obligatoriamente la autorización expresa y datos de localización de
            su tutor legal registrado.
          </p>
          <p className="font-bold text-sm text-moss-900">3. Confidencialidad y Datos</p>
          <p>
            Toda la información ingresada en este entorno es ficticia y se almacena únicamente con
            propósitos de práctica en frameworks como Playwright, Cypress y Selenium.
          </p>
        </div>
      </Modal>
    </div>
  );
}
