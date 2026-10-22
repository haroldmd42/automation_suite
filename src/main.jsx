import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { getNetworkConfig, setNetworkConfig } from './services/network';
import './index.css';

// Hooks globales para test runners (Playwright/Cypress/Selenium):
//   window.__QA_SUITE__.setNetwork({ mode: 'instant', failureRate: 0 })
window.__QA_SUITE__ = {
  version: '1.0.0',
  getNetwork: getNetworkConfig,
  setNetwork: setNetworkConfig,
  reset() {
    localStorage.clear();
    sessionStorage.clear();
  },
};

// HashRouter: compatible con GitHub Pages (sin reescrituras de servidor).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
