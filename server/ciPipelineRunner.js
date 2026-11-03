import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const WORKSPACES_ROOT = path.resolve(process.cwd(), '.ci-workspaces');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function stripAnsi(str) {
  if (!str) return '';
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ejecuta un proceso hijo en el sistema operativo y captura stdout, stderr y código de salida real
 */
function runProcess(command, args, cwd, envVars = {}, useShell = false, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell: useShell,
      env: {
        ...process.env,
        CI: 'true',
        FORCE_COLOR: '0',
        ...envVars,
      },
    });

    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      try {
        child.kill('SIGTERM');
      } catch {}
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(`${stderr}\n${err.message}`),
        durationMs: Date.now() - startTime,
        killedByTimeout,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(stderr),
        durationMs: Date.now() - startTime,
        killedByTimeout,
      });
    });
  });
}

/**
 * Localiza o vincula node_modules con @playwright/test / cypress para ejecución inmediata
 * o prepara el entorno para npm install si no existe en el sistema.
 */
function resolveRunnerDependencies(workspaceDir, folderName, localFolderPath) {
  const targetNodeModules = path.join(workspaceDir, 'node_modules');

  const candidates = [];
  if (localFolderPath && fs.existsSync(localFolderPath)) {
    const cleanLocal = localFolderPath.endsWith('node_modules')
      ? localFolderPath
      : path.join(localFolderPath, 'node_modules');
    candidates.push(cleanLocal);
  }
  if (folderName) {
    candidates.push(path.resolve(process.cwd(), '..', folderName, 'node_modules'));
  }
  candidates.push(path.resolve(process.cwd(), '..', 'aut_suite', 'node_modules'));
  candidates.push(targetNodeModules);
  candidates.push(path.resolve(process.cwd(), 'node_modules'));

  for (const candidate of candidates) {
    const pwCli = path.join(candidate, '@playwright', 'test', 'cli.js');
    const cyCli = path.join(candidate, 'cypress', 'bin', 'cypress');
    if (fs.existsSync(pwCli) || fs.existsSync(cyCli)) {
      if (candidate !== targetNodeModules && !fs.existsSync(targetNodeModules)) {
        try {
          fs.symlinkSync(candidate, targetNodeModules, 'junction');
        } catch (err) {
          console.warn('Aviso al vincular junction node_modules:', err.message);
        }
      }
      return {
        ready: true,
        nodeModulesPath: candidate,
        playwrightCliPath: fs.existsSync(pwCli) ? pwCli : null,
        cypressCliPath: fs.existsSync(cyCli) ? cyCli : null,
      };
    }
  }

  return {
    ready: false,
    nodeModulesPath: targetNodeModules,
    playwrightCliPath: null,
    cypressCliPath: null,
  };
}

/**
 * Escribe la configuración de Playwright para el Pipeline CI/CD:
 * - Captura de pantalla real obligatoria en cada test (screenshot: 'on')
 * - Reporte JSON estructurado (ci-results.json)
 * - Reporte HTML oficial de Playwright (playwright-report/index.html)
 */
function writePlaywrightCiConfig(workspaceDir, targetUrl) {
  const configPath = path.join(workspaceDir, 'playwright.ci.config.mjs');
  const safeBaseUrl = targetUrl || 'http://localhost:5173';

  const content = `export default {
  testDir: '.',
  testIgnore: ['**/node_modules/**', '**/.git/**', '**/playwright-report/**', '**/test-results/**'],
  timeout: 45000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'ci-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: ${JSON.stringify(safeBaseUrl)},
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
};
`;
  fs.writeFileSync(configPath, content, 'utf-8');
  return 'playwright.ci.config.mjs';
}

/**
 * Recorre recursivamente un directorio buscando archivos .png recientes si Playwright
 * guardó la captura en test-results/
 */
function findLatestPngInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return null;
  let latestFile = null;
  let latestMtime = 0;

  function scan(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs >= latestMtime) {
            latestMtime = stat.mtimeMs;
            latestFile = fullPath;
          }
        } catch {}
      }
    }
  }

  scan(dirPath);
  return latestFile;
}

/**
 * Parsea el archivo ci-results.json real emitido por Playwright y extrae:
 * - Estado real de cada test (passed / failed)
 * - Árbol de pasos reales (Before Hooks, acciones, aserciones, After Hooks)
 * - Error y número de línea exacto si falló
 * - Captura PNG real tomada por Chromium convertida a Base64
 */
