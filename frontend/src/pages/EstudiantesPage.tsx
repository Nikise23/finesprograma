import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { api, type Comision, type Estudiante } from '../services/api';

export default function EstudiantesPage() {
  const { token, user } = useAuth();
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 350);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ apellido: '', nombre: '', dni: '', comisionId: '', telefono: '', email: '' });
  const [importComisionId, setImportComisionId] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'ADMINISTRATIVO';
  const canImport = isAdmin || user?.rol === 'DOCENTE';

  const load = () => {
    if (token) api.getEstudiantes(token, undefined, qDebounced || undefined).then(setEstudiantes);
  };

  useEffect(load, [token, qDebounced]);
  useEffect(() => {
    if (token && canImport) api.getComisiones(token).then(setComisiones);
  }, [token, canImport]);

  const payloadFromForm = () => ({
    apellido: form.apellido.trim(),
    nombre: form.nombre.trim(),
    dni: form.dni.trim(),
    ...(form.comisionId ? { comisionId: form.comisionId } : {}),
    ...(form.telefono.trim() ? { telefono: form.telefono.trim() } : {}),
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
  });

  const create = async () => {
    if (!token) return;
    if (!form.comisionId) {
      setMsg('Elegí una comisión');
      return;
    }
    try {
      await api.createEstudiante(token, { ...payloadFromForm(), comisionId: form.comisionId });
      setForm({ apellido: '', nombre: '', dni: '', comisionId: '', telefono: '', email: '' });
      setShowForm(false);
      load();
      setMsg('Estudiante creado');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar estudiante');
    }
  };

  const saveEdit = async () => {
    if (!token || !editId) return;
    try {
      await api.updateEstudiante(token, editId, payloadFromForm());
      setEditId(null);
      load();
      setMsg('Estudiante actualizado');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al actualizar estudiante');
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm('¿Dar de baja al estudiante?')) return;
    await api.deleteEstudiante(token, id);
    load();
  };

  const onImportFile = async (file: File) => {
    if (!token || !importComisionId) {
      setMsg('Elegí la comisión de destino antes de importar');
      return;
    }
    setImporting(true);
    try {
      const r = await api.importEstudiantes(token, importComisionId, file);
      load();
      const errHint = r.errors?.length ? ` · Ej.: ${r.errors[0]}` : '';
      setMsg(`Importación OK: ${r.created} creados, ${r.updated} actualizados, ${r.skipped} omitidos${errHint}`);
      setShowImport(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const comisionLabel = (c: Comision) => {
    const parts = [`Comisión ${c.numero}`];
    if (c.modulo?.etiqueta || c.moduloId) {
      parts.push(`Cuatr. ${c.modulo?.etiqueta ?? c.moduloId}`);
    }
    if (c.sede?.nombre) parts.push(c.sede.nombre);
    return parts.join(' · ');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Estudiantes</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => token && api.exportEstudiantesCsv(token)} className="text-sm text-blue-600">CSV</button>
          <button onClick={() => token && api.exportEstudiantesPdf(token)} className="text-sm text-blue-600">PDF</button>
          {canImport && (
            <button
              onClick={() => { setShowImport(!showImport); setShowForm(false); setMsg(''); }}
              className="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              Importar Excel/CSV
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded px-3 py-2 text-sm ${
            /^(Estudiante |Importación OK)/.test(msg)
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o DNI…"
          className="flex-1 max-w-md rounded-lg border px-3 py-2 text-sm" />
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setShowImport(false); }} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            + Nuevo
          </button>
        )}
      </div>

      {showImport && canImport && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-white p-4">
          <h2 className="font-medium text-slate-800">Importar estudiantes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Elegí la comisión y subí un Excel (.xlsx) o CSV. Columnas obligatorias:
            <span className="font-mono text-xs"> apellido, nombre, dni</span>.
            Opcionales: <span className="font-mono text-xs">telefono, email</span>.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Comisión destino</span>
              <select
                value={importComisionId}
                onChange={(e) => setImportComisionId(e.target.value)}
                className="min-w-[16rem] rounded border px-2 py-1.5 text-sm"
              >
                <option value="">Seleccionar…</option>
                {comisiones.map((c) => (
                  <option key={c.id} value={c.id}>{comisionLabel(c)}</option>
                ))}
              </select>
            </label>
            <input
              ref={importRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await onImportFile(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!importComisionId || importing}
              onClick={() => importRef.current?.click()}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {importing ? 'Importando…' : 'Subir archivo'}
            </button>
            <button type="button" onClick={() => setShowImport(false)} className="text-sm text-slate-500">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="mt-3 grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-3">
          <input placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className="rounded border px-2 py-1 text-sm" />
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded border px-2 py-1 text-sm" />
          <input placeholder="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} className="rounded border px-2 py-1 text-sm" />
          <select value={form.comisionId} onChange={(e) => setForm({ ...form, comisionId: e.target.value })} className="rounded border px-2 py-1 text-sm sm:col-span-2">
            <option value="">Comisión…</option>
            {comisiones.map((c) => <option key={c.id} value={c.id}>{comisionLabel(c)}</option>)}
          </select>
          <button onClick={create} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Guardar</button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Apellido</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">DNI</th>
              <th className="px-3 py-2 text-left">Comisión</th>
              <th className="px-3 py-2 text-left">Estado</th>
              {isAdmin && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e) => (
              <tr key={e.id} className="border-t">
                {editId === e.id ? (
                  <>
                    <td className="px-3 py-2"><input value={form.apellido} onChange={(ev) => setForm({ ...form, apellido: ev.target.value })} className="w-full border rounded px-1 text-sm" /></td>
                    <td className="px-3 py-2"><input value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} className="w-full border rounded px-1 text-sm" /></td>
                    <td className="px-3 py-2"><input value={form.dni} onChange={(ev) => setForm({ ...form, dni: ev.target.value })} className="w-full border rounded px-1 text-sm" /></td>
                    <td className="px-3 py-2">{e.comision?.numero}</td>
                    <td className="px-3 py-2">{e.estado}</td>
                    <td className="px-3 py-2 space-x-1">
                      <button onClick={saveEdit} className="text-xs text-blue-600">Guardar</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-slate-500">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{e.apellido}</td>
                    <td className="px-3 py-2">{e.nombre}</td>
                    <td className="px-3 py-2 font-mono">{e.dni}</td>
                    <td className="px-3 py-2">
                      {e.comisionId ? (
                        <Link to={`/comisiones/${e.comisionId}`} className="text-blue-600">
                          {e.comision?.numero ?? '—'}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Histórico</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{e.estado}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 space-x-2">
                        <button onClick={() => { setEditId(e.id); setForm({ apellido: e.apellido, nombre: e.nombre, dni: e.dni, comisionId: e.comisionId ?? '', telefono: e.telefono ?? '', email: e.email ?? '' }); }} className="text-xs text-blue-600">Editar</button>
                        <button onClick={() => remove(e.id)} className="text-xs text-red-600">Baja</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
