const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export type Rol = 'ADMIN' | 'ADMINISTRATIVO' | 'DOCENTE';

export interface DashboardStats {
  cens?: number;
  sedes?: number;
  comisiones: number;
  estudiantes: number;
  docentes?: number;
  solicitudesPendientes?: number;
}

export interface SolicitudBaja {
  id: string;
  motivo: string;
  estudiante: { apellido: string; nombre: string; dni: string };
  docente: { apellido: string; nombre: string };
}

export interface AuthUser {
  id: string;
  email: string;
  rol: Rol;
  docenteId?: string;
  nombre?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LibroMatriz {
  id: string;
  posicion?: number;
  apellido: string;
  nombre: string;
  dni: string | null;
  libroFolio?: string;
  observaciones?: string;
}

export interface Cens {
  id: string;
  nombre: string;
  direccion: string;
  contacto: string;
  directora: string;
  activo: boolean;
  sedes?: Sede[];
}

export interface Sede {
  id: string;
  censId: string;
  nombre: string;
  direccion: string;
  activo: boolean;
  cens?: Cens;
  comisiones?: Comision[];
}

export interface Modulo {
  id: number;
  etiqueta?: string;
  titulo: string;
  materias?: Materia[];
}

export interface Materia {
  id: string;
  moduloId: number;
  nombre: string;
  orden: number;
  activo: boolean;
  modulo?: Modulo;
}

export interface Comision {
  id: string;
  sedeId?: string;
  moduloId?: number | null;
  numero: string;
  direccion?: string;
  referente?: string;
  contactos?: string[];
  cicloLectivo: string;
  cohorte?: string | null;
  anioCursada?: string | null;
  turno?: string | null;
  activo?: boolean;
  sede?: { nombre: string; cens?: { nombre: string; id?: string } };
  modulo?: Modulo;
  docentes?: { docente: Docente; materia?: Materia | null; codigo?: string | null; horario?: string | null }[];
  _count?: { estudiantes: number };
}

export interface Docente {
  id: string;
  apellido: string;
  nombre: string;
  dni: string;
  email: string;
  telefono?: string;
  activo: boolean;
  comisiones?: { comision: { id: string; numero: string } }[];
}

export interface Usuario {
  id: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  docente?: { id: string; apellido: string; nombre: string; dni: string } | null;
}

export interface UsersListResponse {
  items: Usuario[];
  total: number;
  activos: number;
  inactivos: number;
}

export interface Estudiante {
  id: string;
  apellido: string;
  nombre: string;
  dni: string;
  telefono?: string;
  email?: string;
  estado: string;
  comisionId?: string | null;
  comision?: Comision;
}

export interface Nota {
  id: string;
  estudianteId: string;
  materia: string;
  cuatrimestre: number;
  nota: number;
  observaciones?: string;
  estudiante?: { apellido: string; nombre: string; dni: string };
}

export interface AsistenciaReg {
  id: string;
  estudianteId: string;
  fecha: string;
  presente: boolean;
  justificado: boolean;
  estudiante?: { apellido: string; nombre: string; dni: string };
}

export interface Planificacion {
  id: string;
  nombre: string;
  tipo: string;
  uploadedAt: string;
  docente?: { apellido: string; nombre: string };
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: { fila: number; dni?: string; error: string }[];
  total: number;
}

export interface TrayectoriaResumen {
  dni: string;
  apellido: string;
  nombre: string;
  sexo?: string;
  fechaNacimiento?: string;
  libroMatriz?: { id: string; libroFolio?: string };
  periodos: { periodo: number; comisionNumero: string }[];
  totalPeriodos: number;
  totalInformesNotas?: number;
  estado?: string;
  comisionActual?: string;
}

export interface TrayectoriaDetalle {
  dni: string;
  apellido: string;
  nombre: string;
  sexo?: string;
  fechaNacimiento?: string;
  libroMatriz?: { id: string; libroFolio?: string; apellido?: string; nombre?: string };
  estudiante?: {
    id: string;
    estado: string;
    comision?: { id: string; numero: string; sede?: string; cens?: string } | null;
    notasActuales?: { materia: string; cuatrimestre: number; nota: number }[];
  } | null;
  trayectoria?: {
    id: string;
    periodo: number;
    tipo?: string;
    distrito?: string;
    comisionNumero: string;
    comision?: { id: string; numero: string; sede: string; cens: string } | null;
  }[];
  informesNotas?: {
    periodoLabel: string;
    comisionNumero: string;
    distrito?: string;
    orientacion?: string;
    fuenteArchivo?: string;
    comision?: { id: string; numero: string; sede: string; cens: string } | null;
    notas: { materia: string; nota: string }[];
    libro?: string;
    folio?: string;
    estadoFinal?: string;
  }[];
  registros: {
    id: string;
    periodo: number;
    tipo?: string;
    distrito?: string;
    comisionNumero: string;
    comision?: { id: string; numero: string; sede: string; cens: string } | null;
    fechaNacimiento?: string;
    sexo?: string;
  }[];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const isForm = options.body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message ?? 'Error');
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/csv') || ct.includes('sheet') || ct.includes('pdf') || ct.includes('octet-stream')) {
    return (await res.blob()) as T;
  }
  return res.json();
}