function parsePlaywrightJsonReport(jsonData, workspaceDir) {
  const results = [];

  function walkSteps(rawSteps, defaultLine = 1) {
    if (!Array.isArray(rawSteps)) return [];
    return rawSteps.map((st, idx) => ({
      stepNumber: idx + 1,
      lineNumber: st.location?.line || defaultLine,
      category: st.category || 'pw:api',
      pwTitle: st.title,
      command: st.title,
      status: st.error ? 'failed' : 'passed',
      durationMs: st.duration ?? 0,
      detail: st.error
        ? stripAnsi(st.error.message || st.error.stack || '')
        : `Ejecutado en navegador real (${st.duration ?? 0}ms)`,
      callLog: st.error
        ? stripAnsi(st.error.message || '').split('\n')
        : [
            `Categoría: ${st.category || 'action'}`,
            `Tiempo real: ${st.duration ?? 0}ms`,
            ...(Array.isArray(st.steps) && st.steps.length > 0
              ? st.steps.map((sub) => `${sub.error ? '✘' : '✓'} ${sub.title} (${sub.duration ?? 0}ms)`)
              : []),
          ],
    }));
  }

  function walkSuite(suite, parentFile = '') {
    const suiteFile = suite.file || parentFile;

    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const specTitle = spec.title;
        const specFile = spec.file || suiteFile;
        const specLine = spec.line || 1;
        const testEntry = spec.tests?.[0];
        const lastResult = testEntry?.results?.[testEntry.results.length - 1];

        if (lastResult) {
          const rawStatus = lastResult.status; // 'passed' | 'failed' | 'timedOut' | 'skipped'
          const status = rawStatus === 'passed' ? 'passed' : rawStatus === 'skipped' ? 'pending' : 'failed';
          const steps = walkSteps(lastResult.steps, specLine);

          const firstErr = lastResult.error || (lastResult.errors && lastResult.errors[0]);
          const errorSummary = firstErr
            ? stripAnsi(firstErr.message || firstErr.stack || 'Test failed')
            : null;
          const failedLineNumber = firstErr?.location?.line || null;

          let screenshotDataUrl = null;
          let screenshotFileName = status === 'passed' ? 'test-finished-1.png' : 'test-failed-1.png';

          if (Array.isArray(lastResult.attachments)) {
            const imgAtt = lastResult.attachments.find(
              (a) =>
                (a.contentType && a.contentType.includes('image/png')) ||
                (a.path && a.path.toLowerCase().endsWith('.png'))
            );
            if (imgAtt) {
              if (imgAtt.body) {
                screenshotDataUrl = `data:image/png;base64,${imgAtt.body}`;
              } else if (imgAtt.path && fs.existsSync(imgAtt.path)) {
                try {
                  const buf = fs.readFileSync(imgAtt.path);
                  screenshotDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
                  screenshotFileName = path.basename(imgAtt.path);
                } catch {}
              }
            }
          }

          // Si no vino en attachments pero existe en test-results/, leer el PNG más reciente
          if (!screenshotDataUrl && workspaceDir) {
            const fallbackPng = findLatestPngInDir(path.join(workspaceDir, 'test-results'));
            if (fallbackPng) {
              try {
                const buf = fs.readFileSync(fallbackPng);
                screenshotDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
                screenshotFileName = path.basename(fallbackPng);
              } catch {}
            }
          }

          results.push({
            title: specTitle,
            file: specFile,
            line: specLine,
            status,
            durationMs: lastResult.duration ?? 0,
            projectName: testEntry?.projectName || 'chromium',
            steps,
            errorSummary,
            failedLineNumber,
            screenshotDataUrl,
            screenshotFileName,
            stdout: (lastResult.stdout || []).map((o) => stripAnsi(o.text || '')).join(''),
            stderr: (lastResult.stderr || []).map((o) => stripAnsi(o.text || '')).join(''),
          });
        }
      }
    }

    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) {
        walkSuite(child, suiteFile);
      }
    }
  }

  if (Array.isArray(jsonData?.suites)) {
    for (const s of jsonData.suites) {
      walkSuite(s);
    }
  }

  return results;
}

/**
 * Middleware de Vite que expone el motor DevOps CI/CD Real
 */
