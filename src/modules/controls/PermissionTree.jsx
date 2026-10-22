import { useState, useMemo } from 'react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  RotateCcw,
  Shield,
  Layers,
} from 'lucide-react';
import { PERMISSIONS_TREE } from './controlsData';
import LocatorHint from '../../components/qa/LocatorHint';
import { cn } from '../../utils/format';

// Recolectar todos los IDs de hojas (permisos concretos)
function getAllLeafIds(nodes) {
  let leaves = [];
  for (const n of nodes) {
    if (n.children && n.children.length > 0) {
      leaves = leaves.concat(getAllLeafIds(n.children));
    } else {
      leaves.push(n.id);
    }
  }
  return leaves;
}

// Obtener estado de un nodo (checked, unchecked, indeterminate)
function getNodeState(node, selectedSet) {
  if (!node.children || node.children.length === 0) {
    const isChecked = selectedSet.has(node.id);
    return { checked: isChecked, indeterminate: false };
  }

  const childLeaves = getAllLeafIds(node.children);
  const checkedCount = childLeaves.filter((id) => selectedSet.has(id)).length;

  if (checkedCount === childLeaves.length) {
    return { checked: true, indeterminate: false };
  }
  if (checkedCount > 0) {
    return { checked: false, indeterminate: true };
  }
  return { checked: false, indeterminate: false };
}

function TreeNode({ node, level = 0, selectedSet, onToggle, expandedMap, onToggleExpand }) {
  const isBranch = node.children && node.children.length > 0;
  const isExpanded = expandedMap[node.id] !== false; // Abierto por defecto
  const { checked, indeterminate } = getNodeState(node, selectedSet);

  return (
    <div
      data-testid={`tree-node-${node.id}`}
      style={{ marginLeft: `${level * 20}px` }}
      className="py-1"
    >
      <div className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-moss-50">
        {isBranch ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            data-testid={`tree-expand-btn-${node.id}`}
            aria-label={isExpanded ? `Contraer ${node.label}` : `Expandir ${node.label}`}
            className="p-1 text-moss-500 hover:text-moss-900 rounded"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6 inline-block" />
        )}

        {/* Checkbox con soporte de indeterminate */}
        <label
          htmlFor={`tree-cb-${node.id}`}
          className="flex cursor-pointer items-center gap-2 select-none text-sm text-moss-900"
        >
          <input
            id={`tree-cb-${node.id}`}
            type="checkbox"
            checked={checked}
            ref={(el) => {
              if (el) el.indeterminate = indeterminate;
            }}
            onChange={() => onToggle(node)}
            data-testid={`tree-checkbox-${node.id}`}
            data-indeterminate={indeterminate}
            className="checkbox"
          />
          <span
            className={cn(
              isBranch ? 'font-bold text-moss-900' : 'text-moss-700',
              indeterminate && 'text-moss-600',
            )}
          >
            {node.label}
          </span>
        </label>
        <LocatorHint testId={`tree-checkbox-${node.id}`} />
      </div>

      {/* Renderizado de hijos recursivo */}
      {isBranch && isExpanded && (
        <div className="border-l border-moss-200/80 ml-4 pl-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedSet={selectedSet}
              onToggle={onToggle}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PermissionTree() {
  const allLeaves = useMemo(() => getAllLeafIds(PERMISSIONS_TREE), []);
  const [selectedLeaves, setSelectedLeaves] = useState(() => new Set(['users_create', 'users_edit']));
  const [expandedMap, setExpandedMap] = useState({});

  const handleToggle = (node) => {
    setSelectedLeaves((prev) => {
      const next = new Set(prev);
      const leaves = getAllLeafIds([node]);
      const { checked } = getNodeState(node, prev);

      // Si estaba completamente seleccionado, deseleccionar todos los hijos
      // De lo contrario (deseleccionado o indeterminado), seleccionar todos
      if (checked) {
        leaves.forEach((id) => next.delete(id));
      } else {
        leaves.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleExpand = (nodeId) => {
    setExpandedMap((prev) => ({
      ...prev,
      [nodeId]: prev[nodeId] === false ? true : false,
    }));
  };

  const handleSelectAll = () => {
    setSelectedLeaves(new Set(allLeaves));
  };

  const handleDeselectAll = () => {
    setSelectedLeaves(new Set());
  };

  const selectedArray = Array.from(selectedLeaves);

  return (
    <div data-testid="permission-tree-root" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-moss-900">
            Árbol Jerárquico de Permisos (Checkbox Indeterminado)
          </h3>
          <p className="text-sm text-moss-600">
            Los padres reflejan estado intermedio (indeterminate = true) cuando solo algunos de sus
            hijos están seleccionados.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            data-testid="tree-select-all-btn"
            className="btn btn-secondary btn-sm"
          >
            <CheckSquare className="h-3.5 w-3.5" /> Seleccionar Todo
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            data-testid="tree-deselect-all-btn"
            className="btn btn-secondary btn-sm"
          >
            <Square className="h-3.5 w-3.5" /> Limpiar Todo
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Contenedor del Árbol */}
        <div className="card p-5" data-testid="tree-hierarchy-panel">
          <div className="border-b border-moss-200/80 pb-3 mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-moss-500">
              Estructura de Roles y Accesos
            </span>
            <span className="badge badge-moss font-mono text-[11px]">
              {selectedLeaves.size} de {allLeaves.length} activos
            </span>
          </div>

          <div className="space-y-1">
            {PERMISSIONS_TREE.map((rootNode) => (
              <TreeNode
                key={rootNode.id}
                node={rootNode}
                selectedSet={selectedLeaves}
                onToggle={handleToggle}
                expandedMap={expandedMap}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Resumen de Permisos Asignados */}
        <div className="space-y-4">
          <div className="card p-5" data-testid="tree-summary-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-moss-600" />
              <h4 className="font-bold text-moss-900 text-sm">Permisos Otorgados</h4>
            </div>

            <div className="rounded-xl bg-moss-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-moss-400 mb-2">
                JSON Payload (ID de Hojas):
              </p>
              <pre
                data-testid="selected-permissions-json"
                className="font-mono text-xs text-moss-200 max-h-56 overflow-y-auto whitespace-pre-wrap break-all"
              >
                {JSON.stringify(selectedArray, null, 2)}
              </pre>
            </div>

            <p className="mt-3 text-xs text-moss-500">
              Valida en tus scripts de prueba que los estados intermedios{' '}
              <code className="code-chip">data-indeterminate="true"</code> se propaguen correctamente
              hacia arriba y hacia abajo en la jerarquía DOM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
