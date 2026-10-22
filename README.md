# 🧪 Automation Suite · Entorno Avanzado de Práctica QA

Laboratorio avanzado para el entrenamiento y evaluación de frameworks de automatización web (**Playwright**, **Cypress**, **Selenium**, **Puppeteer**). Diseñado específicamente para romper scripts frágiles mediante latencias de red simuladas, estados transitorios, validaciones cruzadas complejas y flujos multi-paso.

---

## 🎨 Paleta de Diseño y Estilo
Construido con **Tailwind CSS v3** con una escala completa generada a partir de la paleta terrosa:
- `#DAD7CD` (Timberwolf / Fondo claro)
- `#A3B18A` (Sage / Bordes y detalles sutiles)
- `#588157` (Fern / Verde primario de acción)
- `#3A5A40` (Hunter / Acentos y botones principales)
- `#344E41` (Brunswick / Textos y fondos oscuros contrastados)

Cumple con estándares de contraste accesible **WCAG AA/AAA** tanto en textos regulares como en componentes de formulario y badges.

---

## 🚀 Arquitectura y Tecnologías
- **Core:** React 19 + Vite 8
- **Enrutamiento:** React Router DOM (HashRouter para compatibilidad nativa con GitHub Pages)
- **Iconografía:** Lucide React
- **Estilos:** Tailwind CSS v3 + CSS Grid/Flexbox moderno
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) listo para despliegue automatizado a GitHub Pages.

---

## 🛠️ Asistencia de Localizadores QA
1. **Íconos de Mira Interactivas (`LocatorHint`):** Cada botón, input, tabla y tarjeta cuenta con un ícono interactivo que revela y copia al portapapeles:
   - `data-testid`
   - Selector CSS
   - Selector XPath
   - Comando Playwright: `page.getByTestId('...')`
   - Comando Cypress: `cy.get('[data-testid="..."]')`
   - Comando Selenium: `By.cssSelector("[data-testid='...']")`
2. **Modo Inspector en Vivo:** Activa el botón de inspector en la barra superior o presiona para resaltar cualquier elemento con `data-testid` al pasar el cursor. Un clic captura y copia el selector automáticamente sin activar la acción del elemento (<kbd>Esc</kbd> para salir).
3. **Convención Estricta de Localizadores:**
   - Formato kebab-case: `[módulo]-[elemento]-[tipo]`
   - Mensajes de error vinculados: `[testId]-error`
   - Modales: `[modal-id]`, `[modal-id]-backdrop`, `[modal-id]-close-btn`

---

## 🌐 Control y Simulación de Red (2 a 4 segundos)
Por defecto, todas las operaciones simulan una latencia de red realista de **2 a 4 segundos**. Puedes modificar la velocidad o inyectar fallos de servicio 503 desde:
1. **El menú desplegable en la barra superior.**
2. **Parámetros en la URL (Deep Linking):**
   ```text
   http://localhost:5173/?network=instant&failRate=0#/tables
   ```
   - `network`: `realistic` (2-4s), `fast` (300-600ms), `instant` (0s).
   - `failRate`: `0`, `0.1` (10%), `0.3` (30%), `0.5` (50%).
3. **Consola o Test Runners:**
   ```javascript
   window.__QA_SUITE__.setNetwork({ mode: 'instant', failureRate: 0 });
   ```

---

## 📦 Módulos Desarrollados

### 1. 🔐 Autenticación y Manejo de Estados (`#/auth`)
- **Bloqueo de Cuenta:** Bloqueo temporal de 30 segundos tras 3 intentos fallidos (persistido en `localStorage`).
- **Protección contra enumeración:** Los nombres de usuario inexistentes también acumulan intentos.
- **MFA / 2FA:** Código OTP de 6 dígitos (`246810`), soporte para pegado de 6 dígitos automático, expiración a los 60s y cooldown de reenvío.
- **Contraseña Caducada:** Detección de contraseña expirada obligando a definir una nueva con 6 reglas de seguridad en vivo.
- **Sesión Activa:** Token simulado, temporizador de inactividad de 120s con modal de advertencia a los 20s y logout automático.
- **Errores de Red Transitorios:** Usuario `unstable_user` con fallos 503 intercalados que no deben penalizar el contador de intentos.

### 2. 🛒 E-commerce y Carrito Dinámico (`#/ecommerce`)
- **Catálogo:** Búsqueda con debounce, filtros por categoría, ordenamiento y filtro de stock disponible.
- **Límites de Stock:** Validación en tiempo real; productos agotados deshabilitados y límite máximo por pedido (`maxPerOrder`).
- **Cálculo en Centavos:** Operaciones matemáticas con enteros para evitar imprecisiones de punto flotante en subtotales, cupones e impuestos (8%).
- **Cupones de Descuento:**
  - `DESCUENTO10`: 10% de descuento.
  - `SUPER50`: 50% con tope de $30 (mínimo de compra $100).
  - `ENVIOFREE`: Envío gratis (mínimo de compra $50).
  - `EXPIRADO`: Cupón inválido para probar errores de negocio.
