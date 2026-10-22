import { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Code2,
  Frame,
} from 'lucide-react';
import LocatorHint from '../../components/qa/LocatorHint';
import { Spinner } from '../../components/ui/Primitives';
import { cn } from '../../utils/format';

export default function DynamicLifecycleSection() {
  // 1. Elemento con renderizado diferido (delayed)
  const [showDelayed, setShowDelayed] = useState(false);
  const [delayedLoading, setDelayedLoading] = useState(false);

  const handleTriggerDelayed = () => {
    setShowDelayed(false);
    setDelayedLoading(true);
    setTimeout(() => {
      setDelayedLoading(false);
      setShowDelayed(true);
    }, 3200);
  };

  // 2. Elemento que desaparece a los 4 segundos
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [disappearSeconds, setDisappearSeconds] = useState(4);

  const handleTriggerDisappearing = () => {
    setShowDisappearing(true);
    setDisappearSeconds(4);
  };

  useEffect(() => {
    if (!showDisappearing) return;
    const interval = setInterval(() => {
      setDisappearSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setShowDisappearing(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showDisappearing]);

  // 3. Elemento Mutante (cambia atributos cada 2s)
  const [mutationIndex, setMutationIndex] = useState(0);
  const MUTATION_STATES = [
    { label: 'Estado Inicial: NORMAL', tone: 'badge-gray', code: 'IDLE' },
    { label: 'Estado Secundario: EN PROCESO', tone: 'badge-yellow', code: 'PROCESSING' },
    { label: 'Estado Terciario: SINCRONIZADO', tone: 'badge-green', code: 'SYNCED' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMutationIndex((i) => (i + 1) % MUTATION_STATES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [MUTATION_STATES.length]);

  // 4. Polling Asíncrono con barra de progreso
  const [pollingStatus, setPollingStatus] = useState('idle'); // idle | running | done | error
  const [pollingProgress, setPollingProgress] = useState(0);
  const [shouldFailAt60, setShouldFailAt60] = useState(false);

  const startPollingTask = () => {
    setPollingStatus('running');
    setPollingProgress(0);

    const interval = setInterval(() => {
      setPollingProgress((prev) => {
        if (shouldFailAt60 && prev >= 60) {
          clearInterval(interval);
          setPollingStatus('error');
          return 60;
        }
        if (prev >= 100) {
          clearInterval(interval);
          setPollingStatus('done');
          return 100;
        }
        return prev + 20;
      });
    }, 700);
  };

  // 5. Shadow DOM Ref
  const shadowHostRef = useRef(null);
  useEffect(() => {
    if (shadowHostRef.current && !shadowHostRef.current.shadowRoot) {
      const shadow = shadowHostRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .shadow-box {
            padding: 1rem;
            background: #18251e;
            color: #ecebe4;
            border-radius: 0.75rem;
            font-family: inherit;
          }
          .shadow-btn {
            background: #588157;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 600;
            margin-top: 0.5rem;
          }
          .shadow-btn:hover { background: #3a5a40; }
        </style>
        <div class="shadow-box" data-testid="shadow-inner-box">
          <p style="margin: 0; font-size: 0.85rem; font-weight: bold;">Contenido Encapsulado en Shadow Root</p>
          <p style="margin: 0.25rem 0; font-size: 0.75rem; color: #a3b18a;">Para interactuar aquí, tu herramienta de automatización debe penetrar el Shadow DOM.</p>
          <input type="text" id="shadow-input" data-testid="shadow-inner-input" placeholder="Escribe en Shadow DOM..." style="padding: 0.4rem; border-radius: 0.25rem; border: 1px solid #588157; width: 80%; background: #263a30; color: white;" />
          <br/>
          <button type="button" class="shadow-btn" data-testid="shadow-inner-btn" onclick="alert('¡Clic detectado dentro del Shadow DOM!')">
            Botón Shadow Root
          </button>
        </div>
      `;
    }
  }, []);

  return (
    <div data-testid="dynamic-lifecycle-section" className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-moss-900">
          Ciclos de Vida Dinámicos, Mutaciones, Shadow DOM e iFrames
        </h3>
        <p className="text-sm text-moss-600">
          Prueba de aserciones de visibilidad, polling de tareas en background, elementos que se
          autodestruyen y penetración de árboles de DOM encapsulados.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* CASO 1: Renderizado con Retardo (3.2 segundos) */}
        <div className="card p-5 space-y-4" data-testid="delayed-rendering-card">
          <h4 className="font-bold text-sm text-moss-900">1. Renderizado con Retardo (3.2s)</h4>
          <p className="text-xs text-moss-600">
            El elemento no existe en el DOM hasta que transcurren los 3.2 segundos.
          </p>
          <button
            type="button"
            onClick={handleTriggerDelayed}
            disabled={delayedLoading}
            data-testid="trigger-delayed-render-btn"
            className="btn btn-secondary btn-sm w-full"
          >
            {delayedLoading ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{delayedLoading ? 'Esperando 3.2s...' : 'Disparar Aparición'}</span>
          </button>

          {showDelayed && (
            <div
              data-testid="delayed-rendered-element"
              className="rounded-xl bg-moss-600/10 border border-moss-600/30 p-3 text-xs font-bold text-moss-800 animate-slide-up flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-moss-600" />
              <span>¡Elemento renderizado tras 3.2 segundos!</span>
            </div>
          )}
        </div>

        {/* CASO 2: Elemento que Desaparece a los 4s */}
        <div className="card p-5 space-y-4" data-testid="disappearing-card">
          <h4 className="font-bold text-sm text-moss-900">2. Elemento Efímero (Auto-destrucción 4s)</h4>
          <p className="text-xs text-moss-600">
            Aparece y luego se desmonta permanentemente tras 4 segundos exactos.
          </p>
          <button
            type="button"
            onClick={handleTriggerDisappearing}
            disabled={showDisappearing}
            data-testid="trigger-disappearing-btn"
            className="btn btn-secondary btn-sm w-full"
          >
            <Play className="h-4 w-4" /> Disparar Elemento Efímero
          </button>

          {showDisappearing && (
            <div
              data-testid="disappearing-element"
              className="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs font-bold text-danger-700 animate-fade-in flex items-center justify-between"
            >
              <span>Desapareciendo en...</span>
              <span className="font-mono text-base">{disappearSeconds}s</span>
            </div>
          )}
        </div>

        {/* CASO 3: Elemento Mutante Periódico */}
        <div className="card p-5 space-y-4" data-testid="mutating-card">
          <h4 className="font-bold text-sm text-moss-900">3. Elemento con Mutación Continua</h4>
          <p className="text-xs text-moss-600">
            Cambia su data-state y clase cada 2.5s para evaluar esperas de atributos específicos.
          </p>

          <div className="pt-2">
            <span
              data-testid="mutating-state-badge"
              data-state={MUTATION_STATES[mutationIndex].code}
              className={cn('badge text-xs font-mono py-1 px-3', MUTATION_STATES[mutationIndex].tone)}
            >
              {MUTATION_STATES[mutationIndex].label}
            </span>
          </div>
          <LocatorHint testId="mutating-state-badge" />
        </div>
      </div>

      {/* CASO 4: POLLING DE TAREA EN BACKGROUND */}
      <section className="card p-6 space-y-4" data-testid="polling-task-section">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-moss-900">
              4. Polling de Tarea Asíncrona (0% → 100%)
            </h4>
            <p className="text-xs text-moss-600">
              Simula un proceso por lotes donde el script debe consultar el estado periódicamente
              hasta llegar a "done".
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-moss-700 cursor-pointer">
            <input
              type="checkbox"
              checked={shouldFailAt60}
              onChange={(e) => setShouldFailAt60(e.target.checked)}
              data-testid="polling-inject-failure-cb"
              className="checkbox"
            />
            <span>Inyectar fallo en 60%</span>
          </label>
        </div>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span>
              Estado:{' '}
              <strong
                data-testid="polling-status-text"
                className={cn(
                  pollingStatus === 'done'
                    ? 'text-moss-700'
                    : pollingStatus === 'error'
                    ? 'text-danger-600'
                    : 'text-moss-900',
                )}
              >
                {pollingStatus.toUpperCase()}
              </strong>
            </span>
            <span data-testid="polling-progress-percentage">{pollingProgress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-moss-200 overflow-hidden">
            <div
              data-testid="polling-progress-bar"
              style={{ width: `${pollingProgress}%` }}
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                pollingStatus === 'error' ? 'bg-danger-500' : 'bg-moss-600',
              )}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={startPollingTask}
          disabled={pollingStatus === 'running'}
          data-testid="start-polling-task-btn"
          className="btn btn-primary btn-sm"
        >
          {pollingStatus === 'running' ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span>{pollingStatus === 'running' ? 'Procesando Polling...' : 'Iniciar Tarea'}</span>
        </button>
      </section>

      {/* CASO 5: SHADOW DOM & IFRAME */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shadow DOM Host */}
        <section className="card p-6 space-y-4" data-testid="shadow-dom-card">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-moss-600" />
            <h4 className="font-bold text-sm text-moss-900">5. Shadow DOM Encapsulado</h4>
          </div>
          <p className="text-xs text-moss-600">
            Contenedor con Shadow Root nativo. Ideal para validar selectores de Playwright (soporte
            nativo) vs Cypress/Selenium (necesitan traversal explícito).
          </p>

          <div ref={shadowHostRef} data-testid="shadow-host-root" />
        </section>

        {/* Iframe Integrado */}
        <section className="card p-6 space-y-4" data-testid="iframe-card">
          <div className="flex items-center gap-2">
            <Frame className="h-5 w-5 text-moss-600" />
            <h4 className="font-bold text-sm text-moss-900">6. iFrame con Contenido Aislado</h4>
          </div>
          <p className="text-xs text-moss-600">
            Marco HTML independiente (frame switching en Selenium, `frameLocator` en Playwright).
          </p>

          <iframe
            data-testid="embedded-qa-iframe"
            title="iFrame de Pruebas QA"
            className="w-full h-44 rounded-xl border border-moss-300 bg-white"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: sans-serif; padding: 16px; background: #ecebe4; color: #263a30; margin: 0; }
                    button { background: #588157; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                    button:hover { background: #3a5a40; }
                    input { padding: 6px; border-radius: 6px; border: 1px solid #a3b18a; margin-top: 6px; }
                  </style>
                </head>
                <body>
                  <h4 style="margin: 0 0 8px 0; font-size: 13px;">Documento Dentro del iFrame</h4>
                  <input id="iframe-input" data-testid="iframe-inner-input" placeholder="Escribe en el iframe..." />
                  <br/><br/>
                  <button id="iframe-btn" data-testid="iframe-inner-btn" onclick="document.getElementById('iframe-result').innerText = '¡Clic adentro del iframe confirmado!'">
                    Hacer Clic Adentro
                  </button>
                  <p id="iframe-result" data-testid="iframe-result-text" style="font-size: 11px; font-weight: bold; margin-top: 8px; color: #344e41;"></p>
                </body>
              </html>
            `}
          />
        </section>
      </div>
    </div>
  );
}
