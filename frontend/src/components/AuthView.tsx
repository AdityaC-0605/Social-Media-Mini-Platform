import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Heart, Zap } from 'lucide-react';
import { forgotPassword, login, register, resetPassword } from '../api';

type Mode = 'login' | 'register';

type Props = {
  onAuthed: () => void;
};

const AuthView: React.FC<Props> = ({ onAuthed }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotInfo, setForgotInfo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    if (!resetToken) return;

    setMode('login');
    setShowForgot(true);
    setForgotToken(resetToken);
    setForgotError(null);
    setForgotInfo(null);

    params.delete('resetToken');
    const next = params.toString();
    const newUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', newUrl);
  }, []);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === 'register' && !username.trim()) return false;
    return true;
  }, [email, password, mode, username]);

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({ username: username.trim(), email: email.trim(), password });
      }
      onAuthed();
    } catch (e: any) {
      const message = e?.response?.data?.error || e?.message || 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotToken('');
    setForgotNewPassword('');
    setForgotLoading(false);
    setForgotError(null);
    setForgotInfo(null);
  };

  const requestReset = async () => {
    if (forgotLoading) return;
    const e = forgotEmail.trim();
    if (!e) {
      setForgotError('Email is required');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotInfo(null);
    try {
      const res = await forgotPassword(e);
      setForgotInfo(res.message || 'Check your email for a reset link');
      if (res.token) setForgotToken(res.token);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to request reset';
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const performReset = async () => {
    if (forgotLoading) return;
    const token = forgotToken.trim();
    const newPass = forgotNewPassword;
    if (!token) {
      setForgotError('Token is required');
      return;
    }
    if (!newPass || newPass.trim().length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotInfo(null);
    try {
      const res = await resetPassword({ token, password: newPass });
      setForgotInfo(res.message || 'Password updated successfully');
      setPassword('');
      setMode('login');
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to reset password';
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/image.png)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-orange-400/20 backdrop-blur-sm animate-pulse"></div>
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-[2.5rem] p-10 transition-all duration-500 hover:scale-[1.02]">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
          Connectify
        </h1>
        <p className="text-slate-500 text-center mb-8 text-lg">
          {mode === 'login' ? 'Welcome back! Log in to continue' : 'Join the vibe. Create your account'}
        </p>

        {mode === 'register' && (
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" /> Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium text-lg placeholder-slate-400"
              placeholder="yourname"
              autoComplete="username"
            />
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" /> Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium text-lg placeholder-slate-400"
            placeholder="you@example.com"
            autoComplete="email"
            type="email"
          />
        </div>

        <div className="mb-7">
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary-500" /> Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium text-lg placeholder-slate-400"
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            type="password"
          />
        </div>

        {mode === 'login' ? (
          <div className="-mt-4 mb-6 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForgot(true);
                setForgotEmail(email);
                setForgotError(null);
                setForgotInfo(null);
              }}
              className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className={`w-full px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300 active:scale-95 shadow-lg ${
            canSubmit && !loading
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white shadow-primary-500/30'
              : 'bg-slate-300 cursor-not-allowed text-slate-500'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Please wait…
            </span>
          ) : mode === 'login' ? (
            <span className="flex items-center justify-center gap-2">
              <Heart className="w-5 h-5" /> Log In
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" /> Create Account
            </span>
          )}
        </button>

        <div className="mt-8 text-center">
          {mode === 'login' ? (
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="font-bold text-primary-600 hover:text-primary-700 transition-colors text-lg"
            >
              New here? <span className="underline">Create an account</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="font-bold text-primary-600 hover:text-primary-700 transition-colors text-lg"
            >
              Already have an account? <span className="underline">Log in</span>
            </button>
          )}
        </div>
      </div>

      {showForgot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md border border-white/30 shadow-2xl rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-slate-800">Reset password</h2>
              <button
                type="button"
                onClick={closeForgot}
                className="text-sm font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium"
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                />
              </div>

              <button
                type="button"
                onClick={requestReset}
                disabled={forgotLoading}
                className={`w-full px-6 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                  forgotLoading
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {forgotLoading ? 'Please wait…' : 'Get reset token'}
              </button>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Token</label>
                <input
                  value={forgotToken}
                  onChange={(e) => setForgotToken(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium"
                  placeholder="Paste token here"
                  autoComplete="one-time-code"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New password</label>
                <input
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all outline-none font-medium"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                />
              </div>

              {forgotError ? (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                  {forgotError}
                </div>
              ) : null}

              {forgotInfo ? (
                <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                  {forgotInfo}
                </div>
              ) : null}

              <button
                type="button"
                onClick={performReset}
                disabled={forgotLoading}
                className={`w-full px-6 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 ${
                  forgotLoading
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white'
                }`}
              >
                {forgotLoading ? 'Please wait…' : 'Reset password'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AuthView;
