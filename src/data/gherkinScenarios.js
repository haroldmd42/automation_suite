/**
 * Banco oficial de escenarios de prueba en formato Gherkin (BDD)
 * para cada módulo de la Automation Suite.
 *
 * Cada feature incluye Background, Escenarios Happy Path, Casos Negativos,
 * Validaciones de Límites y Reglas de Negocio con sus data-testid correspondientes.
 */

export const GHERKIN_FEATURES = {
  users: {
    key: 'users',
    path: '/users',
    moduleLabel: 'Gestión y Directorio de Usuarios',
    featureTitle: 'Directorio y Ciclo de Vida de Usuarios',
    fileName: 'gestion_usuarios.feature',
    description: `Como ingeniero de aseguramiento de calidad (QA)
  Quiero interactuar con el formulario y la tabla de usuarios
  Para validar reglas de negocio, límites de caracteres y persistencia de datos`,
    tags: ['@suite', '@users', '@crud'],
    scenarios: [
      {
        id: 'users-01',
        title: 'Verificación del estado inicial vacío del directorio',
        tags: ['@smoke', '@estado-vacio'],
        type: 'Scenario',
        description: 'Comprobar que al iniciar o vaciar el directorio se muestra el call-to-action correspondiente.',
        steps: [
          { keyword: 'Given', text: 'que el usuario navega al módulo "Gestión de Usuarios" en "/users"' },
          { keyword: 'And', text: 'el directorio se encuentra en su estado inicial sin registros' },
          { keyword: 'Then', text: 'debe visualizarse el contenedor de estado vacío [data-testid="users-empty-state"]' },
          { keyword: 'And', text: 'el título debe ser "No hay usuarios registrados" [data-testid="empty-state-title"]' },
          { keyword: 'And', text: 'el botón principal debe ser "Crear Primer Usuario" [data-testid="create-first-user-btn"]' },
          { keyword: 'And', text: 'la tabla de usuarios no debe estar presente en el DOM' },
        ],
        involvedLocators: ['users-empty-state', 'empty-state-title', 'create-first-user-btn'],
      },
      {
        id: 'users-02',
        title: 'Creación exitosa de un nuevo usuario con todos los campos válidos',
        tags: ['@smoke', '@happy-path', '@creacion'],
        type: 'Scenario',
        description: 'Registrar un usuario completando todas las secciones del formulario modal y comprobar su alta en la tabla.',
        steps: [
          { keyword: 'Given', text: 'que el usuario está en el módulo "Gestión de Usuarios"' },
          { keyword: 'When', text: 'hace clic en el botón "Crear Usuario" [data-testid="create-user-btn"]' },
          { keyword: 'Then', text: 'se abre el modal de creación [data-testid="create-user-modal"]' },
          { keyword: 'When', text: 'ingresa "Valeria Sofía Martínez" en [data-testid="user-fullname-input"]' },
          { keyword: 'And', text: 'ingresa "valeria_qa" en [data-testid="user-username-input"]' },
          { keyword: 'And', text: 'ingresa "valeria.martinez@corporativo.com" en [data-testid="user-email-input"]' },
          { keyword: 'And', text: 'ingresa "5587654321" en [data-testid="user-phone-input"]' },
          { keyword: 'And', text: 'selecciona el rol "Líder de Calidad (QA Lead)" en [data-testid="user-role-select"]' },
          { keyword: 'And', text: 'selecciona el departamento "Aseguramiento de Calidad (QA & Testing)" en [data-testid="user-department-select"]' },
          { keyword: 'And', text: 'selecciona la fecha "2026-10-15" en [data-testid="user-hire-date-input"]' },
          { keyword: 'And', text: 'ingresa la contraseña "QualityLead2026!" en [data-testid="user-password-input"]' },
          { keyword: 'And', text: 'confirma la contraseña con "QualityLead2026!" en [data-testid="user-confirm-password-input"]' },
          { keyword: 'And', text: 'hace clic en "Guardar y Registrar" [data-testid="submit-create-user-btn"]' },
          { keyword: 'Then', text: 'el modal [data-testid="create-user-modal"] debe cerrarse' },
          { keyword: 'And', text: 'la tabla de usuarios debe mostrar un nuevo registro con nombre "Valeria Sofía Martínez"' },
          { keyword: 'And', text: 'el badge del rol debe indicar "QA Lead"' },
          { keyword: 'And', text: 'el estado del usuario debe ser "Activo"' },
        ],
        involvedLocators: [
          'create-user-btn',
          'create-user-modal',
          'user-fullname-input',
          'user-username-input',
          'user-email-input',
          'user-phone-input',
          'user-role-select',
          'user-department-select',
          'user-hire-date-input',
          'user-password-input',
          'user-confirm-password-input',
          'submit-create-user-btn',
        ],
      },
      {
        id: 'users-03',
        title: 'Bloqueo de guardado al superar el límite máximo de 45 caracteres en Nombre Completo',
        tags: ['@negativo', '@limite-caracteres', '@validaciones'],
        type: 'Scenario',
        description: 'Asegurar que la regla de longitud máxima bloquee el envío y muestre el mensaje descriptivo exacto.',
        steps: [
          { keyword: 'Given', text: 'que el modal de creación de usuario se encuentra abierto' },
          { keyword: 'When', text: 'el usuario ingresa un nombre de 50 caracteres: "Alejandra de los Milagros Hernandez y Rodriguez de la Concepcion"' },
          { keyword: 'Then', text: 'el contador [data-testid="user-fullname-counter"] debe indicar "65/45"' },
          { keyword: 'And', text: 'el contador debe exhibir estilo visual de alerta roja' },
          { keyword: 'When', text: 'el usuario intenta enviar el formulario [data-testid="submit-create-user-btn"]' },
          { keyword: 'Then', text: 'el formulario no debe enviarse ni cerrar el modal' },
          { keyword: 'And', text: 'se despliega el mensaje de error en [data-testid="user-fullname-input-error"]' },
          { keyword: 'And', text: 'el texto del error contiene "El nombre no puede exceder 45 caracteres"' },
        ],
        involvedLocators: ['user-fullname-input', 'user-fullname-counter', 'user-fullname-input-error', 'submit-create-user-btn'],
      },
      {
        id: 'users-04',
        title: 'Validación estricta de formato y longitud exacta de 10 dígitos en Teléfono',
        tags: ['@negativo', '@telefono', '@validaciones'],
        type: 'Scenario Outline',
        description: 'Comprobar que cualquier teléfono con longitud distinta a 10 dígitos impida el guardado.',
        steps: [
          { keyword: 'Given', text: 'que el formulario de usuario está abierto' },
          { keyword: 'When', text: 'el usuario ingresa "<telefono_invalido>" en [data-testid="user-phone-input"]' },
          { keyword: 'And', text: 'hace clic fuera del campo o presiona guardar' },
          { keyword: 'Then', text: 'se muestra el error de validación en [data-testid="user-phone-input-error"]' },
          { keyword: 'And', text: 'el mensaje contiene "<mensaje_esperado>"' },
        ],
        examples: [
          { telefono_invalido: '55123', mensaje_esperado: 'El teléfono debe contener exactamente 10 dígitos' },
          { telefono_invalido: '551234567890', mensaje_esperado: 'El teléfono debe contener exactamente 10 dígitos' },
          { telefono_invalido: 'abcd1234ef', mensaje_esperado: 'El teléfono debe contener exactamente 10 dígitos' },
        ],
        involvedLocators: ['user-phone-input', 'user-phone-counter', 'user-phone-input-error'],
      },
      {
        id: 'users-05',
        title: 'Verificación de correspondencia exacta entre datos creados y Ficha de Detalle',
        tags: ['@verificacion', '@detalle-usuario'],
        type: 'Scenario',
        description: 'Abrir el modal de detalle profundo y comparar cada dato con el registro capturado.',
        steps: [
          { keyword: 'Given', text: 'que existe un usuario registrado con ID "USR-7721" y nombre "Mariana Rivas"' },
          { keyword: 'When', text: 'el usuario hace clic en el botón "Detalle" [data-testid="user-view-btn-USR-7721"]' },
          { keyword: 'Then', text: 'se abre la "Ficha Detallada del Usuario" [data-testid="user-detail-modal"]' },
          { keyword: 'And', text: 'el elemento [data-testid="detail-user-fullname"] debe mostrar "Mariana Rivas"' },
          { keyword: 'And', text: 'el elemento [data-testid="detail-user-username"] debe mostrar "@mariana_qa"' },
          { keyword: 'And', text: 'el elemento [data-testid="detail-user-email"] debe coincidir con el correo registrado' },
          { keyword: 'And', text: 'el elemento [data-testid="detail-user-phone"] debe coincidir con el teléfono registrado' },
          { keyword: 'And', text: 'el elemento [data-testid="detail-user-role"] debe indicar el rol asignado' },
          { keyword: 'When', text: 'hace clic en "Entendido / Cerrar" [data-testid="close-detail-modal-btn"]' },
          { keyword: 'Then', text: 'el modal de detalle se cierra' },
        ],
        involvedLocators: [
          'user-view-btn-USR-7721',
          'user-detail-modal',
          'detail-user-fullname',
          'detail-user-username',
          'detail-user-email',
          'detail-user-phone',
          'detail-user-role',
          'close-detail-modal-btn',
        ],
      },
      {
        id: 'users-06',
        title: 'Edición de usuario con pre-llenado de datos y badge "editado"',
        tags: ['@edicion', '@persistencia'],
        type: 'Scenario',
        description: 'Modificar los datos de un usuario existente, comprobar que la contraseña es opcional y verificar el badge visual.',
        steps: [
          { keyword: 'Given', text: 'que existe un usuario en el directorio' },
          { keyword: 'When', text: 'el usuario hace clic en el botón "Editar" del usuario [data-testid^="user-edit-btn-"]' },
          { keyword: 'Then', text: 'se abre el modal [data-testid="edit-user-modal"] con todos los campos pre-llenados' },
          { keyword: 'And', text: 'el campo contraseña tiene placeholder "Sin cambios (conservar)"' },
          { keyword: 'When', text: 'el usuario actualiza el nombre agregando " - Actualizado"' },
          { keyword: 'And', text: 'presiona "Guardar Cambios" [data-testid="submit-edit-user-btn"]' },
          { keyword: 'Then', text: 'el registro en la tabla muestra el nuevo nombre' },
          { keyword: 'And', text: 'se despliega el badge de modificado [data-testid^="user-updated-badge-"] con el texto "editado"' },
        ],
        involvedLocators: ['edit-user-modal', 'submit-edit-user-btn'],
      },
    ],
  },

  auth: {
    key: 'auth',
    path: '/auth',
    moduleLabel: 'Autenticación & Control de Acceso',
    featureTitle: 'Inicio de Sesión, Bloqueo de Cuenta y MFA',
    fileName: 'autenticacion.feature',
    description: `Como auditor de seguridad y automatizador QA
  Quiero comprobar las políticas de autenticación y controles de seguridad
  Para garantizar que accesos indebidos sean bloqueados y sesiones protegidas`,
    tags: ['@suite', '@auth', '@seguridad'],
    scenarios: [
      {
        id: 'auth-01',
        title: 'Inicio de sesión exitoso con credenciales válidas y rol asignado',
        tags: ['@smoke', '@happy-path', '@login'],
        type: 'Scenario',
        description: 'Comprobar ingreso con usuario admin y verificar redirección a panel de sesión activa.',
        steps: [
          { keyword: 'Given', text: 'que el usuario está en el formulario de login "/auth"' },
          { keyword: 'When', text: 'ingresa "admin@automation.io" en [data-testid="login-email-input"]' },
          { keyword: 'And', text: 'ingresa "Admin123!" en [data-testid="login-password-input"]' },
          { keyword: 'And', text: 'hace clic en "Iniciar Sesión" [data-testid="login-submit-btn"]' },
          { keyword: 'Then', text: 'se despliega el panel de sesión activa [data-testid="auth-session-active"]' },
          { keyword: 'And', text: 'el badge de rol muestra "Administrador"' },
          { keyword: 'And', text: 'se registra el evento "login_success" en el log de auditoría' },
        ],
        involvedLocators: ['login-email-input', 'login-password-input', 'login-submit-btn', 'auth-session-active'],
      },
      {
        id: 'auth-02',
        title: 'Bloqueo temporal de cuenta tras 3 intentos fallidos consecutivos',
        tags: ['@seguridad', '@bloqueo', '@negativo'],
        type: 'Scenario',
        description: 'Simular 3 intentos de credenciales inválidas y verificar el temporizador de bloqueo de 30 segundos.',
        steps: [
          { keyword: 'Given', text: 'que el usuario está en el formulario de login' },
          { keyword: 'When', text: 'ingresa credenciales erróneas por 3 veces consecutivas' },
          { keyword: 'Then', text: 'el formulario se bloquea y se muestra la alerta de cuenta bloqueada [data-testid="auth-lockout-banner"]' },
          { keyword: 'And', text: 'el botón [data-testid="login-submit-btn"] queda deshabilitado' },
          { keyword: 'And', text: 'se visualiza la cuenta regresiva en vivo [data-testid="auth-lockout-countdown"] iniciando en "30s"' },
          { keyword: 'And', text: 'al expirar el tiempo, el formulario se habilita nuevamente' },
        ],
        involvedLocators: ['login-email-input', 'login-password-input', 'login-submit-btn', 'auth-lockout-banner', 'auth-lockout-countdown'],
      },
      {
        id: 'auth-03',
        title: 'Flujo de Segundo Factor de Autenticación (MFA) con código OTP',
        tags: ['@mfa', '@otp', '@seguridad'],
        type: 'Scenario',
        description: 'Probar la validación de un código OTP de 6 dígitos y el cooldown de reenvío.',
        steps: [
          { keyword: 'Given', text: 'que el usuario ingresó credenciales que requieren MFA' },
          { keyword: 'Then', text: 'se muestra la pantalla de desafío OTP [data-testid="auth-mfa-screen"]' },
          { keyword: 'When', text: 'el usuario ingresa el código simulado "123456" en [data-testid="mfa-otp-input"]' },
          { keyword: 'And', text: 'presiona "Verificar Código" [data-testid="mfa-submit-btn"]' },
          { keyword: 'Then', text: 'el desafío se supera y se confirma el inicio de sesión' },
        ],
        involvedLocators: ['auth-mfa-screen', 'mfa-otp-input', 'mfa-submit-btn'],
      },
      {
        id: 'auth-04',
        title: 'Detección en vivo de tecla Bloq Mayús (Caps Lock)',
        tags: ['@ux', '@caps-lock'],
        type: 'Scenario',
        description: 'Advertir al usuario en tiempo real si tiene activadas las mayúsculas al escribir su clave.',
        steps: [
          { keyword: 'Given', text: 'que el foco está en [data-testid="login-password-input"]' },
          { keyword: 'When', text: 'el usuario presiona una tecla con Bloq Mayús activado' },
          { keyword: 'Then', text: 'debe mostrarse el aviso "Bloq Mayús activado" [data-testid="caps-lock-warning"]' },
        ],
        involvedLocators: ['login-password-input', 'caps-lock-warning'],
      },
    ],
  },

  ecommerce: {
    key: 'ecommerce',
    path: '/ecommerce',
    moduleLabel: 'E-commerce & Checkout Multi-paso',
    featureTitle: 'Catálogo de Productos, Carrito y Checkout',
    fileName: 'ecommerce_checkout.feature',
    description: `Como comprador o tester de automatización
  Quiero agregar productos al carrito, aplicar cupones de descuento y pagar
  Para comprobar la precisión de totales y validación Luhn de tarjetas`,
    tags: ['@suite', '@ecommerce', '@checkout'],
    scenarios: [
      {
        id: 'ecom-01',
        title: 'Filtrado de productos por categoría y búsqueda textual',
        tags: ['@catalogo', '@filtros'],
        type: 'Scenario',
        description: 'Filtrar el catálogo de productos y verificar los resultados coincidentes.',
        steps: [
          { keyword: 'Given', text: 'que el usuario está en el catálogo de productos "/ecommerce"' },
          { keyword: 'When', text: 'selecciona la categoría "Hardware" en [data-testid="catalog-category-select"]' },
          { keyword: 'And', text: 'escribe "Teclado" en [data-testid="catalog-search-input"]' },
          { keyword: 'Then', text: 'la lista de productos solo debe mostrar tarjetas que contengan "Teclado"' },
          { keyword: 'And', text: 'cada tarjeta debe mostrar precio, stock disponible y botón "Agregar al Carrito"' },
        ],
        involvedLocators: ['catalog-category-select', 'catalog-search-input'],
      },
      {
        id: 'ecom-02',
        title: 'Control estricto de stock y límite máximo de compra por artículo',
        tags: ['@carrito', '@stock', '@limites'],
        type: 'Scenario',
        description: 'Verificar que el botón de incremento se deshabilite al alcanzar el stock real o tope del pedido.',
        steps: [
          { keyword: 'Given', text: 'que el producto tiene un stock máximo de 5 unidades' },
          { keyword: 'When', text: 'el usuario agrega el producto al carrito' },
          { keyword: 'And', text: 'navega al carrito en "/ecommerce/cart"' },
          { keyword: 'And', text: 'incrementa la cantidad hasta alcanzar 5 unidades' },
          { keyword: 'Then', text: 'el botón de incremento "+" queda deshabilitado' },
          { keyword: 'And', text: 'se muestra el aviso de "Límite de stock alcanzado"' },
        ],
        involvedLocators: ['cart-item-qty-increase', 'topbar-cart-link', 'cart-clear-btn'],
      },
      {
        id: 'ecom-03',
        title: 'Aplicación de cupón de descuento válido y rechazo de cupón expirado',
        tags: ['@cupones', '@calculo-totales'],
        type: 'Scenario Outline',
        description: 'Probar el cálculo de descuentos en centavos y validación de reglas de vigencia.',
        steps: [
          { keyword: 'Given', text: 'que el carrito tiene productos por un subtotal superior al mínimo requerido' },
          { keyword: 'When', text: 'el usuario ingresa el cupón "<codigo_cupon>" en [data-testid="coupon-input"]' },
          { keyword: 'And', text: 'hace clic en "Aplicar Cupón" [data-testid="coupon-apply-btn"]' },
          { keyword: 'Then', text: 'el resultado debe ser "<resultado_esperado>"' },
          { keyword: 'And', text: 'el total del pedido [data-testid="summary-total"] debe reflejar el importe correcto' },
        ],
        examples: [
          { codigo_cupon: 'PROMO15', resultado_esperado: 'Descuento del 15% aplicado' },
          { codigo_cupon: 'EXPIRED2024', resultado_esperado: 'Cupón vencido o no aplicable' },
          { codigo_cupon: 'INVALIDO99', resultado_esperado: 'Código de cupón inexistente' },
        ],
        involvedLocators: ['coupon-input', 'coupon-apply-btn', 'summary-total'],
      },
      {
        id: 'ecom-04',
        title: 'Checkout completo de 4 pasos con tarjeta de prueba aprobada',
        tags: ['@smoke', '@checkout', '@luhn'],
        type: 'Scenario',
        description: 'Flujo extremo a extremo: Dirección → Envío → Pago (Luhn) → Confirmación de Orden.',
        steps: [
          { keyword: 'Given', text: 'que el usuario tiene al menos 1 artículo en el carrito' },
          { keyword: 'When', text: 'inicia el checkout y completa los datos de envío (Paso 1)' },
          { keyword: 'And', text: 'avanza al paso de método de despacho (Paso 2)' },
          { keyword: 'And', text: 'avanza al paso de pago (Paso 3)' },
          { keyword: 'And', text: 'selecciona la tarjeta de prueba "Visa Aprobada (4111...)" en [data-testid="checkout-test-cards-select"]' },
          { keyword: 'And', text: 'hace clic en "Pagar y Confirmar Pedido" [data-testid="checkout-place-order-btn"]' },
          { keyword: 'Then', text: 'se muestra la pantalla de confirmación [data-testid="order-confirmation-screen"]' },
          { keyword: 'And', text: 'se genera un ID de pedido único [data-testid="order-confirmation-id"]' },
          { keyword: 'And', text: 'el carrito de compras se vacía automáticamente' },
        ],
        involvedLocators: ['checkout-test-cards-select', 'checkout-place-order-btn', 'order-confirmation-screen', 'order-confirmation-id'],
      },
    ],
  },

  controls: {
    key: 'controls',
    path: '/controls',
    moduleLabel: 'Controles UI Avanzados',
    featureTitle: 'Selectores en Cascada, Calendarios y Validaciones Cruzadas',
    fileName: 'controles_ui.feature',
    description: `Como especialista en automatización de pruebas
  Quiero interactuar con controles dinámicos complejos
  Para asegurar el comportamiento ante dependencias asíncronas y reglas cruzadas`,
    tags: ['@suite', '@controls', '@cascada'],
    scenarios: [
      {
        id: 'ctrl-01',
        title: 'Cascada asíncrona dependiente País → Estado / Provincia → Ciudad',
        tags: ['@cascada', '@asincrono'],
        type: 'Scenario',
        description: 'Comprobar que los selectores secundarios permanezcan deshabilitados hasta que el padre cargue sus datos.',
        steps: [
          { keyword: 'Given', text: 'que el usuario se encuentra en la pestaña "Selectores en Cascada"' },
          { keyword: 'Then', text: 'el selector Estado [data-testid="cascade-state-select"] debe estar deshabilitado' },
          { keyword: 'And', text: 'el selector Ciudad [data-testid="cascade-city-select"] debe estar deshabilitado' },
          { keyword: 'When', text: 'el usuario selecciona "México" en [data-testid="cascade-country-select"]' },
          { keyword: 'Then', text: 'el selector Estado se habilita con las entidades de México' },
          { keyword: 'When', text: 'selecciona "Jalisco" en [data-testid="cascade-state-select"]' },
          { keyword: 'Then', text: 'el selector Ciudad se habilita mostrando municipios de Jalisco' },
        ],
        involvedLocators: ['cascade-country-select', 'cascade-state-select', 'cascade-city-select'],
      },
      {
        id: 'ctrl-02',
        title: 'Árbol jerárquico de permisos con estado indeterminado (tri-state checkbox)',
        tags: ['@arbol', '@checkbox', '@indeterminado'],
        type: 'Scenario',
        description: 'Verificar la propagación hacia arriba y hacia abajo en la selección de nodos padres e hijos.',
        steps: [
          { keyword: 'Given', text: 'que el árbol de permisos está desplegado' },
          { keyword: 'When', text: 'el usuario marca un sub-permiso hijo' },
          { keyword: 'Then', text: 'el nodo padre debe adquirir la propiedad indeterminate="true"' },
          { keyword: 'When', text: 'el usuario marca el nodo padre' },
          { keyword: 'Then', text: 'todos los nodos hijos deben quedar seleccionados (checked="true")' },
        ],
        involvedLocators: ['tree-checkbox-parent', 'tree-checkbox-child'],
      },
      {
        id: 'ctrl-03',
        title: 'Formulario con validación cruzada condicional',
        tags: ['@validacion-cruzada', '@reglas-negocio'],
        type: 'Scenario',
        description: 'Exigir datos de tutor legal solo cuando la edad del postulante sea menor a 18 años.',
        steps: [
          { keyword: 'Given', text: 'que el usuario ingresa una fecha de nacimiento que determina 16 años' },
          { keyword: 'Then', text: 'la sección "Datos del Tutor Legal" se vuelve obligatoria' },
          { keyword: 'When', text: 'el usuario intenta enviar el formulario sin completar el nombre del tutor' },
          { keyword: 'Then', text: 'se muestra error en [data-testid="cross-tutor-name-input-error"]' },
        ],
        involvedLocators: ['cross-tutor-name-input', 'cross-submit-btn'],
      },
    ],
  },

  async: {
    key: 'async',
    path: '/async',
    moduleLabel: 'Elementos Asíncronos & Ciclos de Vida',
    featureTitle: 'Modales Apilados, Toasts Efímeros y Mutaciones DOM',
    fileName: 'elementos_asincronos.feature',
    description: `Como ingeniero de pruebas automatizadas
  Quiero interactuar con elementos sujetos a condiciones de carrera, retardo y animaciones
  Para diseñar esperas explícitas robustas en Playwright o Cypress`,
    tags: ['@suite', '@async', '@esperas'],
    scenarios: [
      {
        id: 'async-01',
        title: 'Interacción con 3 niveles de modales apilados (stacked modals)',
        tags: ['@modales', '@z-index', '@focus-trap'],
        type: 'Scenario',
        description: 'Abrir modales secundarios y terciarios, asegurando que el cierre respete el orden LIFO (último en entrar, primero en salir).',
        steps: [
          { keyword: 'Given', text: 'que el usuario hace clic en "Abrir Modal Nivel 1" [data-testid="open-modal-lvl1-btn"]' },
          { keyword: 'Then', text: 'el modal 1 se muestra en pantalla con z-index base' },
          { keyword: 'When', text: 'hace clic en "Abrir Modal Nivel 2" [data-testid="open-modal-lvl2-btn"]' },
          { keyword: 'Then', text: 'el modal 2 se superpone al modal 1' },
          { keyword: 'When', text: 'hace clic en "Abrir Modal Nivel 3" [data-testid="open-modal-lvl3-btn"]' },
          { keyword: 'Then', text: 'el modal 3 se superpone a todos' },
          { keyword: 'When', text: 'presiona la tecla "Escape" o botón de cerrar del nivel 3' },
          { keyword: 'Then', text: 'solo se cierra el nivel 3, conservando el nivel 2 activo' },
        ],
        involvedLocators: ['open-modal-lvl1-btn', 'open-modal-lvl2-btn', 'open-modal-lvl3-btn'],
      },
      {
        id: 'async-02',
        title: 'Toast efímero con auto-ocultado y botón de Deshacer (Undo)',
        tags: ['@toasts', '@temporizador', '@undo'],
        type: 'Scenario',
        description: 'Probar que el paso del cursor pause el temporizador de auto-cierre y que hacer clic en Deshacer revierta la acción.',
        steps: [
          { keyword: 'Given', text: 'que se dispara una acción que genera un toast efímero de 5 segundos' },
          { keyword: 'When', text: 'el usuario posiciona el cursor (hover) sobre el toast [data-testid="toast-item"]' },
          { keyword: 'Then', text: 'la barra de progreso de tiempo se pausa' },
          { keyword: 'When', text: 'hace clic en el botón "Deshacer" del toast' },
          { keyword: 'Then', text: 'la operación original es revertida y el toast se descarta' },
        ],
        involvedLocators: ['toast-item', 'toast-undo-btn'],
      },
    ],
  },

  tables: {
    key: 'tables',
    path: '/tables',
    moduleLabel: 'Data Tables & Servidor Simulado',
    featureTitle: 'Paginación, Filtros Combinados y Orden Multi-columna',
    fileName: 'data_tables.feature',
    description: `Como analista de QA
  Quiero comprobar la tabla dinámica de datos con paginación de servidor simulada
  Para validar sincronización con URL, filtros y selección masiva`,
    tags: ['@suite', '@tables', '@paginacion'],
    scenarios: [
      {
        id: 'tbl-01',
        title: 'Paginación del servidor y cambio de tamaño de página',
        tags: ['@smoke', '@paginacion'],
        type: 'Scenario',
        description: 'Verificar cambio de página y cantidad de registros por vista (10, 25, 50).',
        steps: [
          { keyword: 'Given', text: 'que el usuario carga la tabla de datos en "/tables"' },
          { keyword: 'Then', text: 'se muestran por defecto 10 filas en la tabla [data-testid="table-row"]' },
          { keyword: 'When', text: 'cambia el selector de tamaño de página a 25 en [data-testid="table-page-size-select"]' },
          { keyword: 'Then', text: 'se solicitan y renderizan 25 registros' },
          { keyword: 'When', text: 'hace clic en el botón "Siguiente Página" [data-testid="table-next-page-btn"]' },
          { keyword: 'Then', text: 'el indicador de página muestra "Página 2"' },
          { keyword: 'And', text: 'la URL se actualiza con el parámetro "?page=2"' },
        ],
        involvedLocators: ['table-page-size-select', 'table-next-page-btn', 'table-row'],
      },
      {
        id: 'tbl-02',
        title: 'Selección persistente entre páginas y acción masiva de exportación',
        tags: ['@seleccion-masiva', '@exportacion'],
        type: 'Scenario',
        description: 'Seleccionar registros en la página 1, navegar a la página 2, seleccionar otro y comprobar que el conteo global sume todos.',
        steps: [
          { keyword: 'Given', text: 'que el usuario selecciona 2 filas en la Página 1' },
          { keyword: 'When', text: 'navega a la Página 2' },
          { keyword: 'And', text: 'selecciona 1 fila adicional en la Página 2' },
          { keyword: 'Then', text: 'la barra de acciones masivas [data-testid="batch-actions-bar"] debe indicar "3 seleccionados"' },
          { keyword: 'When', text: 'hace clic en "Exportar Seleccionados (CSV)" [data-testid="batch-export-csv-btn"]' },
          { keyword: 'Then', text: 'se genera la descarga del archivo CSV con los 3 registros seleccionados' },
        ],
        involvedLocators: ['batch-actions-bar', 'batch-export-csv-btn'],
      },
    ],
  },

  dashboard: {
    key: 'dashboard',
    path: '/',
    moduleLabel: 'Dashboard & Panel General',
    featureTitle: 'Monitoreo de Suite, Latencia de Red y Navegación',
    fileName: 'dashboard_general.feature',
    description: `Como ingeniero de automatización
  Quiero navegar por el Dashboard central y configurar las condiciones del laboratorio
  Para simular fallos de red y acceder a los distintos módulos de prueba`,
    tags: ['@suite', '@dashboard', '@latencia'],
    scenarios: [
      {
        id: 'dash-01',
        title: 'Navegación fluida a cada módulo de práctica desde las tarjetas del Dashboard',
        tags: ['@smoke', '@navegacion'],
        type: 'Scenario',
        description: 'Comprobar que cada tarjeta conduzca al módulo correspondiente sin errores.',
        steps: [
          { keyword: 'Given', text: 'que el usuario está en el Dashboard principal en "/"' },
          { keyword: 'When', text: 'hace clic en la tarjeta "Gestión de Usuarios" [data-testid="card-users"]' },
          { keyword: 'Then', text: 'la ruta cambia a "/users"' },
          { keyword: 'And', text: 'se visualiza la cabecera "Gestión y Directorio de Usuarios"' },
        ],
        involvedLocators: ['card-users', 'nav-users'],
      },
      {
        id: 'dash-02',
        title: 'Configuración global de simulación de red con latencia y tasa de fallos',
        tags: ['@red', '@latencia', '@chaos-testing'],
        type: 'Scenario',
        description: 'Configurar modo de red lenta (Slow 3G) e inducir fallos 503 para evaluar la tolerancia de la aplicación.',
        steps: [
          { keyword: 'Given', text: 'que el selector de red [data-testid="network-mode-select"] está visible en la barra superior' },
          { keyword: 'When', text: 'el usuario selecciona "Lenta (Slow 3G: 1200ms)"' },
          { keyword: 'And', text: 'selecciona "10% de error" en [data-testid="network-failure-select"]' },
          { keyword: 'Then', text: 'todas las peticiones simuladas en la plataforma aplican el retardo configurado' },
          { keyword: 'And', text: 'un 10% de las operaciones responderán con HTTP 503 simulado para verificar reintentos' },
        ],
        involvedLocators: ['network-mode-select', 'network-failure-select'],
      },
    ],
  },
};

