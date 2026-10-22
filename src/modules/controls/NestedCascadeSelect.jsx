import { useState } from 'react';
import { MapPin, Globe, Building2, CheckCircle2, RotateCcw } from 'lucide-react';
import { GEO_DATA } from './controlsData';
import { simulateRequest } from '../../services/network';
import { Field } from '../../components/ui/Field';
import LocatorHint from '../../components/qa/LocatorHint';
import { Spinner, Alert } from '../../components/ui/Primitives';

export default function NestedCascadeSelect() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Estados de carga asíncrona simulada
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Al cambiar país -> resetear estado y ciudad, simular petición de estados
  const handleCountryChange = async (e) => {
    const countryCode = e.target.value;
    setSelectedCountry(countryCode);
    setSelectedState('');
    setSelectedCity('');

    if (!countryCode) return;

    setLoadingStates(true);
    await simulateRequest(() => {}, { minDelay: 1200, maxDelay: 2200, canFail: false });
    setLoadingStates(false);
  };

  // Al cambiar estado -> resetear ciudad, simular petición de ciudades
  const handleStateChange = async (e) => {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    setSelectedCity('');

    if (!stateCode) return;

    setLoadingCities(true);
    await simulateRequest(() => {}, { minDelay: 1000, maxDelay: 1800, canFail: false });
    setLoadingCities(false);
  };

  const currentCountry = GEO_DATA[selectedCountry];
  const statesList = currentCountry ? Object.entries(currentCountry.states) : [];
  const citiesList = currentCountry && selectedState ? currentCountry.states[selectedState]?.cities || [] : [];

  const handleReset = () => {
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
  };

  const isComplete = selectedCountry && selectedState && selectedCity;

  return (
    <div data-testid="nested-cascade-container" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-moss-900">Cascada Asíncrona (País → Estado → Ciudad)</h3>
          <p className="text-sm text-moss-600">
            Cada selección desencadena una carga asíncrona simulada (1.5 - 2s). Deshabilita los
            controles dependientes durante el estado de espera.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          data-testid="cascade-reset-btn"
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </button>
      </div>

      <div className="card p-6 grid gap-6 md:grid-cols-3">
        {/* Nivel 1: País */}
        <div>
          <label htmlFor="cascade-country" className="label">
            <Globe className="h-4 w-4 text-moss-600" />
            <span>1. País</span>
            <LocatorHint testId="cascade-country-select" />
          </label>
          <select
            id="cascade-country"
            value={selectedCountry}
            onChange={handleCountryChange}
            data-testid="cascade-country-select"
            className="input cursor-pointer"
          >
            <option value="">-- Selecciona un País --</option>
            {Object.values(GEO_DATA).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Nivel 2: Estado / Provincia */}
        <div>
          <label htmlFor="cascade-state" className="label">
            <Building2 className="h-4 w-4 text-moss-600" />
            <span>2. Estado / Región</span>
            <LocatorHint testId="cascade-state-select" />
            {loadingStates && <Spinner className="h-3.5 w-3.5 text-moss-600 ml-auto" testId="cascade-state-spinner" />}
          </label>
          <select
            id="cascade-state"
            value={selectedState}
            onChange={handleStateChange}
            disabled={!selectedCountry || loadingStates}
            data-testid="cascade-state-select"
            className="input cursor-pointer disabled:bg-moss-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedCountry
                ? '-- Selecciona País primero --'
                : loadingStates
                ? 'Cargando estados...'
                : '-- Selecciona Estado --'}
            </option>
            {statesList.map(([code, s]) => (
              <option key={code} value={code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nivel 3: Ciudad / Municipio */}
        <div>
          <label htmlFor="cascade-city" className="label">
            <MapPin className="h-4 w-4 text-moss-600" />
            <span>3. Ciudad / Municipio</span>
            <LocatorHint testId="cascade-city-select" />
            {loadingCities && <Spinner className="h-3.5 w-3.5 text-moss-600 ml-auto" testId="cascade-city-spinner" />}
          </label>
          <select
            id="cascade-city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedState || loadingCities}
            data-testid="cascade-city-select"
            className="input cursor-pointer disabled:bg-moss-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedState
                ? '-- Selecciona Estado primero --'
                : loadingCities
                ? 'Cargando ciudades...'
                : '-- Selecciona Ciudad --'}
            </option>
            {citiesList.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarjeta de Salida / Validación de selección completa */}
      {isComplete ? (
        <div
          data-testid="cascade-result"
          className="rounded-2xl bg-moss-600/10 border border-moss-600/30 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-moss-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-moss-600">
                Ubicación Seleccionada Correctamente:
              </p>
              <p className="text-sm font-bold text-moss-900">
                <span data-testid="cascade-city-result">{selectedCity}</span>,{' '}
                <span data-testid="cascade-state-result">{currentCountry.states[selectedState]?.name}</span> ({selectedCountry})
              </p>
            </div>
          </div>
          <span className="badge badge-green font-mono text-xs">RESOLVED</span>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-moss-300 p-4 text-center text-xs text-moss-500">
          Selecciona País, Estado y Ciudad para verificar el resultado final.
        </div>
      )}
    </div>
  );
}