export function ciRunnerServerPlugin() {
  return {
    name: 'real-devops-ci-runner',
    configureServer(server) {
      // 1. Servir el reporte HTML oficial generado por Playwright (playwright-report/index.html y sus assets/data)
      server.middlewares.use('/api/ci-runner/report', (req, res, next) => {
        try {
          const cleanUrl = (req.url || '').split('?')[0].replace(/^\/+/, '');
          const parts = cleanUrl.split('/');
          const setId = parts[0];
          const subPath = parts.slice(1).join('/') || 'index.html';
          if (!setId) return next();

          const reportFile = path.join(WORKSPACES_ROOT, setId, 'playwright-report', subPath);
          if (!fs.existsSync(reportFile) || fs.statSync(reportFile).isDirectory()) {
            res.statusCode = 404;
            res.end('El reporte oficial de Playwright aún no se ha generado para este set. Ejecuta una prueba primero.');
            return;
          }

          const ext = path.extname(reportFile).toLowerCase();
          const mimeMap = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.json': 'application/json; charset=utf-8',
            '.zip': 'application/zip',
          };
          res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');

          if (ext === '.html') {
            let html = fs.readFileSync(reportFile, 'utf-8');
            const themeFixInjection = `
    <style id="pw-report-iframe-fix">
      html, body {
        background-color: var(--color-canvas-default, #ffffff) !important;
        color: var(--color-fg-default, #1f2328) !important;
        min-height: 100vh;
      }
      body.dark-mode {
        background-color: var(--color-canvas-default, #0d1117) !important;
        color: var(--color-fg-default, #e6edf3) !important;
      }
    </style>
    <script>
      (function() {
        try {
          if (!localStorage.getItem('theme')) {
            localStorage.setItem('theme', 'dark-mode');
          }
          window.addEventListener('DOMContentLoaded', function() {
            var theme = localStorage.getItem('theme') || 'dark-mode';
            document.body.classList.remove('light-mode', 'dark-mode');
            document.body.classList.add(theme);
            // Si el reporte tiene un único test y estamos en la vista lista sin hash, abrir automáticamente el detalle del test
            setTimeout(function() {
              if (!window.location.hash || window.location.hash === '#') {
                var testLinks = document.querySelectorAll('.test-file-test a.test-file-path-link, .test-file-test a[href^="#?testId="]');
                if (testLinks.length === 1) {
                  testLinks[0].click();
                }
              }
            }, 250);
          });
        } catch (e) {}
      })();
    </script>`;
            html = html.replace('</head>', `${themeFixInjection}\n  </head>`);
            res.end(html);
            return;
          }

          fs.createReadStream(reportFile).pipe(res);
        } catch (err) {
          res.statusCode = 500;
          res.end(err.message);
        }
      });

      // 2. Sincronizar los archivos de la carpeta cargada a disco (.ci-workspaces/<setId>)
      server.middlewares.use('/api/ci-runner/sync-workspace', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const setId = String(payload.setId || `set-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            const folderName = payload.folderName || 'tests-workspace';
            const localFolderPath = payload.localFolderPath || '';
            const files = Array.isArray(payload.files) ? payload.files : [];

            const workspaceDir = path.join(WORKSPACES_ROOT, setId);
            ensureDir(workspaceDir);

            let writtenCount = 0;
            for (const f of files) {
              if (!f.relativePath || typeof f.content !== 'string') continue;
              const relParts = f.relativePath.replace(/\\/g, '/').split('/');
              const normalizedRel =
                relParts.length > 1 && relParts[0] === folderName
                  ? relParts.slice(1).join('/')
                  : relParts.join('/');

              const destPath = path.join(workspaceDir, normalizedRel);
              ensureDir(path.dirname(destPath));
              fs.writeFileSync(destPath, f.content, 'utf-8');
              writtenCount++;
            }

            const pkgJsonPath = path.join(workspaceDir, 'package.json');
            if (!fs.existsSync(pkgJsonPath)) {
              fs.writeFileSync(
                pkgJsonPath,
                JSON.stringify(
                  {
                    name: `ci-workspace-${setId}`,
                    private: true,
                    devDependencies: {
                      '@playwright/test': '^1.49.0',
                    },
                  },
                  null,
                  2
                ),
                'utf-8'
              );
            }

            const depInfo = resolveRunnerDependencies(workspaceDir, folderName, localFolderPath);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                setId,
                workspaceDir,
                writtenCount,
                depsReady: depInfo.ready,
                nodeModulesSource: depInfo.nodeModulesPath,
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
      });

      // 3. Ejecutar el Pipeline CI/CD Real: Provisionar -> Instalar/Vincular -> Ejecutar Runner Real -> Recolectar Reporte
      server.middlewares.use('/api/ci-runner/execute-pipeline', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const setId = String(payload.setId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
            const folderName = payload.folderName || '';
            const localFolderPath = payload.localFolderPath || '';
            const framework = payload.framework || 'playwright';
            const targetUrl = payload.targetUrl || 'http://localhost:5173';
            const filePath = payload.filePath || '';
            const testName = payload.testName || '';
            const files = Array.isArray(payload.files) ? payload.files : [];

            const workspaceDir = path.join(WORKSPACES_ROOT, setId);
            ensureDir(workspaceDir);

            const pipelineStages = [];
            const consoleLogs = [];

            // ETAPA 1: Sincronizar archivos del proyecto de pruebas en el Workspace físico
            const stage1Start = Date.now();
            for (const f of files) {
              if (!f.relativePath || typeof f.content !== 'string') continue;
              const relParts = f.relativePath.replace(/\\/g, '/').split('/');
              const normalizedRel =
                relParts.length > 1 && relParts[0] === folderName
                  ? relParts.slice(1).join('/')
                  : relParts.join('/');
              const destPath = path.join(workspaceDir, normalizedRel);
              ensureDir(path.dirname(destPath));
              fs.writeFileSync(destPath, f.content, 'utf-8');
            }

            const pkgJsonPath = path.join(workspaceDir, 'package.json');
            if (!fs.existsSync(pkgJsonPath)) {
              fs.writeFileSync(
                pkgJsonPath,
                JSON.stringify(
                  {
                    name: `ci-workspace-${setId}`,
                    private: true,
                    devDependencies: {
                      '@playwright/test': '^1.49.0',
                    },
                  },
                  null,
                  2
                ),
                'utf-8'
              );
            }

            pipelineStages.push({
              name: '1. Provisionar Workspace & Archivos de Prueba',
              status: 'passed',
              durationMs: Date.now() - stage1Start,
              detail: `Directorio activo: ${workspaceDir}`,
            });
            consoleLogs.push(`[PIPELINE STAGE 1] Archivos sincronizados en: ${workspaceDir}`);

            // ETAPA 2: Instalar o vincular dependencias reales (@playwright/test, cypress, etc.)
            const stage2Start = Date.now();
            let depInfo = resolveRunnerDependencies(workspaceDir, folderName, localFolderPath);

            if (!depInfo.ready) {
              consoleLogs.push(`[PIPELINE STAGE 2] Ejecutando npm install en ${workspaceDir}...`);
              const installRes = await runProcess('npm', ['install', '--no-audit', '--no-fund'], workspaceDir, {}, true, 150000);
              consoleLogs.push(installRes.stdout);
              if (installRes.stderr) consoleLogs.push(installRes.stderr);
              depInfo = resolveRunnerDependencies(workspaceDir, folderName, localFolderPath);
            } else {
              consoleLogs.push(`[PIPELINE STAGE 2] Dependencias y binarios listos desde: ${depInfo.nodeModulesPath}`);
            }

            pipelineStages.push({
              name: '2. Instalar / Verificar Dependencias y Navegador',
              status: depInfo.ready ? 'passed' : 'failed',
              durationMs: Date.now() - stage2Start,
              detail: depInfo.ready
                ? `Runner listo (${depInfo.nodeModulesPath})`
                : 'No se encontró node_modules ni se pudo completar npm install',
            });

            // Normalizar ruta relativa del archivo de prueba dentro del workspace
            let relTestFile = filePath.replace(/\\/g, '/');
            if (folderName && relTestFile.startsWith(`${folderName}/`)) {
              relTestFile = relTestFile.slice(folderName.length + 1);
            }

            // ETAPA 3: Ejecutar las pruebas reales en navegador headless
            const stage3Start = Date.now();
            let execResult = null;
            let parsedSpecs = [];

            if (framework === 'playwright') {
              const configFileName = writePlaywrightCiConfig(workspaceDir, targetUrl);
              const resultsJsonPath = path.join(workspaceDir, 'ci-results.json');
              if (fs.existsSync(resultsJsonPath)) {
                try {
                  fs.unlinkSync(resultsJsonPath);
                } catch {}
              }

              const pwArgs = ['test'];
              if (relTestFile) {
                pwArgs.push(relTestFile);
              }
              pwArgs.push('-c', configFileName);
              if (testName) {
                pwArgs.push('-g', escapeRegex(testName));
              }

              if (depInfo.playwrightCliPath) {
                consoleLogs.push(
                  `[PIPELINE STAGE 3] Ejecutando Playwright Real: node "${depInfo.playwrightCliPath}" ${pwArgs.join(' ')}`
                );
                execResult = await runProcess(
                  process.execPath,
                  [depInfo.playwrightCliPath, ...pwArgs],
                  workspaceDir,
                  {
                    BASE_URL: targetUrl,
                    NODE_PATH: depInfo.nodeModulesPath,
                  },
                  false,
                  180000
                );
              } else {
                consoleLogs.push(`[PIPELINE STAGE 3] Ejecutando Playwright vía npx: npx playwright ${pwArgs.join(' ')}`);
                execResult = await runProcess(
                  'npx',
                  ['playwright', ...pwArgs],
                  workspaceDir,
                  { BASE_URL: targetUrl },
                  true,
                  180000
                );
              }

              if (execResult.stdout) consoleLogs.push(execResult.stdout);
              if (execResult.stderr) consoleLogs.push(execResult.stderr);

              if (fs.existsSync(resultsJsonPath)) {
                try {
                  const rawJson = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf-8'));
                  parsedSpecs = parsePlaywrightJsonReport(rawJson, workspaceDir);
                } catch (parseErr) {
                  consoleLogs.push(`[WARN] Error parseando ci-results.json: ${parseErr.message}`);
                }
              }
            } else if (framework === 'cypress') {
              const cyArgs = ['cypress', 'run', '--headless'];
              if (relTestFile) {
                cyArgs.push('--spec', relTestFile);
              }
              consoleLogs.push(`[PIPELINE STAGE 3] Ejecutando Cypress Real: npx ${cyArgs.join(' ')}`);
              execResult = await runProcess(
                'npx',
                cyArgs,
                workspaceDir,
                { CYPRESS_BASE_URL: targetUrl, NODE_PATH: depInfo.nodeModulesPath },
                true,
                180000
              );
              if (execResult.stdout) consoleLogs.push(execResult.stdout);
              if (execResult.stderr) consoleLogs.push(execResult.stderr);
            } else {
              const cmd = relTestFile.endsWith('.py') ? 'pytest' : relTestFile.endsWith('.java') ? 'mvn' : 'node';
              const args = relTestFile.endsWith('.java') ? ['test'] : [relTestFile];
              consoleLogs.push(`[PIPELINE STAGE 3] Ejecutando Selenium Real: ${cmd} ${args.join(' ')}`);
              execResult = await runProcess(cmd, args, workspaceDir, { BASE_URL: targetUrl }, true, 180000);
              if (execResult.stdout) consoleLogs.push(execResult.stdout);
              if (execResult.stderr) consoleLogs.push(execResult.stderr);
            }

            const hasHtmlReport = fs.existsSync(path.join(workspaceDir, 'playwright-report', 'index.html'));
            const reportUrl = hasHtmlReport ? `/api/ci-runner/report/${setId}/index.html?t=${Date.now()}` : null;

            pipelineStages.push({
              name: `3. Ejecutar Pruebas en Navegador Headless (${framework.toUpperCase()})`,
              status: execResult?.exitCode === 0 ? 'passed' : 'failed',
              durationMs: Date.now() - stage3Start,
              detail: `Exit Code: ${execResult?.exitCode ?? 1} · Duración real: ${execResult?.durationMs ?? 0}ms`,
            });

            pipelineStages.push({
              name: '4. Generar Reporte Oficial & Capturas PNG',
              status: parsedSpecs.length > 0 || hasHtmlReport ? 'passed' : 'failed',
              durationMs: 30,
              detail: hasHtmlReport
                ? `playwright-report/index.html y ${parsedSpecs.length} test(s) con capturas PNG generados en disco`
                : `${parsedSpecs.length} resultado(s) procesados`,
            });

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                exitCode: execResult?.exitCode ?? 1,
                durationMs: execResult?.durationMs ?? 0,
                workspaceDir,
                reportUrl,
                pipelineStages,
                parsedSpecs,
                consoleOutput: consoleLogs.filter(Boolean).join('\n'),
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                ok: false,
                error: err.message,
              })
            );
          }
        });
      });
    },
  };
}
