import { useState } from 'react';
import {
  BellRing,
  CircleCheck,
  TriangleAlert,
  CircleX,
  Info,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useToast, useToastList } from '../../context/ToastContext';
import LocatorHint from '../../components/qa/LocatorHint';

export default function EphemeralToastsSection() {
  const toast = useToast();
  const toasts = useToastList();
  const [deletedFile, setDeletedFile] = useState(false);

  const handleFireUndo = () => {
    setDeletedFile(true);
    toast.warning('Archivo eliminado', 'Se ha borrado "reporte_anual_2026.pdf"', {
      duration: 6000,
      action: {
        label: 'Deshacer eliminación',
        onClick: () => {
          setDeletedFile(false);
          toast.success('Restaurado', 'El archivo ha sido recuperado con éxito.');
        },
      },
    });
  };

  return (
    <div data-testid="ephemeral-toasts-section" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-moss-900">
            Notificaciones Efímeras (Toasts con Barra de Progreso y Pausa en Hover)
          </h3>
          <p className="text-sm text-moss-600">
            Los toasts se apilan en la esquina inferior derecha. Pasar el cursor por encima pausa la
            cuenta regresiva y evita que se cierren mientras el usuario los lee.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-moss text-xs font-mono">
            Activos en DOM:{' '}
            <strong data-testid="active-toasts-count" className="ml-1 text-moss-900">
              {toasts.length}
            </strong>
          </span>
          {toasts.length > 0 && (
            <button
              type="button"
              onClick={toast.clearAll}
              data-testid="clear-all-toasts-btn"
              className="btn btn-secondary btn-sm text-xs"
            >
              <Trash2 className="h-3 w-3" /> Cerrar todos
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Toast de Éxito */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-moss-600" />
            <h4 className="font-bold text-sm text-moss-900">Toast de Éxito (4s)</h4>
          </div>
          <p className="text-xs text-moss-600">Dispara un toast tipo "success" de 4 segundos.</p>
          <button
            type="button"
            onClick={() => toast.success('Operación exitosa', 'Los cambios se guardaron en la base de datos.')}
            data-testid="trigger-toast-success-btn"
            className="btn btn-primary btn-sm w-full"
          >
            Disparar Success Toast
          </button>
        </div>

        {/* Toast con Botón de Acción / Deshacer */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-warning-600" />
            <h4 className="font-bold text-sm text-moss-900">Toast con Acción "Deshacer"</h4>
          </div>
          <p className="text-xs text-moss-600">
            Contiene un botón interactivo que cancela la acción si se pulsa a tiempo.
          </p>
          <button
            type="button"
            onClick={handleFireUndo}
            data-testid="trigger-toast-undo-btn"
            className="btn btn-warning btn-sm w-full text-white"
          >
            Eliminar y permitir Deshacer
          </button>
        </div>

        {/* Toast de Error Persistente */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CircleX className="h-4 w-4 text-danger-500" />
            <h4 className="font-bold text-sm text-moss-900">Toast de Error Persistente</h4>
          </div>
          <p className="text-xs text-moss-600">
            No tiene temporizador de cierre automático. Requiere clic en el botón X de cierre.
          </p>
          <button
            type="button"
            onClick={() =>
              toast.error(
                'Fallo de Conexión',
                'El socket de red no pudo conectarse. Debe cerrarse manualmente.',
                { duration: 0 },
              )
            }
            data-testid="trigger-toast-persistent-btn"
            className="btn btn-danger btn-sm w-full"
          >
            Disparar Error Persistente
          </button>
        </div>
      </div>
    </div>
  );
}
