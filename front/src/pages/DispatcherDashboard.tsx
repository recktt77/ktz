import { useDashboardStore } from '@/store';
import { useTelemetry, useProcessed } from '@/hooks/useTelemetry';
import { AlertsPanel } from '@/widgets/common/AlertsPanel';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusDot } from '@/components/StatusDot';
import { Skeleton } from '@/components/Skeleton';
import { RailwayMap } from '@/widgets/map';
import { isKZ8ATelemetry, isTE33ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';
import type { LocomotiveTelemetry, LocomotiveProcessed, RouteContext } from '@/types';
import type { KZ8ATelemetry, TE33ATelemetry, KZ8AProcessed, TE33AProcessed } from '@/types';

export function DispatcherDashboard() {
  const telemetry = useDashboardStore((s) => s.telemetry);
  const locoIds = Object.keys(telemetry);

  if (locoIds.length === 0) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="dispatcher-page animate-fade-in">
      {/* Map */}
      <RailwayMap className="w-full" compact />

      {/* Fleet summary row */}
      <FleetSummaryRow locoIds={locoIds} />

      {/* Per-locomotive full panels */}
      <div className="dispatcher-page__locos">
        {locoIds.map((id) => (
          <LocoFullPanel key={id} locoId={id} />
        ))}
      </div>

      {/* Alerts */}
      <AlertsPanel />
    </div>
  );
}

function FleetSummaryRow({ locoIds }: { locoIds: string[] }) {
  const processed = useDashboardStore((s) => s.processed);
  const alerts = useDashboardStore((s) => s.alerts);

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const avgHealth = locoIds.length > 0
    ? Math.round(locoIds.reduce((sum, id) => sum + (processed[id]?.health_index ?? 0), 0) / locoIds.length)
    : 0;
  const critCount = locoIds.filter((id) => (processed[id]?.health_index ?? 100) < 50).length;

  return (
    <div className="dispatcher-summary">
      <SummaryCell label="Локомотивов" value={String(locoIds.length)} color="var(--accent-cyan)" />
      <SummaryCell
        label="Ср. здоровье"
        value={`${avgHealth}%`}
        color={avgHealth >= 80 ? 'var(--status-normal)' : avgHealth >= 50 ? 'var(--status-warning)' : 'var(--status-critical)'}
      />
      <SummaryCell label="Оповещений" value={String(activeAlerts.length)} color={activeAlerts.length > 0 ? 'var(--accent-amber)' : 'var(--text-muted)'} />
      <SummaryCell label="Критических" value={String(critCount)} color={critCount > 0 ? 'var(--status-critical)' : 'var(--status-normal)'} />
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="dispatcher-summary__cell">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-lg font-extrabold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function LocoFullPanel({ locoId }: { locoId: string }) {
  const telemetry = useTelemetry(locoId);
  const processed = useProcessed(locoId);
  const route = useDashboardStore((s) => s.routes[locoId]);

  if (!telemetry) return null;

  const hi = processed?.health_index ?? 0;
  const hiColor = hi >= 80 ? 'var(--status-normal)' : hi >= 50 ? 'var(--status-warning)' : 'var(--status-critical)';

  return (
    <div className="panel dispatcher-loco">
      {/* Header */}
      <div className="dispatcher-loco__header">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{locoId}</span>
          <span className="dispatcher-loco__badge">{telemetry.locomotive_model}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <StatusDot status={telemetry.communication_status === 'online' ? 'ok' : telemetry.communication_status === 'degraded' ? 'degraded' : 'fault'} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{telemetry.communication_status}</span>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold tabular-nums" style={{ color: hiColor }}>{hi}</span>
            <span className="text-[10px] ml-0.5 font-bold" style={{ color: hiColor }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* Route bar */}
      {route && <RouteBar route={route} />}

      {/* Metrics grid */}
      <div className="dispatcher-loco__grid">
        <Metric label="Скорость" value={telemetry.speed_kmh.toFixed(0)} unit="км/ч" />
        <Metric label="Давление тормозов" value={telemetry.brake_system_pressure_bar.toFixed(2)} unit="бар" status={telemetry.brake_system_status} />
        <Metric label="Упр. система" value={telemetry.control_system_status} status={telemetry.control_system_status} />

        {isKZ8ATelemetry(telemetry) && <KZ8AMetrics t={telemetry as KZ8ATelemetry} p={processed && isKZ8AProcessed(processed) ? processed as KZ8AProcessed : null} />}
        {isTE33ATelemetry(telemetry) && <TE33AMetrics t={telemetry as TE33ATelemetry} p={processed && isTE33AProcessed(processed) ? processed as TE33AProcessed : null} />}
      </div>

      {/* Processed analytics row */}
      {processed && <AnalyticsRow processed={processed} />}

      {/* Fault code */}
      {telemetry.fault_code && (
        <div className="dispatcher-loco__fault">
          Неисправность: {telemetry.fault_code}
        </div>
      )}

      {/* Recommendation */}
      {processed && 'recommended_action' in processed && (
        <div className="dispatcher-loco__action">
          {(processed as { recommended_action: string }).recommended_action}
        </div>
      )}
    </div>
  );
}

function RouteBar({ route }: { route: RouteContext }) {
  const progress = (route.position_km / route.totalKm) * 100;
  return (
    <div className="dispatcher-loco__route">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-primary)' }}>{route.from}</span>
        <span style={{ color: 'var(--text-dim)' }}>{route.position_km.toFixed(0)} / {route.totalKm} км</span>
        <span style={{ color: 'var(--text-primary)' }}>{route.to}</span>
      </div>
      <ProgressBar value={progress} color="cyan" />
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-dim)' }}>
        <span>Откл: <span style={{ color: Math.abs(route.schedule_deviation_min) > 3 ? 'var(--status-warning)' : 'var(--status-normal)' }}>
          {route.schedule_deviation_min > 0 ? '+' : ''}{route.schedule_deviation_min.toFixed(1)} мин
        </span></span>
        <span>ETA: {route.eta_to_checkpoint_min.toFixed(0)} мин</span>
        <span>Соответствие: {route.route_compliance_score}%</span>
      </div>
    </div>
  );
}

