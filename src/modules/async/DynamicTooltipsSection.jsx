import { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Download,
  Info,
  CheckCircle2,
  Sparkles,
  MousePointerClick,
  Timer,
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import LocatorHint from '../../components/qa/LocatorHint';
import { simulateRequest } from '../../services/network';
import { Spinner } from '../../components/ui/Primitives';

export default function DynamicTooltipsSection() {
  const [clickPopoverOpen, setClickPopoverOpen] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  // Carga asíncrona simulada de datos remotos al abrir el tooltip
  const fetchRemoteMetrics = async () => {
    return await simulateRequest(
      () => {
        return (
          <div className="space-y-1">
            <p className="font-bold text-white">Telemetría de Servidor en Vivo:</p>
            <p className="text-[11px] text-moss-300">CPU: 24.8% · Memoria: 4.2 GB / 16 GB</p>
            <p className="text-[11px] text-moss-300">Peticiones/seg: 1,420 RPS</p>
          </div>
        );
      },
      { minDelay: 1200, maxDelay: 2000, canFail: false },
    );
  };

  return (
    <div data-testid="dynamic-tooltips-section" className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-moss-900">
          Tooltips Dinámicos, Retardos y Contenido Asíncrono
        </h3>
        <p className="text-sm text-moss-600">
          Desafíos de automatización: elementos que no existen en el DOM hasta que el puntero pasa
          sobre ellos, tooltips que esperan respuestas de red y elementos efímeros que se auto-ocultan.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Caso 1: Tooltip Rápido (100ms) */}
        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="badge badge-green text-[10px] mb-2">Hover Inmediato</span>
            <h4 className="font-bold text-sm text-moss-900">Tooltip Rápido (100ms)</h4>
            <p className="text-xs text-moss-600 mt-1">
              Aparece casi instantáneamente al posar el cursor o enfocar con Tab.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip
              content="Información contextual inmediata."
              delay={100}
              testId="tooltip-fast"
            >
              <button
                type="button"
                data-testid="tooltip-fast-trigger"
                className="btn btn-secondary btn-sm w-full"
              >
                <Info className="h-4 w-4" /> Posar Cursor (100ms)
              </button>
            </Tooltip>
            <LocatorHint testId="tooltip-fast-trigger" />
          </div>
        </div>

        {/* Caso 2: Tooltip Lento con Retardo Intencional (900ms) */}
        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="badge badge-yellow text-[10px] mb-2">Hover Retardado</span>
            <h4 className="font-bold text-sm text-moss-900">Tooltip con Retardo (900ms)</h4>
            <p className="text-xs text-moss-600 mt-1">
              Requiere que el script de automatización espere explícitamente el tiempo de gracia.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip
              content="Apareció tras 900ms de mantener el hover sostenido."
              delay={900}
              testId="tooltip-slow"
            >
              <button
                type="button"
                data-testid="tooltip-slow-trigger"
                className="btn btn-secondary btn-sm w-full"
              >
                <Clock className="h-4 w-4" /> Hover Sostenido (900ms)
              </button>
            </Tooltip>
            <LocatorHint testId="tooltip-slow-trigger" />
          </div>
        </div>

        {/* Caso 3: Tooltip Asíncrono con Petición Remota */}
        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="badge badge-blue text-[10px] mb-2">Async Data Fetch</span>
            <h4 className="font-bold text-sm text-moss-900">Tooltip Asíncrono (Red)</h4>
            <p className="text-xs text-moss-600 mt-1">
              Muestra un spinner inicial y resuelve su contenido tras simular una petición HTTP.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip
              content={fetchRemoteMetrics}
              delay={200}
              testId="tooltip-async"
            >
              <button
                type="button"
                data-testid="tooltip-async-trigger"
                className="btn btn-secondary btn-sm w-full"
              >
                <Sparkles className="h-4 w-4 text-info-600" /> Carga Remota (Red)
              </button>
            </Tooltip>
            <LocatorHint testId="tooltip-async-trigger" />
          </div>
        </div>

        {/* Caso 4: Tooltip Auto-Ocultable (3000ms) */}
        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="badge badge-red text-[10px] mb-2">Desaparición Automática</span>
            <h4 className="font-bold text-sm text-moss-900">Auto-ocultado (3s)</h4>
            <p className="text-xs text-moss-600 mt-1">
              Aparece y se desmonta automáticamente a los 3 segundos, aunque no se mueva el ratón.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip
              content="¡Este tooltip expira y se destruye a los 3 segundos exactos!"
              delay={100}
              autoHideMs={3000}
              testId="tooltip-autohide"
            >
              <button
                type="button"
                data-testid="tooltip-autohide-trigger"
                className="btn btn-secondary btn-sm w-full"
              >
                <Timer className="h-4 w-4 text-danger-500" /> Auto-desaparición (3s)
              </button>
            </Tooltip>
            <LocatorHint testId="tooltip-autohide-trigger" />
          </div>
        </div>
      </div>
    </div>
  );
}
