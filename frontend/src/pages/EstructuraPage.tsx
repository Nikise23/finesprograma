import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, type Cens, type Comision, type Docente, type Modulo, type Sede } from '../services/api';

type Level = 'cens' | 'sedes' | 'comisiones';

const EMPTY_CENS_FORM = { nombre: '', direccion: '', contacto: '', directora: '' };

const CENS_FIELDS = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'contacto', label: 'Contacto' },
  { key: 'directora', label: 'Directora' },
] as const;

export default function EstructuraPage() {
  const { token } = useAuth();
  const [level, setLevel] = useState<Level>('cens');
  const [censList, setCensList] = useState<Cens[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [selectedCens, setSelectedCens] = useState<Cens | null>(null);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [censForm, setCensForm] = useState(EMPTY_CENS_FORM);
  const [editingCensId, setEditingCensId] = useState<string | null>(null);
  const [censActivo, setCensActivo] = useState(true);
  const [sedeForm, setSedeForm] = useState({ nombre: '', direccion: '' });
  const [comForm, setComForm] = useState({
    numero: '', direccion: '', referente: '', contactos: '', cicloLectivo: '2026', moduloId: '1',
    cohorte: '', anioCursada: '', turno: 'M',
  });
  const [assignDocenteId, setAssignDocenteId] = useState('');
  const [assignMateriaId, setAssignMateriaId] = useState('');
  const [assignComisionId, setAssignComisionId] = useState<string | null>(null);
  const [editingComisionId, setEditingComisionId] = useState<string | null>(null);

  const loadCens = () => { if (token) api.getCens(token).then(setCensList); };
  useEffect(loadCens, [token]);
  useEffect(() => { if (token) api.getModulos(token).then(setModulos); }, [token]);

  const openSedes = async (cens: Cens) => {
    setSelectedCens(cens);
    setLevel('sedes');
    if (token) setSedes(await api.getSedes(token, cens.id));
  };

  const openComisiones = async (sede: Sede) => {
    setSelectedSede(sede);
    setLevel('comisiones');
    if (token) {
      setComisiones(await api.getComisiones(token, sede.id));
      const docentesPage = await api.getDocentes(token, { limit: 100, includeInactive: false });
      setDocentes(docentesPage.items);
    }
  };

  const resetCensForm = () => {
    setCensForm(EMPTY_CENS_FORM);
    setEditingCensId(null);
    setCensActivo(true);
    setShowForm(false);
  };

  const startNewCens = () => {
    setEditingCensId(null);
    setCensForm(EMPTY_CENS_FORM);
    setCensActivo(true);
    setShowForm(true);
  };

  const startEditCens = (c: Cens) => {
    setEditingCensId(c.id);
    setCensForm({
      nombre: c.nombre,
      direccion: c.direccion,
      contacto: c.contacto,
      directora: c.directora,
    });
    setCensActivo(c.activo);
    setShowForm(true);
  };

  const saveCens = async () => {
    if (!token) return;
    if (editingCensId) {
      const updated = await api.updateCens(token, editingCensId, { ...censForm, activo: censActivo });
      if (selectedCens?.id === editingCensId) {
        setSelectedCens(updated);
      }
      setMsg('CENS actualizado');
    } else {
      await api.createCens(token, censForm);
      setMsg('CENS creado');
    }
    resetCensForm();
    loadCens();
  };

  const deactivateCens = async (id: string) => {
    if (!token || !window.confirm('¿Desactivar este CENS?')) return;
    await api.deleteCens(token, id);
    if (selectedCens?.id === id) {
      setSelectedCens(null);
      setLevel('cens');
    }
    resetCensForm();
    loadCens();
    setMsg('CENS desactivado');
  };

  const saveSede = async () => {
    if (!token || !selectedCens) return;
    await api.createSede(token, { ...sedeForm, censId: selectedCens.id });
    setSedeForm({ nombre: '', direccion: '' });
    setShowForm(false);
    openSedes(selectedCens);
    setMsg('Sede creada');
  };

  const saveComision = async () => {
    if (!token || !selectedSede) return;
    const payload = {
      sedeId: selectedSede.id,
      moduloId: +comForm.moduloId,
      numero: comForm.numero,
      direccion: comForm.direccion,
      referente: comForm.referente,
      contactos: comForm.contactos.split(',').map((s) => s.trim()).filter(Boolean),
      cicloLectivo: comForm.cicloLectivo,
      cohorte: comForm.cohorte || undefined,
      anioCursada: comForm.anioCursada || undefined,
      turno: comForm.turno || undefined,
    };
    if (editingComisionId) {
      await api.updateComision(token, editingComisionId, payload);
      setMsg('Comisión actualizada');
    } else {
      await api.createComision(token, payload);
      setMsg('Comisión creada');
    }
    setComForm({
      numero: '', direccion: '', referente: '', contactos: '', cicloLectivo: '2026', moduloId: '1',
      cohorte: '', anioCursada: '', turno: 'M',
    });
    setEditingComisionId(null);
    setShowForm(false);
    openComisiones(selectedSede);
  };

  const startEditComision = (c: Comision) => {
    setEditingComisionId(c.id);
    setComForm({
      numero: c.numero,
      direccion: c.direccion ?? '',
      referente: c.referente ?? '',
      contactos: Array.isArray(c.contactos) ? c.contactos.join(', ') : '',
      cicloLectivo: c.cicloLectivo,
      moduloId: String(c.moduloId ?? c.modulo?.id ?? 1),
      cohorte: c.cohorte ?? '',
      anioCursada: c.anioCursada ?? '',
      turno: c.turno ?? 'M',
    });
    setShowForm(true);
  };

  const cancelComisionForm = () => {
    setShowForm(false);
    setEditingComisionId(null);
    setComForm({
      numero: '', direccion: '', referente: '', contactos: '', cicloLectivo: '2026', moduloId: '1',
      cohorte: '', anioCursada: '', turno: 'M',
    });
  };

  const assignDocente = async () => {
    if (!token || !assignComisionId || !assignDocenteId || !assignMateriaId) return;
    await api.assignDocente(token, assignComisionId, assignDocenteId, assignMateriaId);
    setAssignComisionId(null);
    setAssignDocenteId('');
    setAssignMateriaId('');
    if (selectedSede) openComisiones(selectedSede);
    setMsg('Docente asignado');
  };

  const assignComision = comisiones.find((c) => c.id === assignComisionId);
  const materiasComision = modulos.find((m) => m.id === assignComision?.moduloId)?.materias ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Estructura organizativa</h1>
      <p className="text-sm text-slate-500">CENS → Sedes → Comisiones (por módulo)</p>

      {level !== 'cens' && (
        <button
          type="button"
          onClick={() => {
            if (level === 'comisiones' && selectedCens) {
              setLevel('sedes');
              setSelectedSede(null);
              openSedes(selectedCens);
            } else {
              setLevel('cens');
              setSelectedCens(null);
              setSelectedSede(null);
            }
          }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          ← Volver
        </button>
      )}

      <nav className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => { setLevel('cens'); setSelectedCens(null); setSelectedSede(null); }}
          className={level === 'cens' ? 'font-semibold text-blue-600' : 'text-slate-600 hover:underline'}>CENS</button>
        {selectedCens && <>
          <span>/</span>
          <button onClick={() => { setLevel('sedes'); setSelectedSede(null); openSedes(selectedCens); }}
            className={level === 'sedes' ? 'font-semibold text-blue-600' : 'text-slate-600 hover:underline'}>{selectedCens.nombre}</button>
        </>}
        {selectedSede && <>
          <span>/</span>
          <span className="font-semibold text-blue-600">{selectedSede.nombre}</span>
        </>}
      </nav>

      {msg && <div className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}

      {level === 'cens' && (
        <div className="mt-4">
          <button onClick={startNewCens} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            + Nuevo CENS
          </button>
          {showForm && (
            <div className="mt-3 rounded-xl border bg-white p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">
                {editingCensId ? 'Editar CENS' : 'Nuevo CENS'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CENS_FIELDS.map(({ key, label }) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block text-slate-600">{label}</span>
                    <input
                      value={censForm[key]}
                      onChange={(e) => setCensForm({ ...censForm, [key]: e.target.value })}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
                {editingCensId && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={censActivo}
                      onChange={(e) => setCensActivo(e.target.checked)}
                    />
                    CENS activo
                  </label>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={saveCens} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
                  {editingCensId ? 'Guardar cambios' : 'Crear CENS'}
                </button>
                <button onClick={resetCensForm} className="rounded border px-3 py-1.5 text-sm text-slate-600">
                  Cancelar
                </button>
                {editingCensId && (
                  <button
                    onClick={() => deactivateCens(editingCensId)}
                    className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600"
                  >
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {censList.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  <p className="text-sm text-slate-500">{c.directora} · {c.direccion}</p>
                  <p className="text-xs text-slate-400">Contacto: {c.contacto}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditCens(c)} className="text-sm text-slate-600">Editar</button>
                  <button onClick={() => openSedes(c)} className="text-sm text-blue-600">Ver sedes →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {level === 'sedes' && selectedCens && (
        <div className="mt-4">
          <button onClick={() => setShowForm(!showForm)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">+ Nueva sede</button>
          {showForm && (
            <div className="mt-3 flex gap-2 rounded-xl border bg-white p-4">
              <input placeholder="Nombre" value={sedeForm.nombre} onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Dirección" value={sedeForm.direccion} onChange={(e) => setSedeForm({ ...sedeForm, direccion: e.target.value })} className="flex-1 rounded border px-2 py-1 text-sm" />
              <button onClick={saveSede} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Guardar</button>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {sedes.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
                <div><p className="font-medium">{s.nombre}</p><p className="text-sm text-slate-500">{s.direccion}</p></div>
                <button onClick={() => openComisiones(s)} className="text-sm text-blue-600">Ver comisiones →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {level === 'comisiones' && selectedSede && (
        <div className="mt-4">
          <button onClick={() => { setShowForm(true); setEditingComisionId(null); }} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">+ Nueva comisión</button>
          {showForm && (
            <div className="mt-3 grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-medium text-slate-700">
                {editingComisionId ? 'Editar comisión' : 'Nueva comisión'}
              </p>
              <select value={comForm.moduloId} onChange={(e) => setComForm({ ...comForm, moduloId: e.target.value })} className="rounded border px-2 py-1 text-sm sm:col-span-2">
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    Cuatr. {m.id} ({m.etiqueta ?? `Módulo ${m.id}`}) — {m.materias?.length ?? '?'} materias — {m.titulo}
                  </option>
                ))}
              </select>
              <input placeholder="Número (ej. 00033)" value={comForm.numero} onChange={(e) => setComForm({ ...comForm, numero: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Ciclo lectivo" value={comForm.cicloLectivo} onChange={(e) => setComForm({ ...comForm, cicloLectivo: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Año cursada (ej. 3°1C)" value={comForm.anioCursada} onChange={(e) => setComForm({ ...comForm, anioCursada: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <select value={comForm.turno} onChange={(e) => setComForm({ ...comForm, turno: e.target.value })} className="rounded border px-2 py-1 text-sm">
                <option value="M">Turno M</option>
                <option value="T">Turno T</option>
                <option value="V">Turno V</option>
                <option value="N">Turno N</option>
              </select>
              <input placeholder="Cohorte (ej. Marzo 2024 Ciencias Sociales)" value={comForm.cohorte} onChange={(e) => setComForm({ ...comForm, cohorte: e.target.value })} className="rounded border px-2 py-1 text-sm sm:col-span-2" />
              <input placeholder="Dirección" value={comForm.direccion} onChange={(e) => setComForm({ ...comForm, direccion: e.target.value })} className="rounded border px-2 py-1 text-sm sm:col-span-2" />
              <input placeholder="Referente" value={comForm.referente} onChange={(e) => setComForm({ ...comForm, referente: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <input placeholder="Contactos (sep. por coma)" value={comForm.contactos} onChange={(e) => setComForm({ ...comForm, contactos: e.target.value })} className="rounded border px-2 py-1 text-sm" />
              <div className="flex gap-2 sm:col-span-2">
                <button onClick={saveComision} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
                  {editingComisionId ? 'Guardar cambios' : 'Crear comisión'}
                </button>
                <button onClick={cancelComisionForm} className="rounded border px-3 py-1.5 text-sm text-slate-600">Cancelar</button>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {comisiones.map((c) => (
              <div key={c.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Comisión {c.numero}</p>
                    <p className="text-sm text-slate-500">
                      {c.modulo
                        ? `Cuatr. ${c.modulo.id}${c.modulo.etiqueta ? ` (${c.modulo.etiqueta})` : ''}`
                        : 'Sin cuatrimestre'}
                      {c.anioCursada ? ` · ${c.anioCursada}` : ''}
                      {c.turno ? ` · Turno ${c.turno}` : ''}
                      {' · '}{c.referente} · Ciclo {c.cicloLectivo} · {c._count?.estudiantes ?? 0} alumnos
                    </p>
                    {c.cohorte && <p className="text-xs text-slate-400">{c.cohorte}</p>}
                    <p className="text-xs text-slate-400">
                      Docentes: {c.docentes?.map((d) => `${d.docente.apellido}${d.materia ? ` (${d.materia.nombre})` : ''}`).join(', ') || 'sin asignar'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditComision(c)} className="text-sm text-slate-600">Editar</button>
                    <Link to={`/comisiones/${c.id}`} className="text-sm text-blue-600">Gestionar</Link>
                    <button onClick={() => setAssignComisionId(c.id)} className="text-sm text-slate-600">Asignar docente</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {assignComisionId && (
            <div className="mt-4 rounded-xl border bg-slate-50 p-4">
              <p className="text-sm font-medium">
                Asignar docente a comisión {assignComision?.numero}
                {assignComision?.moduloId ? ` (Módulo ${assignComision.moduloId})` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <select value={assignDocenteId} onChange={(e) => setAssignDocenteId(e.target.value)} className="rounded border px-2 py-1 text-sm">
                  <option value="">Docente…</option>
                  {docentes.map((d) => <option key={d.id} value={d.id}>{d.apellido}, {d.nombre}</option>)}
                </select>
                <select value={assignMateriaId} onChange={(e) => setAssignMateriaId(e.target.value)} className="min-w-[12rem] rounded border px-2 py-1 text-sm">
                  <option value="">Materia…</option>
                  {materiasComision.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <button onClick={assignDocente} disabled={!assignDocenteId || !assignMateriaId} className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-40">Asignar</button>
                <button onClick={() => { setAssignComisionId(null); setAssignMateriaId(''); }} className="text-sm text-slate-500">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
