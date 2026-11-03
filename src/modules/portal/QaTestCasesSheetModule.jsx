import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Search,
  Columns,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FolderPlus,
  Edit3,
  Check,
  X,
  Lock,
  Unlock,
  PlayCircle,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { useSupabaseAuth } from '../../context/SupabaseAuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/ui/Primitives';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import { cn } from '../../utils/format';

/**
 * Columnas obligatorias por defecto en la hoja de casos de prueba
 */
export const DEFAULT_COLUMNS = [
  {
    id: 'col-dependencia',
    key: 'dependencia',
    label: 'Escenario',
    type: 'text',
    isDefault: true,
    width: 'w-64 min-w-[220px]',
    placeholder: 'Escribe el escenario de prueba...',
  },
  {
    id: 'col-pasos',
    key: 'pasos',
    label: 'Pasos',
    type: 'steps',
    isDefault: true,
    width: 'w-[440px] min-w-[360px]',
    placeholder: 'Escribe el paso y presiona Enter...',
  },
  {
    id: 'col-resultado',
    key: 'resultado',
    label: 'Resultado',
    type: 'text',
    isDefault: true,
    width: 'w-80 min-w-[260px]',
    placeholder: 'Describe el resultado esperado del escenario...',
  },
];

/**
 * Hojas iniciales de ejemplo para el Analista de Calidad
 */
export const INITIAL_SHEETS = [
  {
    id: 'sheet-default-1',
    name: 'Casos de Prueba - Autenticación y Usuarios',
    createdAt: new Date().toISOString(),
    isFinalized: true,
    hasBeenFinalizedOnce: true,
    finalizedAt: new Date().toISOString(),
    finalizedBy: 'Analista de Calidad',
    columns: DEFAULT_COLUMNS,
    rows: [
      {
        id: 'row-1',
        code: 'CP-001',
        executionStatus: 'pending',
        executedBy: '',
        executedAt: null,
        cells: {
          dependencia: 'Módulo Autenticación · Portal Cloud (/login)',
          pasos: [
            'Navegar a la página de inicio de sesión del Portal Cloud',
            'Ingresar un correo electrónico válido en el campo Correo Electrónico',
            'Ingresar la contraseña correspondiente en el campo Contraseña',
            'Presionar el botón "Ingresar al Portal Cloud"',
          ],
          resultado:
            'El sistema autentica al usuario correctamente y lo redirige al módulo asignado según su rol.',
        },
      },
      {
        id: 'row-2',
        code: 'CP-002',
        executionStatus: 'pending',
        executedBy: '',
        executedAt: null,
        cells: {
          dependencia: 'Depende de CP-001 (Usuario con sesión activa)',
          pasos: [
            'Ubicar el menú lateral izquierdo del Portal Cloud',
            'Hacer clic en el botón "Cerrar sesión" en la parte inferior del panel',
          ],
          resultado:
            'Se cierra la sesión activa, se muestra notificación de salida y redirige a la pantalla de Login.',
        },
      },
      {
        id: 'row-3',
        code: 'CP-003',
        executionStatus: 'pending',
        executedBy: '',
        executedAt: null,
        cells: {
          dependencia: 'Módulo Gestión de Usuarios (/users) · Sin precondición de sesión',
          pasos: [
            'Abrir el módulo de Gestión de Usuarios',
            'Hacer clic en el botón "Crear Usuario"',
            'Completar Nombre, Apellido, Nombre de Usuario y Correo Corporativo',
            'Seleccionar Rol y Departamento válidos',
            'Ingresar contraseña temporal que cumpla las políticas de seguridad',
            'Presionar el botón "Guardar y Registrar"',
          ],
          resultado:
            'El usuario se registra exitosamente en el directorio y aparece listado con su rol y departamento.',
        },
      },
    ],
  },
];

export const TEST_CASES_STORAGE_KEY = 'portal_qa_test_cases_sheets_v1';

/**
 * Carga las hojas desde localStorage garantizando compatibilidad de campos
 */