- **Checkout Multi-Paso:**
  - Paso 1: Dirección y contacto (validación estricta de códigos postales y teléfonos según país: MX, US, ES, CO).
  - Paso 2: Selección de paquetería (Estándar, Express, Overnight).
  - Paso 3: Tarjeta con algoritmo de Luhn, formato de espaciado dinámico, detección de Visa/Mastercard/Amex y selector de tarjetas de prueba (aprobadas, fondos insuficientes, error 504).
  - Paso 4: Revisión de pedido con confirmación y checkbox de términos.

### 3. 🎛️ Controles UI y Validaciones Cruzadas (`#/controls`)
- **Cascada Asíncrona:** País → Estado → Ciudad con spinners de carga en cada nivel.
- **Date Pickers Avanzados:**
  - Calendario con fines de semana inhabilitados, fechas pasadas bloqueadas y feriados oficiales restringidos.
  - Rango de fechas con validación de duración máxima (30 días) y detección de conflictos con períodos de mantenimiento/cierre fiscal.
- **Árbol de Permisos:** Checkboxes jerárquicos con soporte nativo de estado indeterminado (`indeterminate = true`).
- **Validaciones Cruzadas:**
  - Menor de edad (< 18 años) requiere obligatoriamente nombre y teléfono del tutor legal.
  - Contratista externo exige especificar empresa proveedora y duración en meses.
  - Salario mínimo no puede exceder el salario máximo.
  - Si se activan notificaciones por SMS, el número de teléfono móvil se vuelve obligatorio.
  - Candado de términos: requiere abrir y leer el modal antes de poder marcar la casilla.
  - Carga de archivos con validación de tamaño (<2MB) y tipo MIME (.pdf, .png, .jpg).

### 4. ⏳ Elementos Asíncronos y Dinámicos (`#/async`)
- **Pila de Modales Superpuestos:** 3 niveles en cascada donde <kbd>Esc</kbd> y clic en backdrop cierran exclusivamente el modal superior de la pila.
- **Tooltips:** Inmediato (100ms), retardado (900ms), asíncrono con fetch simulado de servidor y auto-destructible (3s).
- **Toasts Efímeros:** Pila de máximo 5 notificaciones, pausa de temporizador al hacer hover y botón interactivo "Deshacer".
- **Ciclos de Vida:** Elementos con retardo de 3.2s, auto-destrucción a los 4s, badges con mutación periódica y barra de progreso con polling.
- **Shadow DOM e iFrames:** Árboles DOM encapsulados para pruebas de penetración de selectores.

### 5. 📊 Data Tables Complejas (`#/tables`)
- **Paginación de Servidor:** Tamaño de página dinámico (5, 10, 25, 50), salto directo de página y latencia simulada.
- **Filtros Múltiples:** Búsqueda textual, filtro de estado, método de pago y rango de montos.
- **Ordenamiento:** Cabeceras con estado ascendente / descendente y `aria-sort`.
- **Selección Persistente:** Selección de filas que se mantiene al cambiar de página y checkbox maestro con estado indeterminado.
- **Acciones Masivas:** Exportar selección a CSV, marcar como completados y eliminación con modal de confirmación.
- **Deep Linking:** Sincronización automática de filtros y orden en la URL.

---

## 🏃‍♂️ Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd automation_suite

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Compilar para producción (validación de build)
npm run build
```

---

## 🤖 Snippets de Prueba Listos para Usar

### Playwright
```typescript
import { test, expect } from '@playwright/test';

test('Flujo de Login y Sesión', async ({ page }) => {
  // Configuración de red instantánea para velocidad de ejecución
  await page.goto('/?network=instant#/auth');

  await page.getByTestId('login-username-input').fill('standard_user');
  await page.getByTestId('login-password-input').fill('Secret@123');
  await page.getByTestId('login-submit-btn').click();

  await expect(page.getByTestId('auth-session-panel')).toBeVisible();
  await expect(page.getByTestId('auth-welcome-name')).toContainText('Ana Torres');
});
```

### Cypress
```javascript
describe('E-commerce Suite', () => {
  it('Agrega producto y valida totales', () => {
    cy.visit('/?network=instant#/ecommerce');
    cy.get('[data-testid="add-to-cart-btn-P-1001"]').click();
    cy.get('[data-testid="topbar-cart-count"]').should('have.text', '1');
    
    cy.visit('/#/ecommerce/cart');
    cy.get('[data-testid="summary-subtotal"]').should('be.visible');
  });
});
```
