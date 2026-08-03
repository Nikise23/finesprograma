import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type Comision } from '../services/api';

function TrayectoriaReportForm({ token }: { token: string }) {
  const [dni, setDni] = useState('');
  const [error, setError] = useState('');

  const exportPdf = async () => {
    if (!dni.trim()) {
      setError('Ingresá un DNI');
      return;
    }
    setError('');
    try {
      await api.exportTrayectoriaPdf(token, dni.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el reporte');
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">DNI</span>
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm font-mono"
          placeholder="Ej. 40453177"
        />
      </label>
      <button onClick={exportPdf} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
        Descargar PDF
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function ReportesPage() {
  const { token, user } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [comisionId, setComisionId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    if (token) api.getComisiones(token).then(setComisiones);
  }, [token]);

  if (!token) return null;

  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'ADMINISTRATIVO';

  return (
    <div>
      <h1 className="text-2xl font-bold">Reportes</h1>
      <p className="mt-1 text-sm text-slate-500">Exportá listados en CSV, Excel o PDF</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Estudiantes</h2>
          <p className="mt-1 text-sm text-slate-500">Listado general de alumnos activos</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => api.exportEstudiantesCsv(token)} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">CSV</button>
            <button onClick={() => api.exportEstudiantesPdf(token)} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">PDF</button>
          </div>
        </section>

        {isAdmin && (
          <>
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Docentes</h2>
              <button onClick={() => api.exportDocentesPdf(token)} className="mt-4 rounded border px-3 py-1.5 text-sm hover:bg-slate-50">PDF</button>
            </section>
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Comisiones</h2>
              <button onClick={() => api.exportComisionesPdf(token)} className="mt-4 rounded border px-3 py-1.5 text-sm hover:bg-slate-50">PDF</button>
            </section>
          </>
        )}

        <section className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">Trayectoria de estudiante</h2>
          <p className="mt-1 text-sm text-slate-500">Reporte PDF con el historial por períodos (regulares importados)</p>
          <TrayectoriaReportForm token={token} />
        </section>

        <section className="rounded-xl border bg-white p-5 lg:col-span-2">
          <h2 className="font-semibold">Por comisión</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <select value={comisionId} onChange={(e) => setComisionId(e.target.value)} className="rounded border px-2 py-1.5 text-sm">
              <option value="">Seleccionar comisión…</option>
              {comisiones.map((c) => (
                <option key={c.id} value={c.id}>Comisión {c.numero} — {c.sede?.cens?.nombre}</option>
              ))}
            </select>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded border px-2 py-1.5 text-sm" />
          </div>
          {comisionId && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-slate-500 w-full">Notas:</span>
              <button onClick={() => api.exportNotasExcel(token, comisionId)} className="rounded border px-3 py-1.5 text-sm">Excel</button>
              <button onClick={() => api.exportNotasPdf(token, comisionId)} className="rounded border px-3 py-1.5 text-sm">PDF</button>
              <span className="text-sm text-slate-500 w-full mt-2">Asistencia:</span>
              <button onClick={() => api.exportAsistenciaExcel(token, comisionId, desde || undefined, hasta || undefined)} className="rounded border px-3 py-1.5 text-sm">Excel</button>
              <button onClick={() => api.exportAsistenciaPdf(token, comisionId, desde || undefined, hasta || undefined)} className="rounded border px-3 py-1.5 text-sm">PDF</button>
              <button onClick={() => api.exportEstudiantesCsv(token, { comisionId })} className="rounded border px-3 py-1.5 text-sm">CSV alumnos</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
