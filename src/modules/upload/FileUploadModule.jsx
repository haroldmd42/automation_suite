import { useState, useRef, useCallback } from 'react';
import {
  FileUp,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  FolderArchive,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UploadCloud,
  Eye,
  Check,
  History,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { PageHeader, Panel, EmptyState, Spinner } from '../../components/ui/Primitives';
import Modal from '../../components/ui/Modal';
import LocatorHint from '../../components/qa/LocatorHint';
import { useToast } from '../../context/ToastContext';
import { cn, formatTime } from '../../utils/format';
import {
  UPLOAD_ZONES,
  validateFileForZone,
  formatFileSize,
} from './uploadData';

const LOG_TONE = {
  info: 'text-info-200',
  success: 'text-moss-300',
  warning: 'text-warning-200',
  error: 'text-danger-200',
};

export default function FileUploadModule() {
  const toast = useToast();

  // Errores independientes para cada zona (id de zona -> mensaje de error o null)
  const [zoneErrors, setZoneErrors] = useState({});

  // Estados de arrastre independientes por zona
  const [draggingZones, setDraggingZones] = useState({});

  // Estados de procesamiento / carga activa por zona
  const [processingZones, setProcessingZones] = useState({});

  // Lista consolidada de archivos cargados y procesados correctamente
  const [processedFiles, setProcessedFiles] = useState([]);

  // Archivo seleccionado para el modal de ficha técnica
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  // Referencias a los inputs de archivos de cada zona
  const inputRefs = {
    pdf: useRef(null),
    image: useRef(null),
    data: useRef(null),
    batch: useRef(null),
  };

  // Historial de eventos para aserciones QA (data-tone)
  const [events, setEvents] = useState(() => [
    {
      id: `evt-init`,
      time: formatTime(),
      tone: 'info',
      message: 'Módulo de Carga de Archivos inicializado con 4 zonas de reglas especializadas.',
    },
  ]);

  const addEvent = useCallback((message, tone = 'info') => {
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: formatTime(),
        tone,
        message,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

      // Procesamiento y validación para una zona específica
      const handleZoneFiles = useCallback(
        async (zone, incomingFiles) => {
          const files = Array.from(incomingFiles || []);
          if (files.length === 0) return;

          // Validación para zona de lote múltiple (número de archivos y peso total)
          if (zone.multiple) {
            if (files.length > zone.maxFilesPerBatch) {
              const err = `El lote contiene ${files.length} archivos y supera el máximo permitido de ${zone.maxFilesPerBatch} archivos.`;
              setZoneErrors((prev) => ({ ...prev, [zone.id]: err }));
              addEvent(`[${zone.badge}] Error de lote: ${err}`, 'error');
              toast.error(err);
              return;
            }

              const totalBatchSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
              if (totalBatchSize > zone.maxBatchSizeBytes) {
                const err = `El peso acumulado del lote (${formatFileSize(totalBatchSize)}) supera el límite máximo de ${formatFileSize(zone.maxBatchSizeBytes)}.`;
                setZoneErrors((prev) => ({ ...prev, [zone.id]: err }));
                addEvent(`[${zone.badge}] Error de lote: ${err}`, 'error');
                toast.error(err);
                return;
              }
            }

            // Validar cada archivo con las reglas individuales de la zona
            for (const file of files) {
              const validation = validateFileForZone(file, zone, processedFiles);
              if (!validation.isValid) {
                // Mostrar el error exactamente debajo del campo de esta zona
                setZoneErrors((prev) => ({ ...prev, [zone.id]: validation.errorMessage }));
                addEvent(
                  `[${zone.badge}] Rechazado "${file.name}": ${validation.errorMessage}`,
                  'error'
                );
                toast.error(validation.errorMessage);
                return;
              }
            }

            // Si todos los archivos de esta subida son válidos, limpiar el error de la zona
            setZoneErrors((prev) => ({ ...prev, [zone.id]: null }));
            setProcessingZones((prev) => ({ ...prev, [zone.id]: true }));

            // Simular procesamiento asíncrono realista (500 ms)
            await new Promise((res) => setTimeout(res, 500));

            const newProcessed = files.map((file) => {
              const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
                return {
                  id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  name: file.name,
                  size: file.size,
                  extension: ext,
                  mimeType: file.type || 'application/octet-stream',
                  zoneId: zone.id,
                  zoneBadge: zone.badge,
                  zoneTitle: zone.title,
                  processedAt: new Date().toISOString(),
                  timeLabel: formatTime(),
                };
        });

      setProcessedFiles((prev) => [...newProcessed, ...prev]);
      setProcessingZones((prev) => ({ ...prev, [zone.id]: false }));

      const names = files.map((f) => `"${f.name}"`).join(', ');
      addEvent(`[${zone.badge}] Archivo(s) procesado(s) exitosamente: ${names}.`, 'success');
      toast.success(
        files.length === 1
          ? 'Archivo cargado y procesado correctamente.'
          : `${files.length} archivos cargados y procesados correctamente.`
      );
    },
    [processedFiles, addEvent, toast]
  );

      // Manejador del input nativo para una zona
      const handleInputChange = (zone, e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          handleZoneFiles(zone, files);
        }
        e.target.value = '';
      };

        // Manejadores de Drag & Drop por zona
        const handleDragOver = (zoneId, e) => {
          e.preventDefault();
          e.stopPropagation();
          setDraggingZones((prev) => ({ ...prev, [zoneId]: true }));
        };

          const handleDragLeave = (zoneId, e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraggingZones((prev) => ({ ...prev, [zoneId]: false }));
          };

            const handleDrop = (zone, e) => {
              e.preventDefault();
              e.stopPropagation();
                setDraggingZones((prev) => ({ ...prev, [zone.id]: false }));
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  handleZoneFiles(zone, files);
                }
              };

                  // Eliminar un archivo procesado
                  const handleRemoveProcessedFile = (id) => {
                    setProcessedFiles((prev) => {
                      const target = prev.find((f) => f.id === id);
                      if (target) {
                        addEvent(`Archivo removido de los procesados: "${target.name}".`, 'info');
                      }
                      return prev.filter((f) => f.id !== id);
                    });
                    toast.info('Archivo removido.');
                  };

                    // Limpiar todos los archivos procesados
                    const handleClearAllProcessed = () => {
                      setProcessedFiles([]);
                      addEvent('Lista de archivos procesados vaciada.', 'info');
                      toast.info('Lista de archivos procesados limpiada.');
                    };

                    // Restablecer módulo completo
                    const handleResetModule = () => {
                      setProcessedFiles([]);
                      setZoneErrors({});
                      setDraggingZones({});
                      setProcessingZones({});
                      setSelectedFileForPreview(null);
                      setEvents([
                        {
                          id: `evt-reset`,
                          time: formatTime(),
                          tone: 'info',
                          message: 'Módulo y zonas de carga restablecidas.',
                        },
                      ]);
                      toast.info('Módulo restablecido.');
                    };

                      // Icono para la extensión
                      const getExtensionIcon = (ext) => {
                        const lower = (ext || '').toLowerCase();
                        if (['png', 'jpg', 'jpeg', 'webp'].includes(lower)) return ImageIcon;
                        if (['xlsx', 'csv'].includes(lower)) return FileSpreadsheet;
                        if (['pdf'].includes(lower)) return FileText;
                        if (['docx', 'doc'].includes(lower)) return FileCode;
                        return FileUp;
                      };

                      // Icono representativo para cada zona
                      const getZoneIcon = (zoneId) => {
                        switch (zoneId) {
                          case 'pdf':
                            return FileText;
                          case 'image':
                            return ImageIcon;
                          case 'data':
                            return FileSpreadsheet;
                          case 'batch':
                            return FolderArchive;
                          default:
                            return FileUp;
                        }
                      };

                      return (
                          <div data-testid="upload-module-page" className="space-y-8">
                            {/* Encabezado del Módulo con estilo oficial */}
                            <PageHeader
                              icon={FileUp}
                              eyebrow="Módulo 07"
                              title="Carga de Archivos y Validaciones QA"
                              description="Laboratorio con 4 zonas de carga especializadas con reglas independientes de formato, tamaño (mín/máx), nomenclatura segura y registro inmediato de archivos procesados correctamente."
                              testId="upload-header"
                              actions={
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="badge badge-green" data-testid="upload-zones-count-badge">
                                      <CheckCircle2 className="h-3 w-3" /> 4 Zonas de Reglas Activas
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={handleResetModule}
                                      data-testid="upload-reset-module-btn"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" /> Restablecer Zonas
                                    </button>
                                </div>
                              }
                            />

                                    {/* Grid de las 4 Zonas de Carga con Reglas y Validaciones Independientes */}
                                    <div>
                                      <div className="mb-4 flex items-center justify-between">
                                        <div>
                                          <h2 className="text-lg font-bold text-moss-900">Zonas de Carga Especializadas</h2>
                                          <p className="text-xs text-moss-600">
                                            Cada zona evalúa sus propias políticas. Los mensajes de validación se muestran directamente debajo de cada campo.
                                          </p>
                                        </div>
                                      </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                      {UPLOAD_ZONES.map((zone) => {
                                        const ZoneIcon = getZoneIcon(zone.id);
                                        const isDragging = !!draggingZones[zone.id];
                                        const isProcessing = !!processingZones[zone.id];
                                        const errorMessage = zoneErrors[zone.id];

            return (
              <div
                key={zone.id}
                data-testid={`upload-zone-card-${zone.id}`}
                className="flex flex-col justify-between rounded-3xl border border-moss-200 bg-white/95 p-6 shadow-soft backdrop-blur transition-all duration-200"
              >
                <div>
                  {/* Encabezado de la Zona */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-100 text-moss-700 ring-1 ring-moss-200">
                        <ZoneIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-moss-600/10 px-2 py-0.5 text-[10px] font-bold text-moss-800 ring-1 ring-moss-600/20">
                            {zone.badge}
                          </span>
                          <LocatorHint testId={`upload-zone-${zone.id}-input`} />
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-moss-900">{zone.title}</h3>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-moss-600 leading-relaxed">{zone.description}</p>

                                          {/* Resumen de Reglas de la Zona */}
                                          <div className="mt-3 rounded-xl bg-moss-50/70 px-3 py-2 text-[11px] font-medium text-moss-700 ring-1 ring-moss-200/70">
                                            <strong>Reglas:</strong> {zone.rulesSummary}
                                          </div>

                                            {/* Input Nativo Oculto pero 100% Accesible para Playwright y Cypress */}
                                            <input
                                              ref={inputRefs[zone.id]}
                                              type="file"
                                              multiple={zone.multiple}
                                              accept={zone.accept}
                                              onChange={(e) => handleInputChange(zone, e)}
                                              data-testid={`upload-zone-${zone.id}-input`}
                                              className="hidden"
                                            />

                                            {/* Campo de Carga / Dropzone */}
                                            <div
                                              onDragOver={(e) => handleDragOver(zone.id, e)}
                                              onDragLeave={(e) => handleDragLeave(zone.id, e)}
                                              onDrop={(e) => handleDrop(zone, e)}
                                              onClick={() => inputRefs[zone.id].current?.click()}
                                              data-testid={`upload-zone-${zone.id}-dropzone`}
                                              className={cn(
                                                'relative mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200',
                                                errorMessage
                                                  ? 'border-danger-400 bg-danger-50/30'
                                                  : isDragging
                                                    ? 'border-moss-600 bg-moss-100/70 scale-[1.01]'
                                                    : 'border-moss-300 bg-moss-50/40 hover:border-moss-500 hover:bg-moss-50'
                                              )}
                                            >
                                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-moss-200">
                                                {isProcessing ? (
                                                  <Spinner className="h-6 w-6 text-moss-600" />
                                                ) : (
                                                  <UploadCloud
                                                    className={cn(
                                                      'h-6 w-6 transition-colors',
                                                      isDragging ? 'text-moss-700 animate-bounce' : 'text-moss-600'
                                                    )}
                                                  />
                                                )}
                                              </div>

                                            <p className="mt-3 text-xs font-semibold text-moss-900">
                                              {isProcessing
                                                ? 'Validando y procesando archivo...'
                                                : isDragging
                                                  ? '¡Suelta el archivo aquí!'
                                                  : 'Arrastra archivo aquí o haz clic para explorar'}
                                            </p>

                                                  <button
                                                    type="button"
                                                    disabled={isProcessing}
                                                    className="btn btn-primary btn-sm mt-3 text-xs"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      inputRefs[zone.id].current?.click();
                                                    }}
                                                    data-testid={`upload-zone-${zone.id}-browse-btn`}
                                                  >
                                                    <FileUp className="h-3.5 w-3.5" /> Explorar Archivo
                                                  </button>
                  </div>

                                              {/* MENSAJE DE ERROR MOSTRADO DIRECTAMENTE DEBAJO DEL CAMPO DE CARGA (Solicitud #1) */}
                                              {errorMessage && (
                                                <div
                                                  data-testid={`upload-zone-${zone.id}-error`}
                                                  className="mt-2.5 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-xs text-danger-700 ring-1 ring-danger-200 animate-slide-up"
                                                >
                                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
                                      <div className="flex-1">
                                        <span className="font-semibold">{errorMessage}</span>
                                      </div>
                                    </div>
                  )}
                                  </div>
                              </div>
            );
          })}
                                </div>
      </div>

                            {/* SECCIÓN: ARCHIVOS CARGADOS Y PROCESADOS CORRECTAMENTE (Solicitud #2) */}
                            <Panel
                              icon={FileCheck2}
                              title="Archivos Cargados y Procesados Correctamente"
                              description="Listado consolidado de todos los archivos que superaron con éxito las validaciones de las zonas de carga."
                              testId="uploaded-files-panel"
                              actions={
                                processedFiles.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="badge badge-green text-xs"
                                      data-testid="processed-files-count"
                                    >
                                      {processedFiles.length} archivo(s) procesado(s)
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={handleClearAllProcessed}
                                      data-testid="upload-clear-processed-btn"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Limpiar Procesados
                                    </button>
                                  </div>
                                )
                              }
                            >
                              {processedFiles.length === 0 ? (
                                <EmptyState
                                  icon={FileUp}
                                  title="No hay archivos procesados"
                                  description="Arrastra o selecciona archivos que cumplan los requisitos en cualquiera de las 4 zonas de carga superiores para verlos registrados aquí."
                                  testId="upload-empty-processed"
                                />
                              ) : (
                                <div className="overflow-x-auto" data-testid="uploaded-files-table-container">
                                  <table className="w-full text-left text-xs" data-testid="uploaded-files-table">
                                    <thead>
                                      <tr className="border-b border-moss-200 text-moss-700">
                                        <th className="py-2.5 px-3 font-semibold">Archivo</th>
                                        <th className="py-2.5 px-3 font-semibold">Zona de Origen</th>
                                        <th className="py-2.5 px-3 font-semibold">Tamaño</th>
                                        <th className="py-2.5 px-3 font-semibold">Hora de Carga</th>
                                        <th className="py-2.5 px-3 font-semibold">Estado</th>
                                        <th className="py-2.5 px-3 text-right font-semibold">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {processedFiles.map((file) => {
                                        const ExtIcon = getExtensionIcon(file.extension);

                                        return (
                    <tr
                      key={file.id}
                      data-testid={`processed-file-row-${file.id}`}
                      className="border-b border-moss-100 last:border-0 hover:bg-moss-50/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-100 text-moss-700 ring-1 ring-moss-200">
                            <ExtIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p
                              className="font-semibold text-moss-900 max-w-[200px] truncate"
                              title={file.name}
                              data-testid={`processed-file-name-${file.id}`}
                            >
                              {file.name}
                            </p>
                            <span className="text-[10px] uppercase text-moss-500 font-mono">
                              .{file.extension || 'bin'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded bg-moss-100 px-2 py-0.5 text-[11px] font-semibold text-moss-800 ring-1 ring-moss-200">
                          {file.zoneBadge}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-moss-800" data-testid={`processed-file-size-${file.id}`}>
                        {formatFileSize(file.size)}
                      </td>

                      <td className="py-3 px-3 text-moss-600 font-mono" data-testid={`processed-file-date-${file.id}`}>
                        {file.timeLabel}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className="badge badge-green text-xs"
                          data-testid={`processed-file-status-${file.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Procesado Exitosamente
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm !p-1.5"
                            onClick={() => setSelectedFileForPreview(file)}
                            title="Ver ficha técnica"
                            data-testid={`processed-file-preview-btn-${file.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm !p-1.5 text-danger-600 hover:text-danger-800"
                            onClick={() => handleRemoveProcessedFile(file.id)}
                            title="Eliminar de la lista"
                            data-testid={`processed-file-delete-btn-${file.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                                        );
                                      })}
              </tbody>
                          </table>
                        </div>
                      )
                    }
      </Panel >

      {/* Historial de Eventos en Tiempo Real (para Aserciones Automatizadas con data-tone) */}
      <Panel
        icon={History}
        title="Log de Eventos y Aserciones QA"
        description="Registra en tiempo real cada validación y cambio de estado con atributo data-tone para Playwright y Cypress."
        testId="upload-event-log-panel"
        bodyClassName="!p-0"
      >
        <ol
          data-testid="upload-event-log"
          className="max-h-52 space-y-1.5 overflow-y-auto bg-moss-950 p-4 font-mono text-[11px]"
          aria-live="polite"
        >
          {events.map((e) => (
            <li
              key={e.id}
              data-testid="upload-event-item"
              data-tone={e.tone}
              className="flex gap-2 leading-relaxed"
            >
              <span className="text-moss-500 shrink-0">{e.time}</span>
              <span className={LOG_TONE[e.tone]}>{e.message}</span>
            </li >
          ))}
        </ol >
  <div className="flex items-center gap-2 border-t border-moss-200/80 p-3 text-[11px] text-moss-600">
    <LocatorHint testId="upload-event-item" /> Expone <code className="code-chip">data-tone="success|error|info"</code>
  </div>
      </Panel >

{/* Modal de Ficha Técnica del Archivo Procesado */ }
<Modal
  open={Boolean(selectedFileForPreview)}
  onClose={() => setSelectedFileForPreview(null)}
  title="Ficha Técnica del Archivo Procesado"
  testId="upload-preview-modal"
>
  {selectedFileForPreview && (
    <div className="space-y-4 text-sm" data-testid="upload-preview-details">
      <div className="rounded-xl bg-moss-50 p-4 ring-1 ring-moss-200">
        <p className="text-xs text-moss-600">Nombre del Archivo</p>
        <p className="font-mono text-sm font-bold text-moss-900 break-all" data-testid="preview-filename">
          {selectedFileForPreview.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-moss-50 p-3 ring-1 ring-moss-200">
            <p className="text-xs text-moss-600">Zona de Carga</p>
            <p className="font-semibold text-xs text-moss-900" data-testid="preview-zone">
              {selectedFileForPreview.zoneBadge} - {selectedFileForPreview.zoneTitle}
            </p>
        </div>

        <div className="rounded-xl bg-moss-50 p-3 ring-1 ring-moss-200">
            <p className="text-xs text-moss-600">Tamaño Registrado</p>
            <p className="font-mono text-xs font-semibold text-moss-900" data-testid="preview-filesize">
              {formatFileSize(selectedFileForPreview.size)} ({selectedFileForPreview.size.toLocaleString()} Bytes)
            </p>
        </div>
      </div>

      <div className="rounded-xl bg-moss-50 p-3 ring-1 ring-moss-200">
          <p className="text-xs text-moss-600">Estado de Procesamiento</p>
          <p className="font-semibold text-xs text-moss-700 mt-0.5 flex items-center gap-1.5" data-testid="preview-status">
            <CheckCircle2 className="h-4 w-4" /> Validaciones superadas y almacenado con éxito
          </p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedFileForPreview(null)}
          data-testid="preview-close-btn"
        >
          Cerrar Ficha
        </button>
      </div>
    </div>
  )}
</Modal>
    </div >
  );
}
