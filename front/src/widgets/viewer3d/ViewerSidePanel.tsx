/**
 * Side panel showing component statuses + scores next to the 3D viewer.
 */
import { StatusDot } from '@/components/StatusDot';
import { ProgressBar } from '@/components/ProgressBar';
import type { LocomotiveTelemetry, LocomotiveProcessed, KZ8ATelemetry, TE33ATelemetry, KZ8AProcessed, TE33AProcessed } from '@/types';
import { isKZ8ATelemetry, isKZ8AProcessed, isTE33AProcessed } from '@/types';

interface Props {
  telemetry: LocomotiveTelemetry;
  processed: LocomotiveProcessed | null;
}

export function ViewerSidePanel({ telemetry, processed }: Props) {
  const hi = processed?.health_index ?? 0;
  const hiCol = hi >= 80 ? 'var(--status-normal)' : hi >= 50 ? 'var(--status-warning)' : 'var(--status-critical)';

  return (
    <div className="viewer3d-side">
      <div className="viewer3d-side__health">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Индекс здоровья</span>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-black tabular-nums" style={{ color: hiCol }}>{hi}</span>
          <span className="text-xs font-bold pb-1" style={{ color: 'var(--text-dim)' }}>/100</span>
        </div>
        <ProgressBar value={hi} color={hi >= 80 ? 'green' : hi >= 50 ? 'amber' : 'red'} />
      </div>

      <Section title="Общие параметры">
        <Row label="Скорость" value={`${telemetry.speed_kmh.toFixed(0)} км/ч`} />
        <Row label="Тормоза" value={telemetry.brake_system_pressure_bar.toFixed(2) + ' бар'} status={telemetry.brake_system_status} />
        <Row label="Управление" value={sl(telemetry.control_system_status)} status={telemetry.control_system_status} />
        <Row label="Связь" value={sl(telemetry.communication_status)} status={telemetry.communication_status === 'online' ? 'ok' : telemetry.communication_status === 'degraded' ? 'degraded' : 'fault'} />
        {telemetry.fault_code && <Row label="Неисправность" value={telemetry.fault_code} status="fault" />}
      </Section>

      {isKZ8ATelemetry(telemetry)
        ? <KZ8ASection t={telemetry as KZ8ATelemetry} p={processed && isKZ8AProcessed(processed) ? processed as KZ8AProcessed : null} />
        : <TE33ASection t={telemetry as TE33ATelemetry} p={processed && isTE33AProcessed(processed) ? processed as TE33AProcessed : null} />
      }

      {processed && 'recommended_action' in processed && (
        <div className="viewer3d-side__action">
          {(processed as { recommended_action: string }).recommended_action}
        </div>
      )}
    </div>
  );
}

function KZ8ASection({ t, p }: { t: KZ8ATelemetry; p: KZ8AProcessed | null }) {
  return (
    <>
      <Section title="Электроснабжение">
        <Row label="Пантограф" value={sl(t.pantograph_status)} status={t.pantograph_status} />
        <Row label="Напряжение" value={`${t.catenary_voltage_kv.toFixed(1)} кВ`} />
        <Row label="Ток" value={`${t.catenary_current_a.toFixed(0)} А`} />
      </Section>
      <Section title="Трансформатор">
        <Row label="Статус" value={sl(t.main_transformer_status)} status={t.main_transformer_status} />
        <Row label="Температура" value={`${t.main_transformer_temp_c.toFixed(0)}°C`} status={t.main_transformer_temp_c > 85 ? 'fault' : t.main_transformer_temp_c > 70 ? 'degraded' : 'ok'} />
        <Row label="Нагрузка" value={`${t.main_transformer_load_pct.toFixed(0)}%`} />
      </Section>
      <Section title="Тяговый привод">
        <Row label="Тяга" value={`${t.tractive_effort_kn.toFixed(0)} кН`} />
        <Row label="Конвертер" value={sl(t.traction_converter_status)} status={t.traction_converter_status} />
        <Row label="Темп. конв." value={`${t.traction_converter_temp_c.toFixed(0)}°C`} />
        <Row label="Нагр. конв." value={`${t.traction_converter_load_pct.toFixed(0)}%`} />
      </Section>
      <Section title="Торможение / Энергия">
        <Row label="Рекуперация" value={`${t.regenerative_braking_power_kw.toFixed(0)} кВт`} status={t.regenerative_braking_status} />
        <Row label="Потребление" value={`${t.energy_consumption_kw.toFixed(0)} кВт`} />
        <Row label="Счётчик" value={`${t.energy_meter_kwh.toFixed(0)} кВт·ч`} />
      </Section>
      {p && (
        <Section title="Аналитика">
          <ScoreRow label="Риск снабжения" value={p.electrical_supply_risk} invert />
          <ScoreRow label="Здор. трансф." value={p.transformer_health_score} />
          <ScoreRow label="Здор. тяги" value={p.traction_drive_health_score} />
          <ScoreRow label="Эфф. рекуп." value={p.regen_efficiency_score} />
          <ScoreRow label="Эфф. энергии" value={p.energy_efficiency_score} />
          <ScoreRow label="Риск тормозов" value={p.brake_risk} invert />
          <ScoreRow label="Приоритет ТО" value={p.maintenance_priority_score} invert />
        </Section>
      )}
    </>
  );
}

