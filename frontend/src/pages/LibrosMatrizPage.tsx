import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type ImportResult, type LibroMatriz } from '../services/api';

interface LibroMatrizForm {
  posicion: string;
  apellido: string;
  nombre: string;
  dni: string;
  libroFolio: string;
  observaciones: string;
}

const EMPTY_FORM: LibroMatrizForm = {
  posicion: '',
  apellido: '',
  nombre: '',
  dni: '',
  libroFolio: '',
  observaciones: '',
};

function formFromItem(item: LibroMatriz): LibroMatrizForm {
  return {
    posicion: item.posicion != null ? String(item.posicion) : '',
    apellido: item.apellido,
    nombre: item.nombre,
    dni: item.dni,
    libroFolio: item.libroFolio ?? '',
    observaciones: item.observaciones ?? '',
  };
}

function formToPayload(form: LibroMatrizForm) {
  const payload: {
    apellido: string;
    nombre: string;
    dni: string;
    posicion?: number;
    libroFolio?: string;
    observaciones?: string;
  } = {
    apellido: form.apellido.trim(),
    nombre: form.nombre.trim(),
    dni: form.dni.trim(),
  };

  if (form.posicion.trim()) {
    const posicion = parseInt(form.posicion, 10);
    if (!Number.isNaN(posicion)) payload.posicion = posicion;
  }
  if (form.libroFolio.trim()) payload.libroFolio = form.libroFolio.trim();
  if (form.observaciones.trim()) payload.observaciones = form.observaciones.trim();

  return payload;
}

export default function LibrosMatrizPage() {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: LibroMatriz[]; total: number; pages: number } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<LibroMatrizForm>(EMPTY_FORM);

  const load = () => {
    if (!token) return;
    setLoading(true);
    api.getLibrosMatriz(token, q, page)
      .then((r) => setData({ items: r.items, total: r.total, pages: r.pages }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, q, page]);

  const resetForm = () => {
    setEditId(null);
    setCreating(false);
    setForm(EMPTY_FORM);
  };

  const handleImport = async (file: File) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const result = await api.importLibrosMatriz(token, file);
      setImportResult(result);
      setPage(1);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    resetForm();
    setCreating(true);
    setError('');
    setMsg('');
  };

  const startEdit = (item: LibroMatriz) => {
    setCreating(false);
    setEditId(item.id);
    setForm(formFromItem(item));
    setError('');
    setMsg('');
  };

  const saveForm = async () => {
    if (!token) return;
    const payload = formToPayload(form);

    if (!payload.apellido || !payload.nombre || !payload.dni) {
      setError('Apellido, nombre y DNI son obligatorios');
      return;
    }
    if (payload.dni.length < 6) {
      setError('El DNI debe tener al menos 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    setMsg('');
    try {
      if (creating) {
        await api.createLibroMatriz(token, payload);
        setMsg('Registro creado');
        setPage(1);
      } else if (editId) {
        await api.updateLibroMatriz(token, editId, payload);
        setMsg('Registro actualizado');
      }
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm('¿Eliminar este registro?')) return;
    setError('');
    setMsg('');
    try {
      await api.deleteLibroMatriz(token, id);
      if (editId === id) resetForm();
      setMsg('Registro eliminado');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const showForm = creating || editId !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Libros Matriz</h1>
          <p className="text-sm text-slate-500">
            Importación desde Excel · clave única: DNI
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={startCreate} disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white disabled:opacity-50">
            + Nuevo registro
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            Importar Excel
          </button>
          <button onClick={() => token && api.exportLibrosMatriz(token, q)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-white">
            Exportar
          </button>
        </div>
      </div>

      {importResult && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-medium">Importación completada</p>
          <p>Creados: {importResult.created} · Actualizados: {importResult.updated} · Errores: {importResult.errors.length}</p>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-auto text-red-700">
              {importResult.errors.slice(0, 10).map((e) => (
                <li key={e.fila}>Fila {e.fila}: {e.error} {e.dni ? `(DNI ${e.dni})` : ''}</li>
              ))}
              {importResult.errors.length > 10 && <li>… y {importResult.errors.length - 10} más</li>}
            </ul>
          )}
        </div>
      )}

      {showForm && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            {creating ? 'Nuevo registro' : 'Editar registro'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Posición</span>
              <input
                value={form.posicion}
                onChange={(e) => setForm({ ...form, posicion: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Apellido *</span>
              <input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Nombre *</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">DNI *</span>
              <input
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm font-mono"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Libro/Folio</span>
              <input
                value={form.libroFolio}
                onChange={(e) => setForm({ ...form, libroFolio: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-1">
              <span className="mb-1 block text-slate-600">Observaciones</span>
              <input
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveForm} disabled={loading}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              {creating ? 'Crear registro' : 'Guardar cambios'}
            </button>
            <button onClick={resetForm} className="rounded border px-3 py-1.5 text-sm text-slate-600">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por apellido, nombre, DNI, libro/folio…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Apellido</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">DNI</th>
              <th className="px-3 py-2">Libro/Folio</th>
              <th className="px-3 py-2">Obs.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className={`border-t border-slate-100 ${editId === item.id ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-2">{item.posicion ?? '—'}</td>
                <td className="px-3 py-2">{item.apellido}</td>
                <td className="px-3 py-2">{item.nombre}</td>
                <td className="px-3 py-2 font-mono">{item.dni}</td>
                <td className="px-3 py-2">{item.libroFolio ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{item.observaciones ?? ''}</td>
                <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                  <button onClick={() => startEdit(item)} className="text-blue-600 text-xs">Editar</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && (
          <p className="p-6 text-center text-slate-500">Sin registros. Importá el Excel o agregá uno manualmente.</p>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
          <span>Página {page} de {data.pages} ({data.total} registros)</span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  );
}