function KZ8AMetrics({ t, p }: { t: KZ8ATelemetry; p: KZ8AProcessed | null }) {
  return (
    <>
      <Metric label="Пантограф" value={t.pantograph_status} status={t.pantograph_status} />
      <Metric label="Напряжение сети" value={t.catenary_voltage_kv.toFixed(1)} unit="кВ" />
      <Metric label="Ток сети" value={t.catenary_current_a.toFixed(0)} unit="А" />
      <Metric label="Трансформатор" value={t.main_transformer_status} status={t.main_transformer_status} />
      <Metric label="Темп. трансф." value={t.main_transformer_temp_c.toFixed(0)} unit="°C" />
      <Metric label="Нагр. трансф." value={t.main_transformer_load_pct.toFixed(0)} unit="%" />
      <Metric label="Тяга" value={t.tractive_effort_kn.toFixed(0)} unit="кН" status={t.traction_drive_status} />
      <Metric label="Конвертер" value={t.traction_converter_status} status={t.traction_converter_status} />
      <Metric label="Темп. конверт." value={t.traction_converter_temp_c.toFixed(0)} unit="°C" />
      <Metric label="Нагр. конверт." value={t.traction_converter_load_pct.toFixed(0)} unit="%" />
      <Metric label="Рекуперация" value={t.regenerative_braking_power_kw.toFixed(0)} unit="кВт" status={t.regenerative_braking_status} />
      <Metric label="Эл. тормоз" value={t.electrical_brake_status} status={t.electrical_brake_status} />
      <Metric label="Автопилот" value={t.automatic_pilot_status} status={t.automatic_pilot_status} />
      <Metric label="Энергия" value={t.energy_meter_kwh.toFixed(0)} unit="кВт·ч" />
      <Metric label="Потребление" value={t.energy_consumption_kw.toFixed(0)} unit="кВт" />
      {p && (
        <>
          <Score label="Риск снабжения" value={p.electrical_supply_risk} invert />
          <Score label="Здор. трансф." value={p.transformer_health_score} />
          <Score label="Терм. риск тр." value={p.transformer_thermal_risk} invert />
          <Score label="Здор. тяги" value={p.traction_drive_health_score} />
          <Score label="Терм. риск конв." value={p.converter_thermal_risk} invert />
          <Score label="Эфф. рекуп." value={p.regen_efficiency_score} />
          <Score label="Риск тормозов" value={p.brake_risk} invert />
          <Score label="Эфф. энергии" value={p.energy_efficiency_score} />
        </>
      )}
    </>
  );
}

