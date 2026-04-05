const config = require('../config');

const METRIC_LABELS = {
  speed_kmh: 'Скорость',
  brake_system_pressure_bar: 'Давление тормозной системы',
  main_transformer_temp_c: 'Температура главного трансформатора',
  traction_converter_temp_c: 'Температура тягового преобразователя',
  catenary_voltage_kv: 'Напряжение контактной сети',
  main_transformer_load_pct: 'Нагрузка трансформатора',
  traction_converter_load_pct: 'Нагрузка преобразователя',
  engine_load_pct: 'Нагрузка двигателя',
  engine_rpm: 'Обороты двигателя',
  fuel_level_pct: 'Уровень топлива',
  fuel_consumption_lph: 'Расход топлива',
  fault_code: 'Код неисправности',
};

const METRIC_UNITS = {
  speed_kmh: 'км/ч',
  brake_system_pressure_bar: 'бар',
  main_transformer_temp_c: '°C',
  traction_converter_temp_c: '°C',
  catenary_voltage_kv: 'кВ',
  main_transformer_load_pct: '%',
  traction_converter_load_pct: '%',
  engine_load_pct: '%',
  engine_rpm: 'об/мин',
  fuel_level_pct: '%',
  fuel_consumption_lph: 'л/ч',
};

const ROLE_LABELS = {
  driver: 'машинист',
  engineer: 'инженер',
  dispatcher: 'диспетчер',
};

/**
 * Build system prompt for GPT Realtime session.
 * Includes alert context but NO personal data (no phone, no name).
 * user_id is included as an opaque identifier.
 */
function buildSystemPrompt(alert, targetRole, userId) {
  const metricLabel = METRIC_LABELS[alert.metric] || alert.metric;
  const unit = METRIC_UNITS[alert.metric] || '';
  const roleLabel = ROLE_LABELS[targetRole] || targetRole;
  const ts = new Date(alert.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return `Ты — автоматическая система мониторинга локомотивов КТЖ (Казахстан Темир Жолы).
Ты звонишь ${roleLabel}у (ID сотрудника: ${userId}) по поводу критического отклонения.

ДАННЫЕ АЛЕРТА (ТОЧНЫЕ, ИСПОЛЬЗУЙ ИХ):
- Локомотив: ${alert.locomotive_id} (модель ${alert.locomotive_model})
- Метрика: ${metricLabel}
- Текущее значение: ${alert.value} ${unit}
- Критический порог: ${alert.threshold} ${unit}
- Время обнаружения: ${ts}

СЦЕНАРИЙ ЗВОНКА (следуй строго по порядку):
1. "Здравствуйте, это автоматическая система мониторинга КТЖ."
2. "На локомотиве ${alert.locomotive_id} обнаружено критическое отклонение: ${metricLabel} составляет ${alert.value} ${unit} при допустимом пороге ${alert.threshold} ${unit}."
3. "Пожалуйста, проверьте ситуацию и обратитесь к дэшборду для подробной информации."
4. Подожди ответ. Если собеседник подтвердил — поблагодари и попрощайся. Если задаёт вопрос — отвечай на основе данных алерта выше.
5. После завершения разговора вызови функцию hang_up_call.

ПРАВИЛА:
- Говори ТОЛЬКО по-русски.
- Используй ТОЧНЫЕ цифры из данных алерта. Не говори "не определён" — все данные выше точные.
- НЕ давай советов по ремонту, только констатируй факт.
- Будь лаконичен. Разговор не должен длиться более 40 секунд.`;
}

module.exports = { buildSystemPrompt, METRIC_LABELS, METRIC_UNITS };
