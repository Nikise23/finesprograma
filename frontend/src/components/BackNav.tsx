import { useNavigate } from 'react-router-dom';

/**
 * Navegación hacia atrás: usa el historial del navegador.
 * Si no hay historial útil, va al fallback (por defecto el inicio).
 */
export default function BackNav({
  fallback = '/',
  label = '← Volver',
  className = '',
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    if (document.referrer && document.referrer.startsWith(window.location.origin)) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`mb-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 ${className}`}
      aria-label="Volver atrás"
    >
      {label}
    </button>
  );
}
