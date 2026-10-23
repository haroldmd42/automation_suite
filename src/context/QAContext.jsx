import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const QAContext = createContext(null);
const KEY = 'qa_assist_settings';

function load() {
  try {
    return { showLocators: true, inspector: false, ...JSON.parse(localStorage.getItem(KEY) || '{}'), inspector: false };
  } catch {
    return { showLocators: true, inspector: false };
  }
}

export function QAProvider({ children }) {
  const [state, setState] = useState(() => ({
    ...load(),
    gherkinOpen: false,
  }));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ showLocators: state.showLocators }));
    } catch {
      /* ignore */
    }
  }, [state.showLocators]);

  const toggleLocators = useCallback(() => setState((s) => ({ ...s, showLocators: !s.showLocators })), []);
  const setInspector = useCallback((v) => setState((s) => ({ ...s, inspector: typeof v === 'function' ? v(s.inspector) : v })), []);
  const toggleGherkin = useCallback(() => setState((s) => ({ ...s, gherkinOpen: !s.gherkinOpen })), []);
  const setGherkinOpen = useCallback((v) => setState((s) => ({ ...s, gherkinOpen: typeof v === 'function' ? v(s.gherkinOpen) : !!v })), []);

  const value = useMemo(
    () => ({ ...state, toggleLocators, setInspector, toggleGherkin, setGherkinOpen }),
    [state, toggleLocators, setInspector, toggleGherkin, setGherkinOpen],
  );
  return <QAContext.Provider value={value}>{children}</QAContext.Provider>;
}

export function useQA() {
  const ctx = useContext(QAContext);
  if (!ctx) throw new Error('useQA debe usarse dentro de QAProvider');
  return ctx;
}
