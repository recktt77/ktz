import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    try {
      await login(email.trim(), password);
    } catch {
      /* error is already in store */
    }
  }

  return (
    <div className="login-page">
      {/* Background pattern */}
      <div className="login-page__bg">
        <div className="login-page__grid" />
        <div className="login-page__glow login-page__glow--1" />
        <div className="login-page__glow login-page__glow--2" />
      </div>

      <div className="login-card">
        {/* Logo & Title */}
        <div className="login-card__header">
          <img src="/header-logo.svg" alt="КТЖ" className="login-card__logo" />
          <h1 className="login-card__title">Digital Twin</h1>
          <p className="login-card__subtitle">
            Система мониторинга локомотивов
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-card__error" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
            <button onClick={clearError} className="login-card__error-close" aria-label="Close">
              ×
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-card__form">
          <div className="login-field">
            <label htmlFor="email" className="login-field__label">
              Email
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M2 7l10 6 10-6" />
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@ktj.kz"
                className="login-field__input"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-field__label">
              Пароль
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-field__input"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-card__submit"
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? (
              <span className="login-card__spinner" />
            ) : (
              'Войти'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-card__footer">
          <span>АО «НК «Қазақстан темір жолы»</span>
          <span className="login-card__dot">·</span>
          <span>Locomotive Digital Twin</span>
        </div>
      </div>
    </div>
  );
}