/**
 * Convierte un objeto de feature a texto plano estándar Gherkin (.feature)
 */
export function generateGherkinText(feature) {
  if (!feature) return '';

  let out = '';
  if (feature.tags?.length) {
    out += `${feature.tags.join(' ')}\n`;
  }
  out += `Feature: ${feature.featureTitle}\n`;
  if (feature.description) {
    out += `  ${feature.description.split('\n').join('\n  ')}\n\n`;
  }

  feature.scenarios.forEach((sc, idx) => {
    if (sc.tags?.length) {
      out += `  ${sc.tags.join(' ')}\n`;
    }
    out += `  ${sc.type || 'Scenario'}: ${sc.title}\n`;
    if (sc.description) {
      out += `    # ${sc.description}\n`;
    }
    sc.steps.forEach((st) => {
      out += `    ${st.keyword.padEnd(5)} ${st.text}\n`;
    });

    if (sc.examples?.length) {
      out += `\n    Examples:\n`;
      const keys = Object.keys(sc.examples[0]);
      out += `      | ${keys.join(' | ')} |\n`;
      sc.examples.forEach((ex) => {
        out += `      | ${keys.map((k) => ex[k]).join(' | ')} |\n`;
      });
    }
    out += '\n';
  });

  return out.trim();
}

/**
 * Convierte un escenario individual a texto plano Gherkin
 */
export function generateScenarioText(feature, scenario) {
  if (!scenario) return '';
  let out = '';
  if (scenario.tags?.length) {
    out += `${scenario.tags.join(' ')}\n`;
  }
  out += `${scenario.type || 'Scenario'}: ${scenario.title}\n`;
  if (scenario.description) {
    out += `  # ${scenario.description}\n`;
  }
  scenario.steps.forEach((st) => {
    out += `  ${st.keyword.padEnd(5)} ${st.text}\n`;
  });

  if (scenario.examples?.length) {
    out += `\n  Examples:\n`;
    const keys = Object.keys(scenario.examples[0]);
    out += `    | ${keys.join(' | ')} |\n`;
    scenario.examples.forEach((ex) => {
      out += `    | ${keys.map((k) => ex[k]).join(' | ')} |\n`;
    });
  }
  return out.trim();
}
