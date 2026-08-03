import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, token, ready, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    );
  }

  if (user && token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-slate-900">FINES Adultos</h1>
        <p className="mt-1 text-sm text-slate-500">Iniciá sesión para continuar</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          La sesión expira a los 30 minutos. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
        </p>
      </form>
    </div>
  );
}
