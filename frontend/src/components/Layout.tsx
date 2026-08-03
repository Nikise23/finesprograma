import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import BackNav from './BackNav';
const roleLabels = {
  ADMIN: 'Administrador',
  ADMINISTRATIVO: 'Administrativo',
  DOCENTE: 'Docente',
};

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setMenuOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!user) return null;

  const closeMenu = () => setMenuOpen(false);
  const showBack = location.pathname !== '/';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="hidden rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 lg:inline-flex"
              aria-label={menuOpen ? 'Ocultar menú' : 'Mostrar menú'}
              title={menuOpen ? 'Ocultar menú' : 'Mostrar menú'}
            >
              <MenuIcon />
            </button>
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                aria-label="Volver atrás"
                title="Volver atrás"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              <Link to="/" className="block truncate text-lg font-semibold text-blue-700">
                FINES — Adultos
              </Link>
              <p className="truncate text-sm text-slate-500">
                {user.nombre ?? user.email} · {roleLabels[user.rol]}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMenu}
          aria-label="Cerrar menú"
        />
      )}

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white p-4 pt-20 transition-transform duration-200 lg:static lg:z-0 lg:shrink-0 lg:pt-4 lg:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full lg:hidden lg:w-0 lg:border-0 lg:p-0 lg:overflow-hidden'
          }`}
        >
          <Sidebar rol={user.rol} onNavigate={closeMenu} className="w-52" />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
          {showBack && <BackNav />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}