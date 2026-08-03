import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type Rol, type Usuario } from '../services/api';

const emptyForm = {
  email: '',
  password: '',
  rol: 'ADMINISTRATIVO' as Rol,
};

export default function UsuariosPage() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [activos, setActivos] = useState(0);
  const [inactivos, setInactivos] = useState(0);
  const [q, setQ] = useState('');
  const [rolFilter, setRolFilter] = useState<'' | Rol>('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ email: '', password: '', rol: 'ADMINISTRATIVO' as Rol });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErr('');
    try {
      const data = await api.getUsers(token, q || undefined, rolFilter || undefined);
      setUsers(data.items);
      setTotal(data.total);
      setActivos(data.activos);
      setInactivos(data.inactivos);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [token, q, rolFilter]);

  const flash = (text: string) => {
    setMsg(text);
    setErr('');
  };

  const create = async () => {
    if (!token) return;
    try {
      await api.createUser(token, form);
      setForm(emptyForm);
      setShowForm(false);
      flash('Usuario creado');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear');
    }
  };

  const startEdit = (u: Usuario) => {
    setEditId(u.id);
    setEdit({ email: u.email, password: '', rol: u.rol });
    setErr('');
  };

  const saveEdit = async () => {
    if (!token || !editId) return;
    try {
      await api.updateUser(token, editId, {
        email: edit.email,
        rol: edit.rol,
        ...(edit.password.trim() ? { password: edit.password.trim() } : {}),
      });
      setEditId(null);
      flash('Usuario actualizado');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const toggleActivo = async (u: Usuario) => {
    if (!token) return;
    try {
      await api.updateUser(token, u.id, { activo: !u.activo });
      flash(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  };

  const remove = async (u: Usuario) => {
    if (!token) return;
    if (u.id === me?.id) {
      setErr('No podés eliminar tu propio usuario');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteUser(token, u.id);
      flash('Usuario eliminado');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
          <p className="text-sm text-slate-500">Alta, búsqueda, edición, activación y baja</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErr(''); }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
        >
          + Nuevo usuario
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{activos}</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Inactivos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-600">{inactivos}</p>
        </div>
      </div>

      {msg && <div className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      {err && <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {showForm && (
        <div className="mt-3 grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 8)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="ADMINISTRATIVO">Administrativo</option>
            <option value="ADMIN">Administrador</option>
            <option value="DOCENTE">Docente</option>
          </select>
          <div className="flex gap-2">
            <button onClick={create} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
              Crear
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500">
              Cancelar
            </button>
          </div>
          {form.rol === 'DOCENTE' && (
            <p className="sm:col-span-2 lg:col-span-4 text-xs text-amber-700">
              El usuario docente se crea acá; los datos personales y comisiones se gestionan en Docentes.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email…"
          className="min-w-[14rem] flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <select
          value={rolFilter}
          onChange={(e) => setRolFilter(e.target.value as '' | Rol)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ADMINISTRATIVO">Administrativo</option>
          <option value="DOCENTE">Docente</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Vinculado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Cargando…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Sin usuarios</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                {editId === u.id ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        value={edit.email}
                        onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                        className="w-full rounded border px-1 py-0.5 text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Nueva contraseña (opcional)"
                        value={edit.password}
                        onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                        className="mt-1 w-full rounded border px-1 py-0.5 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={edit.rol}
                        onChange={(e) => setEdit({ ...edit, rol: e.target.value as Rol })}
                        className="rounded border px-1 py-0.5 text-sm"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                        <option value="DOCENTE">DOCENTE</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">{u.activo ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-3 py-2 text-slate-500">—</td>
                    <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                      <button onClick={saveEdit} className="text-xs text-blue-600">Guardar</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-slate-500">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.rol}</td>
                    <td className="px-3 py-2">
                      <span className={u.activo ? 'text-green-700' : 'text-slate-500'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.docente
                        ? `${u.docente.apellido}, ${u.docente.nombre}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                      <button onClick={() => startEdit(u)} className="text-xs text-blue-600">Editar</button>
                      <button onClick={() => toggleActivo(u)} className="text-xs text-amber-700">
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => remove(u)}
                        disabled={u.id === me?.id}
                        className="text-xs text-red-600 disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
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
