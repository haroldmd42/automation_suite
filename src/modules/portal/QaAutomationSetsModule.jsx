import { useState, useMemo, useRef } from 'react';
import {
  FlaskConical,
  FolderOpen,
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode2,
  FileCheck,
  AlertTriangle,
  ArrowLeft,
  Download,
  Search,
  Trash2,
  Sparkles,
  Terminal,
  Check,
  Eye,
  BarChart3,
  Cpu,
  Code2,
  ChevronRight,
  ChevronDown,
  FileText,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Globe,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Spinner } from '../../components/ui/Primitives';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import Modal from '../../components/ui/Modal';
import { cn } from '../../utils/format';

export const AUTOMATION_FRAMEWORKS = [
  {
    value: 'playwright',
    label: 'Playwright',
    badge: 'Playwright',
    projectTag: 'chromium',
    color: 'badge-green',
    runnerCmd: 'npx playwright test',
    engineLabel: 'Playwright Test Runner · Chromium Headless Real',
    extensions: ['.spec.ts', '.spec.js', '.test.ts', '.test.js'],
  },
  {
    value: 'cypress',
    label: 'Cypress',
    badge: 'Cypress',
    projectTag: 'electron',
    color: 'badge-blue',
    runnerCmd: 'npx cypress run --headless',
    engineLabel: 'Cypress Runner · Electron Headless Real',
    extensions: ['.cy.ts', '.cy.js', '.spec.ts', '.spec.js'],
  },
  {
    value: 'selenium',
    label: 'Selenium WebDriver',
    badge: 'Selenium',
    projectTag: 'chromedriver',
    color: 'badge-yellow',
    runnerCmd: 'pytest / mvn test',
    engineLabel: 'Selenium WebDriver · ChromeDriver Headless Real',
    extensions: ['.java', '.py', '.cs', '.spec.js', '.test.js'],
  },
];

const IGNORED_PATH_SEGMENTS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  'playwright-report',
  'test-results',
];

const VALID_TEST_EXTENSIONS = [
  '.spec.ts',
  '.spec.js',
  '.spec.tsx',
  '.spec.jsx',
  '.test.ts',
  '.test.js',
  '.test.tsx',
  '.test.jsx',
  '.cy.ts',
  '.cy.js',
  '.cy.tsx',
  '.cy.jsx',
  '.feature',
  '.java',
  '.py',
  '.cs',
];

const WORKSPACE_SYNC_EXTENSIONS = [
  ...VALID_TEST_EXTENSIONS,
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
];

/**
 * Extrae el bloque de código balanceando llaves { ... } a partir de una posición inicial
 */
function extractBracedBlock(text, startIndex, openLine) {
  const firstBrace = text.indexOf('{', startIndex);
  if (firstBrace === -1) {
    const snippet = text.slice(startIndex, startIndex + 500);
    return { code: snippet.trim(), endOffset: startIndex + snippet.length, startLine: openLine };
  }
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          code: text.slice(startIndex, i + 1).trim(),
          endOffset: i + 1,
          startLine: openLine,
        };
      }
    }
  }
  return {
    code: text.slice(startIndex, Math.min(text.length, startIndex + 800)).trim(),
    endOffset: text.length,
    startLine: openLine,
  };
}

/**
 * Convierte una línea de código en un título de paso estilo Playwright HTML Report
 */
