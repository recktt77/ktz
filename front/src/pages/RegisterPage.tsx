import { useState, useEffect, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';

interface Props {
  inviteCode: string;
  onBackToLogin: () => void;
}

export function RegisterPage({ inviteCode, onBackToLogin }: Props) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !fullName.trim() || !password.trim()) {
      setLocalError('Заполните все обязательные поля');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      setLocalError('Пароль должен быть не менее 8 символов');
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        invite_code: inviteCode,
      });
    } catch {
      /* error is already in store */
    }
  }

  const displayError = localError || error;

  return (
    <div className="login-page">
      <div className="login-page__bg">
        <div className="login-page__grid" />
        <div className="login-page__glow login-page__glow--1" />
        <div className="login-page__glow login-page__glow--2" />
      </div>

      <div className="login-card">
        <div className="login-card__header">
          <img src="/header-logo.svg" alt="КТЖ" className="login-card__logo" />
          <h1 className="login-card__title">Регистрация</h1>
          <p className="login-card__subtitle">
            Заполните данные для создания аккаунта
          </p>
        </div>

        {displayError && (
          <div className="login-card__error" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{displayError}</span>
            <button
              onClick={() => { setLocalError(null); clearError(); }}
              className="login-card__error-close"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-card__form">
          {/* Email */}
          <div className="login-field">
            <label htmlFor="reg-email" className="login-field__label">
              Email
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M2 7l10 6 10-6" />
              </svg>
              <input
                id="reg-email"
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

          {/* Full Name */}
          <div className="login-field">
            <label htmlFor="reg-name" className="login-field__label">
              ФИО
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              </svg>
              <input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="login-field__input"
                autoComplete="name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="login-field">
            <label htmlFor="reg-phone" className="login-field__label">
              Телефон
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (7XX) XXX-XX-XX"
                className="login-field__input"
                autoComplete="tel"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="reg-password" className="login-field__label">
              Пароль
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className="login-field__input"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
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

          {/* Confirm Password */}
          <div className="login-field">
            <label htmlFor="reg-confirm" className="login-field__label">
              Подтвердите пароль
            </label>
            <div className="login-field__wrap">
              <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="login-field__input"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-card__submit"
            disabled={isLoading || !email.trim() || !fullName.trim() || !password.trim() || !confirmPassword.trim()}
          >
            {isLoading ? (
              <span className="login-card__spinner" />
            ) : (
              'Зарегистрироваться'
            )}
          </button>
        </form>

        <div className="login-card__alt">
          <span>Уже есть аккаунт?</span>
          <button onClick={onBackToLogin} className="login-card__link">
            Войти
          </button>
        </div>

        <div className="login-card__footer">
          <span>АО «НК «Қазақстан темір жолы»</span>
          <span className="login-card__dot">·</span>
          <span>Locomotive Digital Twin</span>
        </div>
      </div>
    </div>
  );
}