function TE33AMetrics({ t, p }: { t: TE33ATelemetry; p: TE33AProcessed | null }) {
  return (
    <>
      <Metric label="Двигатель" value={t.engine_status} status={t.engine_status} />
      <Metric label="Обороты" value={t.engine_rpm.toFixed(0)} unit="об/мин" />
      <Metric label="Нагрузка двиг." value={t.engine_load_pct.toFixed(0)} unit="%" />
      <Metric label="Топливо" value={t.fuel_level_pct.toFixed(0)} unit="%" />
      <Metric label="Расход топл." value={t.fuel_consumption_lph.toFixed(0)} unit="л/ч" />
      <Metric label="Пропульсия" value={t.propulsion_system_status} status={t.propulsion_system_status} />
      <Metric label="Дин. тормоз" value={t.dynamic_brake_status} status={t.dynamic_brake_status} />
      <Metric label="Компрессор" value={t.compressor_status} status={t.compressor_status} />
      <Metric label="Вспомогательные" value={t.auxiliaries_status} status={t.auxiliaries_status} />
      <Metric label="Борт. диагн." value={t.onboard_diagnostic_status} status={t.onboard_diagnostic_status} />
      <Metric label="Интерф. экип." value={t.crew_interface_status} status={t.crew_interface_status} />
      <Metric label="Компьютер" value={t.computer_system_status} status={t.computer_system_status} />
      {p && (
        <>
          <Score label="Здор. двигателя" value={p.engine_health_score} />
          <Score label="Перегруз. риск" value={p.engine_overload_risk} invert />
          <Score label="Эфф. топлива" value={p.fuel_efficiency_score} />
          <Score label="Аном. топлива" value={p.fuel_anomaly_score} invert />
          <Score label="Остаток топл." value={p.fuel_remaining_eta_h} unit="ч" raw />
          <Score label="Здор. пропульсии" value={p.propulsion_health_score} />
          <Score label="Дин. тормоз" value={p.dynamic_brake_availability_score} />
          <Score label="Риск тормозов" value={p.brake_risk} invert />
          <Score label="Компрессор" value={p.compressor_readiness_score} />
        </>
      )}
    </>
  );
}

function AnalyticsRow({ processed }: { processed: LocomotiveProcessed }) {
  return (
    <div className="dispatcher-loco__analytics">
      <AnalyticsPill label="Приоритет ТО" value={processed.maintenance_priority_score} invert />
      <AnalyticsPill label="Неисправности" value={processed.fault_severity_score} invert />
    </div>
  );
}

function AnalyticsPill({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value <= 20 : value >= 80;
  const warn = invert ? value <= 50 : value >= 50;
  const color = good ? 'var(--status-normal)' : warn ? 'var(--status-warning)' : 'var(--status-critical)';
  return (
    <div className="dispatcher-analytics-pill">
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function Metric({ label, value, unit, status }: { label: string; value: string; unit?: string; status?: string }) {
  const isStatus = ['ok', 'degraded', 'fault', 'offline'].includes(value);
  return (
    <div className="dispatcher-metric">
      <span className="dispatcher-metric__label">{label}</span>
      <div className="flex items-center gap-1">
        {status && <StatusDot status={status as 'ok' | 'degraded' | 'fault' | 'offline'} />}
        <span className="dispatcher-metric__value" style={{
          color: status === 'fault' ? 'var(--status-critical)' : status === 'degraded' ? 'var(--status-warning)' : 'var(--text-primary)',
        }}>
          {isStatus ? statusLabel(value) : value}
        </span>
        {unit && !isStatus && <span className="dispatcher-metric__unit">{unit}</span>}
      </div>
    </div>
  );
}

function Score({ label, value, invert, unit, raw }: { label: string; value: number; invert?: boolean; unit?: string; raw?: boolean }) {
  const display = raw ? value.toFixed(1) : String(Math.round(value));
  const good = invert ? value <= 20 : value >= 80;
  const warn = invert ? value <= 50 : value >= 50;
  const color = good ? 'var(--status-normal)' : warn ? 'var(--status-warning)' : 'var(--status-critical)';
  return (
    <div className="dispatcher-metric">
      <span className="dispatcher-metric__label">{label}</span>
      <span className="dispatcher-metric__value" style={{ color }}>{display}{unit ?? ''}</span>
    </div>
  );
}

function statusLabel(s: string): string {
  switch (s) {
    case 'ok': return 'Норма';
    case 'degraded': return 'Деград.';
    case 'fault': return 'Отказ';
    case 'offline': return 'Откл.';
    default: return s;
  }
}
