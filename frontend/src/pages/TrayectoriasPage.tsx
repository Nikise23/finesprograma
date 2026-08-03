import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type TrayectoriaDetalle, type TrayectoriaResumen } from '../services/api';

function FichaDetalle({
  detalle,
  token,
  canEdit,
  onClose,
  onRefresh,
}: {
  detalle: TrayectoriaDetalle;
  token: string;
  canEdit: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const fmtFecha = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('es-AR') : '—';

  const trayectoria = detalle.trayectoria ?? detalle.registros ?? [];
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMsg, setPasteMsg] = useState('');
  const [pasting, setPasting] = useState(false);

  const submitPaste = async () => {
    setPasting(true);
    setPasteMsg('');
    try {
      const r = await api.importCalificacionesTexto(token, detalle.dni, {
        texto: pasteText,
        apellido: detalle.apellido,
        nombre: detalle.nombre,
      });
      const hint = r.sinMatch.length ? ` · Sin match: ${r.sinMatch.slice(0, 3).join(', ')}` : '';
      setPasteMsg(
        `Listo: ${r.notasCreated} nuevas, ${r.notasUpdated} actualizadas (${r.periodos.join(', ')})${hint}`,
      );
      setPasteText('');
      onRefresh();
    } catch (e) {
      setPasteMsg(e instanceof Error ? e.message : 'Error al cargar calificaciones');
    } finally {
      setPasting(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:-mx-6 lg:-mt-6 lg:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {detalle.apellido}, {detalle.nombre}
          </h2>
          <p className="text-sm text-slate-500">DNI {detalle.dni}</p>
          <p className="text-xs text-slate-400">
            {detalle.sexo ?? '—'} · Nac. {fmtFecha(detalle.fechaNacimiento)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => { setShowPaste((v) => !v); setPasteMsg(''); }}
              className="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              Pegar notas
            </button>
          )}
          <button
            onClick={() => api.exportTrayectoriaPdf(token, detalle.dni)}
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            PDF
          </button>
          <button
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      {showPaste && canEdit && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-sm font-medium text-slate-800">Cargar calificaciones (texto)</p>
          <p className="mt-1 text-xs text-slate-500">
            Pegá una línea por materia: <span className="font-mono">Materia[tab]Nota</span>.
            Se agrupan por cuatrimestre del plan y quedan en la ficha.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={'Matematica 1\t9\nEducacion Fisica 1\t10\n…'}
            className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pasting || !pasteText.trim()}
              onClick={submitPaste}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {pasting ? 'Guardando…' : 'Guardar en ficha'}
            </button>
            <button type="button" onClick={() => setShowPaste(false)} className="text-sm text-slate-500">
              Cancelar
            </button>
          </div>
          {pasteMsg && (
            <p className={`mt-2 text-sm ${pasteMsg.startsWith('Listo') ? 'text-green-700' : 'text-red-600'}`}>
              {pasteMsg}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 text-sm">
        {detalle.libroMatriz && (
          <p className="text-slate-600">
            Libro/folio: <span className="font-medium">{detalle.libroMatriz.libroFolio ?? '—'}</span>
          </p>
        )}
        {detalle.estudiante && (
          <p className="text-slate-600">
            Estado: <span className="font-medium">{detalle.estudiante.estado}</span>
            {detalle.estudiante.comision && ` · Comisión actual ${detalle.estudiante.comision.numero}`}
          </p>
        )}

        {trayectoria.length > 0 && (
          <section>
            <h3 className="font-semibold text-slate-800">Trayectoria (regulares por período)</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {trayectoria.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Período {r.periodo}</span>
                    <span className="text-slate-600">Com. {r.comisionNumero}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.tipo ?? 'Regular'} · {r.distrito ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(detalle.informesNotas ?? []).map((informe) => (
          <section key={`${informe.periodoLabel}-${informe.comisionNumero}`}>
            <h3 className="font-semibold text-slate-800">Notas — {informe.periodoLabel}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Comisión {informe.comisionNumero}
              {informe.orientacion && ` · ${informe.orientacion}`}
              {informe.estadoFinal && ` · ${informe.estadoFinal}`}
              {(informe.libro || informe.folio) &&
                ` · Libro ${informe.libro ?? '—'} / Folio ${informe.folio ?? '—'}`}
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Materia</th>
                    <th className="px-3 py-2 text-right w-16">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.notas.map((n) => (
                    <tr key={n.materia} className="border-t border-slate-100">
                      <td className="px-3 py-2">{n.materia}</td>
                      <td className="px-3 py-2 text-right font-mono">{n.nota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {(detalle.estudiante?.notasActuales ?? []).length > 0 && (
          <section>
            <h3 className="font-semibold text-slate-800">Notas actuales (ciclo en curso)</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Materia</th>
                    <th className="px-3 py-2 text-center w-16">Cuatr.</th>
                    <th className="px-3 py-2 text-right w-16">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.estudiante!.notasActuales!.map((n, i) => (
                    <tr key={`${n.materia}-${n.cuatrimestre}-${i}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">{n.materia}</td>
                      <td className="px-3 py-2 text-center">{n.cuatrimestre}</td>
                      <td className="px-3 py-2 text-right font-mono">{n.nota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default function TrayectoriasPage() {
  const { token, user } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: TrayectoriaResumen[];
    total: number;
    pages: number;
  } | null>(null);
  const [selectedDni, setSelectedDni] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<TrayectoriaDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const canImport = user?.rol === 'ADMIN' || user?.rol === 'ADMINISTRATIVO';

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    api.searchTrayectorias(token, q, page)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, q, page]);

  useEffect(() => {
    if (!detalle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetalle();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [detalle]);

  const closeDetalle = () => {
    setDetalle(null);
    setSelectedDni(null);
  };

  const openDetalle = async (dni: string) => {
    if (!token) return;
    setSelectedDni(dni);
    setError('');
    try {
      const d = await api.getTrayectoriaByDni(token, dni);
      setDetalle(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ficha');
      setDetalle(null);
    }
  };

  const importEgresadas = async (file: File) => {
    if (!token) return;
    setImporting(true);
    setError('');
    setMsg('');
    try {
      const r = await api.importEgresadas(token, file);
      setMsg(
        `Importado ${r.archivo}: ${r.notasCreated} notas nuevas, ${r.notasUpdated} actualizadas, ${r.dnisUnicos} alumnos · hist. ${r.estudiantesCreados} creados / ${r.estudiantesActualizados} actualizados`,
      );
      load();
      if (selectedDni) openDetalle(selectedDni);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar egresadas');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ficha del estudiante</h1>
          <p className="text-sm text-slate-500">
            Buscá por DNI o nombre y abrí la ficha completa con trayectoria y notas
          </p>
        </div>
        {canImport && (
          <div>
            <input
              ref={importRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await importEgresadas(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => importRef.current?.click()}
              className="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              {importing ? 'Importando…' : 'Importar comisiones egresadas'}
            </button>
          </div>
        )}
      </div>

      {msg && <div className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}
      <p className="mt-2 text-xs text-slate-400">
        El import de egresadas actualiza notas históricas y las une a la ficha por DNI (sin pisar alumnos activos).
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por apellido, nombre o DNI…"
          className="w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && !detalle && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Apellido</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">DNI</th>
              <th className="hidden md:table-cell px-3 py-2">Datos</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr
                key={item.dni}
                className={`border-t border-slate-100 ${selectedDni === item.dni ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-3 py-2">{item.apellido}</td>
                <td className="px-3 py-2">{item.nombre}</td>
                <td className="px-3 py-2 font-mono">{item.dni}</td>
                <td className="hidden md:table-cell px-3 py-2 text-xs text-slate-600">
                  {item.totalPeriodos > 0 && `${item.totalPeriodos} período(s)`}
                  {item.totalInformesNotas ? ` · ${item.totalInformesNotas} informe(s)` : ''}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => openDetalle(item.dni)}
                    className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    Ver ficha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.items.length === 0 && (
          <p className="p-6 text-center text-slate-500">Sin resultados.</p>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
          <span>Página {page} de {data.pages} ({data.total} estudiantes)</span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {detalle && token && (
        <div className="fixed inset-0 z-[60] flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={closeDetalle}
            aria-label="Cerrar ficha"
          />
          <div className="relative ml-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex-1 p-4 lg:p-6">
              <FichaDetalle
                detalle={detalle}
                token={token}
                canEdit={canImport}
                onClose={closeDetalle}
                onRefresh={() => selectedDni && openDetalle(selectedDni)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