function formatPlaywrightStepTitle(line) {
  const gotoMatch = line.match(/(?:goto|visit|get)\s*\(\s*(['"`][^'"`]+['"`])/i);
  if (gotoMatch) return `page.goto(${gotoMatch[1].replace(/['"`]/g, '')})`;

  const getByActionMatch = line.match(
    /(getByTestId|getByRole|getByLabel|getByText|getByPlaceholder|locator)\s*\((.+?)\)\s*\.\s*(click|fill|type|check|uncheck|selectOption|hover|press|pressSequentially)\s*\(([^)]*)\)/i
  );
  if (getByActionMatch) {
    const queryFn = getByActionMatch[1];
    const queryArg = getByActionMatch[2]?.trim();
    const act = getByActionMatch[3];
    const arg = getByActionMatch[4]?.trim();
    return `locator.${act}(${queryFn}(${queryArg})${arg ? `, ${arg}` : ''})`;
  }

  const waitMatch = line.match(/waitForTimeout\s*\(\s*(\d+)\s*\)/i);
  if (waitMatch) return `page.waitForTimeout(${waitMatch[1]}ms)`;

  const expectMatch = line.match(
    /expect\s*\((.+)\)\s*\.\s*(toBeVisible|toHaveTitle|toHaveText|toContainText|toHaveURL|toBe|toEqual)\s*\(([^)]*)\)/i
  );
  if (expectMatch) {
    return `expect.${expectMatch[2]}(${expectMatch[3] || ''})`;
  }

  return line.length > 95 ? `${line.slice(0, 92)}...` : line;
}

/**
 * Convierte el código fuente de un test en una lista inicial de pasos antes de su ejecución real
 */
function parseExecutableStepsFromCode(codeBlock, startLine = 1) {
  const lines = (codeBlock || '').split(/\r?\n/);
  const steps = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const lineNum = startLine + idx;
    if (
      !line ||
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('/*') ||
      line.startsWith('*') ||
      line === '{' ||
      line === '}' ||
      line === '});' ||
      line === '})'
    ) {
      return;
    }

    const isNav = /\b(goto|visit|navigate|open)\s*\(/i.test(line);
    const isAction =
      /\b(click|fill|type|press|pressSequentially|selectOption|check|uncheck|findElement|sendKeys|hover|waitForTimeout)\s*\(/i.test(
        line
      );
    const isAssertion = /\b(expect|should|assert|toHave|toBe|toContain)\b/i.test(line);

    if (isNav || isAction || isAssertion) {
      steps.push({
        id: `step-${lineNum}-${steps.length + 1}`,
        lineNumber: lineNum,
        category: isNav ? 'pw:api' : isAssertion ? 'expect' : 'pw:api',
        pwTitle: formatPlaywrightStepTitle(line),
        command: line.length > 140 ? `${line.slice(0, 137)}...` : line,
      });
    }
  });

  return steps;
}

/**
 * Construye las líneas numeradas del Code Frame estilo Playwright Report
 */
function buildCodeFrameLines(sourceCode, startLine = 1, failedLineNumber = null) {
  const rawLines = (sourceCode || '').split(/\r?\n/);
  return rawLines.map((text, idx) => {
    const lineNum = startLine + idx;
    return {
      lineNumber: lineNum,
      text,
      isFailedLine: failedLineNumber !== null && lineNum === failedLineNumber,
    };
  });
}

/**
 * Analiza el contenido real de un archivo de prueba y extrae cada test con su código fuente
 */
function extractTestsFromContent(content, relativePath, fileName) {
  const found = [];
  if (!content || typeof content !== 'string') return found;

  const getLineNumber = (index) => content.slice(0, index).split(/\r?\n/).length;

  // 1. Playwright / Cypress / Jest / Mocha: test('...', ...) o it('...', ...)
  const jsTestRegex = /\b(?:test|it)(?:\.only|\.skip)?\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let match;
  while ((match = jsTestRegex.exec(content)) !== null) {
    const title = match[2]?.trim();
    const startLine = getLineNumber(match.index);
    const block = extractBracedBlock(content, match.index, startLine);
    if (title) {
      found.push({
        name: title,
        filePath: relativePath,
        fileName,
        startLine,
        sourceCode: block.code,
        parsedSteps: parseExecutableStepsFromCode(block.code, startLine),
      });
    }
  }

  // 2. Gherkin / Cucumber: Scenario: / Escenario:
  const gherkinRegex = /^\s*(?:Scenario|Scenario Outline|Escenario|Esquema del escenario)\s*:\s*(.+)$/gim;
  while ((match = gherkinRegex.exec(content)) !== null) {
    const title = match[1]?.trim();
    const startLine = getLineNumber(match.index);
    const nextChunk = content.slice(match.index, match.index + 700).split(/\n\s*(?:Scenario|Escenario)/i)[0];
    if (title) {
      found.push({
        name: title,
        filePath: relativePath,
        fileName,
        startLine,
        sourceCode: nextChunk.trim(),
        parsedSteps: parseExecutableStepsFromCode(nextChunk, startLine),
      });
    }
  }

  // 3. Python Pytest / Unittest: def test_xxx(
  const pyRegex = /^\s*def\s+(test_[a-zA-Z0-9_]+)\s*\(/gm;
  while ((match = pyRegex.exec(content)) !== null) {
    const fnName = match[1]?.trim();
    const startLine = getLineNumber(match.index);
    const nextChunk = content.slice(match.index, match.index + 700).split(/\ndef\s+/)[0];
    if (fnName) {
      found.push({
        name: fnName,
        filePath: relativePath,
        fileName,
        startLine,
        sourceCode: nextChunk.trim(),
        parsedSteps: parseExecutableStepsFromCode(nextChunk, startLine),
      });
    }
  }

  // 4. Java JUnit / TestNG (@Test) o C# NUnit/xUnit ([Test] / [Fact])
  const javaCsRegex = /(?:@Test|\[Test\]|\[Fact\])[\s\S]{0,160}?(?:public|void)\s+(?:void\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  while ((match = javaCsRegex.exec(content)) !== null) {
    const methodName = match[1]?.trim();
    const startLine = getLineNumber(match.index);
    const block = extractBracedBlock(content, match.index, startLine);
    if (methodName) {
      found.push({
        name: methodName,
        filePath: relativePath,
        fileName,
        startLine,
        sourceCode: block.code,
        parsedSteps: parseExecutableStepsFromCode(block.code, startLine),
      });
    }
  }

  return found;
}

/**
 * Construye archivos .spec.ts ejecutables a partir de los tests del set si no se subieron archivos completos
 */
function buildRunnableWorkspaceFilesFromSet(setObj) {
  if (Array.isArray(setObj.workspaceFiles) && setObj.workspaceFiles.length > 0) {
    return setObj.workspaceFiles;
  }

  const byFile = {};
  for (const t of setObj.tests || []) {
    const fp = t.filePath || 'tests/suite.spec.ts';
    if (!byFile[fp]) byFile[fp] = [];
    byFile[fp].push(t.sourceCode || `test('${t.name}', async ({ page }) => { await page.goto('/'); });`);
  }

  return Object.entries(byFile).map(([relativePath, blocks]) => {
    const joined = blocks.join('\n\n');
    const hasImport = joined.includes('@playwright/test');
    const content = hasImport
      ? joined
      : `import { test, expect } from '@playwright/test';\n\n${joined}\n`;
    return { relativePath, content };
  });
}

const INITIAL_SETS = [
  {
    id: 'set-real-e2e-1',
    name: 'Suite Real E2E · Validación de Módulos QA Suite',
    framework: 'playwright',
    expectedCases: 4,
    folderName: 'aut_suite',
    localFolderPath: '',
    targetUrl: 'http://localhost:5173',
    createdAt: '2026-11-03T14:00:00Z',
    createdBy: 'analista.qa@empresa.com',
    reportUrl: null,
    pipelineStages: [],
    tests: [
      {
        id: 't-real-1',
        name: 'Debe cargar el Dashboard principal y verificar elementos clave',
        filePath: 'aut_suite/tests/dashboard.spec.ts',
        fileName: 'dashboard.spec.ts',
        startLine: 3,
        sourceCode: `test('Debe cargar el Dashboard principal y verificar elementos clave', async ({ page }) => {\n  await page.goto('/#/');\n  await expect(page.locator('[data-testid="brand-link"]')).toBeVisible();\n  await expect(page.locator('[data-testid="main-content"]')).toBeVisible();\n});`,
        parsedSteps: [
          { id: 's-1', lineNumber: 4, category: 'pw:api', pwTitle: "page.goto('/#/')", command: "await page.goto('/#/');" },
          { id: 's-2', lineNumber: 5, category: 'expect', pwTitle: "expect.toBeVisible([data-testid=\"brand-link\"])", command: "await expect(page.locator('[data-testid=\"brand-link\"]')).toBeVisible();" },
          { id: 's-3', lineNumber: 6, category: 'expect', pwTitle: "expect.toBeVisible([data-testid=\"main-content\"])", command: "await expect(page.locator('[data-testid=\"main-content\"]')).toBeVisible();" },
        ],
        status: 'pending',
        durationMs: null,
        lastRunAt: null,
        errorLog: null,
        executionReport: null,
      },
      {
        id: 't-real-2',
        name: 'Debe abrir el modal de creación de usuario y validar límite de caracteres',
        filePath: 'aut_suite/tests/users-validation.spec.ts',
        fileName: 'users-validation.spec.ts',
        startLine: 3,
        sourceCode: `test('Debe abrir el modal de creación de usuario y validar límite de caracteres', async ({ page }) => {\n  await page.goto('/#/users');\n  await page.locator('[data-testid="create-first-user-btn"]').click();\n  await page.locator('[data-testid="user-fullname-input"]').fill('Nombre Extremadamente Largo Que Supera El Limite De Cuarenta Y Cinco Caracteres Permitidos');\n  await page.locator('[data-testid="submit-create-user-btn"]').click();\n  await expect(page.locator('[data-testid="user-fullname-input-error"]')).toBeVisible();\n});`,
        parsedSteps: [
          { id: 's-11', lineNumber: 4, category: 'pw:api', pwTitle: "page.goto('/#/users')", command: "await page.goto('/#/users');" },
          { id: 's-12', lineNumber: 5, category: 'pw:api', pwTitle: "locator.click([data-testid=\"create-first-user-btn\"])", command: "await page.locator('[data-testid=\"create-first-user-btn\"]').click();" },
          { id: 's-13', lineNumber: 6, category: 'pw:api', pwTitle: "locator.fill([data-testid=\"user-fullname-input\"])", command: "await page.locator('[data-testid=\"user-fullname-input\"]').fill('Nombre Extremadamente Largo...');" },
          { id: 's-14', lineNumber: 7, category: 'pw:api', pwTitle: "locator.click([data-testid=\"submit-create-user-btn\"])", command: "await page.locator('[data-testid=\"submit-create-user-btn\"]').click();" },
          { id: 's-15', lineNumber: 8, category: 'expect', pwTitle: "expect.toBeVisible([data-testid=\"user-fullname-input-error\"])", command: "await expect(page.locator('[data-testid=\"user-fullname-input-error\"]')).toBeVisible();" },
        ],
        status: 'pending',
        durationMs: null,
        lastRunAt: null,
        errorLog: null,
        executionReport: null,
      },
      {
        id: 't-real-3',
        name: 'Debe navegar al catálogo E-commerce y verificar productos',
        filePath: 'aut_suite/tests/ecommerce.spec.ts',
        fileName: 'ecommerce.spec.ts',
        startLine: 3,
        sourceCode: `test('Debe navegar al catálogo E-commerce y verificar productos', async ({ page }) => {\n  await page.goto('/#/ecommerce');\n  await expect(page.locator('[data-testid="topbar-cart-link"]')).toBeVisible();\n});`,
        parsedSteps: [
          { id: 's-21', lineNumber: 4, category: 'pw:api', pwTitle: "page.goto('/#/ecommerce')", command: "await page.goto('/#/ecommerce');" },
          { id: 's-22', lineNumber: 5, category: 'expect', pwTitle: "expect.toBeVisible([data-testid=\"topbar-cart-link\"])", command: "await expect(page.locator('[data-testid=\"topbar-cart-link\"]')).toBeVisible();" },
        ],
        status: 'pending',
        durationMs: null,
        lastRunAt: null,
        errorLog: null,
        executionReport: null,
      },
      {
        id: 't-real-4',
        name: 'Debe fallar en navegador real cuando busca un elemento inexistente en Login',
        filePath: 'aut_suite/tests/login-failure.spec.ts',
        fileName: 'login-failure.spec.ts',
        startLine: 3,
        sourceCode: `test('Debe fallar en navegador real cuando busca un elemento inexistente en Login', async ({ page }) => {\n  await page.goto('/#/login');\n  await expect(page.locator('[data-testid="boton-biometrico-inexistente"]')).toBeVisible({ timeout: 2500 });\n});`,
        parsedSteps: [
          { id: 's-31', lineNumber: 4, category: 'pw:api', pwTitle: "page.goto('/#/login')", command: "await page.goto('/#/login');" },
          { id: 's-32', lineNumber: 5, category: 'expect', pwTitle: "expect.toBeVisible([data-testid=\"boton-biometrico-inexistente\"])", command: "await expect(page.locator('[data-testid=\"boton-biometrico-inexistente\"]')).toBeVisible({ timeout: 2500 });" },
        ],
        status: 'pending',
        durationMs: null,
        lastRunAt: null,
        errorLog: null,
        executionReport: null,
      },
    ],
  },
];

export default function QaAutomationSetsModule() {
  const { user, profile, logAudit } = useSupabaseAuth();
  const toast = useToast();
  const folderInputRef = useRef(null);

  const [sets, setSets] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_qa_automation_sets_v4');
      return saved ? JSON.parse(saved) : INITIAL_SETS;
    } catch {
      return INITIAL_SETS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('all');

  // Vista activa: null (listado de cards) o ID del set seleccionado ("Ver Detalle")
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [detailFilter, setDetailFilter] = useState('all');
  const [runningTestIds, setRunningTestIds] = useState({});
  const [runningAll, setRunningAll] = useState(false);
  const [activePipelineStage, setActivePipelineStage] = useState('');

  // Modal de Reporte Individual e Iframe del Reporte Oficial de Playwright
  const [inspectedTest, setInspectedTest] = useState(null);
  const [expandedStepIds, setExpandedStepIds] = useState({});
  const [beforeHooksOpen, setBeforeHooksOpen] = useState(false);
  const [afterHooksOpen, setAfterHooksOpen] = useState(true);
  const [fullscreenScreenshot, setFullscreenScreenshot] = useState(null);
  const [officialPlaywrightModalUrl, setOfficialPlaywrightModalUrl] = useState(null);
  const [showEvidenceSection, setShowEvidenceSection] = useState(false);
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState({});

  // Consola CI/CD en vivo del Set
  const [ciLogs, setCiLogs] = useState([]);

  // Modal de creación de nuevo Set
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    expectedCases: '',
    framework: 'playwright',
    targetUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    localFolderPath: '',
    folderName: '',
    detectedTests: [],
    workspaceFiles: [],
    scannedFilesCount: 0,
  });

  const saveSets = (updated) => {
    setSets(updated);
    try {
      // Guardar en localStorage omitiendo archivos pesados si superan cuota
      const lightCopy = updated.map((s) => ({
        ...s,
        workspaceFiles: (s.workspaceFiles || []).slice(0, 60),
      }));
      localStorage.setItem('portal_qa_automation_sets_v4', JSON.stringify(lightCopy));
    } catch (err) {
      console.warn('Error guardando sets en localStorage:', err);
    }
  };

  const appendCiLog = (line) => {
    const ts = new Date().toISOString().slice(11, 23);
    setCiLogs((prev) => [...prev.slice(-160), `[${ts}] ${line}`]);
  };

  const selectedSet = useMemo(
    () => sets.find((s) => s.id === selectedSetId) || null,
    [sets, selectedSetId]
  );

  // Estadísticas globales de todos los sets
  const globalStats = useMemo(() => {
    const totalSets = sets.length;
    const totalTests = sets.reduce((acc, s) => acc + s.tests.length, 0);
    const passedTests = sets.reduce(
      (acc, s) => acc + s.tests.filter((t) => t.status === 'passed').length,
      0
    );
    const failedTests = sets.reduce(
      (acc, s) => acc + s.tests.filter((t) => t.status === 'failed').length,
      0
    );
    return { totalSets, totalTests, passedTests, failedTests };
  }, [sets]);

  // Procesar archivos reales de la carpeta cargada por el usuario y prepararlos para sincronizar al backend
  const handleFolderUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    setScanningFolder(true);
    try {
      const firstPath = fileList[0].webkitRelativePath || fileList[0].name;
      const rootFolder = firstPath.includes('/') ? firstPath.split('/')[0] : 'carpeta-pruebas';

      // Filtrar todos los archivos del proyecto (ignorando node_modules, .git, playwright-report, etc.)
      const projectFiles = fileList.filter((file) => {
        const rel = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
        const parts = rel.split('/');
        if (parts.some((p) => IGNORED_PATH_SEGMENTS.includes(p))) return false;
        const lower = file.name.toLowerCase();
        return WORKSPACE_SYNC_EXTENSIONS.some((ext) => lower.endsWith(ext));
      });

      const workspaceFiles = [];
      const detected = [];

      for (const file of projectFiles) {
        const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
        const lowerName = file.name.toLowerCase();

        let rawText = '';
        try {
          if (file.size <= 1024 * 512) {
            rawText = await file.text();
            workspaceFiles.push({
              relativePath,
              content: rawText,
            });
          }
        } catch {
          continue;
        }

        const isTestFile =
          VALID_TEST_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) &&
          !lowerName.endsWith('config.ts') &&
          !lowerName.endsWith('config.js');

        if (isTestFile) {
          const extracted = extractTestsFromContent(rawText, relativePath, file.name);
          if (extracted.length > 0) {
            detected.push(...extracted);
          }
        }
      }

      const uniqueTests = detected.map((t, idx) => ({
        id: `det-${Date.now()}-${idx + 1}`,
        name: t.name,
        filePath: t.filePath,
        fileName: t.fileName,
        startLine: t.startLine || 1,
        sourceCode: t.sourceCode || '',
        parsedSteps: t.parsedSteps || [],
        status: 'pending',
        durationMs: null,
        lastRunAt: null,
        errorLog: null,
        executionReport: null,
      }));

      setFormData((prev) => ({
        ...prev,
        folderName: rootFolder,
        detectedTests: uniqueTests,
        workspaceFiles,
        scannedFilesCount: projectFiles.length,
        expectedCases: prev.expectedCases || String(uniqueTests.length),
      }));

      toast.success('Carpeta cargada exitosamente.');
    } catch (err) {
      console.error('Error escaneando carpeta:', err);
      toast.error('Error al cargar la carpeta.');
    } finally {
      setScanningFolder(false);
    }
  };

  // Cargar carpeta de ejemplo con archivos .spec.ts reales ejecutables en Chromium
  const handleLoadSampleFolder = () => {
    const fw = formData.framework || 'playwright';
    const sampleFolder = `aut_suite`;

    const sampleSpecFiles = [
      {
        relativePath: `${sampleFolder}/tests/dashboard.spec.ts`,
        fileName: 'dashboard.spec.ts',
        name: 'Debe cargar el Dashboard principal y verificar elementos clave',
        startLine: 3,
        content: `import { test, expect } from '@playwright/test';\n\ntest('Debe cargar el Dashboard principal y verificar elementos clave', async ({ page }) => {\n  await page.goto('/#/');\n  await expect(page.locator('[data-testid="brand-link"]')).toBeVisible();\n  await expect(page.locator('[data-testid="main-content"]')).toBeVisible();\n});\n`,
      },
      {
        relativePath: `${sampleFolder}/tests/users-validation.spec.ts`,
        fileName: 'users-validation.spec.ts',
        name: 'Debe abrir el modal de creación de usuario y validar límite de caracteres',
        startLine: 3,
        content: `import { test, expect } from '@playwright/test';\n\ntest('Debe abrir el modal de creación de usuario y validar límite de caracteres', async ({ page }) => {\n  await page.goto('/#/users');\n  await page.locator('[data-testid="create-first-user-btn"]').click();\n  await page.locator('[data-testid="user-fullname-input"]').fill('Nombre Extremadamente Largo Que Supera El Limite De Cuarenta Y Cinco Caracteres Permitidos');\n  await page.locator('[data-testid="submit-create-user-btn"]').click();\n  await expect(page.locator('[data-testid="user-fullname-input-error"]')).toBeVisible();\n});\n`,
      },
      {
        relativePath: `${sampleFolder}/tests/ecommerce.spec.ts`,
        fileName: 'ecommerce.spec.ts',
        name: 'Debe navegar al catálogo E-commerce y verificar productos',
        startLine: 3,
        content: `import { test, expect } from '@playwright/test';\n\ntest('Debe navegar al catálogo E-commerce y verificar productos', async ({ page }) => {\n  await page.goto('/#/ecommerce');\n  await expect(page.locator('[data-testid="topbar-cart-link"]')).toBeVisible();\n});\n`,
      },
      {
        relativePath: `${sampleFolder}/tests/login-failure.spec.ts`,
        fileName: 'login-failure.spec.ts',
        name: 'Debe fallar en navegador real cuando busca un elemento inexistente en Login',
        startLine: 3,
        content: `import { test, expect } from '@playwright/test';\n\ntest('Debe fallar en navegador real cuando busca un elemento inexistente en Login', async ({ page }) => {\n  await page.goto('/#/login');\n  await expect(page.locator('[data-testid="boton-biometrico-inexistente"]')).toBeVisible({ timeout: 2500 });\n});\n`,
      },
    ];

    const detectedTests = sampleSpecFiles.map((f, idx) => ({
      id: `sample-${Date.now()}-${idx + 1}`,
      name: f.name,
      filePath: f.relativePath,
      fileName: f.fileName,
      startLine: f.startLine,
      sourceCode: f.content.trim(),
      parsedSteps: parseExecutableStepsFromCode(f.content, 1),
      status: 'pending',
      durationMs: null,
      lastRunAt: null,
      errorLog: null,
      executionReport: null,
    }));

    setFormData((prev) => ({
      ...prev,
      folderName: sampleFolder,
      detectedTests,
      workspaceFiles: sampleSpecFiles.map((f) => ({
        relativePath: f.relativePath,
        content: f.content,
      })),
      scannedFilesCount: sampleSpecFiles.length,
      expectedCases: prev.expectedCases || String(detectedTests.length),
    }));

    toast.info('Suite de ejemplo cargada exitosamente.');
  };

  // Crear nuevo Set de Pruebas y sincronizar el workspace físico en el servidor
  const handleCreateSet = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Ingresa el nombre del set.');
      return;
    }
    const expectedNum = Number(formData.expectedCases);
    if (!expectedNum || expectedNum < 1) {
      toast.error('Ingresa una cantidad válida de casos.');
      return;
    }
    if (formData.detectedTests.length === 0) {
      toast.error('Carga una carpeta con pruebas válidas.');
      return;
    }

    const setId = `set-${Date.now()}`;
    const newSet = {
      id: setId,
      name: formData.name.trim(),
      framework: formData.framework,
      expectedCases: expectedNum,
      targetUrl: formData.targetUrl.trim() || 'http://localhost:5173',
      localFolderPath: formData.localFolderPath.trim(),
      folderName: formData.folderName || 'carpeta-pruebas',
      createdAt: new Date().toISOString(),
      createdBy: user?.email || profile?.email || 'analista.qa@empresa.com',
      workspaceFiles: formData.workspaceFiles,
      reportUrl: null,
      pipelineStages: [],
      tests: formData.detectedTests,
    };

    // Sincronizar archivos en el servidor de inmediato
    try {
      await fetch('/api/ci-runner/sync-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: newSet.id,
          folderName: newSet.folderName,
          localFolderPath: newSet.localFolderPath,
          files: buildRunnableWorkspaceFilesFromSet(newSet),
        }),
      });
    } catch (syncErr) {
      console.warn('Aviso sincronizando workspace inicial:', syncErr);
    }

    const updated = [newSet, ...sets];
    saveSets(updated);

    if (logAudit) {
      await logAudit('create_automation_set', 'qa_automation_sets', {
        set_name: newSet.name,
        framework: newSet.framework,
        expected_cases: newSet.expectedCases,
        detected_tests: newSet.tests.length,
        folder: newSet.folderName,
      });
    }

    toast.success('Set creado exitosamente.');

    setCreateModalOpen(false);
    setFormData({
      name: '',
      expectedCases: '',
      framework: 'playwright',
      targetUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      localFolderPath: '',
      folderName: '',
      detectedTests: [],
      workspaceFiles: [],
      scannedFilesCount: 0,
    });
  };

  // Eliminar un Set
  const handleDeleteSet = (setId, setName) => {
    const updated = sets.filter((s) => s.id !== setId);
    saveSets(updated);
    if (selectedSetId === setId) {
      setSelectedSetId(null);
    }
    toast.info('Set eliminado exitosamente.');
  };

  /**
   * Actualiza la URL del entorno objetivo de un set existente
   */
  const handleUpdateSetTargetUrl = (setId, newUrl) => {
    const updated = sets.map((s) => (s.id === setId ? { ...s, targetUrl: newUrl } : s));
    saveSets(updated);
  };

  /**
   * EJECUTOR REAL EN BACKEND (DEVOPS CI/CD PIPELINE)
   * Envía los archivos al servidor Node.js, instala/vincula las dependencias del framework,
   * ejecuta el proceso real de Playwright/Cypress/Selenium en navegador headless contra targetUrl,
   * y recolecta el reporte JSON real, las capturas PNG reales tomadas por Chromium y el playwright-report/index.html real.
   */
  const executeRealCiPipeline = async (targetSet, singleTest = null) => {
    if (!targetSet) return;

    const fwMeta =
      AUTOMATION_FRAMEWORKS.find((f) => f.value === targetSet.framework) || AUTOMATION_FRAMEWORKS[0];
    const runId = `RUN-${Date.now().toString(36).toUpperCase()}`;

    if (singleTest) {
      setRunningTestIds((prev) => ({ ...prev, [singleTest.id]: true }));
      setActivePipelineStage(`Ejecutando en navegador real (${fwMeta.projectTag}): "${singleTest.name}"...`);
      appendCiLog(`▶ [CI/CD PIPELINE] Iniciando Job ${runId} para test: "${singleTest.name}"`);
    } else {
      setRunningAll(true);
      const batchRunningMap = {};
      (targetSet.tests || []).forEach((t) => {
        batchRunningMap[t.id] = true;
      });
      setRunningTestIds((prev) => ({ ...prev, ...batchRunningMap }));
      setActivePipelineStage(`Provisionando entorno, instalando dependencias y ejecutando ${targetSet.tests.length} tests reales...`);
      appendCiLog(`🚀 [CI/CD PIPELINE] Iniciando ejecución completa del Set "${targetSet.name}" en ${targetSet.targetUrl || 'http://localhost:5173'}...`);
    }

    try {
      const filesPayload = buildRunnableWorkspaceFilesFromSet(targetSet);

      const response = await fetch('/api/ci-runner/execute-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: targetSet.id,
          folderName: targetSet.folderName,
          localFolderPath: targetSet.localFolderPath || '',
          framework: targetSet.framework,
          targetUrl: targetSet.targetUrl || window.location.origin || 'http://localhost:5173',
          filePath: singleTest ? singleTest.filePath : '',
          testName: singleTest ? singleTest.name : '',
          files: filesPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Error ejecutando el pipeline CI/CD en el servidor.');
      }

      if (data.consoleOutput) {
        data.consoleOutput.split('\n').forEach((line) => {
          if (line.trim()) appendCiLog(line);
        });
      }

      const parsedSpecs = Array.isArray(data.parsedSpecs) ? data.parsedSpecs : [];
      const finishedAt = new Date().toISOString();

      setSets((prevSets) => {
        const updated = prevSets.map((s) => {
          if (s.id !== targetSet.id) return s;

          const nextTests = s.tests.map((t) => {
            if (singleTest && t.id !== singleTest.id) return t;

            // Buscar el resultado correspondiente en los specs reales devueltos por Playwright
            const matchedSpec =
              parsedSpecs.find((sp) => sp.title === t.name) ||
              parsedSpecs.find((sp) => sp.file && t.filePath.endsWith(sp.file)) ||
              (singleTest && parsedSpecs.length === 1 ? parsedSpecs[0] : null);

            if (matchedSpec) {
              const rawCodeSteps = parseExecutableStepsFromCode(t.sourceCode || '', t.startLine || 1);
              let effectiveSteps = Array.isArray(matchedSpec.steps) && matchedSpec.steps.length > 0 ? matchedSpec.steps : [];

              if (effectiveSteps.length === 0 && rawCodeSteps.length > 0) {
                const stepCount = rawCodeSteps.length;
                const avgStepMs = Math.max(15, Math.round((matchedSpec.durationMs || 200) / stepCount));
                let failTriggered = false;

                effectiveSteps = rawCodeSteps.map((st, idx) => {
                  if (matchedSpec.status === 'passed') {
                    return {
                      ...st,
                      stepIndex: idx + 1,
                      status: 'passed',
                      durationMs: avgStepMs,
                      detail: 'Ejecutado en navegador real (Chromium)',
                    };
                  }

                  const isFailingStep =
                    !failTriggered &&
                    ((matchedSpec.failedLineNumber && st.lineNumber === matchedSpec.failedLineNumber) ||
                      (!matchedSpec.failedLineNumber && idx === stepCount - 1));

                  if (isFailingStep) {
                    failTriggered = true;
                    return {
                      ...st,
                      stepIndex: idx + 1,
                      status: 'failed',
                      durationMs: Math.max(avgStepMs, (matchedSpec.durationMs || 1000) - avgStepMs * idx),
                      detail: matchedSpec.errorSummary || 'Fallo en la aserción de Playwright',
                    };
                  }

                  if (failTriggered) {
                    return {
                      ...st,
                      stepIndex: idx + 1,
                      status: 'skipped',
                      durationMs: 0,
                      detail: 'Omitido por fallo en paso previo',
                    };
                  }

                  return {
                    ...st,
                    stepIndex: idx + 1,
                    status: 'passed',
                    durationMs: avgStepMs,
                    detail: 'Ejecutado en navegador real (Chromium)',
                  };
                });
              }

              const executionReport = {
                runId,
                isRealBrowserExecution: true,
                framework: fwMeta.label,
                projectTag: matchedSpec.projectName || fwMeta.projectTag,
                engineLabel: fwMeta.engineLabel,
                runnerCmd: `${fwMeta.runnerCmd} "${t.filePath}"`,
                analyst: user?.email || profile?.full_name || 'Analista de Calidad',
                startedAt: finishedAt,
                finishedAt,
                durationMs: matchedSpec.durationMs,
                beforeHooksDurationMs: 0,
                afterHooksDurationMs: 0,
                status: matchedSpec.status,
                exitCode: matchedSpec.status === 'passed' ? 0 : 1,
                totalSteps: effectiveSteps.length,
                passedStepsCount: effectiveSteps.filter((st) => st.status === 'passed').length,
                failedStepsCount: effectiveSteps.filter((st) => st.status === 'failed').length,
                skippedStepsCount: effectiveSteps.filter((st) => st.status === 'skipped').length,
                failedLineNumber: matchedSpec.failedLineNumber,
                steps: effectiveSteps,
                consoleOutput: data.consoleOutput || matchedSpec.stdout || '',
                errorSummary: matchedSpec.errorSummary,
                screenshotDataUrl: matchedSpec.screenshotDataUrl,
                screenshotFileName: matchedSpec.screenshotFileName,
                officialReportUrl: data.reportUrl,
              };

              return {
                ...t,
                status: matchedSpec.status,
                durationMs: matchedSpec.durationMs,
                lastRunAt: finishedAt,
                errorLog: matchedSpec.errorSummary,
                executionReport,
              };
            }

            // Si el runner falló a nivel de proceso (ej. error de compilación o sintaxis antes de emitir spec)
            if (singleTest || !singleTest) {
              const fallbackStatus = data.exitCode === 0 ? 'passed' : 'failed';
              const executionReport = {
                runId,
                isRealBrowserExecution: true,
                framework: fwMeta.label,
                projectTag: fwMeta.projectTag,
                engineLabel: fwMeta.engineLabel,
                runnerCmd: `${fwMeta.runnerCmd} "${t.filePath}"`,
                analyst: user?.email || profile?.full_name || 'Analista de Calidad',
                startedAt: finishedAt,
                finishedAt,
                durationMs: data.durationMs || 0,
                status: fallbackStatus,
                exitCode: data.exitCode,
                totalSteps: t.parsedSteps?.length || 1,
                passedStepsCount: fallbackStatus === 'passed' ? t.parsedSteps?.length || 1 : 0,
                failedStepsCount: fallbackStatus === 'failed' ? 1 : 0,
                skippedStepsCount: 0,
                failedLineNumber: t.startLine || 1,
                steps: t.parsedSteps || [],
                consoleOutput: data.consoleOutput || '',
                errorSummary: fallbackStatus === 'failed' ? data.consoleOutput : null,
                screenshotDataUrl: null,
                screenshotFileName: null,
                officialReportUrl: data.reportUrl,
              };

              return {
                ...t,
                status: fallbackStatus,
                durationMs: data.durationMs || 0,
                lastRunAt: finishedAt,
                errorLog: fallbackStatus === 'failed' ? 'Ver salida de consola del runner' : null,
                executionReport,
              };
            }

            return t;
          });

          return {
            ...s,
            reportUrl: data.reportUrl || s.reportUrl,
            pipelineStages: data.pipelineStages || [],
            workspaceDir: data.workspaceDir || s.workspaceDir,
            tests: nextTests,
          };
        });

        saveSets(updated);

        // Si el modal de inspección estaba abierto para este test, actualizarlo en vivo
        if (singleTest) {
          const updatedSet = updated.find((s) => s.id === targetSet.id);
          const updatedTest = updatedSet?.tests.find((t) => t.id === singleTest.id);
          if (updatedTest) {
            setInspectedTest((prev) => (prev && prev.id === singleTest.id ? updatedTest : prev));
          }
        }

        return updated;
      });

      toast.success(singleTest ? 'Prueba ejecutada exitosamente.' : 'Suite ejecutada exitosamente.');
    } catch (err) {
      console.error('Error en pipeline CI/CD:', err);
      appendCiLog(`✖ [ERROR PIPELINE] ${err.message}`);
      toast.error('Error al ejecutar las pruebas.');
    } finally {
      setActivePipelineStage('');
      if (singleTest) {
        setRunningTestIds((prev) => ({ ...prev, [singleTest.id]: false }));
      } else {
        setRunningAll(false);
        const batchClearedMap = {};
        (targetSet.tests || []).forEach((t) => {
          batchClearedMap[t.id] = false;
        });
        setRunningTestIds((prev) => ({ ...prev, ...batchClearedMap }));
      }
    }
  };

  // Reiniciar estado de los tests de un set a Pendiente
  const handleResetSetTests = (setId) => {
    const updated = sets.map((s) => {
      if (s.id !== setId) return s;
      return {
        ...s,
        pipelineStages: [],
        tests: s.tests.map((t) => ({
          ...t,
          status: 'pending',
          durationMs: null,
          lastRunAt: null,
          errorLog: null,
          executionReport: null,
        })),
      };
    });
    saveSets(updated);
    setCiLogs([]);
    toast.info('Resultados reiniciados exitosamente.');
  };

  // Descargar la captura PNG real directamente
  const handleDownloadScreenshotPng = (testItem) => {
    const dataUrl = testItem?.executionReport?.screenshotDataUrl;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${testItem.executionReport.runId.toLowerCase()}-${testItem.executionReport.screenshotFileName || 'screenshot.png'}`;
    a.click();
    toast.success('Captura descargada exitosamente.');
  };

  const filteredSets = useMemo(() => {
    return sets.filter((s) => {
      if (frameworkFilter !== 'all' && s.framework !== frameworkFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.folderName.toLowerCase().includes(q) ||
          s.framework.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sets, frameworkFilter, searchQuery]);

  // ============================================================================
  // VISTA DE DETALLE DEL SET Y EJECUCIÓN REAL EN PIPELINE CI/CD
  // ============================================================================
  if (selectedSet) {
    const fwMeta =
      AUTOMATION_FRAMEWORKS.find((f) => f.value === selectedSet.framework) || AUTOMATION_FRAMEWORKS[0];
    const totalTests = selectedSet.tests.length;
    const passedTests = selectedSet.tests.filter((t) => t.status === 'passed');
    const failedTests = selectedSet.tests.filter((t) => t.status === 'failed');
    const pendingTests = selectedSet.tests.filter((t) => t.status === 'pending');
    const executedTests = selectedSet.tests.filter((t) => t.status === 'passed' || t.status === 'failed');
    const executedCount = executedTests.length;
    const passRate = executedCount > 0 ? Math.round((passedTests.length / executedCount) * 100) : 0;
    const totalDurationMs = selectedSet.tests.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    const avgDurationMs = executedCount > 0 ? Math.round(totalDurationMs / executedCount) : 0;

    const sortedByDuration = [...executedTests]
      .filter((t) => typeof t.durationMs === 'number' && t.durationMs >= 0)
      .sort((a, b) => a.durationMs - b.durationMs);
    const fastestTest = sortedByDuration.length > 0 ? sortedByDuration[0] : null;
    const slowestTest = sortedByDuration.length > 0 ? sortedByDuration[sortedByDuration.length - 1] : null;
    const maxTestDurationMs = slowestTest?.durationMs || 1;

    const lastRunTimestamp = selectedSet.tests
      .map((t) => t.lastRunAt)
      .filter(Boolean)
      .sort()
      .pop();

    const totalStepsCount = selectedSet.tests.reduce(
      (acc, t) => acc + (t.executionReport?.totalSteps || t.parsedSteps?.length || 1),
      0
    );
    const passedStepsTotal = selectedSet.tests.reduce(
      (acc, t) =>
        acc +
        (t.executionReport
          ? t.executionReport.passedStepsCount
          : t.status === 'passed'
            ? t.parsedSteps?.length || 1
            : 0),
      0
    );

    const coveragePct = Math.min(
      100,
      Math.round((totalTests / Math.max(1, Number(selectedSet.expectedCases) || 1)) * 100)
    );

    // Agrupar resultados por archivo de especificación (spec file)
    const fileMap = {};
    selectedSet.tests.forEach((t) => {
      const fp = t.filePath || t.fileName || 'suite.spec.ts';
      if (!fileMap[fp]) {
        fileMap[fp] = {
          filePath: fp,
          total: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          durationMs: 0,
        };
      }
      fileMap[fp].total += 1;
      if (t.status === 'passed') fileMap[fp].passed += 1;
      else if (t.status === 'failed') fileMap[fp].failed += 1;
      else fileMap[fp].pending += 1;
      fileMap[fp].durationMs += t.durationMs || 0;
    });
    const specsByFile = Object.values(fileMap);

    // Parámetros del gráfico de anillo SVG (Donut Chart)
    const donutRadius = 46;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const passedArc = totalTests > 0 ? (passedTests.length / totalTests) * donutCircumference : 0;
    const failedArc = totalTests > 0 ? (failedTests.length / totalTests) * donutCircumference : 0;

    const visibleTests = selectedSet.tests.filter((t) => {
      if (detailFilter === 'all') return true;
      return t.status === detailFilter;
    });

    return (
      <div className="space-y-6 animate-slide-up" data-testid="qa-set-detail-view">
        {/* Barra superior de acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedSetId(null)}
            className="btn btn-secondary btn-sm gap-2"
            data-testid="back-to-sets-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a los Sets de Pruebas</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleResetSetTests(selectedSet.id)}
              disabled={runningAll}
              className="btn btn-secondary btn-sm gap-1.5"
              data-testid="reset-set-execution-btn"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reiniciar Resultados</span>
            </button>

            {selectedSet.reportUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setOfficialPlaywrightModalUrl(selectedSet.reportUrl)}
                  className="btn btn-secondary btn-sm gap-1.5 border-emerald-400 text-moss-900"
                  data-testid="open-official-playwright-report-btn"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <span>Ver playwright-report/index.html Oficial</span>
                </button>
                <a
                  href={selectedSet.reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm gap-1.5"
                  title="Abrir reporte oficial de Playwright en pestaña nueva"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => executeRealCiPipeline(selectedSet, null)}
              disabled={runningAll}
              className="btn btn-primary btn-sm gap-1.5 shadow-lift"
              data-testid="run-all-tests-btn"
            >
              {runningAll ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Ejecutando Suite...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Ejecutar Suite ({totalTests} Tests)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cabecera estilo DevOps Pipeline + Configuración de Entorno Objetivo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100 shadow-lift space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300" data-testid="detail-set-framework">
                  {fwMeta.label} · {fwMeta.projectTag}
                </span>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-xs text-slate-300" data-testid="detail-set-folder">
                  <FolderOpen className="h-3.5 w-3.5 mr-1 inline text-emerald-400" />
                  {selectedSet.folderName}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {fwMeta.engineLabel}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-white" data-testid="detail-set-title">
                {selectedSet.name}
              </h1>
              <p className="text-xs text-slate-300">
                Workspace sincronizado en <code>.ci-workspaces/{selectedSet.id}</code> · Runner <code>{fwMeta.runnerCmd}</code> con generación de reporte HTML y capturas de ejecución.
              </p>
            </div>

            {/* Contador de Píldoras estilo Playwright Header */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {[
                { key: 'all', label: 'All', count: totalTests, color: 'text-white border-slate-700' },
                { key: 'passed', label: '✓ Passed', count: passedTests.length, color: 'text-emerald-400 border-emerald-500/40' },
                { key: 'failed', label: '✘ Failed', count: failedTests.length, color: 'text-red-400 border-red-500/40' },
                { key: 'pending', label: '○ Pending', count: pendingTests.length, color: 'text-slate-400 border-slate-700' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setDetailFilter(pill.key)}
                  data-testid={`filter-tests-${pill.key}-btn`}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 font-mono text-xs font-bold transition',
                    pill.color,
                    detailFilter === pill.key ? 'bg-white/15 ring-2 ring-emerald-400/50' : 'bg-slate-800/90 hover:bg-slate-800'
                  )}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          </div>

          {/* Barra de configuración de URL del Entorno Requerido + Etapas del Pipeline DevOps */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-mono text-slate-300 shrink-0">Entorno Destino (BASE_URL):</span>
              <input
                type="url"
                value={selectedSet.targetUrl || 'http://localhost:5173'}
                onChange={(e) => handleUpdateSetTargetUrl(selectedSet.id, e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 font-mono text-xs text-emerald-300 focus:border-emerald-400 focus:outline-none"
                placeholder="http://localhost:5173"
                data-testid="pipeline-target-url-input"
              />
            </div>

            {activePipelineStage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-mono text-emerald-300">
                <Spinner className="h-3.5 w-3.5 text-emerald-400" />
                <span>{activePipelineStage}</span>
              </div>
            )}
          </div>

          {/* Etapas del Pipeline CI/CD si ya se ejecutó */}
          {Array.isArray(selectedSet.pipelineStages) && selectedSet.pipelineStages.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              {selectedSet.pipelineStages.map((stg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-mono',
                    stg.status === 'passed'
                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                      : 'border-red-500/40 bg-red-950/40 text-red-200'
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="truncate">{stg.name}</span>
                    <span>{stg.status === 'passed' ? '✓' : '✘'}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400" title={stg.detail}>
                    {stg.detail} ({stg.durationMs}ms)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LISTADO DE TESTS DISPONIBLES */}
        <div className="card overflow-hidden shadow-soft border border-moss-200" data-testid="set-tests-list-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-moss-200 bg-moss-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-moss-800">
              <FileCode2 className="h-4 w-4 text-moss-600" />
              <span>
                {selectedSet.folderName} · {totalTests} tests detectados ({selectedSet.expectedCases} casos esperados)
              </span>
            </div>
            <span className="text-xs font-mono text-moss-600" data-testid="detail-expected-vs-detected">
              Tiempo real total: {(totalDurationMs / 1000).toFixed(2)}s
            </span>
          </div>

          {visibleTests.length === 0 ? (
            <div className="p-8 text-center text-sm text-moss-600">
              No hay tests en este filtro actualmente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" data-testid="set-tests-table">
                <thead>
                  <tr className="border-b border-moss-200 bg-moss-100/60 text-[11px] font-bold uppercase tracking-wider text-moss-700">
                    <th className="py-3 px-5">Escenario</th>
                    <th className="py-3 px-4 w-44">Estado</th>
                    <th className="py-3 px-4 w-64">Reporte</th>
                    <th className="py-3 px-5 w-48 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moss-200/80">
                  {visibleTests.map((testItem) => {
                    const isRunning = Boolean(runningTestIds[testItem.id]) || runningAll;
                    const stepsCount = testItem.parsedSteps?.length || 1;
                    const rep = testItem.executionReport;

                    return (
                      <tr
                        key={testItem.id}
                        onClick={() => setInspectedTest(testItem)}
                        className={cn(
                          'transition cursor-pointer hover:bg-moss-50/80 align-top',
                          testItem.status === 'failed' && 'bg-red-50/35 hover:bg-red-50/60',
                          testItem.status === 'passed' && 'bg-emerald-50/25 hover:bg-emerald-50/50'
                        )}
                        data-testid={`test-item-row-${testItem.id}`}
                      >
                        {/* COLUMNA 1: ESCENARIO */}
                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className="font-semibold text-sm text-moss-950 hover:underline"
                                data-testid={`test-item-name-${testItem.id}`}
                              >
                                {testItem.name}
                              </span>

                              <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700">
                                {rep?.projectTag || fwMeta.projectTag}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-moss-600 font-mono">
                              <span>
                                {testItem.filePath}:{testItem.startLine || 1}
                              </span>
                              <span>·</span>
                              <span>
                                {rep
                                  ? `${rep.passedStepsCount}/${rep.totalSteps} steps ejecutados`
                                  : `${stepsCount} steps`}
                              </span>
                            </div>

                            {testItem.status === 'failed' && testItem.errorLog && (
                              <div
                                className="mt-2 rounded-xl border border-red-200 bg-red-50/95 p-2.5 font-mono text-xs text-red-800 line-clamp-2 max-w-2xl"
                                data-testid={`test-item-error-${testItem.id}`}
                              >
                                {testItem.errorLog}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* COLUMNA 2: ESTADO (PASÓ / FALLÓ / EJECUTANDO / PENDIENTE) */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col items-start gap-1">
                            {isRunning ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                                <Spinner className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>Ejecutando...</span>
                              </span>
                            ) : testItem.status === 'passed' ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/90 px-2.5 py-1 text-xs font-bold text-emerald-800"
                                data-testid={`test-item-status-${testItem.id}`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>Pasó</span>
                              </span>
                            ) : testItem.status === 'failed' ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100/90 px-2.5 py-1 text-xs font-bold text-red-800"
                                data-testid={`test-item-status-${testItem.id}`}
                              >
                                <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                <span>Falló</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full border border-moss-200 bg-moss-100/70 px-2.5 py-1 text-xs font-semibold text-moss-700"
                                data-testid={`test-item-status-${testItem.id}`}
                              >
                                <Clock className="h-3.5 w-3.5 text-moss-500 shrink-0" />
                                <span>Pendiente</span>
                              </span>
                            )}

                            {testItem.durationMs !== null && !isRunning && (
                              <span className="font-mono text-[11px] font-semibold text-moss-600 pl-1">
                                ⏱ {testItem.durationMs}ms
                              </span>
                            )}
                          </div>
                        </td>

                        {/* COLUMNA 3: REPORTE */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setInspectedTest(testItem)}
                            className="btn btn-secondary btn-sm gap-1.5"
                            data-testid={`inspect-test-report-btn-${testItem.id}`}
                          >
                            <FileText className="h-3.5 w-3.5 text-moss-700" />
                            <span>Ver Reporte</span>
                          </button>
                        </td>

                        {/* COLUMNA 4: ACCIONES */}
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => executeRealCiPipeline(selectedSet, testItem)}
                            className="btn btn-primary btn-sm gap-1.5 ml-auto"
                            data-testid={`run-single-test-btn-${testItem.id}`}
                          >
                            {isRunning ? (
                              <>
                                <Spinner className="h-3.5 w-3.5" />
                                <span>Ejecutando...</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5" />
                                <span>{testItem.status === 'pending' ? 'Ejecutar' : 'Re-ejecutar'}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CONSOLA CI/CD EN VIVO */}
        {ciLogs.length > 0 && (
          <div className="card overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-lift" data-testid="live-ci-console">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <Terminal className="h-4 w-4" />
                <span>SALIDA REAL DE PROCESO OS ({fwMeta.engineLabel})</span>
              </div>
              <button
                type="button"
                onClick={() => setCiLogs([])}
                className="text-[11px] font-mono text-slate-400 hover:text-white"
              >
                Limpiar consola
              </button>
            </div>
            <pre className="max-h-56 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
              {ciLogs.join('\n')}
            </pre>
          </div>
        )}

        {/* ====================================================================
            DASHBOARD PROFESIONAL DE REPORTE GENERAL DE PRUEBAS AUTOMATIZADAS
            ==================================================================== */}
        <div
          className="card overflow-hidden shadow-lift border border-moss-200"
          data-testid="execution-general-report"
        >
          {/* 1. CABECERA EJECUTIVA DEL REPORTE */}
          <div className="border-b border-slate-800 bg-slate-900 px-6 py-5 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  {executedCount === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Pendiente de Ejecución
                    </span>
                  ) : failedTests.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Build Passed · Suite Aprobada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-red-300">
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                      Build Failed · {failedTests.length} {failedTests.length === 1 ? 'Fallo Detectado' : 'Fallos Detectados'}
                    </span>
                  )}

                  <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                    {fwMeta.label} · {fwMeta.projectTag}
                  </span>

                  <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                    Carpeta: {selectedSet.folderName}
                  </span>
                </div>

                <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Reporte Ejecutivo de Ejecución · {selectedSet.name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                  <span>
                    Entorno: <strong className="text-emerald-300">{selectedSet.targetUrl || 'http://localhost:5173'}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Analista: <strong className="text-slate-200">{user?.email || profile?.full_name || 'Analista de Calidad'}</strong>
                  </span>
                  {lastRunTimestamp && (
                    <>
                      <span>·</span>
                      <span>
                        Última corrida: <strong className="text-slate-200">{new Date(lastRunTimestamp).toLocaleString()}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedSet.reportUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOfficialPlaywrightModalUrl(selectedSet.reportUrl)}
                      className="btn btn-primary btn-sm gap-1.5"
                      data-testid="open-embedded-playwright-report-btn"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Abrir Reporte HTML (Playwright)</span>
                    </button>
                    <a
                      href={selectedSet.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm gap-1.5 bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Pestaña Nueva</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-white">
            {/* 2. BLOQUE PRINCIPAL DE ANALÍTICA: ANILLO PASS RATE + KPIs + TELEMETRÍA DE TIEMPOS */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Anillo de Efectividad (Donut Chart) */}
              <div className="lg:col-span-4 rounded-2xl border border-moss-200 bg-moss-50/40 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-moss-700">
                    Tasa de Aprobación (Pass Rate)
                  </span>
                  <span
                    className={cn(
                      'badge text-[11px]',
                      failedTests.length > 0
                        ? 'badge-red'
                        : executedCount > 0
                          ? 'badge-green'
                          : 'badge-neutral'
                    )}
                  >
                    {executedCount}/{totalTests} ejecutados
                  </span>
                </div>

                <div className="my-4 flex items-center gap-5">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
                      <circle
                        cx="56"
                        cy="56"
                        r={donutRadius}
                        fill="transparent"
                        stroke="#e5ece6"
                        strokeWidth="12"
                      />
                      {passedArc > 0 && (
                        <circle
                          cx="56"
                          cy="56"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray={`${passedArc} ${donutCircumference}`}
                          strokeLinecap="butt"
                        />
                      )}
                      {failedArc > 0 && (
                        <circle
                          cx="56"
                          cy="56"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#ef4444"
                          strokeWidth="12"
                          strokeDasharray={`${failedArc} ${donutCircumference}`}
                          strokeDashoffset={-passedArc}
                          strokeLinecap="butt"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span
                        className="font-display text-2xl font-bold text-moss-950"
                        data-testid="report-pass-rate"
                      >
                        {passRate}%
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-moss-500">
                        Efectividad
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Pasados
                      </span>
                      <span className="font-mono font-bold text-emerald-800">
                        {passedTests.length} ({totalTests > 0 ? Math.round((passedTests.length / totalTests) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-red-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        Fallidos
                      </span>
                      <span className="font-mono font-bold text-red-700">
                        {failedTests.length} ({totalTests > 0 ? Math.round((failedTests.length / totalTests) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-moss-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-moss-300" />
                        Pendientes
                      </span>
                      <span className="font-mono font-semibold text-moss-600">
                        {pendingTests.length} ({totalTests > 0 ? Math.round((pendingTests.length / totalTests) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de distribución proporcional */}
                <div className="space-y-1.5">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-moss-200/70">
                    {totalTests > 0 && (
                      <>
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{ width: `${(passedTests.length / totalTests) * 100}%` }}
                          title={`Pasados: ${passedTests.length}`}
                        />
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${(failedTests.length / totalTests) * 100}%` }}
                          title={`Fallidos: ${failedTests.length}`}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-moss-600">
                    <span>Cobertura de casos: {coveragePct}%</span>
                    <span>{passedStepsTotal}/{totalStepsCount} steps OK</span>
                  </div>
                </div>
              </div>

              {/* Tarjetas de Indicadores Clave (KPIs) */}
              <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Pasados
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p
                    className="mt-2 font-display text-3xl font-bold text-emerald-700"
                    data-testid="report-passed-count"
                  >
                    {passedTests.length}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800/80 font-medium">
                    Escenarios aprobados
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                      Fallidos
                    </span>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <p
                    className="mt-2 font-display text-3xl font-bold text-red-700"
                    data-testid="report-failed-count"
                  >
                    {failedTests.length}
                  </p>
                  <p className="mt-1 text-[11px] text-red-800/80 font-medium">
                    {failedTests.length === 0 ? 'Sin regresiones' : 'Con traza de error'}
                  </p>
                </div>

                <div className="rounded-2xl border border-moss-200 bg-moss-50/40 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-moss-700">
                      Pendientes
                    </span>
                    <Clock className="h-4 w-4 text-moss-500" />
                  </div>
                  <p
                    className="mt-2 font-display text-3xl font-bold text-moss-800"
                    data-testid="report-pending-count"
                  >
                    {pendingTests.length}
                  </p>
                  <p className="mt-1 text-[11px] text-moss-600 font-medium">
                    Por ejecutar
                  </p>
                </div>

                <div className="rounded-2xl border border-moss-200 bg-white p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-moss-600">
                    Tests Detectados
                  </span>
                  <p
                    className="mt-2 font-display text-2xl font-bold text-moss-950"
                    data-testid="report-detected-tests"
                  >
                    {totalTests}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-moss-500">
                    En {specsByFile.length} {specsByFile.length === 1 ? 'archivo' : 'archivos'} spec
                  </p>
                </div>

                <div className="rounded-2xl border border-moss-200 bg-white p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-moss-600">
                    Casos Esperados
                  </span>
                  <p
                    className="mt-2 font-display text-2xl font-bold text-moss-950"
                    data-testid="report-expected-cases"
                  >
                    {selectedSet.expectedCases}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-moss-500">
                    Cobertura: {coveragePct}%
                  </p>
                </div>

                <div className="rounded-2xl border border-moss-200 bg-white p-4 flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-moss-600">
                    Steps Verificados
                  </span>
                  <p className="mt-2 font-display text-2xl font-bold text-moss-950">
                    {passedStepsTotal}/{totalStepsCount}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-moss-500">
                    Acciones y expects
                  </p>
                </div>
              </div>

              {/* Telemetría de Tiempos de Ejecución */}
              <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Métricas de Tiempo
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {fwMeta.projectTag}
                  </span>
                </div>

                <div className="my-3 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Tiempo Total Suite:</span>
                    <span className="font-display text-2xl font-bold text-white font-mono">
                      {(totalDurationMs / 1000).toFixed(2)}s
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Promedio / Test:</span>
                    <span className="font-mono text-sm font-bold text-emerald-300">
                      {(avgDurationMs / 1000).toFixed(2)}s ({avgDurationMs}ms)
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Más rápido:</span>
                      <span className="font-mono text-emerald-300 truncate" title={fastestTest?.name || ''}>
                        {fastestTest ? `${(fastestTest.durationMs / 1000).toFixed(2)}s · ${fastestTest.name}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Más lento:</span>
                      <span className="font-mono text-amber-300 truncate" title={slowestTest?.name || ''}>
                        {slowestTest ? `${(slowestTest.durationMs / 1000).toFixed(2)}s · ${slowestTest.name}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Duración exacta:</span>
                  <strong className="text-slate-200">{totalDurationMs.toLocaleString()} ms</strong>
                </div>
              </div>
            </div>

            {/* 3. RESUMEN POR ARCHIVO DE PRUEBA + DISTRIBUCIÓN DE TIEMPOS POR ESCENARIO */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Desglose por Archivo Spec */}
              <div className="lg:col-span-6 rounded-2xl border border-moss-200 bg-white overflow-hidden">
                <div className="border-b border-moss-200 bg-moss-50/70 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-moss-800 flex items-center gap-1.5">
                    <FileCode2 className="h-4 w-4 text-moss-600" />
                    Resumen por Archivo de Especificación (Specs)
                  </span>
                  <span className="font-mono text-[11px] text-moss-600">
                    {specsByFile.length} {specsByFile.length === 1 ? 'archivo' : 'archivos'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-moss-100 bg-moss-50/30 text-[10px] font-bold uppercase tracking-wider text-moss-600">
                        <th className="py-2.5 px-4">Archivo Spec</th>
                        <th className="py-2.5 px-3 text-center">Tests</th>
                        <th className="py-2.5 px-3 text-center">Pasados</th>
                        <th className="py-2.5 px-3 text-center">Fallidos</th>
                        <th className="py-2.5 px-4 text-right">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-moss-100">
                      {specsByFile.map((sf) => {
                        const fileExec = sf.passed + sf.failed;
                        const fileRate = fileExec > 0 ? Math.round((sf.passed / fileExec) * 100) : 0;
                        return (
                          <tr key={sf.filePath} className="hover:bg-moss-50/50">
                            <td className="py-3 px-4">
                              <div className="font-mono font-semibold text-moss-900 truncate max-w-[230px]" title={sf.filePath}>
                                {sf.filePath}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-moss-100">
                                  <div
                                    className={cn(
                                      'h-full',
                                      sf.failed > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                                    )}
                                    style={{ width: `${(sf.passed / Math.max(1, sf.total)) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-moss-500">{fileRate}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-moss-800">
                              {sf.total}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                              {sf.passed}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-red-600">
                              {sf.failed}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-moss-700">
                              {(sf.durationMs / 1000).toFixed(2)}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comparativa de Tiempos de Ejecución por Escenario */}
              <div className="lg:col-span-6 rounded-2xl border border-moss-200 bg-white overflow-hidden flex flex-col">
                <div className="border-b border-moss-200 bg-moss-50/70 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-moss-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-moss-600" />
                    Distribución de Tiempo por Escenario
                  </span>
                  <span className="font-mono text-[11px] text-moss-600">
                    Total: {(totalDurationMs / 1000).toFixed(2)}s
                  </span>
                </div>

                <div className="p-4 space-y-3 max-h-64 overflow-y-auto flex-1">
                  {selectedSet.tests.map((t) => {
                    const dur = t.durationMs || 0;
                    const widthPct = t.durationMs ? Math.max(6, Math.round((dur / maxTestDurationMs) * 100)) : 0;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setInspectedTest(t)}
                        className="group cursor-pointer space-y-1 rounded-xl p-2 hover:bg-moss-50/80 transition"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {t.status === 'passed' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : t.status === 'failed' ? (
                              <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-moss-400 shrink-0" />
                            )}
                            <span className="font-semibold text-moss-900 truncate group-hover:underline">
                              {t.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-moss-700 shrink-0">
                            {t.durationMs !== null ? `${(dur / 1000).toFixed(2)}s (${dur}ms)` : 'Pendiente'}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-moss-100">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              t.status === 'passed'
                                ? 'bg-emerald-500'
                                : t.status === 'failed'
                                  ? 'bg-red-500'
                                  : 'bg-moss-300'
                            )}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. GALERÍA DE EVIDENCIAS VISUALES DE LA EJECUCIÓN (OCULTA POR DEFECTO) */}
            {selectedSet.tests.some((t) => t.executionReport?.screenshotDataUrl) && (
              <div className="rounded-2xl border border-moss-200 bg-moss-50/40 overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowEvidenceSection((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setShowEvidenceSection((prev) => !prev);
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 cursor-pointer hover:bg-moss-100/60 transition"
                  data-testid="toggle-evidence-gallery-btn"
                >
                  <div className="flex items-center gap-2.5">
                    {showEvidenceSection ? (
                      <ChevronDown className="h-4 w-4 text-moss-700" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-moss-700" />
                    )}
                    <Camera className="h-4 w-4 text-moss-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-moss-900">
                      Evidencia Visual de Ejecución (
                      {selectedSet.tests.filter((t) => t.executionReport?.screenshotDataUrl).length} Capturas Disponibles)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEvidenceSection((prev) => !prev);
                    }}
                    className="btn btn-secondary btn-sm gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5 text-moss-700" />
                    <span>{showEvidenceSection ? 'Ocultar Capturas' : 'Ver Capturas de Evidencia'}</span>
                  </button>
                </div>

                {showEvidenceSection && (
                  <div className="border-t border-moss-200 bg-white p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                      <span className="text-xs text-moss-600">
                        Selecciona un escenario para desplegar su captura o abrirla en pantalla completa.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allMap = {};
                            selectedSet.tests.forEach((t) => {
                              if (t.executionReport?.screenshotDataUrl) allMap[t.id] = true;
                            });
                            setExpandedEvidenceIds(allMap);
                          }}
                          className="text-xs font-semibold text-moss-700 hover:text-moss-950 underline"
                        >
                          Expandir todas
                        </button>
                        <span className="text-moss-300">·</span>
                        <button
                          type="button"
                          onClick={() => setExpandedEvidenceIds({})}
                          className="text-xs font-semibold text-moss-600 hover:text-moss-900 underline"
                        >
                          Contraer todas
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedSet.tests
                        .filter((t) => t.executionReport?.screenshotDataUrl)
                        .map((t) => {
                          const isCardExpanded = Boolean(expandedEvidenceIds[t.id]);
                          return (
                            <div
                              key={t.id}
                              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-soft flex flex-col justify-between"
                            >
                              <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shrink-0',
                                      t.status === 'passed'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    )}
                                  >
                                    {t.status === 'passed' ? '✓ Pasó' : '✘ Falló'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-xs text-white" title={t.name}>
                                      {t.name}
                                    </p>
                                    <p className="truncate font-mono text-[10px] text-slate-400">
                                      {t.filePath}:{t.startLine || 1}
                                      {t.durationMs !== null ? ` · ${(t.durationMs / 1000).toFixed(2)}s` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedEvidenceIds((prev) => ({
                                        ...prev,
                                        [t.id]: !prev[t.id],
                                      }))
                                    }
                                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-700 transition"
                                  >
                                    {isCardExpanded ? 'Ocultar' : 'Ver'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullscreenScreenshot(t.executionReport.screenshotDataUrl)}
                                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    title="Abrir en pantalla completa"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadScreenshotPng(t)}
                                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    title="Descargar PNG"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {isCardExpanded && (
                                <div
                                  onClick={() => setFullscreenScreenshot(t.executionReport.screenshotDataUrl)}
                                  className="relative aspect-video w-full cursor-pointer overflow-hidden border-t border-slate-800 bg-slate-950"
                                >
                                  <img
                                    src={t.executionReport.screenshotDataUrl}
                                    alt={`Evidencia de ${t.name}`}
                                    className="h-full w-full object-cover hover:scale-102 transition"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            MODAL CON EL REPORTE REAL DE PLAYWRIGHT DE UN TEST INDIVIDUAL
            ==================================================================== */}
        <Modal
          open={Boolean(inspectedTest)}
          onClose={() => setInspectedTest(null)}
          title={
            inspectedTest
              ? `${inspectedTest.filePath}:${inspectedTest.startLine || 1} › ${inspectedTest.name}`
              : 'Playwright Test Report'
          }
          description={
            inspectedTest
              ? `Proyecto: ${fwMeta.projectTag} · Motor Real: ${fwMeta.engineLabel}`
              : ''
          }
          size="2xl"
          testId="single-test-execution-report-modal"
          footer={
            inspectedTest && (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setInspectedTest(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cerrar
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => executeRealCiPipeline(selectedSet, inspectedTest)}
                    disabled={Boolean(runningTestIds[inspectedTest.id])}
                    className="btn btn-primary btn-sm gap-1.5"
                    data-testid="modal-rerun-single-test-btn"
                  >
                    {runningTestIds[inspectedTest.id] ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {inspectedTest.executionReport ? 'Re-ejecutar en Navegador Real' : 'Ejecutar Test en Navegador Real'}
                    </span>
                  </button>
                  {inspectedTest.executionReport?.screenshotDataUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownloadScreenshotPng(inspectedTest)}
                      className="btn btn-secondary btn-sm gap-1.5"
                      data-testid="download-single-test-png-btn"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Descargar Captura PNG Real</span>
                    </button>
                  )}
                  {(inspectedTest.executionReport?.officialReportUrl || selectedSet.reportUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = inspectedTest.executionReport?.officialReportUrl || selectedSet.reportUrl;
                        setInspectedTest(null);
                        setOfficialPlaywrightModalUrl(url);
                      }}
                      className="btn btn-secondary btn-sm gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Ver en playwright-report/index.html</span>
                    </button>
                  )}
                </div>
              </div>
            )
          }
        >
          {inspectedTest && (
            <div className="space-y-4 text-xs" data-testid="single-test-report-content">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {inspectedTest.status === 'passed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 font-bold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> Passed (Real Chromium Run)
                      </span>
                    ) : inspectedTest.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 font-bold text-red-300">
                        <XCircle className="h-4 w-4" /> Failed (Real Chromium Run)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 font-bold text-slate-300">
                        <Clock className="h-4 w-4" /> Pendiente de Ejecución Real
                      </span>
                    )}

                    <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 font-mono text-xs text-blue-300">
                      {inspectedTest.executionReport?.projectTag || fwMeta.projectTag}
                    </span>
                  </div>

                  <span className="font-mono text-sm font-bold text-slate-200">
                    ⏱ {inspectedTest.durationMs ? `${inspectedTest.durationMs}ms` : '—'}
                  </span>
                </div>
              </div>

              {!inspectedTest.executionReport && (
                <div className="rounded-xl border border-moss-200 bg-moss-50 p-4 text-moss-800">
                  Haz clic en <strong>"Ejecutar Test en Navegador Real"</strong> abajo para lanzar el proceso <code>npx playwright test</code> contra <code>{selectedSet.targetUrl || 'http://localhost:5173'}</code> y capturar la pantalla real de Chromium.
                </div>
              )}

              {/* SECCIÓN 1: ERRORS & CODE FRAME REAL */}
              {inspectedTest.executionReport?.errorSummary && (
                <div className="overflow-hidden rounded-xl border border-red-500/40 bg-slate-950 text-slate-100">
                  <div className="border-b border-slate-800 bg-red-950/60 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-red-300">
                    Errors (Playwright Real Runner Output)
                  </div>
                  <pre className="p-3.5 font-mono text-xs text-red-300 whitespace-pre-wrap border-b border-slate-800 max-h-52 overflow-y-auto">
                    {inspectedTest.executionReport.errorSummary}
                  </pre>
                  <div className="py-2 font-mono text-xs overflow-x-auto">
                    {buildCodeFrameLines(
                      inspectedTest.sourceCode,
                      inspectedTest.startLine || 1,
                      inspectedTest.executionReport.failedLineNumber
                    ).map((ln) => (
                      <div
                        key={ln.lineNumber}
                        className={cn(
                          'flex px-4 py-0.5',
                          ln.isFailedLine && 'bg-red-500/25 text-red-200 font-bold'
                        )}
                      >
                        <span className="w-4 text-red-400 font-bold">{ln.isFailedLine ? '>' : ' '}</span>
                        <span className="w-12 text-slate-500 select-none">{ln.lineNumber} |</span>
                        <span className="whitespace-pre text-slate-200">{ln.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN 2: ÁRBOL DE TEST STEPS REALES DE PLAYWRIGHT */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100">
                <div className="border-b border-slate-800 bg-slate-900 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Test Steps (Reportados por {fwMeta.label})
                </div>

                <div className="divide-y divide-slate-800/80 font-mono text-xs">
                  {(inspectedTest.executionReport?.steps || inspectedTest.parsedSteps || []).map(
                    (st, idx) => {
                      const stStatus = st.status || 'pending';
                      const stepKey = st.id || `st-${idx}`;
                      const isExpanded = Boolean(expandedStepIds[stepKey]);
                      return (
                        <div key={stepKey} className={cn(stStatus === 'failed' && 'bg-red-950/35')}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedStepIds((prev) => ({
                                ...prev,
                                [stepKey]: !prev[stepKey],
                              }))
                            }
                            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-900/70"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span
                              className={cn(
                                'font-bold shrink-0',
                                stStatus === 'passed'
                                  ? 'text-emerald-400'
                                  : stStatus === 'failed'
                                  ? 'text-red-400'
                                  : 'text-slate-500'
                              )}
                            >
                              {stStatus === 'passed' ? '✓' : stStatus === 'failed' ? '✘' : '○'}
                            </span>
                            <span className="truncate text-slate-100">{st.pwTitle || st.command}</span>
                            <span className="ml-auto pl-2 text-slate-500 shrink-0">
                              {inspectedTest.fileName}:{st.lineNumber}
                            </span>
                            <span className="w-16 text-right text-slate-400 shrink-0">
                              {st.durationMs !== undefined ? `${st.durationMs}ms` : '—'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="bg-slate-900/70 pl-10 pr-4 py-2 text-[11px] text-slate-300 space-y-1 border-t border-slate-800/60">
                              {(st.callLog || [st.detail]).filter(Boolean).map((logLine, lIdx) => (
                                <div key={lIdx} className="text-slate-300">
                                  — {logLine}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* SECCIÓN 3: CAPTURA DE PANTALLA PNG REAL TOMADA POR CHROMIUM */}
              {inspectedTest.executionReport?.screenshotDataUrl && (
                <div
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100"
                  data-testid="single-test-screenshot-section"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Screenshots · {inspectedTest.executionReport.screenshotFileName} (Captura Real Chromium)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFullscreenScreenshot(inspectedTest.executionReport.screenshotDataUrl)
                        }
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 font-mono text-[11px] text-slate-200 hover:bg-slate-700"
                      >
                        <Maximize2 className="h-3 w-3" /> Ampliar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadScreenshotPng(inspectedTest)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 font-mono text-[11px] font-bold text-white hover:bg-emerald-500"
                      >
                        <Download className="h-3 w-3" /> Guardar PNG
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950">
                    <img
                      src={inspectedTest.executionReport.screenshotDataUrl}
                      alt="Captura de la ejecución real en Chromium"
                      onClick={() =>
                        setFullscreenScreenshot(inspectedTest.executionReport.screenshotDataUrl)
                      }
                      className="w-full rounded-lg border border-slate-800 cursor-zoom-in"
                      data-testid="execution-final-screenshot-img"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Modal con el playwright-report/index.html OFICIAL generado por Playwright en disco */}
        <Modal
          open={Boolean(officialPlaywrightModalUrl)}
          onClose={() => setOfficialPlaywrightModalUrl(null)}
          title="Playwright HTML Report Oficial (Generado en Disco por Playwright CLI)"
          description="Este es el archivo playwright-report/index.html real generado por la ejecución en vivo de Playwright. Haz clic sobre cualquier test para desplegar sus pasos, errores y capturas."
          size="full"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setOfficialPlaywrightModalUrl(null)}
                className="btn btn-secondary btn-sm"
              >
                Cerrar
              </button>
              {officialPlaywrightModalUrl && (
                <a
                  href={officialPlaywrightModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir en Pestaña Completa</span>
                </a>
              )}
            </div>
          }
        >
          {officialPlaywrightModalUrl && (
            <div className="h-[78vh] w-full overflow-hidden rounded-xl border border-moss-200 bg-white">
              <iframe
                src={officialPlaywrightModalUrl}
                title="Playwright Official HTML Report"
                className="h-full w-full border-0 bg-white"
                onLoad={(e) => {
                  try {
                    const doc = e.currentTarget.contentDocument;
                    if (!doc) return;
                    const styleEl = doc.createElement('style');
                    styleEl.textContent = `
                      html, body {
                        background-color: var(--color-canvas-default, #ffffff) !important;
                        color: var(--color-fg-default, #1f2328) !important;
                        min-height: 100vh;
                      }
                      body.dark-mode {
                        background-color: var(--color-canvas-default, #0d1117) !important;
                        color: var(--color-fg-default, #e6edf3) !important;
                      }
                    `;
                    doc.head?.appendChild(styleEl);
                    setTimeout(() => {
                      const win = e.currentTarget.contentWindow;
                      if (win && (!win.location.hash || win.location.hash === '#')) {
                        const links = doc.querySelectorAll(
                          '.test-file-test a.test-file-path-link, .test-file-test a[href^="#?testId="]'
                        );
                        if (links.length === 1) {
                          links[0].click();
                        }
                      }
                    }, 220);
                  } catch {
                    // ignore cross-origin if any
                  }
                }}
              />
            </div>
          )}
        </Modal>

        {/* Modal para ver la captura en pantalla completa */}
        <Modal
          open={Boolean(fullscreenScreenshot)}
          onClose={() => setFullscreenScreenshot(null)}
          title="Captura de Pantalla Real tomada por Chromium Headless"
          size="lg"
        >
          {fullscreenScreenshot && (
            <div className="space-y-3">
              <img
                src={fullscreenScreenshot}
                alt="Captura ampliada"
                className="w-full rounded-xl border border-slate-700"
              />
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // VISTA PRINCIPAL: CARDS DE SETS DE PRUEBAS AUTOMATIZADAS
  // ============================================================================
  return (
    <div className="space-y-6 animate-slide-up" data-testid="qa-automation-sets-module">
      <PageHeader
        icon={FlaskConical}
        eyebrow="Portal Cloud · Rol Analista de Calidad"
        title="Sets de Pruebas Automatizadas"
        description="Gestiona y ejecuta suites de pruebas automatizadas (Playwright, Cypress o Selenium) con pipeline CI/CD integrado, métricas de cobertura y evidencias de ejecución."
        testId="qa-automation-sets-header"
        actions={
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary gap-2 shadow-lift"
            data-testid="open-create-automation-set-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Set de Pruebas</span>
          </button>
        }
      />

      {/* Resumen de KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Sets Provisionados</span>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-total-sets">
            {globalStats.totalSets}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Workspaces CI/CD en servidor</p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-moss-600">Tests Detectados</span>
          <p className="mt-2 font-display text-2xl font-bold text-moss-900" data-testid="kpi-total-detected-tests">
            {globalStats.totalTests}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Extraídos de archivos reales</p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Tests Passed</span>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700" data-testid="kpi-passed-tests">
            {globalStats.passedTests}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Ejecutados en navegador real</p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">Tests Failed</span>
          <p className="mt-2 font-display text-2xl font-bold text-red-600" data-testid="kpi-failed-tests">
            {globalStats.failedTests}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Con captura y traza de fallo real</p>
        </div>
      </div>

      {/* Barra de búsqueda y filtro por Framework */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-moss-200 bg-white p-4 shadow-soft">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar set por nombre, carpeta o framework..."
            className="input pl-10 w-full"
            data-testid="search-automation-sets-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-moss-700">Framework:</span>
          <div className="w-48">
            <CustomSelect
              id="filter-framework-select"
              testId="filter-framework-select"
              size="sm"
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los frameworks' },
                ...AUTOMATION_FRAMEWORKS.map((f) => ({ value: f.value, label: f.label })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Grid de Cards de Sets Creados */}
      {filteredSets.length === 0 ? (
        <div
          className="card flex min-h-[260px] flex-col items-center justify-center p-8 text-center"
          data-testid="empty-automation-sets"
        >
          <FolderOpen className="h-12 w-12 text-moss-300 mb-3" />
          <h3 className="font-display text-lg font-bold text-moss-900">
            No hay sets de pruebas automatizadas
          </h3>
          <p className="mt-1 max-w-md text-xs text-moss-600">
            Crea tu primer set indicando el nombre, los casos esperados, el framework (Playwright, Cypress o Selenium) y cargando la carpeta con tus pruebas.
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-primary btn-sm mt-4 gap-1.5"
            data-testid="empty-create-set-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Primer Set Automatizado</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="automation-sets-cards-grid">
          {filteredSets.map((setItem) => {
            const fwMeta =
              AUTOMATION_FRAMEWORKS.find((f) => f.value === setItem.framework) || AUTOMATION_FRAMEWORKS[0];
            const total = setItem.tests.length;
            const passed = setItem.tests.filter((t) => t.status === 'passed').length;
            const failed = setItem.tests.filter((t) => t.status === 'failed').length;
            const pending = setItem.tests.filter((t) => t.status === 'pending').length;
            const executed = passed + failed;
            const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

            return (
              <div
                key={setItem.id}
                className="card flex flex-col justify-between p-5 shadow-soft hover:shadow-lift transition-all border border-moss-200/90"
                data-testid={`automation-set-card-${setItem.id}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('badge text-xs font-bold', fwMeta.color)}>
                      {fwMeta.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSet(setItem.id, setItem.name)}
                      className="text-moss-400 hover:text-danger-600 transition p-1"
                      title="Eliminar set"
                      data-testid={`delete-set-btn-${setItem.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <h3
                      className="font-display text-lg font-bold text-moss-900 line-clamp-2"
                      data-testid={`set-card-title-${setItem.id}`}
                    >
                      {setItem.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-moss-600 truncate">
                      <FolderOpen className="h-3.5 w-3.5 text-moss-500 shrink-0" />
                      <span className="truncate">{setItem.folderName}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-moss-500 truncate">
                      <Globe className="h-3 w-3 text-moss-400 shrink-0" />
                      <span className="truncate">{setItem.targetUrl || 'http://localhost:5173'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-moss-50/70 p-3 border border-moss-200/60 text-xs">
                    <div>
                      <span className="text-moss-500 block text-[11px]">Casos Esperados</span>
                      <strong className="font-display text-base text-moss-900" data-testid={`set-card-expected-${setItem.id}`}>
                        {setItem.expectedCases}
                      </strong>
                    </div>
                    <div>
                      <span className="text-moss-500 block text-[11px]">Tests Detectados</span>
                      <strong className="font-display text-base text-moss-900" data-testid={`set-card-detected-${setItem.id}`}>
                        {total}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-semibold">✓ {passed} passed</span>
                      <span className="text-red-600 font-semibold">✘ {failed} failed</span>
                      <span className="text-moss-500">{pending} pend.</span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-moss-100">
                      {total > 0 && (
                        <>
                          <div
                            className="bg-moss-600"
                            style={{ width: `${(passed / total) * 100}%` }}
                          />
                          <div
                            className="bg-danger-600"
                            style={{ width: `${(failed / total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-moss-500 text-right">
                      {executed > 0 ? `Efectividad real: ${passRate}%` : 'Sin ejecutar aún'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-moss-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-moss-500">
                    {new Date(setItem.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSetId(setItem.id);
                      setDetailFilter('all');
                    }}
                    className="btn btn-primary btn-sm gap-1.5"
                    data-testid={`view-set-detail-btn-${setItem.id}`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Detalle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA CREAR NUEVO SET Y PROVISIONAR WORKSPACE REAL */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Set de Pruebas Automatizadas (Pipeline CI/CD Real)"
        description="Configura el set, indica la URL del entorno donde correrán las pruebas y selecciona la carpeta de tu proyecto para sincronizarla y ejecutarla realmente."
        size="lg"
        testId="create-automation-set-modal"
      >
        <form onSubmit={handleCreateSet} className="space-y-4" data-testid="create-automation-set-form">
          <Field label="Nombre del Set de Pruebas *" id="set-name-input" required>
            <input
              id="set-name-input"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Regresión E2E Carrito y Pasarela de Pagos"
              className="input w-full"
              data-testid="set-name-input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Framework *"
              id="set-framework-select"
              help="Runner que se ejecutará"
              required
            >
              <CustomSelect
                id="set-framework-select"
                testId="set-framework-select"
                value={formData.framework}
                onChange={(e) => setFormData((p) => ({ ...p, framework: e.target.value }))}
                options={AUTOMATION_FRAMEWORKS.map((f) => ({
                  value: f.value,
                  label: f.label,
                }))}
              />
            </Field>

            <Field
              label="Casos Esperados *"
              id="set-expected-cases-input"
              help="Total de casos esperados"
              required
            >
              <input
                id="set-expected-cases-input"
                type="number"
                min={1}
                max={500}
                required
                value={formData.expectedCases}
                onChange={(e) => setFormData((p) => ({ ...p, expectedCases: e.target.value }))}
                placeholder="Ej. 10"
                className="input w-full font-mono"
                data-testid="set-expected-cases-input"
              />
            </Field>

            <Field
              label="URL Entorno Requerido *"
              id="set-target-url-input"
              help="BASE_URL para el navegador"
              required
            >
              <input
                id="set-target-url-input"
                type="url"
                required
                value={formData.targetUrl}
                onChange={(e) => setFormData((p) => ({ ...p, targetUrl: e.target.value }))}
                placeholder="http://localhost:5173"
                className="input w-full font-mono text-xs"
                data-testid="set-target-url-input"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-800">
              Carpeta del Proyecto de Pruebas *
            </label>
            <div className="rounded-2xl border-2 border-dashed border-moss-300 bg-moss-50/60 p-5 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-moss-900">
                  Selecciona la carpeta donde tienes todas las pruebas (ej. <code>aut_suite</code>)
                </p>
                <p className="text-xs text-moss-600">
                  Los archivos se sincronizarán en el workspace del servidor para que <strong>Playwright / Cypress / Selenium</strong> los ejecute realmente en navegador headless.
                </p>
              </div>

              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderUpload}
                className="hidden"
                data-testid="set-folder-input"
              />

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={scanningFolder}
                  className="btn btn-primary btn-sm gap-1.5"
                  data-testid="select-folder-btn"
                >
                  {scanningFolder ? <Spinner className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                  <span>Cargar Carpeta de Pruebas</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleFolder}
                  className="btn btn-secondary btn-sm gap-1.5"
                  data-testid="load-sample-folder-btn"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Cargar Suite Real de Prueba ({formData.framework})</span>
                </button>
              </div>
            </div>
          </div>

          {formData.detectedTests.length > 0 && (
            <div
              className="rounded-2xl border border-moss-200 bg-white p-4 space-y-3"
              data-testid="detected-tests-preview"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-moss-600" />
                  <span className="text-xs font-bold text-moss-900">
                    Carpeta lista para sincronizar: <code className="code-chip">{formData.folderName}</code> ({formData.workspaceFiles.length} archivos)
                  </span>
                </div>
                <span className="badge badge-green text-xs" data-testid="detected-tests-count-badge">
                  {formData.detectedTests.length} tests detectados
                </span>
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-moss-100 rounded-xl border border-moss-100 bg-moss-50/40">
                {formData.detectedTests.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-medium text-moss-900 truncate pr-2">
                      {idx + 1}. {t.name}
                    </span>
                    <span className="font-mono text-[11px] text-moss-500 shrink-0">
                      {t.filePath}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-moss-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
              data-testid="cancel-create-set-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || formData.detectedTests.length === 0}
              className="btn btn-primary gap-1.5"
              data-testid="submit-create-set-btn"
            >
              <Check className="h-4 w-4" />
              <span>Provisionar y Crear Set ({formData.detectedTests.length} Tests)</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
