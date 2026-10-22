import { useState } from 'react';
import {
  Layers,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import Modal, { getOpenModalCount } from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { useToast } from '../../context/ToastContext';

export default function NestedModalsSection() {
  const toast = useToast();

  const [modal1Open, setModal1Open] = useState(false);
  const [modal2Open, setModal2Open] = useState(false);
  const [modal3Open, setModal3Open] = useState(false);

  const [signerName, setSignerName] = useState('');
  const [signedSuccess, setSignedSuccess] = useState(false);

  const handleFinishLevel3 = () => {
    if (!signerName.trim()) return;
    setSignedSuccess(true);
    setModal3Open(false);
    setModal2Open(false);
    setModal1Open(false);
    toast.success('Proceso completado', `Firma validada por ${signerName}.`);
  };

  return (
    <div data-testid="nested-modals-section" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-moss-900">
            Modales Superpuestos (Pila de 3 Niveles con Focus Trap)
          </h3>
          <p className="text-sm text-moss-600">
            Cada modal se apila en el DOM con z-index incremental. Presionar la tecla{' '}
            <kbd className="kbd">Esc</kbd> o hacer clic en el backdrop debe cerrar{' '}
            <strong>únicamente el modal activo en la cima de la pila</strong>.
          </p>
        </div>
      </div>

      <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-200 text-moss-700">
          <Layers className="h-8 w-8" />
        </div>
        <h4 className="text-base font-bold text-moss-900">
          Flujo de Aprobación Jerárquica de 3 Fases
        </h4>
        <p className="text-xs text-moss-600 max-w-md">
          Inicia el modal de Nivel 1. Desde su interior podrás abrir el Nivel 2, y desde este
          último el Nivel 3.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSignedSuccess(false);
              setSignerName('');
              setModal1Open(true);
            }}
            data-testid="open-modal-level-1-btn"
            className="btn btn-primary"
          >
            <ExternalLink className="h-4 w-4" /> Abrir Modal Nivel 1 (Configuración)
          </button>
          <LocatorHint testId="open-modal-level-1-btn" />
        </div>

        {signedSuccess && (
          <div
            data-testid="modal-signed-success-banner"
            className="rounded-xl bg-moss-600/10 border border-moss-600/30 p-3 text-xs text-moss-800 font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-moss-600" />
            <span>Firma de 3 niveles completada con éxito por "{signerName}".</span>
          </div>
        )}
      </div>

      {/* MODAL NIVEL 1 */}
      <Modal
        open={modal1Open}
        onClose={() => setModal1Open(false)}
        title="Nivel 1: Configuración de Políticas"
        description="Paso inicial del flujo de privilegios elevados."
        testId="nested-modal-level-1"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModal1Open(false)}
              data-testid="modal-level-1-cancel-btn"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModal2Open(true)}
              data-testid="open-modal-level-2-btn"
            >
              <span>Continuar a Nivel 2</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-moss-800">
          <p>
            Estás en el <strong>Nivel 1</strong>. Presiona el botón siguiente para disparar el
            segundo modal superpuesto sin desmontar este.
          </p>
          <div className="rounded-xl bg-moss-50 p-3 font-mono text-xs text-moss-700">
            data-modal-level="1"
          </div>
        </div>
      </Modal>

      {/* MODAL NIVEL 2 */}
      <Modal
        open={modal2Open}
        onClose={() => setModal2Open(false)}
        title="Nivel 2: Advertencia de Seguridad Crítica"
        description="Esta acción requiere confirmación de credenciales."
        testId="nested-modal-level-2"
        icon={ShieldAlert}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModal2Open(false)}
              data-testid="modal-level-2-back-btn"
            >
              Volver a Nivel 1
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => setModal3Open(true)}
              data-testid="open-modal-level-3-btn"
            >
              <span>Confirmar y Pasar a Nivel 3 (Firma)</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-moss-800">
          <p>
            Estás en el <strong>Nivel 2</strong>. El Nivel 1 continúa por debajo con su fondo
            oscurecido. Si presionas <kbd className="kbd">Esc</kbd>, solo este modal se cerrará.
          </p>
          <div className="rounded-xl bg-warning-50 p-3 font-mono text-xs text-warning-800">
            data-modal-level="2"
          </div>
        </div>
      </Modal>

      {/* MODAL NIVEL 3 */}
      <Modal
        open={modal3Open}
        onClose={() => setModal3Open(false)}
        title="Nivel 3: Firma Criptográfica Final"
        description="Ingresa tu nombre para autorizar la operación."
        testId="nested-modal-level-3"
        icon={KeyRound}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModal3Open(false)}
              data-testid="modal-level-3-back-btn"
            >
              Volver a Nivel 2
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!signerName.trim()}
              onClick={handleFinishLevel3}
              data-testid="modal-level-3-submit-btn"
            >
              Firmar y Cerrar Todo
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-moss-700">
            Cúspide de la pila (Nivel 3). Escribe tu firma para confirmar la transacción:
          </p>
          <input
            type="text"
            data-autofocus
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Tu nombre completo..."
            data-testid="modal-level-3-signer-input"
            className="input"
          />
        </div>
      </Modal>
    </div>
  );
}
