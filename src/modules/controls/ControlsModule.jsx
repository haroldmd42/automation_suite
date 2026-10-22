import { useState } from 'react';
import {
  SlidersHorizontal,
  MapPin,
  Calendar,
  FolderTree,
  FileCheck2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/Primitives';
import { Tabs } from '../../components/ui/Tabs';
import NestedCascadeSelect from './NestedCascadeSelect';
import AdvancedDatePicker from './AdvancedDatePicker';
import PermissionTree from './PermissionTree';
import CrossValidationForm from './CrossValidationForm';

const TABS = [
  { key: 'cascade', label: 'Cascada Geográfica Asíncrona', icon: MapPin },
  { key: 'datepicker', label: 'Date Pickers con Reglas', icon: Calendar },
  { key: 'tree', label: 'Árbol de Permisos (Indeterminate)', icon: FolderTree },
  { key: 'crossval', label: 'Validaciones Cruzadas Estrictas', icon: FileCheck2 },
];

export default function ControlsModule() {
  const [activeTab, setActiveTab] = useState('cascade');

  return (
    <div data-testid="controls-module-page" className="space-y-6">
      <PageHeader
        icon={SlidersHorizontal}
        eyebrow="Módulo 03"
        title="Controles UI y Validaciones Cruzadas"
        description="Escenarios avanzados de UI interactiva: selectores anidados que dependen de peticiones de red, calendarios con bloqueo de fines de semana y períodos restringidos, árboles jerárquicos de checkboxes y formularios con reglas cruzadas de negocio."
        testId="controls-header"
      />

      {/* Selector de Pestañas Accesible */}
      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        prefix="controls-tab"
      />

      {/* Contenido de la pestaña activa */}
      <div id="controls-tab-panel" role="tabpanel" data-testid="controls-active-panel">
        {activeTab === 'cascade' && <NestedCascadeSelect />}
        {activeTab === 'datepicker' && <AdvancedDatePicker />}
        {activeTab === 'tree' && <PermissionTree />}
        {activeTab === 'crossval' && <CrossValidationForm />}
      </div>
    </div>
  );
}
