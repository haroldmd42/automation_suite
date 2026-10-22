import { Link } from 'react-router-dom';
import { Compass, House } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" data-testid="not-found-page">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-moss-400 to-moss-700 text-white shadow-lift">
        <Compass className="h-10 w-10" aria-hidden />
      </div>
      <p className="font-mono text-sm font-semibold text-moss-600">ERROR 404</p>
      <h1 className="mt-2 text-3xl font-bold">Ruta no encontrada</h1>
      <p className="mt-2 max-w-md text-moss-600">
        La página que buscas no existe. Útil para validar el manejo de rutas inválidas en tus pruebas.
      </p>
      <Link to="/" className="btn btn-primary mt-6" data-testid="not-found-home-link">
        <House className="h-4 w-4" /> Volver al dashboard
      </Link>
    </div>
  );
}
