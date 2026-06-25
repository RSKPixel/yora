import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../templates/AuthContext';

const Login = () => {
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId.trim()) {
      setError('User ID is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      await login(userId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-sky-900/30 blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-xl border border-sky-900/80 bg-neutral-900/90 shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="border-b border-sky-900/60 bg-sky-950 px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-900/60 border border-sky-700/50">
              <i className="bi bi-box-seam text-2xl text-sky-400"></i>
            </div>
            <h1 className="text-xl font-bold tracking-wide text-white/95">YORA ERP</h1>
            <p className="mt-1 text-xs text-white/45">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5" autoComplete="off">
            <div className="space-y-2">
              <label htmlFor="userId" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                User ID
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  className="login-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className="login-input"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="login-input-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2.5 text-xs text-red-300">
                <i className="bi bi-exclamation-circle mt-0.5 shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              <span className="login-submit-icon" aria-hidden="true">
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                ) : (
                  <i className="bi bi-box-arrow-in-right"></i>
                )}
              </span>
              <span className="login-submit-label">
                {loading ? 'Signing in…' : 'Sign In'}
              </span>
            </button>
          </form>

          <div className="border-t border-gray-800/80 px-6 py-3 text-center text-[10px] text-white/30">
            Secure access to your business operations
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
