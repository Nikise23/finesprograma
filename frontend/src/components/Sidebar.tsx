import { NavLink } from 'react-router-dom';
import type { Rol } from '../services/api';

interface NavItem {
  to: string;
  label: string;
  roles: Rol[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Panel', roles: ['ADMIN', 'ADMINISTRATIVO', 'DOCENTE'] },
  { to: '/estructura', label: 'Estructura', roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { to: '/comisiones', label: 'Mis comisiones', roles: ['DOCENTE'] },
  { to: '/estudiantes', label: 'Estudiantes', roles: ['ADMIN', 'ADMINISTRATIVO', 'DOCENTE'] },
  { to: '/trayectorias', label: 'Ficha estudiante', roles: ['ADMIN', 'ADMINISTRATIVO', 'DOCENTE'] },
  { to: '/docentes', label: 'Docentes', roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { to: '/libros-matrices', label: 'Libros matriz', roles: ['ADMIN', 'ADMINISTRATIVO'] },
  { to: '/reportes', label: 'Reportes', roles: ['ADMIN', 'ADMINISTRATIVO', 'DOCENTE'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
];

interface SidebarProps {
  rol: Rol;
  onNavigate?: () => void;
  className?: string;
}

export default function Sidebar({ rol, onNavigate, className = '' }: SidebarProps) {
  const items = navItems.filter((i) => i.roles.includes(rol));

  return (
    <nav className={className}>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
