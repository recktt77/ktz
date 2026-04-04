import { useDashboardStore } from '@/store';

export function AdminOverview() {
  const fleet = useDashboardStore((s) => s.fleet);
  const alerts = useDashboardStore((s) => s.alerts);
  const telemetry = useDashboardStore((s) => s.telemetry);
  const processed = useDashboardStore((s) => s.processed);

  const total = fleet.length || Object.keys(telemetry).length || 2;
  const avgHealth = fleet.length > 0
    ? Math.round(fleet.reduce((s, e) => s + e.health_index, 0) / fleet.length)
    : Object.keys(processed).length > 0
    ? Math.round(Object.values(processed).reduce((s, p) => s + p.health_index, 0) / Object.keys(processed).length)
    : 100;

  const avgDowntimeRisk = fleet.length > 0
    ? Math.round(fleet.reduce((s, e) => s + e.downtime_risk_score, 0) / fleet.length)
    : 0;

  const avgAvailability = fleet.length > 0
    ? Math.round(fleet.reduce((s, e) => s + e.availability_score, 0) / fleet.length)
    : total;

  const breakdownRisk = fleet.length > 0
    ? Math.round(fleet.reduce((s, e) => s + e.maintenance_priority_score, 0) / fleet.length)
    : 0;

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
  const warningAlerts = alerts.filter((a) => a.severity === 'warning').length;

  // Build per-loco health bars from fleet or telemetry
  const locoHealthList = fleet.length > 0
    ? fleet.map((e) => ({
        id: e.locomotive_id,
        health: e.health_index,
        color: e.health_index >= 80 ? 'var(--accent-cyan)' : e.health_index >= 50 ? 'var(--accent-amber)' : 'var(--accent-coral)',
      }))
    : Object.entries(processed).map(([id, p]) => ({
        id,
        health: p.health_index,
        color: p.health_index >= 80 ? 'var(--accent-cyan)' : p.health_index >= 50 ? 'var(--accent-amber)' : 'var(--accent-coral)',
      }));

  // Maintenance queue — sorted by lowest health
  const maintenanceQueue = [...locoHealthList].sort((a, b) => a.health - b.health);

  // Locomotives at risk — health below 60
  const atRisk = locoHealthList.filter((l) => l.health < 60);

  const unavailable = fleet.filter((e) => e.communication_status === 'offline').length;

  return (
    <div className="animate-fade-in admin-overview">
      {/* Row 1: KPI cards */}
      <div className="admin-overview__kpis">
        {/* Delay risk */}
        <div className="admin-card admin-card--dark">
          <div className="admin-card__label">Риск задержки</div>
          <div className="admin-card__big-value">{Math.max(0, 100 - avgHealth)}%</div>
          <MiniAreaChart color="var(--accent-amber)" value={Math.max(0, 100 - avgHealth)} />
        </div>

        {/* Downtime risk */}
        <div className="admin-card admin-card--dark">
          <div className="admin-card__label">Риск простоя</div>
          <div className="admin-card__big-value">{avgDowntimeRisk}%</div>
          <MiniAreaChart color="var(--accent-coral)" value={avgDowntimeRisk} />
        </div>

        {/* Health bars */}
        <div className="admin-card admin-card--dark admin-card--wide">
          <div className="admin-card__label" style={{ marginBottom: 12 }}>Health локомотивы</div>
          <div className="space-y-2">
            {locoHealthList.length > 0 ? locoHealthList.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <span className="text-xs w-20 shrink-0 font-mono" style={{ color: 'var(--text-secondary)' }}>{l.id}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${l.health}%`, background: l.color }}
                  />
                </div>
                <span className="text-xs w-10 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{l.health}%</span>
              </div>
            )) : (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Нет данных о флоте</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="admin-overview__row2">
        {/* Breakdown risk */}
        <div className="admin-card admin-card--dark">
          <div className="admin-card__label">Риск поломки</div>
          <div className="admin-card__big-value">{breakdownRisk}%</div>
          <MiniAreaChart color="var(--status-warning)" value={breakdownRisk} />
        </div>

        {/* Events of the day */}
        <div className="admin-card admin-card--dark">
          <div className="admin-card__label" style={{ marginBottom: 12 }}>События дня</div>
          <div className="flex gap-8">
            <div>
              <div className="admin-card__big-value">{warningAlerts}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ошибок</div>
            </div>
            <div>
              <div className="admin-card__big-value">{criticalAlerts}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Критических ситуаций</div>
            </div>
          </div>
        </div>

        {/* Fleet availability */}
        <div className="admin-card admin-card--dark">
          <div className="admin-card__label" style={{ marginBottom: 12 }}>Доступность парка</div>
          <div className="flex gap-8">
            <div>
              <div className="admin-card__big-value">{total}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Сейчас</div>
            </div>
            <div>
              <div className="admin-card__big-value">{unavailable}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Выпали</div>
            </div>
          </div>
        </div>

        {/* Maintenance queue */}
        <div className="admin-card admin-card--dark admin-card--list">
          <div className="admin-card__label admin-card__label--accent">Очередь на ремонт</div>
          <div className="admin-card__list-items">
            {maintenanceQueue.length > 0 ? maintenanceQueue.map((l) => (
              <div key={l.id} className="admin-list-item">
                <span className="font-mono">{l.id}</span>
              </div>
            )) : (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Нет данных</div>
            )}
          </div>
        </div>
      </div>

      {/* Risk list */}
      <div className="admin-overview__risk">
        <div className="admin-card admin-card--dark admin-card--list">
          <div className="admin-card__label admin-card__label--accent">
            Какие локомотивы скоро выйдут из строя
          </div>
          <div className="admin-card__list-items">
            {atRisk.length > 0 ? atRisk.map((l) => (
              <div key={l.id} className="admin-list-item">
                <span className="font-mono">{l.id}</span>
                <span className="text-xs" style={{ color: 'var(--accent-coral)' }}>{l.health}%</span>
              </div>
            )) : (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Все локомотивы в норме</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple mini area chart visualization */
function MiniAreaChart({ color, value }: { color: string; value: number }) {
  // Generate a pseudo-random wave pattern based on value
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = value / 100;
    const wave = Math.sin(i * 0.8 + value * 0.1) * 0.3;
    return Math.max(0, Math.min(1, base + wave * (0.5 + Math.sin(i * 1.3) * 0.3)));
  });

  const h = 48;
  const w = 160;
  const stepX = w / (points.length - 1);
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${h - p * h * 0.8}`)
    .join(' ');
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2">
      <defs>
        <linearGradient id={`grad-${value}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${value})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