function authGet<T>(path: string, token: string) {
  return request<T>(path, {}, token);
}

function authPost<T>(path: string, token: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, token);
}

function authPatch<T>(path: string, token: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token);
}

function authDelete<T>(path: string, token: string) {
  return request<T>(path, { method: 'DELETE' }, token);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser; expiresInSeconds?: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getStats: (token: string) => authGet<DashboardStats>('/dashboard/stats', token),

  // CENS
  getCens: (token: string) => authGet<Cens[]>('/cens', token),
  createCens: (token: string, data: Omit<Cens, 'id' | 'activo' | 'sedes'>) => authPost('/cens', token, data),
  updateCens: (token: string, id: string, data: Partial<Cens>) =>
    authPatch<Cens>(`/cens/${id}`, token, data),
  deleteCens: (token: string, id: string) => authDelete(`/cens/${id}`, token),

  // Sedes
  getSedes: (token: string, censId?: string) =>
    authGet<Sede[]>(`/sedes${censId ? `?censId=${censId}` : ''}`, token),
  createSede: (token: string, data: { censId: string; nombre: string; direccion: string }) =>
    authPost('/sedes', token, data),
  updateSede: (token: string, id: string, data: Partial<Sede>) => authPatch(`/sedes/${id}`, token, data),
  deleteSede: (token: string, id: string) => authDelete(`/sedes/${id}`, token),

  // Módulos y materias
  getModulos: (token: string) => authGet<Modulo[]>('/modulos', token),
  getMaterias: (token: string, moduloId?: number) =>
    authGet<Materia[]>(`/modulos/materias${moduloId ? `?moduloId=${moduloId}` : ''}`, token),

  // Comisiones
  getComisiones: (token: string, sedeId?: string) =>
    authGet<Comision[]>(`/comisiones${sedeId ? `?sedeId=${sedeId}` : ''}`, token),
  getComision: (token: string, id: string) => authGet<Comision>(`/comisiones/${id}`, token),
  createComision: (token: string, data: {
    sedeId: string; moduloId: number; numero: string; direccion: string; referente: string;
    contactos: string[]; cicloLectivo: string; cohorte?: string; anioCursada?: string; turno?: string;
  }) => authPost('/comisiones', token, data),
  updateComision: (token: string, id: string, data: Partial<Comision>) =>
    authPatch(`/comisiones/${id}`, token, data),
  deleteComision: (token: string, id: string) => authDelete(`/comisiones/${id}`, token),
  assignDocente: (token: string, comisionId: string, docenteId: string, materiaId?: string) =>
    authPost(`/comisiones/${comisionId}/docentes`, token, { docenteId, materiaId }),
  unassignDocente: (token: string, comisionId: string, docenteId: string) =>
    authDelete(`/comisiones/${comisionId}/docentes/${docenteId}`, token),

  // Docentes
  getDocentes: (
    token: string,
    opts?: {
      q?: string;
      page?: number;
      limit?: number;
      comisionId?: string;
      includeInactive?: boolean;
    },
  ) => {
    const p = new URLSearchParams();
    if (opts?.q) p.set('q', opts.q);
    if (opts?.page) p.set('page', String(opts.page));
    if (opts?.limit) p.set('limit', String(opts.limit));
    if (opts?.comisionId) p.set('comisionId', opts.comisionId);
    if (opts?.includeInactive) p.set('includeInactive', 'true');
    const qs = p.toString();
    return authGet<Paginated<Docente>>(`/docentes${qs ? `?${qs}` : ''}`, token);
  },
  createDocente: (token: string, data: {
    email: string; password: string; apellido: string; nombre: string; dni: string; telefono?: string;
  }) => authPost('/docentes', token, data),
  updateDocente: (token: string, id: string, data: Partial<Docente & { password?: string }>) =>
    authPatch(`/docentes/${id}`, token, data),
  deleteDocente: (token: string, id: string) => authDelete(`/docentes/${id}`, token),

  // Estudiantes
  getEstudiantes: (token: string, comisionId?: string, q?: string) => {
    const params = new URLSearchParams();
    if (comisionId) params.set('comisionId', comisionId);
    if (q) params.set('q', q);
    const qs = params.toString();
    return authGet<Estudiante[]>(`/estudiantes${qs ? `?${qs}` : ''}`, token);
  },

  getLibrosMatriz: (token: string, q?: string, page = 1) =>
    authGet<Paginated<LibroMatriz>>(`/libros-matrices?q=${q ?? ''}&page=${page}&limit=50`, token),

  nextLibroMatrizPosicion: (token: string) =>
    authGet<{ posicion: number }>('/libros-matrices/next-posicion', token),

  importLibrosMatriz: (token: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<ImportResult>('/libros-matrices/import', { method: 'POST', body: fd }, token);
  },

  exportLibrosMatriz: async (token: string, q?: string) => {
    const blob = await request<Blob>(`/libros-matrices/export?q=${q ?? ''}`, {}, token);
    downloadBlob(blob, 'libros-matriz.xlsx');
  },

  createLibroMatriz: (
    token: string,
    data: {
      apellido: string;
      nombre: string;
      dni?: string | null;
      posicion?: number;
      libroFolio?: string;
      observaciones?: string;
    },
  ) => authPost<LibroMatriz>('/libros-matrices', token, data),

  updateLibroMatriz: (
    token: string,
    id: string,
    data: {
      apellido?: string;
      nombre?: string;
      dni?: string | null;
      posicion?: number;
      libroFolio?: string;
      observaciones?: string;
    },
  ) => authPatch<LibroMatriz>(`/libros-matrices/${id}`, token, data),

  deleteLibroMatriz: (token: string, id: string) =>
    authDelete(`/libros-matrices/${id}`, token),

  searchTrayectorias: (token: string, q?: string, page = 1) =>
    authGet<Paginated<TrayectoriaResumen>>(
      `/trayectorias?q=${encodeURIComponent(q ?? '')}&page=${page}&limit=25`,
      token,
    ).then((r) => ({
      items: r.items,
      total: r.total,
      page: r.page,
      pages: r.pages,
    })),

  getTrayectoriaByDni: (token: string, dni: string) =>
    authGet<TrayectoriaDetalle>(`/trayectorias/dni/${encodeURIComponent(dni)}`, token),

  importEgresadas: (token: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{
      archivo: string;
      hojas: number;
      alumnos: number;
      dnisUnicos: number;
      notasCreated: number;
      notasUpdated: number;
      estudiantesCreados: number;
      estudiantesActualizados: number;
    }>('/trayectorias/import-egresadas', { method: 'POST', body: fd }, token);
  },

  importCalificacionesTexto: (
    token: string,
    dni: string,
    data: { texto: string; apellido?: string; nombre?: string },
  ) =>
    authPost<{
      dni: string;
      apellido: string;
      nombre: string;
      notasCreated: number;
      notasUpdated: number;
      totalLineas: number;
      sinMatch: string[];
      periodos: string[];
    }>(`/trayectorias/dni/${encodeURIComponent(dni)}/calificaciones-texto`, token, data),

  exportTrayectoriaPdf: (token: string, dni: string) =>
    api.downloadReport(token, `/reportes/trayectoria/pdf?dni=${encodeURIComponent(dni)}`, `trayectoria-${dni}.pdf`),

  getNotas: (token: string, comisionId: string, cuatrimestre?: number) =>
    authGet<Nota[]>(`/notas?comisionId=${comisionId}${cuatrimestre ? `&cuatrimestre=${cuatrimestre}` : ''}`, token),

  saveNota: (token: string, data: {
    estudianteId: string;
    comisionId: string;
    materia: string;
    cuatrimestre: number;
    nota: number;
    observaciones?: string;
  }) => authPost('/notas', token, data),

  getAsistencia: (token: string, comisionId: string, desde?: string, hasta?: string) => {
    const p = new URLSearchParams({ comisionId });
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    return authGet<AsistenciaReg[]>(`/asistencia?${p}`, token);
  },

  saveAsistencia: (token: string, data: {
    comisionId: string;
    fecha: string;
    registros: { estudianteId: string; presente: boolean; justificado?: boolean }[];
  }) => authPost('/asistencia', token, data),

  getPlanificaciones: (token: string, comisionId: string) =>
    authGet<Planificacion[]>(`/planificaciones?comisionId=${comisionId}`, token),

  uploadPlanificacion: (token: string, comisionId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/planificaciones/upload?comisionId=${comisionId}`, { method: 'POST', body: fd }, token);
  },

  downloadPlanificacion: async (token: string, id: string, filename: string) => {
    const blob = await request<Blob>(`/planificaciones/${id}/download`, {}, token);
    downloadBlob(blob, filename);
  },

  solicitarBaja: (token: string, estudianteId: string, motivo: string) =>
    authPost(`/estudiantes/${estudianteId}/solicitar-baja`, token, { motivo }),

  createEstudiante: (token: string, data: Partial<Estudiante> & { comisionId: string; dni: string; apellido: string; nombre: string }) =>
    authPost('/estudiantes', token, data),

  importEstudiantes: (token: string, comisionId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ created: number; updated: number; skipped: number; errors: string[] }>(
      `/estudiantes/import?comisionId=${encodeURIComponent(comisionId)}`,
      { method: 'POST', body: fd },
      token,
    );
  },

  updateEstudiante: (token: string, id: string, data: Partial<Estudiante>) =>
    authPatch(`/estudiantes/${id}`, token, data),

  deleteEstudiante: (token: string, id: string) => authDelete(`/estudiantes/${id}`, token),

  getUsers: (token: string, q?: string, rol?: Rol) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (rol) p.set('rol', rol);
    const qs = p.toString();
    return authGet<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`, token);
  },
  createUser: (token: string, data: { email: string; password: string; rol: Rol }) =>
    authPost<Usuario>('/users', token, data),
  updateUser: (
    token: string,
    id: string,
    data: { email?: string; password?: string; rol?: Rol; activo?: boolean },
  ) => authPatch<Usuario>(`/users/${id}`, token, data),
  deleteUser: (token: string, id: string) => authDelete<{ ok: boolean }>(`/users/${id}`, token),

  downloadReport: async (token: string, path: string, filename: string) => {
    const blob = await request<Blob>(path, {}, token);
    downloadBlob(blob, filename);
  },

  exportEstudiantesCsv: async (token: string, filters?: { comisionId?: string; censId?: string; sedeId?: string }) => {
    const p = new URLSearchParams();
    if (filters?.comisionId) p.set('comisionId', filters.comisionId);
    if (filters?.censId) p.set('censId', filters.censId);
    if (filters?.sedeId) p.set('sedeId', filters.sedeId);
    const qs = p.toString();
    const blob = await request<Blob>(`/reportes/estudiantes/csv${qs ? `?${qs}` : ''}`, {}, token);
    downloadBlob(blob, 'estudiantes.csv');
  },

  exportEstudiantesPdf: async (token: string, filters?: { comisionId?: string; censId?: string; sedeId?: string }) => {
    const p = new URLSearchParams();
    if (filters?.comisionId) p.set('comisionId', filters.comisionId);
    if (filters?.censId) p.set('censId', filters.censId);
    if (filters?.sedeId) p.set('sedeId', filters.sedeId);
    const qs = p.toString();
    await api.downloadReport(token, `/reportes/estudiantes/pdf${qs ? `?${qs}` : ''}`, 'estudiantes.pdf');
  },

  exportNotasExcel: async (token: string, comisionId: string) => {
    await api.downloadReport(token, `/reportes/notas/excel?comisionId=${comisionId}`, 'notas.xlsx');
  },

  exportNotasPdf: async (token: string, comisionId: string) => {
    await api.downloadReport(token, `/reportes/notas/pdf?comisionId=${comisionId}`, 'notas.pdf');
  },

  exportAsistenciaExcel: async (token: string, comisionId: string, desde?: string, hasta?: string) => {
    const p = new URLSearchParams({ comisionId });
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    await api.downloadReport(token, `/reportes/asistencia/excel?${p}`, 'asistencia.xlsx');
  },

  exportAsistenciaPdf: async (token: string, comisionId: string, desde?: string, hasta?: string) => {
    const p = new URLSearchParams({ comisionId });
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    await api.downloadReport(token, `/reportes/asistencia/pdf?${p}`, 'asistencia.pdf');
  },

  exportDocentesPdf: (token: string) => api.downloadReport(token, '/reportes/docentes/pdf', 'docentes.pdf'),

  exportComisionesPdf: (token: string, censId?: string, sedeId?: string) => {
    const p = new URLSearchParams();
    if (censId) p.set('censId', censId);
    if (sedeId) p.set('sedeId', sedeId);
    const qs = p.toString();
    return api.downloadReport(token, `/reportes/comisiones/pdf${qs ? `?${qs}` : ''}`, 'comisiones.pdf');
  },

  getSolicitudesBaja: (token: string) =>
    authGet<SolicitudBaja[]>('/solicitudes-baja?estado=pendiente', token),

  resolverSolicitud: (token: string, id: string, aprobar: boolean) =>
    authPost(`/solicitudes-baja/${id}/resolver`, token, { aprobar }),
};