function TE33ASection({ t, p }: { t: TE33ATelemetry; p: TE33AProcessed | null }) {
  return (
    <>
      <Section title="Дизельный двигатель">
        <Row label="Статус" value={sl(t.engine_status)} status={t.engine_status} />
        <Row label="Обороты" value={`${t.engine_rpm.toFixed(0)} об/мин`} />
        <Row label="Нагрузка" value={`${t.engine_load_pct.toFixed(0)}%`} />
      </Section>
      <Section title="Топливо">
        <Row label="Уровень" value={`${t.fuel_level_pct.toFixed(0)}%`} status={t.fuel_level_pct > 20 ? 'ok' : 'fault'} />
        <Row label="Расход" value={`${t.fuel_consumption_lph.toFixed(0)} л/ч`} />
      </Section>
      <Section title="Пропульсия / Торможение">
        <Row label="Пропульсия" value={sl(t.propulsion_system_status)} status={t.propulsion_system_status} />
        <Row label="Дин. тормоз" value={sl(t.dynamic_brake_status)} status={t.dynamic_brake_status} />
        <Row label="Компрессор" value={sl(t.compressor_status)} status={t.compressor_status} />
      </Section>
      <Section title="Системы">
        <Row label="Диагностика" value={sl(t.onboard_diagnostic_status)} status={t.onboard_diagnostic_status} />
        <Row label="Вспом. сист." value={sl(t.auxiliaries_status)} status={t.auxiliaries_status} />
        <Row label="Интерф. экип." value={sl(t.crew_interface_status)} status={t.crew_interface_status} />
        <Row label="Компьютер" value={sl(t.computer_system_status)} status={t.computer_system_status} />
      </Section>
      {p && (
        <Section title="Аналитика">
          <ScoreRow label="Здор. двигателя" value={p.engine_health_score} />
          <ScoreRow label="Перегруз. риск" value={p.engine_overload_risk} invert />
          <ScoreRow label="Эфф. топлива" value={p.fuel_efficiency_score} />
          <ScoreRow label="Остаток топл." value={p.fuel_remaining_eta_h} unit="ч" raw />
          <ScoreRow label="Здор. пропульсии" value={p.propulsion_health_score} />
          <ScoreRow label="Дин. тормоз" value={p.dynamic_brake_availability_score} />
          <ScoreRow label="Компрессор" value={p.compressor_readiness_score} />
          <ScoreRow label="Приоритет ТО" value={p.maintenance_priority_score} invert />
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="viewer3d-side__section">
      <h4 className="viewer3d-side__section-title">{title}</h4>
      <div className="viewer3d-side__rows">{children}</div>
    </div>
  );
}

function Row({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="viewer3d-side__row">
      <div className="flex items-center gap-1.5">
        {status && <StatusDot status={status as 'ok' | 'degraded' | 'fault' | 'offline'} />}
        <span className="viewer3d-side__row-label">{label}</span>
      </div>
      <span className="viewer3d-side__row-value" style={{
        color: status === 'fault' ? 'var(--status-critical)' : status === 'degraded' ? 'var(--status-warning)' : 'var(--text-primary)',
      }}>{value}</span>
    </div>
  );
}

function ScoreRow({ label, value, invert, unit, raw }: { label: string; value: number; invert?: boolean; unit?: string; raw?: boolean }) {
  const display = raw ? value.toFixed(1) : String(Math.round(value));
  const good = invert ? value <= 20 : value >= 80;
  const warn = invert ? value <= 50 : value >= 50;
  const color = good ? 'var(--status-normal)' : warn ? 'var(--status-warning)' : 'var(--status-critical)';
  return (
    <div className="viewer3d-side__row">
      <span className="viewer3d-side__row-label">{label}</span>
      <span className="viewer3d-side__row-value" style={{ color }}>{display}{unit ?? ''}</span>
    </div>
  );
}

function sl(s: string): string {
  switch (s) {
    case 'ok': return 'Норма';
    case 'degraded': return 'Деград.';
    case 'fault': return 'Отказ';
    case 'offline': return 'Откл.';
    case 'online': return 'Онлайн';
    default: return s;
  }
}
