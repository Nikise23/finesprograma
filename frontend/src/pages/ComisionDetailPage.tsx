import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  api,
  type AsistenciaReg,
  type Comision,
  type Estudiante,
  type Nota,
  type Planificacion,
} from '../services/api';

type Tab = 'estudiantes' | 'notas' | 'asistencia' | 'planificaciones';

export default function ComisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const backFallback = user?.rol === 'DOCENTE' ? '/comisiones' : '/estructura';
  const [tab, setTab] = useState<Tab>('estudiantes');
  const [comision, setComision] = useState<Comision | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [, setAsistencias] = useState<AsistenciaReg[]>([]);
  const [planificaciones, setPlanificaciones] = useState<Planificacion[]>([]);
  const [materia, setMateria] = useState('');
  const materias = comision?.modulo?.materias ?? [];
  /** El cuatrimestre del plan es el módulo de la comisión (1–6) */
  const cuatrimestrePlan = comision?.moduloId ?? comision?.modulo?.id ?? 1;
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [asistenciaMap, setAsistenciaMap] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [nuevoAlumno, setNuevoAlumno] = useState({ apellido: '', nombre: '', dni: '' });
  const [bajaId, setBajaId] = useState<string | null>(null);
  const [motivoBaja, setMotivoBaja] = useState('');

  const canManageAlumnos = user?.rol === 'DOCENTE' || user?.rol === 'ADMIN' || user?.rol === 'ADMINISTRATIVO';

  const loadEstudiantes = () => {
    if (token && id) api.getEstudiantes(token, id).then(setEstudiantes);
  };

  useEffect(() => {
    if (!token || !id) return;
    api.getComision(token, id).then(setComision);
    loadEstudiantes();
  }, [token, id]);

  useEffect(() => {
    if (materias.length && !materia) setMateria(materias[0].nombre);
  }, [materias, materia]);

  useEffect(() => {
    if (!token || !id) return;
    if (tab === 'notas') api.getNotas(token, id, cuatrimestrePlan).then(setNotas);
    if (tab === 'asistencia') {
      api.getAsistencia(token, id, fecha, fecha).then((regs) => {
        setAsistencias(regs);
        const map: Record<string, boolean> = {};
        regs.forEach((r) => { map[r.estudianteId] = r.presente; });
        setAsistenciaMap(map);
      });
    }
    if (tab === 'planificaciones') api.getPlanificaciones(token, id).then(setPlanificaciones);
  }, [token, id, tab, cuatrimestrePlan, fecha]);

  const getNota = (estudianteId: string) =>
    notas.find((n) => n.estudianteId === estudianteId && n.materia === materia && n.cuatrimestre === cuatrimestrePlan);

  const saveNota = async (estudianteId: string, notaVal: number) => {
    if (!token || !id) return;
    await api.saveNota(token, { estudianteId, comisionId: id, materia, cuatrimestre: cuatrimestrePlan, nota: notaVal });
    setMsg('Nota guardada');
    api.getNotas(token, id, cuatrimestrePlan).then(setNotas);
  };

  const saveAsistencia = async () => {
    if (!token || !id) return;
    await api.saveAsistencia(token, {
      comisionId: id,
      fecha,
      registros: estudiantes.map((e) => ({
        estudianteId: e.id,
        presente: asistenciaMap[e.id] ?? false,
      })),
    });
    setMsg('Asistencia registrada');
  };

  const addEstudiante = async () => {
    if (!token || !id) return;
    const apellido = nuevoAlumno.apellido.trim();
    const nombre = nuevoAlumno.nombre.trim();
    const dni = nuevoAlumno.dni.trim();
    if (apellido.length < 2 || nombre.length < 2 || !dni) {
      setMsg('Completá apellido, nombre (mín. 2 letras) y DNI');
      return;
    }
    try {
      await api.createEstudiante(token, { apellido, nombre, dni, comisionId: id });
      setNuevoAlumno({ apellido: '', nombre: '', dni: '' });
      loadEstudiantes();
      setMsg('Estudiante agregado');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al agregar estudiante');
    }
  };

  const importEstudiantes = async (file: File) => {
    if (!token || !id) return;
    try {
      const r = await api.importEstudiantes(token, id, file);
      loadEstudiantes();
      setMsg(`Importación: ${r.created} creados, ${r.updated} actualizados, ${r.skipped} omitidos`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al importar');
    }
  };

  const solicitarBaja = async () => {
    if (!token || !bajaId) return;
    await api.solicitarBaja(token, bajaId, motivoBaja);
    setBajaId(null);
    setMotivoBaja('');
    loadEstudiantes();
    setMsg('Solicitud de baja enviada al administrador');
  };

  if (!id) return null;

  return (
    <div>
      <p className="mb-1 text-sm text-slate-500">
        <Link to={backFallback} className="text-blue-600 hover:underline">
          {user?.rol === 'DOCENTE' ? 'Mis comisiones' : 'Estructura'}
        </Link>
        <span className="mx-1">/</span>
        <span>Comisión {comision?.numero ?? '…'}</span>
      </p>
      <h1 className="mt-2 text-2xl font-bold">
        Comisión {comision?.numero ?? '…'}
        {comision?.modulo && (
          <span className="ml-2 text-base font-normal text-slate-500">
            · Cuatr. {comision.modulo.id}
            {comision.modulo.etiqueta ? ` (${comision.modulo.etiqueta})` : ''}
          </span>
        )}
      </h1>
      <p className="text-sm text-slate-500">
        {comision?.sede?.cens?.nombre} · Ciclo {comision?.cicloLectivo}
        {comision?.anioCursada && <> · {comision.anioCursada}</>}
        {comision?.turno && <> · Turno {comision.turno}</>}
        {comision?.modulo && <> · {comision.modulo.titulo}</>}
      </p>
      {comision?.cohorte && (
        <p className="text-sm text-slate-500">{comision.cohorte}</p>
      )}

      {msg && (
        <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(['estudiantes', 'notas', 'asistencia', 'planificaciones'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setMsg(''); }}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => token && api.exportEstudiantesCsv(token, { comisionId: id })} className="text-sm text-blue-600">CSV alumnos</button>
          <button onClick={() => token && api.exportNotasExcel(token, id)} className="text-sm text-blue-600">Excel notas</button>
        </div>
      </div>

      {tab === 'estudiantes' && (
        <div className="mt-4">
          {canManageAlumnos && (
            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <h3 className="font-medium">Agregar alumno</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input placeholder="Apellido" value={nuevoAlumno.apellido} onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apellido: e.target.value })} className="rounded border px-2 py-1 text-sm" />
                  <input placeholder="Nombre" value={nuevoAlumno.nombre} onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })} className="rounded border px-2 py-1 text-sm" />
                  <input placeholder="DNI" value={nuevoAlumno.dni} onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, dni: e.target.value })} className="rounded border px-2 py-1 text-sm w-28" />
                  <button onClick={addEstudiante} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Agregar</button>
                </div>
              </div>
              <div className="border-t pt-3">
                <h3 className="font-medium">Importar desde Excel / CSV</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Columnas: apellido, nombre, dni (obligatorias). Opcionales: telefono, email.
                </p>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) await importEstudiantes(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="mt-2 rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                >
                  Subir archivo
                </button>
              </div>
            </div>
          )}
          <table className="w-full rounded-xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-3 py-2 text-left">Apellido</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">DNI</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {estudiantes.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{e.apellido}</td>
                  <td className="px-3 py-2">{e.nombre}</td>
                  <td className="px-3 py-2 font-mono">{e.dni}</td>
                  <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${e.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{e.estado}</span></td>
                  <td className="px-3 py-2">
                    {user?.rol === 'DOCENTE' && e.estado === 'activo' && (
                      <button onClick={() => setBajaId(e.id)} className="text-xs text-red-600">Solicitar baja</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bajaId && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-sm">Motivo de baja</p>
              <textarea value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} className="mt-2 w-full rounded border p-2 text-sm" rows={3} />
              <div className="mt-2 flex gap-2">
                <button onClick={solicitarBaja} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Enviar solicitud</button>
                <button onClick={() => setBajaId(null)} className="text-sm text-slate-600">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'notas' && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded border bg-slate-50 px-2 py-1 text-sm text-slate-700">
              {comision?.modulo
                ? `Cuatrimestre ${comision.modulo.id}${comision.modulo.etiqueta ? ` · ${comision.modulo.etiqueta}` : ''} · ${materias.length} materias`
                : 'Sin cuatrimestre asignado a la comisión'}
            </span>
            <select value={materia} onChange={(e) => setMateria(e.target.value)} className="rounded border px-2 py-1 text-sm min-w-[16rem]">
              {materias.length === 0 && <option value="">Sin materias (asigne cuatrimestre/módulo a la comisión)</option>}
              {materias.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>
          <table className="w-full rounded-xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">DNI</th>
              <th className="px-3 py-2 text-left">Nota (1-10)</th>
            </tr></thead>
            <tbody>
              {estudiantes.filter((e) => e.estado === 'activo').map((e) => {
                const n = getNota(e.id);
                return (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2">{e.apellido}, {e.nombre}</td>
                    <td className="px-3 py-2 font-mono">{e.dni}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} max={10} step={0.5} defaultValue={n ? Number(n.nota) : ''}
                        onBlur={(ev) => { const v = parseFloat(ev.target.value); if (v >= 1 && v <= 10) saveNota(e.id, v); }}
                        className="w-16 rounded border px-2 py-1" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'asistencia' && (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm">Fecha:</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded border px-2 py-1 text-sm" />
            <button onClick={saveAsistencia} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white">Guardar asistencia</button>
          </div>
          <table className="w-full rounded-xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-3 py-2 text-left">Alumno</th>
              <th className="px-3 py-2 text-left">Presente</th>
            </tr></thead>
            <tbody>
              {estudiantes.filter((e) => e.estado === 'activo').map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{e.apellido}, {e.nombre}</td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={asistenciaMap[e.id] ?? false}
                      onChange={(ev) => setAsistenciaMap({ ...asistenciaMap, [e.id]: ev.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'planificaciones' && (
        <div className="mt-4">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f && token) {
                await api.uploadPlanificacion(token, id, f);
                api.getPlanificaciones(token, id).then(setPlanificaciones);
                setMsg('Planificación subida');
              }
            }} />
          <button onClick={() => fileRef.current?.click()} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
            Subir planificación
          </button>
          <ul className="mt-4 space-y-2">
            {planificaciones.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-slate-500">{new Date(p.uploadedAt).toLocaleDateString('es-AR')}</p>
                </div>
                <button onClick={() => token && api.downloadPlanificacion(token, p.id, p.nombre)}
                  className="text-blue-600 text-sm">Descargar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
