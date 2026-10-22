import { useState } from 'react';
import { MapPin, Globe, Building2, CheckCircle2, RotateCcw } from 'lucide-react';
import { GEO_DATA } from './controlsData';
import { simulateRequest } from '../../services/network';
import CustomSelect from '../../components/ui/CustomSelect';
import LocatorHint from '../../components/qa/LocatorHint';
import { Spinner } from '../../components/ui/Primitives';

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

  const countryOptions = [
    { value: '', label: '-- Selecciona un País --' },
    ...Object.values(GEO_DATA).map((c) => ({
      value: c.code,
      label: `${c.name} (${c.code})`,
    })),
  ];

  const statePlaceholder = !selectedCountry
    ? '-- Selecciona País primero --'
    : loadingStates
    ? 'Cargando estados...'
    : '-- Selecciona Estado --';

  const stateOptions = [
    { value: '', label: statePlaceholder },
    ...statesList.map(([code, s]) => ({
      value: code,
      label: s.name,
    })),
  ];

  const cityPlaceholder = !selectedState
    ? '-- Selecciona Estado primero --'
    : loadingCities
    ? 'Cargando ciudades...'
    : '-- Selecciona Ciudad --';

  const cityOptions = [
    { value: '', label: cityPlaceholder },
    ...citiesList.map((city) => ({
      value: city,
      label: city,
    })),
  ];

  return (
    <div data-testid="nested-cascade-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-moss-900">Cascada Asíncrona (País → Estado → Ciudad)</h3>
          <p className="text-sm text-moss-600 mt-0.5">
            Cada selección desencadena una carga asíncrona simulada (1.5 - 2s). Deshabilita los
            controles dependientes durante el estado de espera.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          data-testid="cascade-reset-btn"
          className="btn btn-secondary btn-sm self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </button>
      </div>

      <div className="card p-6 grid gap-6 md:grid-cols-3">
        {/* Nivel 1: País */}
        <div className="space-y-2">
          <label htmlFor="cascade-country" className="label flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-moss-800">
              <Globe className="h-4 w-4 text-moss-600" />
              <span>1. País</span>
            </span>
            <LocatorHint testId="cascade-country-select" />
          </label>
          <CustomSelect
            id="cascade-country"
            testId="cascade-country-select"
            value={selectedCountry}
            onChange={handleCountryChange}
            options={countryOptions}
            placeholder="-- Selecciona un País --"
          />
        </div>

        {/* Nivel 2: Estado / Provincia */}
        <div className="space-y-2">
          <label htmlFor="cascade-state" className="label flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-moss-800">
              <Building2 className="h-4 w-4 text-moss-600" />
              <span>2. Estado / Región</span>
              {loadingStates && <Spinner className="h-3.5 w-3.5 text-moss-600 ml-1.5" testId="cascade-state-spinner" />}
            </span>
            <LocatorHint testId="cascade-state-select" />
          </label>
          <CustomSelect
            id="cascade-state"
            testId="cascade-state-select"
            value={selectedState}
            onChange={handleStateChange}
            disabled={!selectedCountry || loadingStates}
            options={stateOptions}
            placeholder={statePlaceholder}
          />
        </div>

        {/* Nivel 3: Ciudad / Municipio */}
        <div className="space-y-2">
          <label htmlFor="cascade-city" className="label flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-moss-800">
              <MapPin className="h-4 w-4 text-moss-600" />
              <span>3. Ciudad / Municipio</span>
              {loadingCities && <Spinner className="h-3.5 w-3.5 text-moss-600 ml-1.5" testId="cascade-city-spinner" />}
            </span>
            <LocatorHint testId="cascade-city-select" />
          </label>
          <CustomSelect
            id="cascade-city"
            testId="cascade-city-select"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedState || loadingCities}
            options={cityOptions}
            placeholder={cityPlaceholder}
          />
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
