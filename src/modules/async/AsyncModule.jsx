import { useState } from 'react';
import {
  Timer,
  Layers,
  MessageSquare,
  BellRing,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/Primitives';
import { Tabs } from '../../components/ui/Tabs';
import NestedModalsSection from './NestedModalsSection';
import DynamicTooltipsSection from './DynamicTooltipsSection';
import EphemeralToastsSection from './EphemeralToastsSection';
import DynamicLifecycleSection from './DynamicLifecycleSection';

const TABS = [
  { key: 'modals', label: 'Modales Superpuestos (Stack)', icon: Layers },
  { key: 'tooltips', label: 'Tooltips Dinámicos & Asíncronos', icon: MessageSquare },
  { key: 'toasts', label: 'Alertas Efímeras (Toasts)', icon: BellRing },
  { key: 'lifecycle', label: 'Ciclos de Vida, Shadow DOM & iFrame', icon: Activity },
];

export default function AsyncModule() {
  const [activeTab, setActiveTab] = useState('modals');

  return (
    <div data-testid="async-module-page" className="space-y-6">
      <PageHeader
        icon={Timer}
        eyebrow="Módulo 04"
        title="Elementos Asíncronos y Dinámicos"
        description="El campo de entrenamiento definitivo para la sincronización web: modales con apilamiento en cascada, tooltips que dependen de latencias de red, toasts efímeros con temporizador en vivo, elementos con mutaciones periódicas, Shadow DOM nativo y documentos dentro de iframes."
        testId="async-header"
      />

      {/* Tabs de Secciones */}
      <Tabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        prefix="async-tab"
      />

      <div id="async-tab-panel" role="tabpanel" data-testid="async-active-panel">
        {activeTab === 'modals' && <NestedModalsSection />}
        {activeTab === 'tooltips' && <DynamicTooltipsSection />}
        {activeTab === 'toasts' && <EphemeralToastsSection />}
        {activeTab === 'lifecycle' && <DynamicLifecycleSection />}
      </div>
    </div>
  );
}
