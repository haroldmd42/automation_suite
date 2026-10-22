import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  CreditCard,
  Truck,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Calendar,
  Building,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { useCart } from './CartContext';
import { SHIPPING_METHODS, TEST_CARDS } from './products';
import { formatCents, cn } from '../../utils/format';
import {
  EMAIL_RE,
  NAME_RE,
  POSTAL_RULES,
  PHONE_RULES,
  luhnCheck,
  detectCardType,
  formatCardNumber,
  formatExpiry,
  validateExpiry,
  onlyDigits,
} from '../../utils/validators';
import { simulateRequest, NetworkError } from '../../services/network';
import { Field, Checkbox } from '../../components/ui/Field';
import LocatorHint from '../../components/qa/LocatorHint';
import { Alert, Spinner } from '../../components/ui/Primitives';

const STEPS = [
  { id: 1, key: 'address', label: 'Dirección de Envío', icon: MapPin },
  { id: 2, key: 'shipping', label: 'Método de Envío', icon: Truck },
  { id: 3, key: 'payment', label: 'Método de Pago', icon: CreditCard },
  { id: 4, key: 'review', label: 'Revisión y Confirmación', icon: ShieldCheck },
];

export default function Checkout() {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    shippingId,
    setShippingId,
    selectedShipping,
    clearCart,
    setLatestOrder,
  } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Paso 1: Dirección de Envío
  const [address, setAddress] = useState({
    firstName: 'Alex',
    lastName: 'Vargas',
    email: 'alex.vargas@qateam.io',
    phone: '5551234567',
    country: 'MX',
    street: 'Av. Insurgentes Sur 1602, Piso 4',
    city: 'Ciudad de México',
    state: 'CDMX',
    postalCode: '03900',
    notes: 'Entregar en recepción',
  });
  const [addressTouched, setAddressTouched] = useState({});

  // Paso 3: Pago
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer'
  const [card, setCard] = useState({
    name: 'ALEX VARGAS',
    number: '4532 0000 0000 0000',
    expiry: '12/28',
    cvv: '123',
  });
  const [cardTouched, setCardTouched] = useState({});

  // Paso 4: Aceptación de términos
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  // Si el carrito está vacío y no se está procesando el pedido
  if (items.length === 0 && !submitting) {
    return (
      <div className="card p-10 text-center" data-testid="checkout-empty-cart">
        <h2 className="text-xl font-bold text-moss-900">No hay productos para pagar</h2>
        <p className="mt-2 text-sm text-moss-600">Agrega productos a tu carrito antes de proceder al checkout.</p>
        <Link to="/ecommerce" className="btn btn-primary mt-5">
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  // Validaciones del Paso 1
  const validateAddress = () => {
    const errs = {};
    if (!address.firstName.trim()) errs.firstName = 'El nombre es obligatorio';
    else if (!NAME_RE.test(address.firstName.trim())) errs.firstName = 'Solo se permiten letras';

    if (!address.lastName.trim()) errs.lastName = 'El apellido es obligatorio';
    else if (!NAME_RE.test(address.lastName.trim())) errs.lastName = 'Solo se permiten letras';

    if (!address.email.trim()) errs.email = 'El correo es obligatorio';
    else if (!EMAIL_RE.test(address.email.trim())) errs.email = 'Formato de correo no válido';

    const pRule = PHONE_RULES[address.country] || { digits: 10 };
    const rawPhone = onlyDigits(address.phone);
    if (!rawPhone) errs.phone = 'El teléfono es obligatorio';
    else if (rawPhone.length !== pRule.digits) {
      errs.phone = `Debe tener exactamente ${pRule.digits} dígitos para ${address.country}`;
    }

    if (!address.street.trim()) errs.street = 'La dirección de entrega es obligatoria';
    if (!address.city.trim()) errs.city = 'La ciudad es obligatoria';
    if (!address.state.trim()) errs.state = 'El estado o provincia es obligatorio';

    const postRule = POSTAL_RULES[address.country];
    if (!address.postalCode.trim()) errs.postalCode = 'El código postal es obligatorio';
    else if (postRule && !postRule.re.test(address.postalCode.trim())) {
      errs.postalCode = `Formato inválido (${postRule.hint})`;
    }

    return errs;
  };

  // Validaciones del Paso 3 (Tarjeta)
  const validateCard = () => {
    if (paymentMethod !== 'card') return {};
    const errs = {};
    if (!card.name.trim()) errs.name = 'Nombre del titular es obligatorio';
    else if (!NAME_RE.test(card.name.trim())) errs.name = 'Solo letras en el nombre del titular';

    const dNum = onlyDigits(card.number);
    const cardInfo = detectCardType(card.number);
    if (!dNum) errs.number = 'El número de tarjeta es obligatorio';
    else if (dNum.length !== cardInfo.length) {
      errs.number = `Debe tener ${cardInfo.length} dígitos (${cardInfo.label})`;
    } else if (!luhnCheck(dNum)) {
      errs.number = 'Número de tarjeta inválido (falla validación de Luhn)';
    }

    const expErr = validateExpiry(card.expiry);
    if (expErr) errs.expiry = expErr;

    const dCvv = onlyDigits(card.cvv);
    if (!dCvv) errs.cvv = 'CVV obligatorio';
    else if (dCvv.length !== cardInfo.cvv) {
      errs.cvv = `${cardInfo.cvv} dígitos requeridos para ${cardInfo.label}`;
    }

    return errs;
  };

  const addressErrors = validateAddress();
  const cardErrors = validateCard();

  const handleNextStep1 = (e) => {
    e.preventDefault();
    setAddressTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      postalCode: true,
    });
    if (Object.keys(addressErrors).length === 0) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep2 = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep3 = (e) => {
    e.preventDefault();
    setCardTouched({ name: true, number: true, expiry: true, cvv: true });
    if (paymentMethod === 'transfer' || Object.keys(cardErrors).length === 0) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Autocompletar tarjeta de prueba seleccionada
  const handleSelectTestCard = (e) => {
    const found = TEST_CARDS.find((c) => c.number === e.target.value);
    if (found) {
      setCard({
        name: 'USUARIO PRUEBA QA',
        number: formatCardNumber(found.number),
        expiry: found.expiry,
        cvv: found.cvv,
      });
      setCardTouched({});
      setPaymentError(null);
    }
  };

  // Procesar compra final
  const handlePlaceOrder = async () => {
    setTermsTouched(true);
    if (!termsAccepted) return;

    setSubmitting(true);
    setPaymentError(null);

    try {
      // Simular latencia bancaria y procesamiento de orden
      await simulateRequest(
        () => {
          const rawNum = onlyDigits(card.number);
          // Evaluar casos de prueba simulados
          if (rawNum === '4000000000000002') {
            throw new NetworkError(
              'Transacción rechazada por el banco: Fondos insuficientes en la tarjeta.',
              402,
              'PAYMENT_INSUFFICIENT_FUNDS',
            );
          }
          if (rawNum === '4000000000000003') {
            throw new NetworkError(
              '504 Gateway Timeout: El procesador de pagos no respondió a tiempo. Intente nuevamente.',
              504,
              'PAYMENT_TIMEOUT',
            );
          }
          return { success: true };
        },
        { minDelay: 2500, maxDelay: 3800, canFail: false },
      );

      // Pedido Exitoso
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderSummary = {
        orderId,
        date: new Date().toISOString(),
        items: [...items],
        itemCount,
        subtotalCents,
        discountCents,
        shippingCents,
        taxCents,
        totalCents,
        shippingMethod: selectedShipping,
        shippingAddress: { ...address },
        paymentMethod: paymentMethod === 'card' ? `Tarjeta terminada en ${onlyDigits(card.number).slice(-4)}` : 'Transferencia Bancaria',
      };

      setLatestOrder(orderSummary);
      clearCart();
      navigate(`/ecommerce/order/${orderId}`);
    } catch (err) {
      setPaymentError(err.message);
      setSubmitting(false);
    }
  };

  const cardInfo = detectCardType(card.number);

  return (
    <div data-testid="checkout-page" className="space-y-6">
      {/* Indicador visual de Pasos */}
      <nav
        aria-label="Progreso del Checkout"
        className="card p-3 sm:p-4"
        data-testid="checkout-step-indicator"
      >
        <ol className="flex items-center justify-between gap-2 overflow-x-auto text-xs sm:text-sm">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <li
                key={s.id}
                data-testid={`step-indicator-${s.id}`}
                data-active={isCurrent}
                data-completed={isCompleted}
                className="flex items-center gap-2 shrink-0"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl font-bold transition-all',
                    isCompleted
                      ? 'bg-moss-600 text-white'
                      : isCurrent
                      ? 'bg-moss-800 text-white shadow-soft ring-2 ring-moss-500'
                      : 'bg-moss-200 text-moss-700',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    'font-medium hidden md:inline',
                    isCurrent ? 'text-moss-900 font-bold' : 'text-moss-600',
                  )}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-moss-300 ml-1 sm:ml-3" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Contenedor Principal de Pasos */}
        <div className="space-y-6">
          {/* PASO 1: DIRECCIÓN DE ENVÍO */}
          {currentStep === 1 && (
            <form
              onSubmit={handleNextStep1}
              noValidate
              data-testid="checkout-step-1-form"
              className="card p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-moss-600" />
                  <h3 className="text-lg font-bold text-moss-900">1. Datos de Contacto y Envío</h3>
                </div>
                <LocatorHint testId="checkout-step1-next-btn" label="siguiente paso de envío" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombre"
                  htmlFor="ship-first-name"
                  testId="ship-first-name-input"
                  error={addressTouched.firstName && addressErrors.firstName}
                  required
                >
                  <input
                    id="ship-first-name"
                    value={address.firstName}
                    onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, firstName: true }))}
                    data-testid="ship-first-name-input"
                    className="input"
                    placeholder="Alex"
                  />
                </Field>

                <Field
                  label="Apellido"
                  htmlFor="ship-last-name"
                  testId="ship-last-name-input"
                  error={addressTouched.lastName && addressErrors.lastName}
                  required
                >
                  <input
                    id="ship-last-name"
                    value={address.lastName}
                    onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, lastName: true }))}
                    data-testid="ship-last-name-input"
                    className="input"
                    placeholder="Vargas"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Correo Electrónico"
                  htmlFor="ship-email"
                  testId="ship-email-input"
                  error={addressTouched.email && addressErrors.email}
                  required
                >
                  <input
                    id="ship-email"
                    type="email"
                    value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, email: true }))}
                    data-testid="ship-email-input"
                    className="input"
                    placeholder="alex@ejemplo.com"
                  />
                </Field>

                <Field
                  label="Teléfono"
                  htmlFor="ship-phone"
                  testId="ship-phone-input"
                  error={addressTouched.phone && addressErrors.phone}
                  hint={`Prefijo ${PHONE_RULES[address.country]?.prefix || ''} · ${PHONE_RULES[address.country]?.digits || 10} dígitos`}
                  required
                >
                  <input
                    id="ship-phone"
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, phone: true }))}
                    data-testid="ship-phone-input"
                    className="input"
                    placeholder="5551234567"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="ship-country" className="label">
                    <span>País</span>
                    <LocatorHint testId="ship-country-select" />
                  </label>
                  <select
                    id="ship-country"
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value, postalCode: '' })}
                    data-testid="ship-country-select"
                    className="input cursor-pointer"
                  >
                    <option value="MX">México (+52)</option>
                    <option value="US">Estados Unidos (+1)</option>
                    <option value="ES">España (+34)</option>
                    <option value="CO">Colombia (+57)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Código Postal"
                    htmlFor="ship-postal"
                    testId="ship-postal-input"
                    error={addressTouched.postalCode && addressErrors.postalCode}
                    hint={POSTAL_RULES[address.country]?.hint}
                    required
                  >
                    <input
                      id="ship-postal"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      onBlur={() => setAddressTouched((t) => ({ ...t, postalCode: true }))}
                      data-testid="ship-postal-input"
                      className="input font-mono"
                      placeholder="03900"
                    />
                  </Field>
                </div>
              </div>

              <Field
                label="Calle y Número (Dirección)"
                htmlFor="ship-street"
                testId="ship-street-input"
                error={addressTouched.street && addressErrors.street}
                required
              >
                <input
                  id="ship-street"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  onBlur={() => setAddressTouched((t) => ({ ...t, street: true }))}
                  data-testid="ship-street-input"
                  className="input"
                  placeholder="Av. Insurgentes Sur 1602, Piso 4"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Ciudad"
                  htmlFor="ship-city"
                  testId="ship-city-input"
                  error={addressTouched.city && addressErrors.city}
                  required
                >
                  <input
                    id="ship-city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, city: true }))}
                    data-testid="ship-city-input"
                    className="input"
                    placeholder="Ciudad de México"
                  />
                </Field>

                <Field
                  label="Estado / Provincia"
                  htmlFor="ship-state"
                  testId="ship-state-input"
                  error={addressTouched.state && addressErrors.state}
                  required
                >
                  <input
                    id="ship-state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    onBlur={() => setAddressTouched((t) => ({ ...t, state: true }))}
                    data-testid="ship-state-input"
                    className="input"
                    placeholder="CDMX"
                  />
                </Field>
              </div>

              <Field
                label="Instrucciones o notas de entrega"
                htmlFor="ship-notes"
                testId="ship-notes-input"
                optional
              >
                <textarea
                  id="ship-notes"
                  rows={2}
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  data-testid="ship-notes-input"
                  className="input"
                  placeholder="Dejar en caseta con vigilante..."
                />
              </Field>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  data-testid="checkout-step1-next-btn"
                  className="btn btn-primary"
                >
                  <span>Continuar a Método de Envío</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 2: MÉTODO DE ENVÍO */}
          {currentStep === 2 && (
            <div className="card p-6 space-y-5" data-testid="checkout-step-2-form">
              <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-moss-600" />
                  <h3 className="text-lg font-bold text-moss-900">2. Selecciona Método de Envío</h3>
                </div>
                <LocatorHint testId="checkout-step2-next-btn" />
              </div>

              <div className="space-y-3" role="radiogroup" aria-label="Métodos de envío disponibles">
                {SHIPPING_METHODS.map((method) => {
                  const isSelected = shippingId === method.id;
                  return (
                    <label
                      key={method.id}
                      htmlFor={`shipping-method-${method.id}`}
                      data-testid={`shipping-option-${method.id}`}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all',
                        isSelected
                          ? 'border-moss-600 bg-moss-50/80 shadow-soft ring-1 ring-moss-600'
                          : 'border-moss-200 bg-white hover:border-moss-300',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          id={`shipping-method-${method.id}`}
                          type="radio"
                          name="shipping_method"
                          value={method.id}
                          checked={isSelected}
                          onChange={() => setShippingId(method.id)}
                          data-testid={`shipping-radio-${method.id}`}
                          className="h-4 w-4 accent-moss-600"
                        />
                        <div>
                          <p className="font-semibold text-moss-900 text-sm">{method.name}</p>
                          <p className="text-xs text-moss-600">
                            {method.deliveryTime} · Vía {method.carrier}
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-moss-900 text-sm">
                        {formatCents(method.costCents)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-moss-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  data-testid="checkout-step2-back-btn"
                  className="btn btn-secondary btn-sm"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a Dirección
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  data-testid="checkout-step2-next-btn"
                  className="btn btn-primary"
                >
                  <span>Continuar a Método de Pago</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: MÉTODO DE PAGO */}
          {currentStep === 3 && (
            <form
              onSubmit={handleNextStep3}
              noValidate
              data-testid="checkout-step-3-form"
              className="card p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-moss-600" />
                  <h3 className="text-lg font-bold text-moss-900">3. Método de Pago</h3>
                </div>
                <LocatorHint testId="checkout-step3-next-btn" />
              </div>

              {/* Selector de modo de pago */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="pay-method-card-btn"
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                    paymentMethod === 'card'
                      ? 'border-moss-600 bg-moss-600 text-white'
                      : 'border-moss-200 bg-white text-moss-700 hover:bg-moss-50',
                  )}
                >
                  <CreditCard className="h-4 w-4" /> Tarjeta Bancaria
                </button>
                <button
                  type="button"
                  data-testid="pay-method-transfer-btn"
                  onClick={() => setPaymentMethod('transfer')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                    paymentMethod === 'transfer'
                      ? 'border-moss-600 bg-moss-600 text-white'
                      : 'border-moss-200 bg-white text-moss-700 hover:bg-moss-50',
                  )}
                >
                  <Building className="h-4 w-4" /> Transferencia / SPEI
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <div className="space-y-4 pt-2">
                  {/* Selector rápido de tarjetas de prueba para automatizadores */}
                  <div className="rounded-xl border border-moss-200 bg-moss-50 p-3">
                    <label
                      htmlFor="test-cards-select"
                      className="label !mb-1 text-xs font-semibold text-moss-800"
                    >
                      <span>🧪 Autocompletar tarjeta de prueba:</span>
                      <LocatorHint testId="checkout-test-cards-select" />
                    </label>
                    <select
                      id="test-cards-select"
                      onChange={handleSelectTestCard}
                      defaultValue=""
                      data-testid="checkout-test-cards-select"
                      className="input text-xs cursor-pointer"
                    >
                      <option value="" disabled>
                        Selecciona un escenario de prueba...
                      </option>
                      {TEST_CARDS.map((tc) => (
                        <option key={tc.number} value={tc.number}>
                          {tc.label} (Terminación ...{tc.number.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Field
                    label="Nombre en la tarjeta"
                    htmlFor="card-name"
                    testId="card-name-input"
                    error={cardTouched.name && cardErrors.name}
                    required
                  >
                    <input
                      id="card-name"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                      onBlur={() => setCardTouched((t) => ({ ...t, name: true }))}
                      data-testid="card-name-input"
                      className="input uppercase"
                      placeholder="ALEX VARGAS"
                    />
                  </Field>

                  <Field
                    label="Número de Tarjeta"
                    htmlFor="card-number"
                    testId="card-number-input"
                    error={cardTouched.number && cardErrors.number}
                    labelExtra={
                      <span className="badge badge-moss text-[10px] font-mono">
                        {cardInfo.label}
                      </span>
                    }
                    required
                  >
                    <input
                      id="card-number"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      onBlur={() => setCardTouched((t) => ({ ...t, number: true }))}
                      data-testid="card-number-input"
                      className="input font-mono tracking-wider"
                      placeholder="4532 0000 0000 0000"
                      maxLength={19}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Expiración (MM/AA)"
                      htmlFor="card-expiry"
                      testId="card-expiry-input"
                      error={cardTouched.expiry && cardErrors.expiry}
                      required
                    >
                      <input
                        id="card-expiry"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        onBlur={() => setCardTouched((t) => ({ ...t, expiry: true }))}
                        data-testid="card-expiry-input"
                        className="input font-mono text-center"
                        placeholder="12/28"
                        maxLength={5}
                      />
                    </Field>

                    <Field
                      label="Código de Seguridad (CVV)"
                      htmlFor="card-cvv"
                      testId="card-cvv-input"
                      error={cardTouched.cvv && cardErrors.cvv}
                      hint={`${cardInfo.cvv} dígitos`}
                      required
                    >
                      <input
                        id="card-cvv"
                        type="password"
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, cardInfo.cvv) })}
                        onBlur={() => setCardTouched((t) => ({ ...t, cvv: true }))}
                        data-testid="card-cvv-input"
                        className="input font-mono text-center"
                        placeholder="123"
                        maxLength={cardInfo.cvv}
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-moss-50 p-5 space-y-2 text-sm text-moss-800">
                  <p className="font-semibold text-moss-900">Instrucciones de Transferencia Bancaria:</p>
                  <p>Al confirmar el pedido se generará una línea de captura CLABE única para realizar el depósito dentro de las próximas 24 horas.</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-moss-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  data-testid="checkout-step3-back-btn"
                  className="btn btn-secondary btn-sm"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a Envío
                </button>
                <button
                  type="submit"
                  data-testid="checkout-step3-next-btn"
                  className="btn btn-primary"
                >
                  <span>Revisar Pedido</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 4: REVISIÓN Y CONFIRMACIÓN */}
          {currentStep === 4 && (
            <div className="card p-6 space-y-5" data-testid="checkout-step-4-form">
              <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-moss-600" />
                  <h3 className="text-lg font-bold text-moss-900">4. Confirmación Final de la Orden</h3>
                </div>
                <LocatorHint testId="checkout-place-order-btn" />
              </div>

              {/* Errores bancarios / simulados */}
              {paymentError && (
                <Alert
                  tone="error"
                  icon={AlertTriangle}
                  title="Fallo al procesar el pago"
                  testId="checkout-payment-error-alert"
                >
                  <span>{paymentError}</span>
                </Alert>
              )}

              {/* Resumen de dirección y pago */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-moss-200 p-3.5 space-y-1">
                  <span className="font-semibold uppercase tracking-wider text-moss-500">
                    Enviar a:
                  </span>
                  <p className="font-bold text-moss-900 text-sm">
                    {address.firstName} {address.lastName}
                  </p>
                  <p className="text-moss-700">{address.street}</p>
                  <p className="text-moss-700">
                    {address.city}, {address.state} - CP {address.postalCode} ({address.country})
                  </p>
                  <p className="text-moss-600">Tel: {address.phone}</p>
                </div>

                <div className="rounded-xl border border-moss-200 p-3.5 space-y-1">
                  <span className="font-semibold uppercase tracking-wider text-moss-500">
                    Método de pago:
                  </span>
                  <p className="font-bold text-moss-900 text-sm">
                    {paymentMethod === 'card'
                      ? `${cardInfo.label} terminada en ${onlyDigits(card.number).slice(-4)}`
                      : 'Transferencia Bancaria'}
                  </p>
                  <span className="font-semibold uppercase tracking-wider text-moss-500 block pt-1">
                    Método de Envío:
                  </span>
                  <p className="text-moss-700">
                    {selectedShipping.name} ({selectedShipping.deliveryTime})
                  </p>
                </div>
              </div>

              {/* Checkbox de términos y condiciones */}
              <div className="pt-2">
                <Checkbox
                  id="checkout-terms"
                  checked={termsAccepted}
                  onChange={(c) => setTermsAccepted(c)}
                  label="He leído y acepto los términos y condiciones de compra simulada."
                  testId="checkout-terms-checkbox"
                  error={
                    termsTouched && !termsAccepted
                      ? 'Debes aceptar los términos y condiciones para continuar.'
                      : null
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-moss-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCurrentStep(3)}
                  data-testid="checkout-step4-back-btn"
                  className="btn btn-secondary btn-sm"
                >
                  <ArrowLeft className="h-4 w-4" /> Modificar Pago
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                  data-testid="checkout-place-order-btn"
                  className="btn btn-primary btn-lg"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" testId="checkout-spinner" />
                      <span>Procesando pago seguro...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Confirmar y Pagar ({formatCents(totalCents)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumen Lateral del Pedido */}
        <aside className="space-y-4">
          <div className="card p-5" data-testid="checkout-order-summary">
            <h4 className="font-bold text-moss-900 text-sm mb-3">Tu Pedido ({itemCount})</h4>

            <div className="max-h-60 overflow-y-auto divide-y divide-moss-100 pr-1">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="py-2 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-moss-900">{product.name}</span>
                    <span className="block text-moss-500">Cant: {qty}</span>
                  </div>
                  <span className="font-mono font-medium text-moss-800">
                    {formatCents(product.priceCents * qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-moss-200 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-moss-700">
                <span>Subtotal</span>
                <span className="font-mono">{formatCents(subtotalCents)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-moss-700">
                  <span>Descuento</span>
                  <span className="font-mono">-{formatCents(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-moss-700">
                <span>Envío ({selectedShipping.name})</span>
                <span className="font-mono">{formatCents(shippingCents)}</span>
              </div>
              <div className="flex justify-between text-moss-700">
                <span>Impuestos (8%)</span>
                <span className="font-mono">{formatCents(taxCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-moss-900 text-sm border-t border-moss-200/80 pt-2">
                <span>Total</span>
                <span data-testid="checkout-summary-total" className="font-mono text-base">
                  {formatCents(totalCents)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
