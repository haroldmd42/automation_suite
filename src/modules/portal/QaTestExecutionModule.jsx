import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  RotateCcw,
  Download,
  FileSpreadsheet,
  UserCheck,
  Lock,
  Edit3,
  ChevronDown,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/ui/Primitives';
import { Checkbox } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import { cn } from '../../utils/format';
import {
  loadStoredTestSheets,
  TEST_CASES_STORAGE_KEY,
  isColumnCompleteInSheet,
} from './QaTestCasesSheetModule';

export default function QaTestExecutionModule() {
  const { user, profile, logAudit } = useSupabaseAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [sheets, setSheets] = useState(() => loadStoredTestSheets());
  const [selectedSheetId, setSelectedSheetId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());
  const [bulkStatusValue, setBulkStatusValue] = useState('passed');
  const [execMenuOpen, setExecMenuOpen] = useState(false);
  const execMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (execMenuRef.current && !execMenuRef.current.contains(e.target)) {
        setExecMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const analystDefaultName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Analista de Calidad';

  // Sincronizar al montar o cambiar foco por si se finalizó una hoja recientemente
  useEffect(() => {
    const syncFromStorage = () => {
      setSheets(loadStoredTestSheets());
    };
    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const saveAllSheets = (updatedSheets) => {
    setSheets(updatedSheets);
    try {
      localStorage.setItem(TEST_CASES_STORAGE_KEY, JSON.stringify(updatedSheets));
    } catch (err) {
      console.warn('Error guardando estado de ejecución:', err);
    }
  };

  // Solo los diseños que han sido finalizados aparecen reflejados en este módulo
  const finalizedSheets = useMemo(
    () => sheets.filter((s) => Boolean(s.isFinalized)),
    [sheets]
  );

  const filteredFinalizedSheets = useMemo(() => {
    if (!searchQuery.trim()) return finalizedSheets;
    const q = searchQuery.toLowerCase();
    return finalizedSheets.filter((s) => s.name.toLowerCase().includes(q));
  }, [finalizedSheets, searchQuery]);

  const selectedSheet = useMemo(
    () => finalizedSheets.find((s) => s.id === selectedSheetId) || null,
    [finalizedSheets, selectedSheetId]
  );

  // Estadísticas globales de todos los diseños finalizados
  const globalStats = useMemo(() => {
    const totalSheets = finalizedSheets.length;
    let totalCases = 0;
    let passedCases = 0;
    let failedCases = 0;
    let pendingCases = 0;

    finalizedSheets.forEach((s) => {
      (s.rows || []).forEach((r) => {
        totalCases += 1;
        const st = r.executionStatus || 'pending';
        if (st === 'passed') passedCases += 1;
        else if (st === 'failed') failedCases += 1;
        else pendingCases += 1;
      });
    });

    return { totalSheets, totalCases, passedCases, failedCases, pendingCases };
  }, [finalizedSheets]);

  /**
   * Cambia el estado de ejecución de un caso (pending | passed | failed)
   * y asigna automáticamente el nombre de quien realizó la ejecución
   */
  const handleSetCaseExecutionStatus = (sheetId, rowId, newStatus) => {
    const nowIso = new Date().toISOString();

    const updated = sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: (s.rows || []).map((r) => {
          if (r.id !== rowId) return r;
          const isExecuted = newStatus === 'passed' || newStatus === 'failed';
          return {
            ...r,
            executionStatus: newStatus,
            executedBy: isExecuted ? r.executedBy?.trim() || analystDefaultName : '',
            executedAt: isExecuted ? nowIso : null,
          };
        }),
      };
    });

    saveAllSheets(updated);

    if (logAudit) {
      const sheetObj = sheets.find((s) => s.id === sheetId);
      const rowObj = sheetObj?.rows.find((r) => r.id === rowId);
      logAudit('update_test_case_execution', 'qa_test_execution', {
        sheet_name: sheetObj?.name,
        case_code: rowObj?.code,
        status: newStatus,
        executed_by: newStatus === 'pending' ? '' : analystDefaultName,
      });
    }

    toast.success('Estado actualizado exitosamente.');
  };

  /**
   * Cambia el estado de ejecución de varios escenarios seleccionados al mismo tiempo
   */
  const handleBulkSetExecutionStatus = (sheetId, targetIdsSet, newStatus) => {
    if (!targetIdsSet || targetIdsSet.size === 0) return;
    const nowIso = new Date().toISOString();
    const isExecuted = newStatus === 'passed' || newStatus === 'failed';

    const updated = sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: (s.rows || []).map((r) => {
          if (!targetIdsSet.has(r.id)) return r;
          return {
            ...r,
            executionStatus: newStatus,
            executedBy: isExecuted ? r.executedBy?.trim() || analystDefaultName : '',
            executedAt: isExecuted ? nowIso : null,
          };
        }),
      };
    });

    saveAllSheets(updated);

    if (logAudit) {
      const sheetObj = sheets.find((s) => s.id === sheetId);
      logAudit('bulk_update_test_case_execution', 'qa_test_execution', {
        sheet_name: sheetObj?.name,
        count: targetIdsSet.size,
        status: newStatus,
        executed_by: isExecuted ? analystDefaultName : '',
      });
    }

    toast.success('Estados actualizados exitosamente.');
    setSelectedRowIds(new Set());
  };

  /**
   * Permite actualizar manualmente el nombre de quien realizó la ejecución en una fila
   */
  const handleChangeExecutorName = (sheetId, rowId, newExecutorName) => {
    const updated = sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: (s.rows || []).map((r) =>
          r.id === rowId
            ? {
                ...r,
                executedBy: newExecutorName,
              }
            : r
        ),
      };
    });
    saveAllSheets(updated);
  };

  /**
   * Reinicia todos los casos de la hoja seleccionada al estado inicial Pendiente
   */
  const handleResetSheetExecution = (sheetId) => {
    const updated = sheets.map((s) => {
      if (s.id !== sheetId) return s;
      return {
        ...s,
        rows: (s.rows || []).map((r) => ({
          ...r,
          executionStatus: 'pending',
          executedBy: '',
          executedAt: null,
        })),
      };
    });
    saveAllSheets(updated);
    toast.info('Estados reiniciados exitosamente.');
  };

  const getRowSteps = (row) => {
    const raw = row?.cells?.pasos;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(/\r?\n/);
    }
    return [];
  };

  /**
   * Exporta los resultados de la ejecución a Excel (.CSV) incluyendo solo las columnas completas, Estado y Ejecutado por
   */
  const handleExportExecutionCsv = (sheet) => {
    if (!sheet) return;
    const completedCols = (sheet.columns || []).filter((col) => isColumnCompleteInSheet(sheet, col));
    const headers = [
      '# Caso',
      ...completedCols.map((c) => c.label),
      'Estado',
      'Ejecutado por',
      'Fecha Ejecución',
    ];

    const escapeCsvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const statusLabelMap = {
      passed: 'Aprobado',
      failed: 'Fallido',
      pending: 'Pendiente',
    };

    const csvRows = [
      headers.map(escapeCsvCell).join(';'),
      ...(sheet.rows || []).map((row) => {
        const stepsFormatted = getRowSteps(row)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s, idx) => `${idx + 1}. ${s}`)
          .join('\n');

        const values = [
          row.code,
          ...completedCols.map((col) =>
            col.type === 'steps' || col.key === 'pasos'
              ? stepsFormatted
              : row.cells[col.key] ?? ''
          ),
          statusLabelMap[row.executionStatus || 'pending'] || 'Pendiente',
          row.executedBy || 'Sin ejecutar',
          row.executedAt ? new Date(row.executedAt).toLocaleString() : '—',
        ];
        return values.map(escapeCsvCell).join(';');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejecucion_${sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Reporte exportado exitosamente.');
  };

  // ============================================================================
  // VISTA DE DETALLE: EJECUCIÓN DE UN DISEÑO FINALIZADO (TABLA DE CASOS)
  // ============================================================================
  if (selectedSheet) {
    const rows = selectedSheet.rows || [];
    // Solo se muestran en la ejecución las columnas que estén completamente diligenciadas
    const completedColumns = (selectedSheet.columns || []).filter((col) =>
      isColumnCompleteInSheet(selectedSheet, col)
    );
    const totalCases = rows.length;
    const passedCount = rows.filter((r) => r.executionStatus === 'passed').length;
    const failedCount = rows.filter((r) => r.executionStatus === 'failed').length;
    const pendingCount = rows.filter((r) => !r.executionStatus || r.executionStatus === 'pending').length;
    const executedCount = passedCount + failedCount;
    const passRate = executedCount > 0 ? Math.round((passedCount / executedCount) * 100) : 0;

    const visibleRows = rows.filter((r) => {
      const st = r.executionStatus || 'pending';
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (caseSearchQuery.trim()) {
        const q = caseSearchQuery.toLowerCase();
        if (r.code.toLowerCase().includes(q)) return true;
        if ((r.executedBy || '').toLowerCase().includes(q)) return true;
        return completedColumns.some((col) => {
          const val = r.cells[col.key];
          if (Array.isArray(val)) return val.some((step) => String(step).toLowerCase().includes(q));
          return String(val ?? '').toLowerCase().includes(q);
        });
      }
      return true;
    });

    const visibleRowIds = visibleRows.map((r) => r.id);
    const selectedVisibleCount = visibleRowIds.filter((id) => selectedRowIds.has(id)).length;
    const isAllVisibleSelected =
      visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
    const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;

    const handleToggleSelectAllVisible = () => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (isAllVisibleSelected) {
          visibleRowIds.forEach((id) => next.delete(id));
        } else {
          visibleRowIds.forEach((id) => next.add(id));
        }
        return next;
      });
    };

    const handleToggleSelectRow = (rowId) => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
    };

    return (
      <div className="space-y-5 animate-slide-up" data-testid="qa-test-execution-detail-view">
        {/* Barra superior de navegación y Dropdown de opciones */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedSheetId(null);
              setStatusFilter('all');
              setCaseSearchQuery('');
              setSelectedRowIds(new Set());
            }}
            className="btn btn-secondary btn-sm gap-2"
            data-testid="back-to-execution-sheets-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Diseños Finalizados</span>
          </button>

          {/* DROPDOWN DE OPCIONES DE EJECUCIÓN */}
          <div className="relative" ref={execMenuRef}>
            <button
              type="button"
              onClick={() => setExecMenuOpen((prev) => !prev)}
              className="btn btn-secondary btn-sm gap-2 border-moss-300"
              data-testid="execution-options-dropdown-btn"
            >
              <span>Opciones de Ejecución</span>
              <ChevronDown
                className={cn('h-4 w-4 text-moss-700 transition-transform', execMenuOpen && 'rotate-180')}
              />
            </button>

            {execMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-moss-200 bg-white p-1.5 shadow-lift z-40 animate-slide-up"
                data-testid="execution-options-dropdown-menu"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-moss-500">
                  Acciones de la Ejecución
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExecMenuOpen(false);
                    handleExportExecutionCsv(selectedSheet);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                  data-testid="export-execution-csv-btn"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Exportar Ejecución (.CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExecMenuOpen(false);
                    handleResetSheetExecution(selectedSheet.id);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                  data-testid="reset-sheet-execution-btn"
                >
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <span>Reiniciar Todos a Pendiente</span>
                </button>

                <div className="my-1 border-t border-moss-100" />
                <button
                  type="button"
                  onClick={() => {
                    setExecMenuOpen(false);
                    navigate('/portal/qa-test-cases');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-800 hover:bg-moss-50 transition"
                  data-testid="go-to-design-matrix-btn"
                >
                  <Edit3 className="h-4 w-4 text-moss-700" />
                  <span>Ir a Matriz de Diseño</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cabecera Ejecutiva de la Hoja en Ejecución */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100 shadow-lift space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300">
                  <Lock className="h-3 w-3" />
                  Diseño Finalizado
                </span>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 font-mono text-xs text-slate-300">
                  {totalCases} {totalCases === 1 ? 'Caso de Prueba' : 'Casos de Prueba'}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Ejecutor activo: <strong className="text-emerald-300">{analystDefaultName}</strong>
                </span>
              </div>

              <h1
                className="font-display text-2xl font-bold text-white"
                data-testid="execution-sheet-title"
              >
                {selectedSheet.name}
              </h1>

              <p className="text-xs text-slate-300">
                Marca cada escenario como <strong>Aprobado</strong> o <strong>Fallido</strong>. El estado inicial es{' '}
                <strong>Pendiente</strong> y se registrará automáticamente quién realizó la ejecución.
              </p>
            </div>

            {/* Píldoras de filtro por Estado */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {[
                { key: 'all', label: 'Todos', count: totalCases, color: 'text-white border-slate-700' },
                {
                  key: 'pending',
                  label: 'Pendientes',
                  count: pendingCount,
                  color: 'text-amber-300 border-amber-500/40',
                },
                {
                  key: 'passed',
                  label: 'Aprobados',
                  count: passedCount,
                  color: 'text-emerald-400 border-emerald-500/40',
                },
                {
                  key: 'failed',
                  label: 'Fallidos',
                  count: failedCount,
                  color: 'text-red-400 border-red-500/40',
                },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  data-testid={`filter-exec-${pill.key}-btn`}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 font-mono text-xs font-bold transition',
                    pill.color,
                    statusFilter === pill.key
                      ? 'bg-white/15 ring-2 ring-emerald-400/50'
                      : 'bg-slate-800/90 hover:bg-slate-800'
                  )}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          </div>

          {/* Barra de progreso visual y buscador interno */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Avance de ejecución: <strong>{executedCount}</strong> de <strong>{totalCases}</strong> casos (
                  {totalCases > 0 ? Math.round((executedCount / totalCases) * 100) : 0}%)
                </span>
                <span className="text-emerald-300 font-bold">
                  Efectividad: {passRate}%
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                {totalCases > 0 && (
                  <>
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(passedCount / totalCases) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(failedCount / totalCases) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={caseSearchQuery}
                onChange={(e) => setCaseSearchQuery(e.target.value)}
                placeholder="Buscar caso, paso o ejecutor..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                data-testid="search-execution-cases-input"
              />
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES MASIVAS PARA CAMBIAR VARIOS ESCENARIOS DE ESTADO AL MISMO TIEMPO */}
        {selectedRowIds.size > 0 && (
          <div
            data-testid="exec-bulk-actions-bar"
            className="rounded-2xl bg-moss-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-lift animate-slide-up"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="exec-selected-count-badge"
                className="rounded-lg bg-moss-700 px-3 py-1 font-mono text-xs font-bold text-moss-100"
              >
                {selectedRowIds.size} escenario{selectedRowIds.size === 1 ? '' : 's'} seleccionado
                {selectedRowIds.size === 1 ? '' : 's'}
              </span>

              {selectedRowIds.size < rows.length && (
                <button
                  type="button"
                  onClick={() => setSelectedRowIds(new Set(rows.map((r) => r.id)))}
                  data-testid="exec-select-all-rows-btn"
                  className="text-xs text-moss-300 hover:text-white underline"
                >
                  Seleccionar los {rows.length} escenarios
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                data-testid="exec-clear-selection-btn"
                className="text-xs text-moss-400 hover:text-white"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-moss-200">
                Cambiar estado masivo a:
              </span>
              <div className="w-44">
                <CustomSelect
                  id="bulk-exec-status-select"
                  testId="bulk-exec-status-select"
                  size="sm"
                  value={bulkStatusValue}
                  onChange={(e) => setBulkStatusValue(e.target.value)}
                  options={[
                    { value: 'passed', label: 'Aprobado' },
                    { value: 'failed', label: 'Fallido' },
                    { value: 'pending', label: 'Pendiente' },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  handleBulkSetExecutionStatus(selectedSheet.id, selectedRowIds, bulkStatusValue)
                }
                data-testid="apply-bulk-exec-status-btn"
                className="btn btn-primary btn-sm gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Aplicar a ({selectedRowIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE EJECUCIÓN DE CASOS DE PRUEBA (MISMO LISTADO + ESTADO + EJECUTADO POR) */}
        <div className="card overflow-hidden border border-moss-300 shadow-lift bg-white">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              data-testid="execution-cases-table"
            >
              <thead>
                <tr className="bg-moss-900 text-white divide-x divide-moss-700/80 border-b-2 border-moss-800">
                  {/* Columna de Selección Múltiple */}
                  <th className="w-12 py-3 px-3 text-center bg-moss-950">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        id="select-all-exec-rows"
                        testId="select-all-exec-rows"
                        checked={isAllVisibleSelected}
                        indeterminate={isSomeVisibleSelected}
                        onChange={handleToggleSelectAllVisible}
                      />
                    </div>
                  </th>

                  <th className="w-24 min-w-[88px] py-3 px-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider bg-moss-950 text-emerald-300">
                    # Caso
                  </th>

                  {/* Columnas Completas del Diseño Finalizado (Escenario, Pasos, Resultado + Personalizadas Completas) */}
                  {completedColumns.map((col, idx) => (
                    <th
                      key={col.id}
                      className={cn('py-3 px-4 font-bold uppercase tracking-wider text-[11px]', col.width)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 font-mono text-[10px] font-bold text-emerald-300 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{col.label}</span>
                      </div>
                    </th>
                  ))}

                  {/* COLUMNA ESTADO (PENDIENTE INICIAL / APROBADO / FALLIDO) */}
                  <th className="w-52 min-w-[195px] py-3 px-4 font-mono text-[11px] font-bold uppercase tracking-wider bg-moss-950 text-amber-300">
                    Estado
                  </th>

                  {/* COLUMNA FINAL: NOMBRE DE QUIEN REALIZÓ LA EJECUCIÓN */}
                  <th className="w-64 min-w-[230px] py-3 px-4 font-mono text-[11px] font-bold uppercase tracking-wider bg-moss-950 text-emerald-300">
                    Ejecutado por
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-moss-200">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={completedColumns.length + 4}
                      className="py-12 text-center text-sm text-moss-500"
                    >
                      No hay casos de prueba en este filtro.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, rowIndex) => {
                    const status = row.executionStatus || 'pending';
                    const rowSteps = getRowSteps(row).filter((s) => String(s).trim().length > 0);
                    const isRowSelected = selectedRowIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'divide-x divide-moss-200 transition align-top',
                          isRowSelected && 'ring-1 ring-inset ring-moss-500 bg-moss-50/70',
                          !isRowSelected && status === 'passed' && 'bg-emerald-50/35 hover:bg-emerald-50/60',
                          !isRowSelected && status === 'failed' && 'bg-red-50/35 hover:bg-red-50/60',
                          !isRowSelected && status === 'pending' && 'hover:bg-moss-50/50'
                        )}
                        data-testid={`exec-case-row-${rowIndex + 1}`}
                      >
                        {/* Checkbox de selección del escenario */}
                        <td className="bg-moss-50/70 py-3.5 px-3 text-center align-top">
                          <div className="flex items-center justify-center pt-1">
                            <Checkbox
                              id={`select-exec-row-${rowIndex + 1}`}
                              testId={`select-exec-row-${rowIndex + 1}`}
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectRow(row.id)}
                            />
                          </div>
                        </td>

                        {/* # Caso */}
                        <td className="bg-moss-50/70 py-3.5 px-2.5 text-center align-top">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono text-[11px] font-bold text-moss-500">
                              {rowIndex + 1}
                            </span>
                            <span
                              className="rounded-md bg-moss-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-moss-900"
                              data-testid={`exec-row-code-${rowIndex + 1}`}
                            >
                              {row.code}
                            </span>
                          </div>
                        </td>

                        {/* Celdas del Diseño en Modo Lectura (Solo Columnas Completas) */}
                        {completedColumns.map((col) => {
                          if (col.type === 'steps' || col.key === 'pasos') {
                            return (
                              <td key={col.id} className="p-3.5 align-top">
                                {rowSteps.length === 0 ? (
                                  <span className="italic text-moss-400">Sin pasos registrados</span>
                                ) : (
                                  <ol className="space-y-1.5">
                                    {rowSteps.map((stText, sIdx) => (
                                      <li
                                        key={`${row.id}-st-${sIdx}`}
                                        className="flex items-start gap-2 text-xs text-moss-950 leading-relaxed"
                                      >
                                        <span className="mt-0.5 inline-flex h-5 min-w-[22px] items-center justify-center rounded bg-moss-900 px-1.5 font-mono text-[10px] font-bold text-emerald-300 shrink-0">
                                          {sIdx + 1}.
                                        </span>
                                        <span>{stText}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </td>
                            );
                          }

                          const cellVal = row.cells[col.key] ?? '';
                          return (
                            <td
                              key={col.id}
                              className="p-3.5 align-top text-xs leading-relaxed text-moss-900 whitespace-pre-wrap"
                            >
                              {cellVal || <span className="italic text-moss-400">—</span>}
                            </td>
                          );
                        })}

                        {/* COLUMNA ESTADO CON CUSTOMSELECT DEL SISTEMA DE DISEÑO DE LA PLATAFORMA */}
                        <td className="p-3.5 align-top">
                          <div className="space-y-1.5">
                            <CustomSelect
                              id={`exec-status-select-${rowIndex + 1}`}
                              testId={`exec-status-select-${rowIndex + 1}`}
                              size="sm"
                              value={status}
                              prefixIcon={
                                status === 'passed'
                                  ? CheckCircle2
                                  : status === 'failed'
                                    ? XCircle
                                    : Clock
                              }
                              onChange={(e) =>
                                handleSetCaseExecutionStatus(selectedSheet.id, row.id, e.target.value)
                              }
                              options={[
                                { value: 'pending', label: 'Pendiente' },
                                { value: 'passed', label: 'Aprobado' },
                                { value: 'failed', label: 'Fallido' },
                              ]}
                            />

                            <div className="flex items-center gap-1.5 px-1" data-testid={`exec-status-badge-${rowIndex + 1}`}>
                              {status === 'passed' ? (
                                <span className="text-[11px] font-semibold text-emerald-800">
                                  Estado: Aprobado
                                </span>
                              ) : status === 'failed' ? (
                                <span className="text-[11px] font-semibold text-red-700">
                                  Estado: Fallido
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-amber-800">
                                  Estado inicial: Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* COLUMNA FINAL: QUIEN REALIZÓ LA EJECUCIÓN */}
                        <td className="p-3.5 align-top">
                          {status === 'pending' ? (
                            <div
                              className="flex items-center gap-1.5 text-xs text-moss-400 italic pt-1"
                              data-testid={`exec-runner-name-${rowIndex + 1}`}
                            >
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Sin ejecutar (Pendiente)</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                <input
                                  type="text"
                                  value={row.executedBy || analystDefaultName}
                                  onChange={(e) =>
                                    handleChangeExecutorName(
                                      selectedSheet.id,
                                      row.id,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Nombre del ejecutor..."
                                  className="w-full rounded-lg border border-moss-200 bg-white px-2.5 py-1 text-xs font-semibold text-moss-950 focus:border-moss-500 focus:outline-none"
                                  data-testid={`exec-runner-input-${rowIndex + 1}`}
                                />
                              </div>
                              {row.executedAt && (
                                <p className="font-mono text-[10px] text-moss-500 pl-5">
                                  {new Date(row.executedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA PRINCIPAL: LISTADO DE DISEÑOS FINALIZADOS NOMBRADOS POR HOJA
  // ============================================================================
  return (
    <div className="space-y-6 animate-slide-up" data-testid="qa-test-execution-module">
      <PageHeader
        icon={PlayCircle}
        eyebrow="Portal Cloud · Rol Analista de Calidad"
        title="Ejecución de Pruebas (Diseños Finalizados)"
        description="Aquí se reflejan automáticamente todas las hojas de casos de prueba cuyo diseño ha sido finalizado en la Matriz de Casos de Prueba. Abre cualquier diseño para calificar cada caso como Aprobado o Fallido y registrar quién realizó la ejecución."
        testId="qa-test-execution-header"
        actions={
          <button
            type="button"
            onClick={() => navigate('/portal/qa-test-cases')}
            className="btn btn-secondary gap-2"
            data-testid="navigate-to-test-cases-matrix-btn"
          >
            <FileSpreadsheet className="h-4 w-4 text-moss-700" />
            <span>Ir a Matriz de Casos de Prueba</span>
          </button>
        }
      />

      {/* Resumen de KPIs de Ejecución */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-moss-600">
            Diseños Finalizados
          </span>
          <p
            className="mt-2 font-display text-2xl font-bold text-moss-900"
            data-testid="exec-kpi-total-sheets"
          >
            {globalStats.totalSheets}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Hojas habilitadas para ejecución</p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Casos Pendientes
          </span>
          <p
            className="mt-2 font-display text-2xl font-bold text-amber-700"
            data-testid="exec-kpi-pending-cases"
          >
            {globalStats.pendingCases}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">
            De {globalStats.totalCases} casos totales
          </p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Casos Aprobados
          </span>
          <p
            className="mt-2 font-display text-2xl font-bold text-emerald-700"
            data-testid="exec-kpi-passed-cases"
          >
            {globalStats.passedCases}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Ejecutados satisfactoriamente</p>
        </div>

        <div className="card p-4 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            Casos Fallidos
          </span>
          <p
            className="mt-2 font-display text-2xl font-bold text-red-600"
            data-testid="exec-kpi-failed-cases"
          >
            {globalStats.failedCases}
          </p>
          <p className="text-[11px] text-moss-500 mt-1">Con incidencias detectadas</p>
        </div>
      </div>

      {/* Buscador de hojas finalizadas */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-moss-200 bg-white p-4 shadow-soft">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar diseño finalizado por nombre de la Hoja..."
            className="input pl-10 w-full"
            data-testid="search-finalized-sheets-input"
          />
        </div>
        <span className="text-xs font-mono text-moss-600">
          Ejecutor activo: <strong className="text-moss-900">{analystDefaultName}</strong>
        </span>
      </div>

      {/* Listado de Cards de Diseños Finalizados */}
      {filteredFinalizedSheets.length === 0 ? (
        <div
          className="card flex min-h-[260px] flex-col items-center justify-center p-8 text-center"
          data-testid="empty-finalized-sheets"
        >
          <Lock className="h-12 w-12 text-moss-300 mb-3" />
          <h3 className="font-display text-lg font-bold text-moss-900">
            No hay diseños finalizados disponibles
          </h3>
          <p className="mt-1 max-w-md text-xs text-moss-600">
            Dirígete al módulo <strong>Matriz de Casos de Prueba</strong> y presiona el botón{' '}
            <strong>&ldquo;Finalizar Diseño&rdquo;</strong> en cualquier hoja para que aparezca reflejada aquí lista para su ejecución.
          </p>
          <button
            type="button"
            onClick={() => navigate('/portal/qa-test-cases')}
            className="btn btn-primary btn-sm mt-4 gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ir a Matriz de Casos de Prueba</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredFinalizedSheets.map((sheet) => {
            const rows = sheet.rows || [];
            const total = rows.length;
            const passed = rows.filter((r) => r.executionStatus === 'passed').length;
            const failed = rows.filter((r) => r.executionStatus === 'failed').length;
            const pending = rows.filter((r) => !r.executionStatus || r.executionStatus === 'pending').length;
            const executed = passed + failed;
            const progressPct = total > 0 ? Math.round((executed / total) * 100) : 0;

            return (
              <div
                key={sheet.id}
                className="card flex flex-col justify-between p-5 shadow-soft hover:shadow-lift transition border border-moss-200/90"
                data-testid={`finalized-sheet-card-${sheet.id}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      Diseño Finalizado
                    </span>
                    <span className="font-mono text-[11px] text-moss-500">
                      {total} {total === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="font-display text-lg font-bold text-moss-950 line-clamp-1"
                      data-testid={`finalized-sheet-name-${sheet.id}`}
                    >
                      {sheet.name}
                    </h3>
                    <p className="mt-1 text-xs text-moss-600 font-mono">
                      Finalizado por: <strong>{sheet.finalizedBy || 'Analista de Calidad'}</strong>
                    </p>
                  </div>

                  {/* Contadores de Estado */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-moss-50/70 p-3 border border-moss-100 text-center">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-amber-700">
                        Pendientes
                      </span>
                      <span className="font-display text-lg font-bold text-amber-800">
                        {pending}
                      </span>
                    </div>
                    <div className="border-x border-moss-200/70">
                      <span className="block text-[10px] font-bold uppercase text-emerald-700">
                        Aprobados
                      </span>
                      <span className="font-display text-lg font-bold text-emerald-700">
                        {passed}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-red-700">
                        Fallidos
                      </span>
                      <span className="font-display text-lg font-bold text-red-600">
                        {failed}
                      </span>
                    </div>
                  </div>

                  {/* Barra de avance */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-moss-600">
                      <span>Avance de ejecución</span>
                      <span className="font-bold text-moss-900">{progressPct}%</span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-moss-100">
                      {total > 0 && (
                        <>
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${(passed / total) * 100}%` }}
                          />
                          <div
                            className="bg-red-500"
                            style={{ width: `${(failed / total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-moss-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-moss-500">
                    {sheet.finalizedAt
                      ? new Date(sheet.finalizedAt).toLocaleDateString()
                      : new Date(sheet.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSheetId(sheet.id);
                      setStatusFilter('all');
                    }}
                    className="btn btn-primary btn-sm gap-1.5"
                    data-testid={`open-finalized-sheet-btn-${sheet.id}`}
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Abrir y Ejecutar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

