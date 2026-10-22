import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table2,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { INITIAL_TRANSACTIONS, STATUS_LABELS } from './tableData';
import { formatCents, formatDateES, cn } from '../../utils/format';
import { useDebounce } from '../../hooks/common';
import { simulateRequest } from '../../services/network';
import { PageHeader, Spinner, Skeleton, Alert } from '../../components/ui/Primitives';
import { Checkbox } from '../../components/ui/Field';
import CustomSelect from '../../components/ui/CustomSelect';
import LocatorHint from '../../components/qa/LocatorHint';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';

export default function DataTableModule() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dataset mutable para permitir actualizaciones masivas
  const [dataset, setDataset] = useState(INITIAL_TRANSACTIONS);

  // Estados leídos de SearchParams para permitir Deep Linking
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const initialSearch = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialSortCol = searchParams.get('sortBy') || 'date';
  const initialSortDir = searchParams.get('sortDir') || 'desc';

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Ordenamiento
  const [sortCol, setSortCol] = useState(initialSortCol);
  const [sortDir, setSortDir] = useState(initialSortDir); // 'asc' | 'desc'

  // Selección de filas (Persistente entre páginas)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Estados de carga asíncrona simulada de servidor
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 350);

  // Sincronizar parámetros en URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== 10) params.set('pageSize', String(pageSize));
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sortCol) params.set('sortBy', sortCol);
    if (sortDir) params.set('sortDir', sortDir);
    setSearchParams(params, { replace: true });
  }, [page, pageSize, debouncedSearch, statusFilter, sortCol, sortDir, setSearchParams]);

  // Filtrado y Ordenamiento
  const filteredData = useMemo(() => {
    return dataset.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && item.paymentMethod !== paymentFilter) return false;

      if (minAmount && item.amountCents < parseFloat(minAmount) * 100) return false;
      if (maxAmount && item.amountCents > parseFloat(maxAmount) * 100) return false;

      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesCustomer = item.customer.toLowerCase().includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesEmail) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'amountCents') {
        return sortDir === 'asc' ? a.amountCents - b.amountCents : b.amountCents - a.amountCents;
      }
      if (sortCol === 'date') {
        const tA = new Date(a.date).getTime();
        const tB = new Date(b.date).getTime();
        return sortDir === 'asc' ? tA - tB : tB - tA;
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [dataset, statusFilter, paymentFilter, minAmount, maxAmount, debouncedSearch, sortCol, sortDir]);

  // Paginación
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Simular latencia de servidor al cambiar de página, búsqueda u orden
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    simulateRequest(() => {}, { minDelay: 400, maxDelay: 800, canFail: false }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, statusFilter, paymentFilter, sortCol, sortDir]);

  // Manejo de Ordenamiento
  const handleSort = (columnKey) => {
    if (sortCol === columnKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(columnKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Checkbox Maestro de Página
  const pageRowIds = paginatedRows.map((r) => r.id);
  const selectedOnCurrentPage = pageRowIds.filter((id) => selectedIds.has(id)).length;
  const isPageAllSelected = pageRowIds.length > 0 && selectedOnCurrentPage === pageRowIds.length;
  const isPageIndeterminate = selectedOnCurrentPage > 0 && !isPageAllSelected;

  const handleToggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isPageAllSelected) {
        pageRowIds.forEach((id) => next.delete(id));
      } else {
        pageRowIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllGlobal = () => {
    setSelectedIds(new Set(filteredData.map((d) => d.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Acciones Masivas
  const handleBulkComplete = () => {
    setDataset((prev) =>
      prev.map((item) => (selectedIds.has(item.id) ? { ...item, status: 'completed' } : item)),
    );
    toast.success(
      'Actualización masiva',
      `${selectedIds.size} transacciones marcadas como "Completado".`,
    );
    handleClearSelection();
  };

  const handleConfirmDelete = () => {
    setDataset((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    toast.info('Registros eliminados', `Se eliminaron ${selectedIds.size} transacciones.`);
    handleClearSelection();
    setDeleteConfirmOpen(false);
  };

  const handleExportCSV = () => {
    const rowsToExport = dataset.filter((d) => selectedIds.has(d.id));
    const target = rowsToExport.length > 0 ? rowsToExport : filteredData;

    const headers = ['ID', 'Cliente', 'Email', 'Fecha', 'Metodo', 'Monto_USD', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...target.map((r) =>
        [
          r.id,
          `"${r.customer}"`,
          r.email,
          r.date,
          `"${r.paymentMethod}"`,
          (r.amountCents / 100).toFixed(2),
          r.status,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transacciones_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo generado', `Se exportaron ${target.length} registros a CSV.`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
    setSortCol('date');
    setSortDir('desc');
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
      setJumpPageInput('');
    }
  };

  return (
    <div data-testid="data-tables-page" className="space-y-6">
      <PageHeader
        icon={Table2}
        eyebrow="Módulo 05"
        title="Data Tables Complejas y Servidor Simulado"
        description="Paginación real de servidor, filtros múltiples combinados con debounce, ordenamiento multi-columna, selección de filas persistente a través de páginas, acciones masivas y sincronización de estado en la URL (deep linking)."
        testId="tables-header"
      />

      {/* BARRA DE FILTROS COMBINADOS */}
      <section className="card p-5 space-y-4" data-testid="table-filters-section">
        <div className="flex items-center justify-between border-b border-moss-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-moss-600" />
            <h3 className="text-sm font-bold text-moss-900">Filtros Combinados de Búsqueda</h3>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            data-testid="table-reset-filters-btn"
            className="btn btn-secondary btn-sm text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar Filtros
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda rápida */}
          <div>
            <label htmlFor="table-search" className="label">
              <span>Buscar por ID o Cliente</span>
              <LocatorHint testId="table-search-input" />
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-500" />
              <input
                id="table-search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                data-testid="table-search-input"
                placeholder="TXN-..., Ana Torres..."
                className="input pl-9"
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div>
            <label htmlFor="table-status-filter" className="label">
              <span>Estado de Transacción</span>
              <LocatorHint testId="table-status-filter" />
            </label>
            <CustomSelect
              id="table-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              testId="table-status-filter"
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'completed', label: 'Completado' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'review', label: 'En Revisión' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
            />
          </div>

          {/* Filtro de Método de Pago */}
          <div>
            <label htmlFor="table-payment-filter" className="label">
              <span>Método de Pago</span>
              <LocatorHint testId="table-payment-filter" />
            </label>
            <CustomSelect
              id="table-payment-filter"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              testId="table-payment-filter"
              options={[
                { value: 'all', label: 'Todos los Métodos' },
                { value: 'Tarjeta Visa', label: 'Tarjeta Visa' },
                { value: 'Mastercard', label: 'Mastercard' },
                { value: 'SPEI / Transferencia', label: 'SPEI / Transferencia' },
                { value: 'PayPal', label: 'PayPal' },
                { value: 'Cripto / USDT', label: 'Cripto / USDT' },
              ]}
            />
          </div>

          {/* Rango de Montos */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="table-min-amount" className="label">
                <span>Mín ($)</span>
              </label>
              <input
                id="table-min-amount"
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setPage(1);
                }}
                data-testid="table-min-amount-input"
                className="input font-mono"
              />
            </div>
            <div>
              <label htmlFor="table-max-amount" className="label">
                <span>Máx ($)</span>
              </label>
              <input
                id="table-max-amount"
                type="number"
                placeholder="5000"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setPage(1);
                }}
                data-testid="table-max-amount-input"
                className="input font-mono"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BARRA DE ACCIONES MASIVAS (CUANDO HAY FILAS SELECCIONADAS) */}
      {selectedIds.size > 0 && (
        <div
          data-testid="table-bulk-actions-bar"
          className="rounded-2xl bg-moss-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-lift animate-slide-up"
        >
          <div className="flex items-center gap-3">
            <span
              data-testid="selected-count-badge"
              className="rounded-lg bg-moss-700 px-3 py-1 font-mono text-xs font-bold text-moss-100"
            >
              {selectedIds.size} seleccionada{selectedIds.size > 1 ? 's' : ''}
            </span>
            {selectedIds.size < totalItems && (
              <button
                type="button"
                onClick={handleSelectAllGlobal}
                data-testid="select-all-global-btn"
                className="text-xs text-moss-300 hover:text-white underline"
              >
                Seleccionar las {totalItems} filas en todas las páginas
              </button>
            )}
            <button
              type="button"
              onClick={handleClearSelection}
              data-testid="clear-selection-btn"
              className="text-xs text-moss-400 hover:text-white"
            >
              Deseleccionar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkComplete}
              data-testid="bulk-complete-btn"
              className="btn btn-sm bg-moss-600 hover:bg-moss-500 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Completado
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              data-testid="bulk-export-btn"
              className="btn btn-sm btn-secondary"
            >
              <Download className="h-3.5 w-3.5" /> Exportar ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              data-testid="bulk-delete-btn"
              className="btn btn-sm btn-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* TABLA PRINCIPAL */}
      <section className="card overflow-hidden" data-testid="data-table-container">
        {/* Cabecera de controles superiores: tamaño de página y exportación */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-moss-200/80 bg-moss-50/50 p-4 text-xs text-moss-700">
          <div className="flex items-center gap-2">
            <label htmlFor="table-page-size-select" className="font-medium text-moss-800">
              Mostrar:
            </label>
            <div className="w-28">
              <CustomSelect
                id="table-page-size-select"
                testId="table-page-size-select"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                size="sm"
                options={[
                  { value: '5', label: '5 filas' },
                  { value: '10', label: '10 filas' },
                  { value: '25', label: '25 filas' },
                  { value: '50', label: '50 filas' },
                ]}
              />
            </div>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <span className="flex items-center gap-1.5 text-moss-600" data-testid="table-loading-spinner">
                <Spinner className="h-3.5 w-3.5" /> Consultando servidor...
              </span>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              data-testid="export-all-csv-btn"
              className="btn btn-secondary btn-sm text-xs"
            >
              <Download className="h-3 w-3" /> Exportar Vista a CSV
            </button>
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="main-data-table">
            <thead className="border-b border-moss-200/80 bg-moss-100/70 text-xs font-bold uppercase tracking-wider text-moss-700">
              <tr>
                {/* Checkbox Maestro de Página */}
                <th className="table-th w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isPageAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPageIndeterminate;
                    }}
                    onChange={handleToggleSelectPage}
                    data-testid="select-all-page-cb"
                    data-indeterminate={isPageIndeterminate}
                    aria-label="Seleccionar todas las filas de esta página"
                    className="checkbox"
                  />
                </th>

                {/* Columna ID */}
                <th
                  className="table-th cursor-pointer select-none"
                  onClick={() => handleSort('id')}
                  data-testid="th-sort-id"
                  aria-sort={sortCol === 'id' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID Transacción</span>
                    {sortCol === 'id' ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-moss-900" /> : <ArrowDown className="h-3.5 w-3.5 text-moss-900" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-moss-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Columna Cliente */}
                <th
                  className="table-th cursor-pointer select-none"
                  onClick={() => handleSort('customer')}
                  data-testid="th-sort-customer"
                  aria-sort={sortCol === 'customer' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente / Contacto</span>
                    {sortCol === 'customer' ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-moss-900" /> : <ArrowDown className="h-3.5 w-3.5 text-moss-900" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-moss-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Columna Fecha */}
                <th
                  className="table-th cursor-pointer select-none"
                  onClick={() => handleSort('date')}
                  data-testid="th-sort-date"
                  aria-sort={sortCol === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    {sortCol === 'date' ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-moss-900" /> : <ArrowDown className="h-3.5 w-3.5 text-moss-900" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-moss-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Columna Método */}
                <th className="table-th">Método</th>

                {/* Columna Monto */}
                <th
                  className="table-th text-right cursor-pointer select-none"
                  onClick={() => handleSort('amountCents')}
                  data-testid="th-sort-amount"
                  aria-sort={sortCol === 'amountCents' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Monto (USD)</span>
                    {sortCol === 'amountCents' ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-moss-900" /> : <ArrowDown className="h-3.5 w-3.5 text-moss-900" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-moss-400 opacity-60" />
                    )}
                  </div>
                </th>

                {/* Columna Estado */}
                <th
                  className="table-th cursor-pointer select-none"
                  onClick={() => handleSort('status')}
                  data-testid="th-sort-status"
                  aria-sort={sortCol === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {sortCol === 'status' ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-moss-900" /> : <ArrowDown className="h-3.5 w-3.5 text-moss-900" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-moss-400 opacity-60" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-moss-100">
              {loading ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="table-td text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                    <td className="table-td"><Skeleton className="h-4 w-20" /></td>
                    <td className="table-td"><Skeleton className="h-4 w-36" /></td>
                    <td className="table-td"><Skeleton className="h-4 w-24" /></td>
                    <td className="table-td"><Skeleton className="h-4 w-24" /></td>
                    <td className="table-td text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="table-td"><Skeleton className="h-5 w-20" /></td>
                  </tr>
                ))
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-moss-600" data-testid="table-no-results">
                    No se encontraron registros que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isChecked = selectedIds.has(row.id);
                  const statusInfo = STATUS_LABELS[row.status] || { label: row.status, tone: 'badge-gray' };

                  return (
                    <tr
                      key={row.id}
                      data-testid={`table-row-${row.id}`}
                      data-selected={isChecked}
                      className={cn(
                        'transition-colors hover:bg-moss-50/50',
                        isChecked && 'bg-moss-100/50',
                      )}
                    >
                      <td className="table-td text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(row.id)}
                          data-testid={`row-select-${row.id}`}
                          aria-label={`Seleccionar ${row.id}`}
                          className="checkbox"
                        />
                      </td>
                      <td className="table-td font-mono text-xs font-bold text-moss-900">
                        {row.id}
                      </td>
                      <td className="table-td">
                        <div className="font-semibold text-moss-900">{row.customer}</div>
                        <div className="text-xs text-moss-500">{row.email}</div>
                      </td>
                      <td className="table-td font-mono text-xs text-moss-700">
                        {formatDateES(new Date(row.date))}
                      </td>
                      <td className="table-td text-xs text-moss-800">{row.paymentMethod}</td>
                      <td className="table-td text-right font-mono font-bold text-moss-900">
                        {formatCents(row.amountCents)}
                      </td>
                      <td className="table-td">
                        <span className={cn('badge text-[11px]', statusInfo.tone)}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINACIÓN INFERIOR */}
        <div
          data-testid="table-pagination-bar"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-moss-200/80 bg-moss-50/60 p-4 text-xs text-moss-700"
        >
          {/* Información de rango actual */}
          <div data-testid="pagination-info" className="font-medium">
            Mostrando{' '}
            <strong className="text-moss-900">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            a{' '}
            <strong className="text-moss-900">
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            de <strong className="text-moss-900">{totalItems}</strong> transacciones
          </div>

          {/* Botones de Navegación de Página */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="pagination-prev-btn"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Números de página */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              // Centrar alrededor de la página actual
              let pNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) pNum = currentPage - 2 + i;
                if (pNum > totalPages) pNum = totalPages - (4 - i);
              }
              const isCurrent = pNum === currentPage;

              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  data-testid={`pagination-page-${pNum}`}
                  className={cn(
                    'h-8 w-8 rounded-lg font-mono text-xs font-semibold transition',
                    isCurrent
                      ? 'bg-moss-700 text-white shadow-soft'
                      : 'border border-moss-300 bg-white text-moss-800 hover:bg-moss-100',
                  )}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="pagination-next-btn"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Salto directo a página */}
          <form onSubmit={handleJumpToPage} className="flex items-center gap-1.5">
            <label htmlFor="jump-page-input" className="text-xs">
              Ir a pág:
            </label>
            <input
              id="jump-page-input"
              type="number"
              min="1"
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder={String(currentPage)}
              data-testid="pagination-jump-input"
              className="h-8 w-14 rounded-lg border border-moss-300 bg-white text-center font-mono text-xs font-semibold"
            />
            <button
              type="submit"
              data-testid="pagination-jump-btn"
              className="btn btn-secondary btn-sm text-xs"
            >
              Ir
            </button>
          </form>
        </div>
      </section>

      {/* Modal de Confirmación de Eliminación Masiva */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="¿Eliminar registros seleccionados?"
        description={`Esta acción eliminará permanentemente ${selectedIds.size} transacciones del conjunto de datos.`}
        testId="bulk-delete-confirm-modal"
        icon={Trash2}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              data-testid="bulk-delete-cancel-btn"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDelete}
              data-testid="bulk-delete-confirm-btn"
            >
              Sí, Eliminar ({selectedIds.size})
            </button>
          </>
        }
      >
        <p className="text-xs text-moss-700">
          Los registros eliminados no se podrán recuperar a menos que restablezcas los datos locales
          desde el pie de página.
        </p>
      </Modal>
    </div>
  );
}
