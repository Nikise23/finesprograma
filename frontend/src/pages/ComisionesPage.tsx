import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type Comision } from '../services/api';

export default function ComisionesPage() {
  const { token } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);

  useEffect(() => {
    if (token) api.getComisiones(token).then(setComisiones);
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Mis comisiones</h1>
      <p className="mt-1 text-slate-600">Seleccioná una comisión para gestionar alumnos, notas y asistencia.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {comisiones.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">
              Comisión {c.numero}
              {c.moduloId ? ` · Cuatr. ${c.moduloId}${c.modulo?.etiqueta ? ` (${c.modulo.etiqueta})` : ''}` : ''}
            </h2>
            <p className="text-sm text-slate-500">
              {c.sede?.cens?.nombre} · {c.sede?.nombre} · Ciclo {c.cicloLectivo}
              {c.turno ? ` · Turno ${c.turno}` : ''}
            </p>
            {c.cohorte && <p className="text-xs text-slate-400">{c.cohorte}</p>}
            <p className="mt-1 text-sm">{c._count?.estudiantes ?? 0} estudiantes</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/comisiones/${c.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                Gestionar
              </Link>
            </div>
          </div>
        ))}
      </div>
      {comisiones.length === 0 && (
        <p className="mt-8 text-center text-slate-500">No tenés comisiones asignadas.</p>
      )}
    </div>
  );
}
