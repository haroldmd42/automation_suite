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
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ showLocators: state.showLocators }));
    } catch {
      /* ignore */
    }
  }, [state.showLocators]);

  const toggleLocators = useCallback(() => setState((s) => ({ ...s, showLocators: !s.showLocators })), []);
  const setInspector = useCallback((v) => setState((s) => ({ ...s, inspector: typeof v === 'function' ? v(s.inspector) : v })), []);

  const value = useMemo(
    () => ({ ...state, toggleLocators, setInspector }),
    [state, toggleLocators, setInspector],
  );
  return <QAContext.Provider value={value}>{children}</QAContext.Provider>;
}

export function useQA() {
  const ctx = useContext(QAContext);
  if (!ctx) throw new Error('useQA debe usarse dentro de QAProvider');
  return ctx;
}
