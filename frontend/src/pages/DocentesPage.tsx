import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type Comision, type Docente } from '../services/api';

export default function DocentesPage() {
  const { token } = useAuth();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [comisionId, setComisionId] = useState('');
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', apellido: '', nombre: '', dni: '', telefono: '',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    api
      .getDocentes(token, {
        q: search || undefined,
        page,
        limit: 25,
        comisionId: comisionId || undefined,
        includeInactive,
      })
      .then((r) => {
        setDocentes(r.items);
        setTotal(r.total);
        setPages(r.pages);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, search, page, comisionId, includeInactive]);

  useEffect(() => {
    if (!token) return;
    api.getComisiones(token).then(setComisiones).catch(() => {});
  }, [token]);

  const create = async () => {
    if (!token) return;
    try {
      await api.createDocente(token, form);
      setForm({ email: '', password: '', apellido: '', nombre: '', dni: '', telefono: '' });
      setShowForm(false);
      setMsg('Docente creado');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    }
  };

  const toggleActivo = async (d: Docente) => {
    if (!token) return;
    const next = !d.activo;
    const label = next ? 'activar' : 'desactivar';
    if (!confirm(`¿Confirmás ${label} a ${d.apellido}, ${d.nombre}?`)) return;
    try {
      await api.updateDocente(token, d.id, { activo: next });
      setMsg(`Docente ${next ? 'activado' : 'desactivado'}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const applySearch = () => {
    setPage(1);
    setSearch(q.trim());
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Docentes</h1>
          <p className="text-sm text-slate-500">{total} registros</p>
        </div>
        <button onClick={() => token && api.exportDocentesPdf(token)} className="text-sm text-blue-600">
          Exportar PDF
        </button>
      </div>

      {msg && <div className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      {error && <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Buscar por nombre, DNI o email…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button onClick={applySearch} className="rounded-lg border px-3 py-2 text-sm hover:bg-white">
            Buscar
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">Comisión</label>
          <select
            value={comisionId}
            onChange={(e) => { setComisionId(e.target.value); setPage(1); }}
            className="rounded-lg border px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Todas las comisiones</option>
            {comisiones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} — {c.sede?.cens?.nombre ?? c.sede?.nombre ?? ''}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }}
          />
          Incluir inactivos
        </label>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          + Nuevo docente
        </button>
      </div>

      {comisionId && (
        <p className="mt-2 text-sm text-blue-700">
          Mostrando docentes asignados a la comisión seleccionada
          {!includeInactive ? ' (solo activos)' : ''}.
        </p>
      )}

      {showForm && (
        <div className="mt-3 grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2">
          {(['apellido', 'nombre', 'dni', 'email', 'telefono', 'password'] as const).map((f) => (
            <input
              key={f}
              type={f === 'password' ? 'password' : 'text'}
              placeholder={f}
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              className="rounded border px-2 py-1 text-sm capitalize"
            />
          ))}
          <button onClick={create} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white sm:col-span-2">
            Crear docente
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Apellido</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">DNI</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Comisiones</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {docentes.map((d) => (
              <tr key={d.id} className={`border-t ${!d.activo ? 'bg-slate-50 text-slate-500' : ''}`}>
                <td className="px-3 py-2">{d.apellido}</td>
                <td className="px-3 py-2">{d.nombre}</td>
                <td className="px-3 py-2 font-mono">{d.dni}</td>
                <td className="px-3 py-2">{d.email}</td>
                <td className="px-3 py-2">
                  {d.comisiones?.map((c) => c.comision.numero).join(', ') || '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      d.activo ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {d.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleActivo(d)}
                    className={`text-xs ${d.activo ? 'text-red-600' : 'text-green-700'}`}
                  >
                    {d.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && docentes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No hay docentes con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {page} de {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
