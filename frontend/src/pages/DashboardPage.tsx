import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type DashboardStats, type SolicitudBaja } from '../services/api';

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudBaja[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.getStats(token)
      .then(setStats)
      .catch((e) => setError(e.message));

    if (user?.rol === 'ADMIN') {
      api.getSolicitudesBaja(token).then(setSolicitudes).catch(() => {});
    }
  }, [token, user?.rol]);

  const resolver = async (id: string, aprobar: boolean) => {
    if (!token) return;
    await api.resolverSolicitud(token, id, aprobar);
    setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    const newStats = await api.getStats(token);
    setStats(newStats);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Panel principal</h1>
      <p className="mt-1 text-slate-600">
        Bienvenido al sistema de gestión FINES — Modalidad Adultos
      </p>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user?.rol !== 'DOCENTE' && <StatCard label="CENS activos" value={stats?.cens} />}
        {user?.rol !== 'DOCENTE' && <StatCard label="Sedes" value={stats?.sedes} />}
        <StatCard label="Comisiones" value={stats?.comisiones} />
        <StatCard label="Estudiantes activos" value={stats?.estudiantes} />
        {user?.rol !== 'DOCENTE' && <StatCard label="Docentes" value={stats?.docentes} />}
        {user?.rol === 'ADMIN' && (
          <StatCard label="Bajas pendientes" value={stats?.solicitudesPendientes} />
        )}
      </div>

      {user?.rol === 'ADMIN' && solicitudes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Solicitudes de baja pendientes</h2>
          <div className="mt-4 space-y-3">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">
                    {s.estudiante.apellido}, {s.estudiante.nombre} (DNI {s.estudiante.dni})
                  </p>
                  <p className="text-sm text-slate-500">
                    Solicitada por {s.docente.apellido}, {s.docente.nombre}
                  </p>
                  <p className="mt-1 text-sm">{s.motivo}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolver(s.id, true)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                  >
                    Aprobar baja
                  </button>
                  <button
                    onClick={() => resolver(s.id, false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
        <p className="font-medium">Accesos rápidos</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {user?.rol === 'DOCENTE' && <li><a href="/comisiones" className="underline">Gestionar mis comisiones</a></li>}
          {(user?.rol === 'ADMIN' || user?.rol === 'ADMINISTRATIVO') && (
            <li><a href="/libros-matrices" className="underline">Libros matriz — importar Excel</a></li>
          )}
          <li><a href="/estudiantes" className="underline">Ver estudiantes</a></li>
        </ul>
      </section>
    </div>
  );
}