export function loadStoredTestSheets() {
  try {
    const saved = localStorage.getItem(TEST_CASES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((sheet) => ({
          ...sheet,
          isFinalized: Boolean(sheet.isFinalized),
          hasBeenFinalizedOnce: Boolean(sheet.hasBeenFinalizedOnce || sheet.isFinalized),
          columns: (sheet.columns || DEFAULT_COLUMNS).map((col) => {
            if (col.key === 'dependencia' || col.id === 'col-dependencia') {
              return { ...col, label: 'Escenario', placeholder: 'Escribe el escenario de prueba...' };
            }
            if (col.key === 'pasos' || col.id === 'col-pasos') {
              return { ...col, label: 'Pasos' };
            }
            return col;
          }),
          rows: (sheet.rows || []).map((r, idx) => ({
            ...r,
            code: r.code || `CP-${String(idx + 1).padStart(3, '0')}`,
            executionStatus: r.executionStatus || 'pending',
            executedBy: r.executedBy || '',
            executedAt: r.executedAt || null,
          })),
        }));
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_SHEETS;
}

/**
 * Limpia cualquier prefijo numérico ("1.", "1)", "Paso 1:") al pegar texto
 */
function stripStepNumberPrefix(text) {
  return String(text || '')
    .replace(/^\s*(?:paso\s*)?\d+\s*[.):-]\s*/i, '')
    .trim();
}

/**
 * Verifica si una celda específica dentro de una fila está diligenciada correctamente
 */
export function isCellFilled(row, col) {
  if (!row || !col) return false;
  if (col.type === 'steps' || col.key === 'pasos') {
    const raw = row?.cells?.pasos;
    const steps = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? raw.split(/\r?\n/)
        : [];
    const nonEmptySteps = steps.map((s) => String(s || '').trim()).filter(Boolean);
    if (nonEmptySteps.length === 0) return false;
    // Todos los pasos visibles deben estar diligenciados
    return steps.every((s) => String(s || '').trim().length > 0);
  }
  return String(row?.cells?.[col.key] ?? '').trim().length > 0;
}

/**
 * Verifica si una columna está completamente diligenciada en todas las filas de la hoja
 */
export function isColumnCompleteInSheet(sheet, col) {
  const rows = sheet?.rows || [];
  if (rows.length === 0 || !col) return false;
  return rows.every((row) => isCellFilled(row, col));
}

/**
 * Valida que todas las columnas disponibles en la hoja estén diligenciadas en todas las filas
 */
export function validateSheetCompletion(sheet) {
  const missing = [];
  if (!sheet || !Array.isArray(sheet.rows) || sheet.rows.length === 0) {
    return missing;
  }
  const columns = sheet.columns || DEFAULT_COLUMNS;
  sheet.rows.forEach((row, rowIdx) => {
    columns.forEach((col) => {
      if (!isCellFilled(row, col)) {
        missing.push({
          rowId: row.id,
          rowIndex: rowIdx,
          rowCode: row.code || `CP-${String(rowIdx + 1).padStart(3, '0')}`,
          colId: col.id,
          colKey: col.key,
          colLabel: col.label,
        });
      }
    });
  });
  return missing;
}

export default function QaTestCasesSheetModule() {
  const { user, profile, logAudit } = useSupabaseAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [sheets, setSheets] = useState(() => loadStoredTestSheets());
  const [activeSheetId, setActiveSheetId] = useState(() => sheets[0]?.id || 'sheet-default-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal para agregar nueva columna personalizada
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [newColForm, setNewColForm] = useState({
    label: '',
    type: 'text',
    optionsCsv: 'Alta, Media, Baja',
  });

  // Modal para crear nueva hoja / matriz
  const [addSheetModalOpen, setAddSheetModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  // Modal de confirmación para Finalizar Diseño, Actualizar y Finalizar o Desbloquear Diseño
  const [confirmDesignAction, setConfirmDesignAction] = useState(null); // 'finalize' | 'update_finalize' | 'unlock' | null

  // Edición de nombre de columna o de hoja en línea
  const [editingColId, setEditingColId] = useState(null);
  const [editingColLabel, setEditingColLabel] = useState('');
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [editingSheetName, setEditingSheetName] = useState('');

  // Referencias para enfocar automáticamente el nuevo paso al presionar Enter
  const stepInputRefs = useRef({});

  const analystDisplayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Analista de Calidad';

  const saveSheets = (updatedSheets) => {
    setSheets(updatedSheets);
    try {
      localStorage.setItem(TEST_CASES_STORAGE_KEY, JSON.stringify(updatedSheets));
    } catch (err) {
      console.warn('No se pudo guardar en localStorage:', err);
    }
  };

  const activeSheet = useMemo(
    () => sheets.find((s) => s.id === activeSheetId) || sheets[0] || null,
    [sheets, activeSheetId]
  );

  const isLocked = Boolean(activeSheet?.isFinalized);

  const updateActiveSheet = (updater) => {
    if (!activeSheet) return;
    const next = sheets.map((s) => (s.id === activeSheet.id ? updater(s) : s));
    saveSheets(next);
  };

  // ============================================================================
  // FINALIZAR DISEÑO (BLOQUEAR MODO LECTURA) / EDITAR Y ACTUALIZAR DISEÑO
  // ============================================================================
  const missingCells = useMemo(() => validateSheetCompletion(activeSheet), [activeSheet]);

  /**
   * Valida que todas las columnas disponibles estén completas y abre el modal de confirmación
   */
  const handleFinalizeDesign = () => {
    if (!activeSheet) return;
    if (activeSheet.rows.length === 0) {
      toast.warning('Agrega al menos un caso de prueba.');
      return;
    }

    const incomplete = validateSheetCompletion(activeSheet);
    if (incomplete.length > 0) {
      setShowValidationErrors(true);
      toast.error('Completa todos los campos obligatorios.');
      return;
    }

    setShowValidationErrors(false);
    setConfirmDesignAction(activeSheet.hasBeenFinalizedOnce ? 'update_finalize' : 'finalize');
  };

  /**
   * Ejecuta la finalización o actualización definitiva tras confirmar en el modal
   */
  const executeConfirmedFinalize = () => {
    if (!activeSheet) return;
    const nowIso = new Date().toISOString();
    const wasFinalizedBefore = Boolean(activeSheet.hasBeenFinalizedOnce);

    updateActiveSheet((sheet) => ({
      ...sheet,
      isFinalized: true,
      hasBeenFinalizedOnce: true,
      finalizedAt: nowIso,
      finalizedBy: analystDisplayName,
      rows: sheet.rows.map((r) => ({
        ...r,
        executionStatus: r.executionStatus || 'pending',
        executedBy: r.executedBy || '',
      })),
    }));

    setEditingColId(null);
    setEditingSheetId(null);
    setConfirmDesignAction(null);

    if (logAudit) {
      logAudit(wasFinalizedBefore ? 'update_finalized_sheet' : 'finalize_sheet_design', 'qa_test_cases_sheet', {
        sheet_id: activeSheet.id,
        sheet_name: activeSheet.name,
        total_cases: activeSheet.rows.length,
        analyst: analystDisplayName,
      });
    }

    toast.success(
      wasFinalizedBefore ? 'Casos actualizados exitosamente.' : 'Casos guardados exitosamente.'
    );
  };

  /**
   * Abre el modal de confirmación antes de desbloquear una hoja finalizada
   */
  const handleUnlockForEdit = () => {
    if (!activeSheet) return;
    setConfirmDesignAction('unlock');
  };

  /**
   * Ejecuta el desbloqueo definitivo tras confirmar en el modal
   */
  const executeConfirmedUnlock = () => {
    if (!activeSheet) return;
    setShowValidationErrors(false);
    updateActiveSheet((sheet) => ({
      ...sheet,
      isFinalized: false,
    }));
    setConfirmDesignAction(null);
    toast.info('Diseño habilitado para edición.');
  };

  // ============================================================================
  // OPERACIONES DE FILAS (CASOS DE PRUEBA) Y CELDAS
  // ============================================================================
  const handleAddRow = () => {
    if (!activeSheet || isLocked) return;
    const nextIndex = activeSheet.rows.length + 1;
    const newCode = `CP-${String(nextIndex).padStart(3, '0')}`;

    const defaultCells = {};
    activeSheet.columns.forEach((col) => {
      defaultCells[col.key] = col.type === 'steps' ? [''] : '';
    });

    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: newCode,
      executionStatus: 'pending',
      executedBy: '',
      executedAt: null,
      cells: defaultCells,
    };

    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: [...sheet.rows, newRow],
    }));

    if (logAudit) {
      logAudit('add_test_case_row', 'qa_test_cases_sheet', {
        sheet: activeSheet.name,
        case_code: newCode,
      });
    }
    toast.success('Caso creado exitosamente.');
  };

  const handleDuplicateRow = (rowIndex) => {
    if (!activeSheet || isLocked) return;
    const sourceRow = activeSheet.rows[rowIndex];
    if (!sourceRow) return;

    const clonedCells = JSON.parse(JSON.stringify(sourceRow.cells));
    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: `CP-${String(activeSheet.rows.length + 1).padStart(3, '0')}`,
      executionStatus: 'pending',
      executedBy: '',
      executedAt: null,
      cells: clonedCells,
    };

    updateActiveSheet((sheet) => {
      const nextRows = [...sheet.rows];
      nextRows.splice(rowIndex + 1, 0, newRow);
      return {
        ...sheet,
        rows: nextRows.map((r, idx) => ({
          ...r,
          code: `CP-${String(idx + 1).padStart(3, '0')}`,
        })),
      };
    });

    toast.success('Caso duplicado exitosamente.');
  };

  const handleDeleteRow = (rowId) => {
    if (!activeSheet || isLocked) return;
    updateActiveSheet((sheet) => {
      const filtered = sheet.rows.filter((r) => r.id !== rowId);
      return {
        ...sheet,
        rows: filtered.map((r, idx) => ({
          ...r,
          code: `CP-${String(idx + 1).padStart(3, '0')}`,
        })),
      };
    });
    toast.info('Caso eliminado exitosamente.');
  };

  const handleCellChange = (rowId, colKey, value) => {
    if (isLocked) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) =>
        r.id === rowId
          ? {
            ...r,
            cells: {
              ...r.cells,
              [colKey]: value,
            },
          }
          : r
      ),
    }));
  };

  // ============================================================================
  // OPERACIONES DE PASOS CON NUMERACIÓN AUTOMÁTICA (1., 2., 3. ...)
  // ============================================================================
  const getRowSteps = (row) => {
    const raw = row?.cells?.pasos;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(/\r?\n/).map(stripStepNumberPrefix);
    }
    return [''];
  };

  const handleStepTextChange = (rowId, stepIdx, newValue) => {
    if (isLocked) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSteps = [...getRowSteps(r)];
        currentSteps[stepIdx] = newValue;
        return {
          ...r,
          cells: {
            ...r.cells,
            pasos: currentSteps,
          },
        };
      }),
    }));
  };

  const handleAddStepAfter = (rowId, afterIdx) => {
    if (isLocked) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSteps = [...getRowSteps(r)];
        const targetIdx = typeof afterIdx === 'number' ? afterIdx + 1 : currentSteps.length;
        currentSteps.splice(targetIdx, 0, '');
        return {
          ...r,
          cells: {
            ...r.cells,
            pasos: currentSteps,
          },
        };
      }),
    }));

    const nextStepIdx = typeof afterIdx === 'number' ? afterIdx + 1 : 0;
    setTimeout(() => {
      const refKey = `${rowId}-step-${nextStepIdx}`;
      stepInputRefs.current[refKey]?.focus();
    }, 30);
  };

  const handleRemoveStep = (rowId, stepIdx) => {
    if (isLocked) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSteps = [...getRowSteps(r)];
        if (currentSteps.length <= 1) {
          return {
            ...r,
            cells: { ...r.cells, pasos: [''] },
          };
        }
        currentSteps.splice(stepIdx, 1);
        return {
          ...r,
          cells: {
            ...r.cells,
            pasos: currentSteps,
          },
        };
      }),
    }));

    setTimeout(() => {
      const prevIdx = Math.max(0, stepIdx - 1);
      const refKey = `${rowId}-step-${prevIdx}`;
      stepInputRefs.current[refKey]?.focus();
    }, 30);
  };

  const handleMoveStep = (rowId, stepIdx, direction) => {
    if (isLocked) return;
    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSteps = [...getRowSteps(r)];
        const targetIdx = stepIdx + direction;
        if (targetIdx < 0 || targetIdx >= currentSteps.length) return r;
        const temp = currentSteps[stepIdx];
        currentSteps[stepIdx] = currentSteps[targetIdx];
        currentSteps[targetIdx] = temp;
        return {
          ...r,
          cells: {
            ...r.cells,
            pasos: currentSteps,
          },
        };
      }),
    }));
  };

  const handleStepPaste = (e, rowId, stepIdx) => {
    if (isLocked) return;
    const pastedText = e.clipboardData?.getData('text') || '';
    if (!pastedText.includes('\n')) return;

    e.preventDefault();
    const lines = pastedText
      .split(/\r?\n/)
      .map(stripStepNumberPrefix)
      .filter(Boolean);

    if (lines.length === 0) return;

    updateActiveSheet((sheet) => ({
      ...sheet,
      rows: sheet.rows.map((r) => {
        if (r.id !== rowId) return r;
        const currentSteps = [...getRowSteps(r)];
        currentSteps.splice(stepIdx, 1, ...lines);
        return {
          ...r,
          cells: {
            ...r.cells,
            pasos: currentSteps,
          },
        };
      }),
    }));

    toast.success('Pasos agregados exitosamente.');
  };

  // ============================================================================
  // OPERACIONES DE COLUMNAS PERSONALIZADAS (AÑADIR, RENOMBRAR, ELIMINAR)
  // ============================================================================
  const handleAddColumn = (e) => {
    e.preventDefault();
    if (isLocked) return;
    const cleanLabel = newColForm.label.trim();
    if (!cleanLabel || !activeSheet) return;

    const colKey = `custom_${cleanLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36).slice(-3)}`;

    const options =
      newColForm.type === 'select'
        ? newColForm.optionsCsv
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
        : [];

    const newCol = {
      id: `col-${Date.now()}`,
      key: colKey,
      label: cleanLabel,
      type: newColForm.type,
      options,
      isDefault: false,
      width: 'w-56 min-w-[190px]',
      placeholder: `Ingresa ${cleanLabel.toLowerCase()}...`,
    };

    updateActiveSheet((sheet) => ({
      ...sheet,
      columns: [...sheet.columns, newCol],
      rows: sheet.rows.map((r) => ({
        ...r,
        cells: {
          ...r.cells,
          [colKey]: newColForm.type === 'select' && options.length > 0 ? options[0] : '',
        },
      })),
    }));

    setNewColForm({ label: '', type: 'text', optionsCsv: 'Alta, Media, Baja' });
    setAddColumnModalOpen(false);
    toast.success('Columna creada exitosamente.');
  };

  const handleSaveColumnRename = (colId) => {
    if (isLocked) {
      setEditingColId(null);
      return;
    }
    const clean = editingColLabel.trim();
    if (!clean) {
      setEditingColId(null);
      return;
    }
    updateActiveSheet((sheet) => ({
      ...sheet,
      columns: sheet.columns.map((c) => (c.id === colId ? { ...c, label: clean } : c)),
    }));
    setEditingColId(null);
    toast.success('Columna actualizada exitosamente.');
  };

  const handleDeleteColumn = (col) => {
    if (isLocked) return;
    if (col.isDefault) {
      toast.warning('No se puede eliminar una columna base.');
      return;
    }
    updateActiveSheet((sheet) => ({
      ...sheet,
      columns: sheet.columns.filter((c) => c.id !== col.id),
    }));
    toast.info('Columna eliminada exitosamente.');
  };

  // ============================================================================
  // GESTIÓN DE HOJAS (PESTAÑAS TIPO EXCEL) Y EXPORTACIÓN
  // ============================================================================
  const handleCreateSheet = (e) => {
    e.preventDefault();
    const cleanName = newSheetName.trim();
    if (!cleanName) return;

    const newSheet = {
      id: `sheet-${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      isFinalized: false,
      hasBeenFinalizedOnce: false,
      finalizedAt: null,
      finalizedBy: '',
      columns: DEFAULT_COLUMNS,
      rows: [
        {
          id: `row-${Date.now()}-1`,
          code: 'CP-001',
          executionStatus: 'pending',
          executedBy: '',
          executedAt: null,
          cells: {
            dependencia: '',
            pasos: [''],
            resultado: '',
          },
        },
      ],
    };

    const updated = [...sheets, newSheet];
    saveSheets(updated);
    setActiveSheetId(newSheet.id);
    setNewSheetName('');
    setAddSheetModalOpen(false);
    toast.success('Hoja creada exitosamente.');
  };

  const handleDeleteSheet = (sheetId) => {
    if (sheets.length <= 1) {
      toast.warning('Debe existir al menos una hoja.');
      return;
    }
    const target = sheets.find((s) => s.id === sheetId);
    if (!window.confirm(`¿Eliminar la hoja "${target?.name}" y todos sus casos de prueba?`)) return;

    const updated = sheets.filter((s) => s.id !== sheetId);
    saveSheets(updated);
    if (activeSheetId === sheetId) {
      setActiveSheetId(updated[0].id);
    }
    toast.info('Hoja eliminada exitosamente.');
  };

  const handleSaveSheetRename = (sheetId) => {
    const clean = editingSheetName.trim();
    if (!clean) {
      setEditingSheetId(null);
      return;
    }
    const updated = sheets.map((s) => (s.id === sheetId ? { ...s, name: clean } : s));
    saveSheets(updated);
    setEditingSheetId(null);
    toast.success('Hoja actualizada exitosamente.');
  };

  const formatStepsForExport = (row) => {
    const steps = getRowSteps(row)
      .map((s) => s.trim())
      .filter(Boolean);
    return steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
  };

  const handleExportExcelCsv = () => {
    if (!activeSheet) return;

    const headers = ['# Caso', ...activeSheet.columns.map((c) => c.label)];
    const escapeCsvCell = (val) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.map(escapeCsvCell).join(';'),
      ...activeSheet.rows.map((row) => {
        const values = [
          row.code,
          ...activeSheet.columns.map((col) => {
            if (col.type === 'steps' || col.key === 'pasos') {
              return formatStepsForExport(row);
            }
            return row.cells[col.key] ?? '';
          }),
        ];
        return values.map(escapeCsvCell).join(';');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Archivo exportado exitosamente.');
  };

  const handleCopyForExcel = async () => {
    if (!activeSheet) return;
    const headers = ['# Caso', ...activeSheet.columns.map((c) => c.label)].join('\t');
    const lines = activeSheet.rows.map((row) => {
      const cols = [
        row.code,
        ...activeSheet.columns.map((col) => {
          if (col.type === 'steps' || col.key === 'pasos') {
            return `"${formatStepsForExport(row).replace(/"/g, '""')}"`;
          }
          return String(row.cells[col.key] ?? '').replace(/\t|\r?\n/g, ' ');
        }),
      ];
      return cols.join('\t');
    });

    try {
      await navigator.clipboard.writeText([headers, ...lines].join('\n'));
      toast.success('Tabla copiada exitosamente.');
    } catch {
      toast.error('Error al copiar la tabla.');
    }
  };

  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];
    if (!searchQuery.trim()) return activeSheet.rows;
    const q = searchQuery.toLowerCase();
    return activeSheet.rows.filter((row) => {
      if (row.code.toLowerCase().includes(q)) return true;
      return activeSheet.columns.some((col) => {
        const val = row.cells[col.key];
        if (Array.isArray(val)) {
          return val.some((step) => String(step).toLowerCase().includes(q));
        }
        return String(val ?? '')
          .toLowerCase()
          .includes(q);
      });
    });
  }, [activeSheet, searchQuery]);

  const totalStepsInSheet = useMemo(() => {
    if (!activeSheet) return 0;
    return activeSheet.rows.reduce((acc, r) => {
      const validSteps = getRowSteps(r).filter((s) => s.trim().length > 0);
      return acc + validSteps.length;
    }, 0);
  }, [activeSheet]);

  const finalizedSheetsCount = useMemo(
    () => sheets.filter((s) => s.isFinalized).length,
    [sheets]
  );

  return (
    <div className="space-y-5 animate-slide-up" data-testid="qa-test-cases-sheet-module">
      <PageHeader
        icon={FileSpreadsheet}
        eyebrow="Portal Cloud · Rol Analista de Calidad"
        title="Matriz de Casos de Prueba (Diseño de Hojas QA)"
        description="Diseña tus escenarios en formato tabla de Excel con las columnas por defecto Escenario, Pasos y Resultado. Al finalizar el diseño de una hoja, se bloquea en modo lectura y se publica automáticamente en el módulo Ejecución de Pruebas."
        testId="qa-test-cases-header"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* DROPDOWN CON TODAS LAS OPCIONES DE LA HOJA */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                className="btn btn-secondary btn-sm gap-2 border-moss-300"
                data-testid="sheet-options-dropdown-btn"
              >
                <span>Opciones de Hoja</span>
                <ChevronDown
                  className={cn('h-4 w-4 text-moss-700 transition-transform', actionsMenuOpen && 'rotate-180')}
                />
              </button>

              {actionsMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-moss-200 bg-white p-1.5 shadow-lift z-40 animate-slide-up"
                  data-testid="sheet-options-dropdown-menu"
                >
                  {!isLocked && (
                    <>
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-moss-500">
                        Estructura de la Hoja
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          handleAddRow();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                        data-testid="add-test-case-row-btn"
                      >
                        <Plus className="h-4 w-4 text-moss-700" />
                        <span>Añadir Nuevo Caso (Fila)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          setAddColumnModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                        data-testid="open-add-column-modal-btn"
                      >
                        <Columns className="h-4 w-4 text-moss-700" />
                        <span>Añadir Nueva Columna</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          setAddSheetModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                        data-testid="dropdown-add-new-sheet-btn"
                      >
                        <FolderPlus className="h-4 w-4 text-moss-700" />
                        <span>Crear Nueva Hoja</span>
                      </button>

                      <div className="my-1 border-t border-moss-100" />
                    </>
                  )}

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-moss-500">
                    Exportar y Portapapeles
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleCopyForExcel();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                    data-testid="copy-sheet-excel-btn"
                  >
                    <Copy className="h-4 w-4 text-moss-700" />
                    <span>Copiar Tabla para Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleExportExcelCsv();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-moss-900 hover:bg-moss-50 transition"
                    data-testid="export-sheet-csv-btn"
                  >
                    <Download className="h-4 w-4 text-moss-700" />
                    <span>Exportar a Excel (.CSV)</span>
                  </button>

                  <div className="my-1 border-t border-moss-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      navigate('/portal/qa-test-execution');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                    data-testid="dropdown-go-to-execution-btn"
                  >
                    <PlayCircle className="h-4 w-4 text-emerald-600" />
                    <span>Ir a Ejecución de Pruebas</span>
                  </button>
                </div>
              )}
            </div>

            {/* BOTÓN PRINCIPAL: FINALIZAR DISEÑO / EDITAR DISEÑO */}
            {isLocked ? (
              <button
                type="button"
                onClick={handleUnlockForEdit}
                className="btn btn-secondary btn-sm gap-1.5 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                data-testid="edit-finalized-sheet-btn"
              >
                <Unlock className="h-4 w-4 text-amber-700" />
                <span>Editar Diseño</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeDesign}
                className="btn btn-primary btn-sm gap-1.5 shadow-lift"
                data-testid="finalize-sheet-design-btn"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {activeSheet?.hasBeenFinalizedOnce
                    ? 'Actualizar y Finalizar Diseño'
                    : 'Finalizar Diseño'}
                </span>
              </button>
            )}
          </div>
        }
      />

      {/* BARRA DE PESTAÑAS DE LIBRO EXCEL + BUSCADOR Y RESUMEN */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-moss-200 bg-white p-3.5 shadow-soft">
        {/* Pestañas de Hojas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheet?.id;
            const isEditing = editingSheetId === sheet.id;

            return (
              <div
                key={sheet.id}
                className={cn(
                  'group flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0',
                  isActive
                    ? 'border-moss-600 bg-moss-900 text-white shadow-2xs'
                    : 'border-moss-200 bg-moss-50/70 text-moss-800 hover:bg-moss-100'
                )}
                onClick={() => setActiveSheetId(sheet.id)}
                data-testid={`sheet-tab-${sheet.id}`}
              >
                {sheet.isFinalized ? (
                  <Lock
                    className={cn('h-3.5 w-3.5', isActive ? 'text-emerald-400' : 'text-emerald-600')}
                    title="Diseño Finalizado (Solo lectura)"
                  />
                ) : (
                  <FileSpreadsheet
                    className={cn('h-3.5 w-3.5', isActive ? 'text-amber-300' : 'text-moss-600')}
                    title="En Edición"
                  />
                )}

                {isEditing && !sheet.isFinalized ? (
                  <input
                    type="text"
                    value={editingSheetName}
                    onChange={(e) => setEditingSheetName(e.target.value)}
                    onBlur={() => handleSaveSheetRename(sheet.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSheetRename(sheet.id);
                      if (e.key === 'Escape') setEditingSheetId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-40 rounded bg-white px-1.5 py-0.5 text-xs text-moss-950 focus:outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (sheet.isFinalized) {
                        toast.info('Desbloquea el diseño para editar.');
                        return;
                      }
                      setEditingSheetId(sheet.id);
                      setEditingSheetName(sheet.name);
                    }}
                    title={
                      sheet.isFinalized
                        ? `${sheet.name} (Diseño Finalizado)`
                        : 'Doble clic para renombrar la hoja'
                    }
                  >
                    {sheet.name}
                  </span>
                )}

                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 font-mono text-[10px]',
                    isActive ? 'bg-white/15 text-emerald-200' : 'bg-moss-200/70 text-moss-700'
                  )}
                >
                  {sheet.rows.length}
                </span>

                {sheet.isFinalized && (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase',
                      isActive
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30'
                        : 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    Finalizado
                  </span>
                )}

                {sheets.length > 1 && !sheet.isFinalized && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSheet(sheet.id);
                    }}
                    className={cn(
                      'ml-0.5 rounded p-0.5 opacity-60 hover:opacity-100',
                      isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-moss-200 text-moss-700'
                    )}
                    title="Eliminar hoja"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setAddSheetModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-dashed border-moss-300 bg-moss-50/40 px-2.5 py-1.5 text-xs font-semibold text-moss-700 hover:bg-moss-100 transition shrink-0"
            data-testid="add-new-sheet-btn"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ Nueva Hoja</span>
          </button>
        </div>

        {/* Buscador y contadores rápidos */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-moss-600">
            <span>
              <strong>{activeSheet?.rows.length || 0}</strong> escenarios
            </span>
            <span>·</span>
            <span>
              <strong>{totalStepsInSheet}</strong> pasos
            </span>
            <span>·</span>
            <span>
              <strong>{finalizedSheetsCount}</strong>/{sheets.length} finalizadas
            </span>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-moss-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar escenarios o pasos..."
              className="input pl-9 py-1.5 text-xs w-full"
              data-testid="search-test-cases-sheet-input"
            />
          </div>
        </div>
      </div>

      {/* BANNER DE ESTADO DEL DISEÑO (BLOQUEADO EN MODO LECTURA vs MODO EDICIÓN) */}
      {activeSheet && (
        <div
          className={cn(
            'rounded-2xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 transition',
            isLocked
              ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950 shadow-2xs'
              : 'border-amber-300 bg-amber-50/80 text-amber-950'
          )}
          data-testid="sheet-design-status-banner"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl shrink-0',
                isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              )}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">
                  {isLocked
                    ? `Diseño Finalizado · Modo Solo Lectura ("${activeSheet.name}")`
                    : activeSheet.hasBeenFinalizedOnce
                      ? `Editando Diseño Desbloqueado ("${activeSheet.name}")`
                      : `Diseño en Edición ("${activeSheet.name}")`}
                </span>
                <span
                  className={cn(
                    'badge text-[10px]',
                    isLocked ? 'badge-green' : 'badge-amber'
                  )}
                  data-testid="sheet-lock-state-badge"
                >
                  {isLocked ? 'BLOQUEADO · SOLO LECTURA' : 'MODO EDICIÓN ACTIVO'}
                </span>
              </div>
              <p className="text-xs opacity-85 mt-0.5">
                {isLocked ? (
                  <>
                    Este diseño está bloqueado para evitar cambios accidentales y se encuentra publicado en{' '}
                    <strong>Ejecución de Pruebas</strong>. Si necesitas modificarlo, presiona{' '}
                    <strong>&ldquo;Editar Diseño&rdquo;</strong>.
                  </>
                ) : (
                  <>
                    Agrega o edita casos, pasos y columnas. Cuando termines, presiona{' '}
                    <strong>
                      &ldquo;
                      {activeSheet.hasBeenFinalizedOnce
                        ? 'Actualizar y Finalizar Diseño'
                        : 'Finalizar Diseño'}
                      &rdquo;
                    </strong>{' '}
                    para bloquearlo y habilitarlo en el módulo de Ejecución de Pruebas.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLocked ? (
              <>
                <button
                  type="button"
                  onClick={handleUnlockForEdit}
                  className="btn btn-secondary btn-sm gap-1.5 bg-white border-emerald-300 text-emerald-950 hover:bg-emerald-100"
                  data-testid="banner-edit-sheet-btn"
                >
                  <Unlock className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Editar Diseño</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/portal/qa-test-execution')}
                  className="btn btn-primary btn-sm gap-1.5"
                  data-testid="go-to-test-execution-btn"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>Ir a Ejecución de Pruebas</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleFinalizeDesign}
                className="btn btn-primary btn-sm gap-1.5 shadow-sm"
                data-testid="banner-finalize-sheet-btn"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {activeSheet.hasBeenFinalizedOnce
                    ? 'Actualizar y Finalizar Diseño'
                    : 'Finalizar Diseño'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ALERTA DE VALIDACIÓN SI FALTAN COLUMNAS O CELDAS POR DILIGENCIAR AL FINALIZAR */}
      {!isLocked && showValidationErrors && missingCells.length > 0 && (
        <div
          className="rounded-2xl border border-red-300 bg-red-50 px-5 py-3.5 text-red-950 shadow-2xs flex flex-wrap items-center justify-between gap-3"
          data-testid="sheet-validation-errors-alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900">
                No se puede finalizar el diseño: hay {missingCells.length}{' '}
                {missingCells.length === 1 ? 'celda sin diligenciar' : 'celdas sin diligenciar'}
              </p>
              <p className="text-xs text-red-800 mt-0.5">
                Todas las columnas disponibles ({activeSheet?.columns.map((c) => c.label).join(', ')}) deben estar completamente diligenciadas en cada caso de prueba antes de finalizar. Completa los campos marcados en rojo o elimina las columnas/filas que no necesites.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowValidationErrors(false)}
            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Ocultar aviso
          </button>
        </div>
      )}

      {/* HOJA DE CÁLCULO ESTILO EXCEL */}
      {activeSheet && (
        <div
          className={cn(
            'card overflow-hidden border shadow-lift bg-white',
            isLocked ? 'border-emerald-300' : 'border-moss-300'
          )}
        >
          {/* Cinta informativa estilo barra de fórmulas de Excel */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-moss-200 bg-moss-50/90 px-4 py-2 text-xs text-moss-700">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white',
                  isLocked ? 'bg-slate-700' : 'bg-emerald-700'
                )}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>SOLO LECTURA</span>
                  </>
                ) : (
                  <span>FX · MODO EXCEL QA</span>
                )}
              </span>
              {isLocked ? (
                <span>
                  Hoja finalizada por <strong>{activeSheet.finalizedBy || analystDisplayName}</strong>
                  {activeSheet.finalizedAt
                    ? ` el ${new Date(activeSheet.finalizedAt).toLocaleString()}`
                    : ''}
                  .
                </span>
              ) : (
                <span>
                  En la columna <strong>Pasos</strong>, presiona{' '}
                  <kbd className="rounded border border-moss-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>{' '}
                  para agregar el siguiente paso numerado automáticamente.
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] text-moss-500">
              Analista: {analystDisplayName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              data-testid="excel-test-cases-table"
            >
              <thead>
                <tr className="bg-moss-900 text-white divide-x divide-moss-700/80 border-b-2 border-moss-800">
                  {/* Columna índice # tipo Excel */}
                  <th className="w-24 min-w-[90px] py-3 px-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider bg-moss-950 text-emerald-300">
                    # Caso
                  </th>

                  {/* Columnas (Dependencia, Pasos, Resultado + Columnas Añadidas) */}
                  {activeSheet.columns.map((col, colIdx) => {
                    const excelLetter = String.fromCharCode(65 + colIdx);
                    const isEditingCol = editingColId === col.id && !isLocked;

                    return (
                      <th
                        key={col.id}
                        className={cn('py-2.5 px-3.5 align-middle select-none', col.width)}
                        data-testid={`sheet-col-header-${col.key}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 font-mono text-[10px] font-bold text-emerald-300 shrink-0">
                              {excelLetter}
                            </span>

                            {isEditingCol ? (
                              <input
                                type="text"
                                value={editingColLabel}
                                onChange={(e) => setEditingColLabel(e.target.value)}
                                onBlur={() => handleSaveColumnRename(col.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveColumnRename(col.id);
                                  if (e.key === 'Escape') setEditingColId(null);
                                }}
                                autoFocus
                                className="w-full rounded bg-white px-2 py-0.5 text-xs font-bold text-moss-950 focus:outline-none"
                              />
                            ) : (
                              <span
                                className={cn(
                                  'font-bold text-xs tracking-wide truncate',
                                  !col.isDefault && !isLocked && 'cursor-pointer'
                                )}
                                onDoubleClick={() => {
                                  if (!col.isDefault && !isLocked) {
                                    setEditingColId(col.id);
                                    setEditingColLabel(col.label);
                                  }
                                }}
                                title={
                                  col.isDefault
                                    ? `Columna por defecto: ${col.label}`
                                    : isLocked
                                      ? col.label
                                      : 'Doble clic para renombrar columna'
                                }
                              >
                                {col.label}
                              </span>
                            )}
                          </div>

                          {!col.isDefault && !isLocked && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingColId(col.id);
                                  setEditingColLabel(col.label);
                                }}
                                className="rounded p-1 text-moss-300 hover:bg-white/10 hover:text-white"
                                title="Renombrar columna"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(col)}
                                className="rounded p-1 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                                title="Eliminar columna"
                                data-testid={`delete-col-btn-${col.key}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* Columna Acciones (solo activa en modo edición) */}
                  {!isLocked && (
                    <th className="w-28 min-w-[105px] py-2.5 px-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider bg-moss-950 text-moss-200">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-moss-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeSheet.columns.length + (isLocked ? 1 : 2)}
                      className="py-12 text-center text-sm text-moss-500"
                    >
                      No hay casos de prueba que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIndex) => {
                    const rowSteps = getRowSteps(row);

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'divide-x divide-moss-200 transition group align-top',
                          isLocked ? 'bg-slate-50/35' : 'hover:bg-moss-50/40'
                        )}
                        data-testid={`test-case-row-${rowIndex + 1}`}
                      >
                        {/* Celda # Caso (Índice tipo Excel) */}
                        <td className="bg-moss-50/80 py-3 px-2.5 text-center align-top select-none">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono text-[11px] font-bold text-moss-500">
                              {rowIndex + 1}
                            </span>
                            <span
                              className="rounded-md bg-moss-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-moss-900"
                              data-testid={`row-code-${rowIndex + 1}`}
                            >
                              {row.code}
                            </span>
                          </div>
                        </td>

                        {/* Celdas dinámicas por columna */}
                        {activeSheet.columns.map((col) => {
                          const cellIncomplete = !isLocked && showValidationErrors && !isCellFilled(row, col);

                          // COLUMNA DE PASOS CON NUMERACIÓN AUTOMÁTICA
                          if (col.type === 'steps' || col.key === 'pasos') {
                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  'p-2.5 align-top bg-white transition',
                                  cellIncomplete && 'bg-red-50/50 ring-1 ring-inset ring-red-300'
                                )}
                                data-testid={`cell-${row.id}-${col.key}`}
                              >
                                <div className="space-y-1.5">
                                  {rowSteps.map((stepText, sIdx) => {
                                    const stepEmptyError =
                                      !isLocked && showValidationErrors && !String(stepText || '').trim();
                                    return (
                                      <div
                                        key={`${row.id}-step-${sIdx}`}
                                        className="flex items-start gap-1.5 group/step"
                                      >
                                        {/* Número automático del paso */}
                                        <span
                                          className="mt-1 inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-moss-900 px-1.5 font-mono text-[11px] font-bold text-emerald-300 shrink-0 select-none"
                                          data-testid={`step-number-${rowIndex + 1}-${sIdx + 1}`}
                                        >
                                          {sIdx + 1}.
                                        </span>

                                        {isLocked ? (
                                          <div
                                            className="w-full rounded-lg bg-moss-50/40 px-2.5 py-1 text-xs text-moss-900 leading-relaxed"
                                            data-testid={`step-readonly-${rowIndex + 1}-${sIdx + 1}`}
                                          >
                                            {stepText || <span className="italic text-moss-400">Sin descripción</span>}
                                          </div>
                                        ) : (
                                          <>
                                            <input
                                              ref={(el) => {
                                                stepInputRefs.current[`${row.id}-step-${sIdx}`] = el;
                                              }}
                                              type="text"
                                              value={stepText}
                                              onChange={(e) =>
                                                handleStepTextChange(row.id, sIdx, e.target.value)
                                              }
                                              onPaste={(e) => handleStepPaste(e, row.id, sIdx)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleAddStepAfter(row.id, sIdx);
                                                } else if (
                                                  e.key === 'Backspace' &&
                                                  !stepText &&
                                                  rowSteps.length > 1
                                                ) {
                                                  e.preventDefault();
                                                  handleRemoveStep(row.id, sIdx);
                                                }
                                              }}
                                              placeholder={`Paso ${sIdx + 1}: escribe la acción y presiona Enter...`}
                                              className={cn(
                                                'w-full rounded-lg border px-2.5 py-1 text-xs text-moss-950 placeholder:text-moss-400 focus:border-moss-500 focus:bg-white focus:outline-none transition',
                                                stepEmptyError
                                                  ? 'border-red-400 bg-red-50/70 placeholder:text-red-400'
                                                  : 'border-transparent bg-moss-50/50'
                                              )}
                                              data-testid={`step-input-${rowIndex + 1}-${sIdx + 1}`}
                                            />

                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/step:opacity-100 focus-within:opacity-100 transition pt-1 shrink-0">
                                              {rowSteps.length > 1 && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleMoveStep(row.id, sIdx, -1)}
                                                    disabled={sIdx === 0}
                                                    className="rounded p-0.5 text-moss-500 hover:bg-moss-100 hover:text-moss-900 disabled:opacity-30"
                                                    title="Subir paso"
                                                  >
                                                    <ArrowUp className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleMoveStep(row.id, sIdx, 1)}
                                                    disabled={sIdx === rowSteps.length - 1}
                                                    className="rounded p-0.5 text-moss-500 hover:bg-moss-100 hover:text-moss-900 disabled:opacity-30"
                                                    title="Bajar paso"
                                                  >
                                                    <ArrowDown className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveStep(row.id, sIdx)}
                                                    className="rounded p-0.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                    title="Eliminar este paso"
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {cellIncomplete && (
                                    <p className="pl-7 text-[10px] font-semibold text-red-600">
                                      Completa todos los pasos de este caso.
                                    </p>
                                  )}

                                  {!isLocked && (
                                    <div className="pt-1 pl-7 flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => handleAddStepAfter(row.id, rowSteps.length - 1)}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-moss-700 hover:bg-moss-100 hover:text-moss-950 transition"
                                        data-testid={`add-step-btn-${rowIndex + 1}`}
                                      >
                                        <Plus className="h-3 w-3" />
                                        <span>Añadir paso #{rowSteps.length + 1}</span>
                                      </button>
                                      <span className="font-mono text-[10px] text-moss-400">
                                        {rowSteps.filter((s) => s.trim()).length}{' '}
                                        {rowSteps.filter((s) => s.trim()).length === 1 ? 'paso' : 'pasos'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          // COLUMNA TIPO LISTA / SELECT PERSONALIZADA
                          if (col.type === 'select' && Array.isArray(col.options)) {
                            const val = row.cells[col.key] ?? '';
                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  'p-2.5 align-top',
                                  cellIncomplete && 'bg-red-50/50 ring-1 ring-inset ring-red-300'
                                )}
                                data-testid={`cell-${row.id}-${col.key}`}
                              >
                                <CustomSelect
                                  id={`select-${row.id}-${col.key}`}
                                  testId={`select-${rowIndex + 1}-${col.key}`}
                                  value={val}
                                  disabled={isLocked}
                                  error={cellIncomplete}
                                  size="sm"
                                  placeholder="Seleccionar..."
                                  onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                  options={col.options.map((opt) => ({
                                    value: opt,
                                    label: opt,
                                  }))}
                                />
                                {cellIncomplete && (
                                  <p className="mt-1 text-[10px] font-semibold text-red-600">
                                    Selecciona un valor para {col.label}.
                                  </p>
                                )}
                              </td>
                            );
                          }

                          // CELDAS DE TEXTO ESTILO EXCEL (Escenario, Resultado y Columnas Adicionales)
                          const cellValue = row.cells[col.key] ?? '';
                          return (
                            <td
                              key={col.id}
                              className={cn(
                                'p-2 align-top transition',
                                !isLocked && 'focus-within:bg-emerald-50/30',
                                cellIncomplete && 'bg-red-50/50 ring-1 ring-inset ring-red-300'
                              )}
                              data-testid={`cell-${row.id}-${col.key}`}
                            >
                              {isLocked ? (
                                <div
                                  className="p-2 text-xs leading-relaxed text-moss-950 whitespace-pre-wrap"
                                  data-testid={`cell-readonly-${rowIndex + 1}-${col.key}`}
                                >
                                  {cellValue || <span className="italic text-moss-400">—</span>}
                                </div>
                              ) : (
                                <>
                                  <textarea
                                    rows={Math.max(2, Math.min(6, String(cellValue).split('\n').length))}
                                    value={cellValue}
                                    onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                    placeholder={col.placeholder || `Escribir ${col.label.toLowerCase()}...`}
                                    className={cn(
                                      'w-full resize-y rounded-lg border p-2 text-xs leading-relaxed text-moss-950 placeholder:text-moss-400 focus:border-moss-500 focus:bg-white focus:outline-none transition',
                                      cellIncomplete
                                        ? 'border-red-400 bg-red-50/60 placeholder:text-red-400'
                                        : 'border-transparent bg-transparent'
                                    )}
                                    data-testid={`cell-input-${rowIndex + 1}-${col.key}`}
                                  />
                                  {cellIncomplete && (
                                    <p className="px-1 pt-0.5 text-[10px] font-semibold text-red-600">
                                      Campo requerido ({col.label}).
                                    </p>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}

                        {/* Celda de Acciones de la Fila (Solo visible si no está bloqueada) */}
                        {!isLocked && (
                          <td className="p-2.5 text-center align-top bg-moss-50/30">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(rowIndex)}
                                className="rounded-lg border border-moss-200 bg-white p-1.5 text-moss-700 hover:bg-moss-100 hover:text-moss-950 transition"
                                title="Duplicar caso de prueba"
                                data-testid={`duplicate-row-btn-${rowIndex + 1}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                                title="Eliminar fila"
                                data-testid={`delete-row-btn-${rowIndex + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pie de tabla tipo Excel */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-moss-200 bg-moss-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {isLocked ? (
                <>
                  <button
                    type="button"
                    onClick={handleUnlockForEdit}
                    className="btn btn-secondary btn-sm gap-1.5"
                    data-testid="bottom-unlock-sheet-btn"
                  >
                    <Unlock className="h-4 w-4 text-amber-700" />
                    <span>Desbloquear para Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/portal/qa-test-execution')}
                    className="btn btn-primary btn-sm gap-1.5"
                    data-testid="bottom-go-execution-btn"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Ejecutar este Diseño en Ejecución de Pruebas</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="btn btn-secondary btn-sm gap-1.5"
                    data-testid="bottom-add-row-btn"
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      Añadir Fila (CP-{String((activeSheet.rows.length || 0) + 1).padStart(3, '0')})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddColumnModalOpen(true)}
                    className="btn btn-secondary btn-sm gap-1.5"
                    data-testid="bottom-add-column-btn"
                  >
                    <Columns className="h-4 w-4" />
                    <span>Añadir Nueva Columna</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalizeDesign}
                    className="btn btn-primary btn-sm gap-1.5"
                    data-testid="bottom-finalize-sheet-btn"
                  >
                    <Lock className="h-4 w-4" />
                    <span>
                      {activeSheet.hasBeenFinalizedOnce
                        ? 'Actualizar y Finalizar Diseño'
                        : 'Finalizar Diseño'}
                    </span>
                  </button>
                </>
              )}
            </div>

            <span className="font-mono text-xs text-moss-600">
              Columnas base: <strong>Escenario</strong> · <strong>Pasos</strong> ·{' '}
              <strong>Resultado</strong>
              {activeSheet.columns.length > 3 && (
                <>
                  {' '}
                  + <strong>{activeSheet.columns.length - 3}</strong> personalizada(s)
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* MODAL PARA AÑADIR NUEVA COLUMNA PERSONALIZADA */}
      <Modal
        open={addColumnModalOpen}
        onClose={() => setAddColumnModalOpen(false)}
        title="Añadir Nueva Columna a la Tabla"
        description="Las columnas Escenario, Pasos y Resultado se mantienen por defecto. Puedes añadir todas las columnas adicionales que necesites para documentar tus casos de prueba."
        size="md"
        testId="add-column-modal"
      >
        <form onSubmit={handleAddColumn} className="space-y-4">
          <Field label="Nombre de la Columna *" id="new-col-label-input" required>
            <input
              id="new-col-label-input"
              type="text"
              required
              value={newColForm.label}
              onChange={(e) => setNewColForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Ej. Dependencia, Prioridad, Datos de Prueba, Precondiciones..."
              className="input w-full"
              data-testid="new-col-label-input"
              autoFocus
            />
          </Field>

          <Field label="Tipo de Celda" id="new-col-type-select">
            <CustomSelect
              id="new-col-type-select"
              testId="new-col-type-select"
              value={newColForm.type}
              onChange={(e) => setNewColForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { value: 'text', label: 'Texto libre (Celda editable tipo Excel)' },
                { value: 'select', label: 'Lista desplegable (Ej. Alta / Media / Baja)' },
              ]}
            />
          </Field>

          {newColForm.type === 'select' && (
            <Field
              label="Opciones separadas por coma *"
              id="new-col-options-input"
              help="Ejemplo: Alta, Media, Baja"
              required
            >
              <input
                id="new-col-options-input"
                type="text"
                required
                value={newColForm.optionsCsv}
                onChange={(e) => setNewColForm((p) => ({ ...p, optionsCsv: e.target.value }))}
                placeholder="Alta, Media, Baja"
                className="input w-full font-mono text-xs"
                data-testid="new-col-options-input"
              />
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-moss-200">
            <button
              type="button"
              onClick={() => setAddColumnModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newColForm.label.trim()}
              className="btn btn-primary gap-1.5"
              data-testid="confirm-add-column-btn"
            >
              <Check className="h-4 w-4" />
              <span>Crear Columna</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PARA CREAR HOJA / MATRIZ */}
      <Modal
        open={addSheetModalOpen}
        onClose={() => setAddSheetModalOpen(false)}
        title="Crear Nueva Hoja de Casos de Prueba"
        description="Crea una nueva hoja en modo edición con las columnas por defecto: Escenario, Pasos y Resultado."
        size="md"
        testId="add-sheet-modal"
      >
        <form onSubmit={handleCreateSheet} className="space-y-4">
          <Field label="Nombre de la Hoja / Módulo *" id="new-sheet-name-input" required>
            <input
              id="new-sheet-name-input"
              type="text"
              required
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="Ej. Regresión Carrito de Compras"
              className="input w-full"
              data-testid="new-sheet-name-input"
              autoFocus
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-moss-200">
            <button
              type="button"
              onClick={() => setAddSheetModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newSheetName.trim()}
              className="btn btn-primary gap-1.5"
              data-testid="confirm-create-sheet-btn"
            >
              <Check className="h-4 w-4" />
              <span>Crear Hoja</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN PARA FINALIZAR, ACTUALIZAR O DESBLOQUEAR EL DISEÑO */}
      <Modal
        open={Boolean(confirmDesignAction)}
        onClose={() => setConfirmDesignAction(null)}
        title={
          confirmDesignAction === 'unlock'
            ? 'Confirmar Desbloqueo de Diseño'
            : confirmDesignAction === 'update_finalize'
              ? 'Confirmar Actualización y Finalización de Diseño'
              : 'Confirmar Finalización de Diseño'
        }
        description={
          confirmDesignAction === 'unlock'
            ? `¿Estás seguro de que deseas desbloquear la hoja "${activeSheet?.name || ''}" para editarla?`
            : confirmDesignAction === 'update_finalize'
              ? `¿Estás seguro de que deseas guardar los cambios y volver a finalizar el diseño de "${activeSheet?.name || ''}"?`
              : `¿Estás seguro de que deseas finalizar y bloquear el diseño de "${activeSheet?.name || ''}"?`
        }
        size="md"
        testId="confirm-design-action-modal"
      >
        <div className="space-y-4">
          <div
            className={cn(
              'rounded-xl border p-4 text-xs leading-relaxed',
              confirmDesignAction === 'unlock'
                ? 'border-amber-200 bg-amber-50/80 text-amber-950'
                : 'border-moss-200 bg-moss-50/80 text-moss-900'
            )}
          >
            {confirmDesignAction === 'unlock' ? (
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>La hoja pasará a Modo Edición</span>
                </p>
                <p>
                  Al desbloquear <strong>{activeSheet?.name}</strong>, podrás modificar escenarios, pasos y columnas. Mientras se encuentre en edición, deberás volver a confirmar{' '}
                  <strong>&ldquo;Actualizar y Finalizar Diseño&rdquo;</strong> para que quede bloqueada y disponible en el módulo de{' '}
                  <strong>Ejecución de Pruebas</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-moss-700 shrink-0" />
                  <span>
                    {confirmDesignAction === 'update_finalize'
                      ? 'Se actualizarán los cambios y la hoja quedará bloqueada en solo lectura'
                      : 'La hoja quedará bloqueada en modo solo lectura'}
                  </span>
                </p>
                <p>
                  Se han verificado satisfactoriamente los{' '}
                  <strong>{activeSheet?.rows.length || 0} casos de prueba</strong> y las{' '}
                  <strong>{activeSheet?.columns.length || 0} columnas</strong> de la hoja{' '}
                  <strong>{activeSheet?.name}</strong>. Una vez confirmada esta acción, el diseño se reflejará de inmediato en el módulo{' '}
                  <strong>Ejecución de Pruebas</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-moss-200">
            <button
              type="button"
              onClick={() => setConfirmDesignAction(null)}
              className="btn btn-secondary"
              data-testid="cancel-design-action-btn"
            >
              Cancelar
            </button>

            {confirmDesignAction === 'unlock' ? (
              <button
                type="button"
                onClick={executeConfirmedUnlock}
                className="btn btn-primary gap-1.5"
                data-testid="confirm-unlock-design-btn"
              >
                <Unlock className="h-4 w-4" />
                <span>Sí, Desbloquear para Editar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={executeConfirmedFinalize}
                className="btn btn-primary gap-1.5"
                data-testid="confirm-finalize-design-btn"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {confirmDesignAction === 'update_finalize'
                    ? 'Sí, Actualizar y Finalizar'
                    : 'Sí, Finalizar Diseño'}
                </span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
