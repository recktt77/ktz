import { useState, useEffect, useCallback } from 'react';
import * as sim from '@/services/api/simulatorService';

const PARAM_LABELS: Record<string, string> = {
  speed: 'Скорость (км/ч)',
  catenaryVoltage: 'Напряжение сети (кВ)',
  catenaryCurrent: 'Ток сети (А)',
  transformerTemp: 'Темп. трансформатора (°C)',
  transformerLoad: 'Нагрузка трансформатора (%)',
  converterTemp: 'Темп. конвертера (°C)',
  converterLoad: 'Нагрузка конвертера (%)',
  tractiveEffort: 'Тяговое усилие (кН)',
  regenPower: 'Мощность рекуперации (кВт)',
  energyConsumption: 'Потребление энергии (кВт·ч)',
  brakePressure: 'Давление тормозов (бар)',
  engineRpm: 'Обороты двигателя (об/мин)',
  engineLoad: 'Нагрузка двигателя (%)',
  fuelLevel: 'Уровень топлива (%)',
  fuelConsumption: 'Расход топлива (л/ч)',
};

type LocoType = 'kz8a' | 'te33a';

export function SimulatorPanel() {
  const [status, setStatus] = useState<sim.SimulatorStatus | null>(null);
  const [scenarios, setScenarios] = useState<sim.Scenario[]>([]);
  const [params, setParams] = useState<sim.OverrideParams | null>(null);
  const [overrides, setOverrides] = useState<sim.Overrides>({ kz8a: {}, te33a: {} });
  const [draftOverrides, setDraftOverrides] = useState<Record<LocoType, Record<string, string>>>({ kz8a: {}, te33a: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeLoco, setActiveLoco] = useState<LocoType>('kz8a');

  const loadAll = useCallback(async () => {
    try {
      const [st, sc, p, ov] = await Promise.all([
        sim.getStatus(),
        sim.getScenarios(),
        sim.getParams(),
        sim.getOverrides(),
      ]);
      setStatus(st);
      setScenarios(sc);
      setParams(p);
      setOverrides(ov);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!status || status.state !== 'running') return;
    const id = setInterval(async () => {
      try {
        const st = await sim.getStatus();
        setStatus(st);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [status?.state]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleControl = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    setLoading(true);
    setError(null);
    try {
      const res = await sim[action]();
      setStatus(res.status);
      flash(`Симулятор: ${res.message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
    setLoading(false);
  };

  const handleScenario = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await sim.setScenario(id);
      setStatus(res.status);
      const ov = await sim.getOverrides();
      setOverrides(ov);
      flash(`Сценарий: ${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
    setLoading(false);
  };

  const handleApplyOverride = async (loco: LocoType) => {
    setLoading(true);
    setError(null);
    const draft = draftOverrides[loco];
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v.trim() !== '') {
        const n = Number(v);
        if (isNaN(n)) {
          setError(`Некорректное значение для ${k}`);
          setLoading(false);
          return;
        }
        parsed[k] = n;
      }
    }
    if (Object.keys(parsed).length === 0) {
      setError('Укажите хотя бы один параметр');
      setLoading(false);
      return;
    }
    try {
      const res = await sim.setOverride(loco, parsed);
      setOverrides(res.overrides);
      setDraftOverrides(prev => ({ ...prev, [loco]: {} }));
      flash(`Override для ${loco.toUpperCase()} применён`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
    setLoading(false);
  };

  const handleClearOverrides = async (loco: LocoType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await sim.clearOverride(loco);
      setOverrides(res.overrides);
      setDraftOverrides(prev => ({ ...prev, [loco]: {} }));
      flash(`Override для ${loco.toUpperCase()} сброшен`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
    setLoading(false);
  };

  const stateColors: Record<string, string> = {
    running: 'var(--status-normal)',
    paused: 'var(--accent-amber)',
    idle: 'var(--text-muted)',
  };

  const currentParams = params?.[activeLoco] ?? [];
  const currentOverrides = overrides[activeLoco] ?? {};

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status & Controls */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Симулятор телеметрии
          </h2>
          {status && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: stateColors[status.state] ?? 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: stateColors[status.state] ?? 'var(--text-muted)' }}>
                {status.state === 'running' ? 'Работает' : status.state === 'paused' ? 'Пауза' : 'Остановлен'}
              </span>
              {status.state === 'running' && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  · тик #{status.tick}
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--status-critical)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {error}
            <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">×</button>
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'rgba(52,211,153,0.08)', color: 'var(--status-normal)', border: '1px solid rgba(52,211,153,0.15)' }}>
            {success}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="admin-btn" disabled={loading || status?.state === 'running'} onClick={() => handleControl('start')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            Запуск
          </button>
          <button className="admin-btn" disabled={loading || status?.state !== 'running'} onClick={() => handleControl('pause')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            Пауза
          </button>
          <button className="admin-btn" disabled={loading || status?.state !== 'paused'} onClick={() => handleControl('resume')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            Продолжить
          </button>
          <button className="admin-btn" style={{ borderColor: 'rgba(239,68,68,0.3)' }} disabled={loading || status?.state === 'idle'} onClick={() => handleControl('stop')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            Стоп
          </button>
        </div>
      </div>

      {/* Scenarios */}
      <div className="panel p-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Сценарии</h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleScenario(sc.id)}
              disabled={loading}
              className="text-left rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                background: status?.scenario === sc.id ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface)',
                border: `1px solid ${status?.scenario === sc.id ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`,
                color: status?.scenario === sc.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              <div className="font-semibold" style={{ color: status?.scenario === sc.id ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                {sc.id.replace(/_/g, ' ')}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sc.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Override Panel */}
      <div className="panel p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Ручные метрики</h3>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {(['kz8a', 'te33a'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveLoco(t)}
                className="px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  background: activeLoco === t ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: activeLoco === t ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {Object.keys(currentOverrides).length > 0 && (
            <button
              className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--status-critical)', border: '1px solid rgba(239,68,68,0.15)' }}
              onClick={() => handleClearOverrides(activeLoco)}
              disabled={loading}
            >
              Сбросить override
            </button>
          )}
        </div>

        {/* Active overrides */}
        {Object.keys(currentOverrides).length > 0 && (
          <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-cyan)' }}>Активные override:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentOverrides).map(([k, v]) => (
                <span key={k} className="text-xs px-2.5 py-1 rounded-full font-mono" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--text-primary)' }}>
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parameter inputs */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentParams.map((param) => (
            <div key={param}>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {PARAM_LABELS[param] ?? param}
              </label>
              <input
                type="number"
                step="any"
                placeholder={currentOverrides[param] !== undefined ? String(currentOverrides[param]) : '—'}
                value={draftOverrides[activeLoco][param] ?? ''}
                onChange={(e) => setDraftOverrides(prev => ({
                  ...prev,
                  [activeLoco]: { ...prev[activeLoco], [param]: e.target.value },
                }))}
                className="admin-input"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              />
            </div>
          ))}
        </div>

        <button
          className="admin-btn mt-4"
          disabled={loading}
          onClick={() => handleApplyOverride(activeLoco)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Применить override для {activeLoco.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
