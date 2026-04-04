/**
 * Standalone test for trilingual report PDF generation with mock data.
 * Run: node test-reports.js
 * Outputs: test-output/test_driver_KZ8A.pdf, test_engineer_KZ8A.pdf, etc.
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/* ================================================================
   FONT RESOLUTION — Cyrillic support
   ================================================================ */

const FONT_CANDIDATES = {
    regular: [
        'C:\\Windows\\Fonts\\arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ],
    bold: [
        'C:\\Windows\\Fonts\\arialbd.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ],
};

function resolveFont(candidates) {
    for (const p of candidates) {
        try { if (fs.existsSync(p)) return p; } catch (_) { /* skip */ }
    }
    return null;
}

const FONT_REGULAR = resolveFont(FONT_CANDIDATES.regular);
const FONT_BOLD = resolveFont(FONT_CANDIDATES.bold) || FONT_REGULAR;

function registerFonts(doc) {
    if (FONT_REGULAR) {
        doc.registerFont('Regular', FONT_REGULAR);
        doc.registerFont('Bold', FONT_BOLD || FONT_REGULAR);
        doc.font('Regular');
    }
}

function setFont(doc, style = 'regular') {
    if (FONT_REGULAR) {
        doc.font(style === 'bold' ? 'Bold' : 'Regular');
    } else {
        doc.font(style === 'bold' ? 'Helvetica-Bold' : 'Helvetica');
    }
}

/* ================================================================
   TRANSLATIONS
   ================================================================ */

const LANG_ORDER = ['kz', 'ru', 'en'];

const L = {
    kz: {
        companyName: 'ҚТЖ — Нақты уақыттағы мониторинг',
        roles: { driver: 'Машинист есебі', dispatcher: 'Диспетчер есебі', engineer: 'Инженерлік есеп', supervisor: 'Басшы есебі' },
        langLabel: 'ҚАЗАҚША',
        locomotive: 'Локомотив', period: 'Кезең', generated: 'Құрылған',
        healthIndex: 'Денсаулық индексі', avg: 'Орташа', min: 'Мин', max: 'Макс',
        speed: 'Жылдамдық (км/сағ)', brakePressure: 'Тежегіш қысымы (бар)',
        transformerTemp: 'Трансформатор температурасы (°C)', transformerLoad: 'Трансформатор жүктемесі (%)',
        converterTemp: 'Түрлендіргіш температурасы (°C)', catenaryVoltage: 'Контакт желі кернеуі (кВ)',
        catenaryCurrent: 'Контакт желі тогы (А)', energyConsumption: 'Энергия тұтыну (кВт)',
        engineRpm: 'Қозғалтқыш айн. (айн/мин)', engineLoad: 'Қозғалтқыш жүктемесі (%)',
        fuelLevel: 'Отын деңгейі (%)', fuelConsumption: 'Отын шығыны (л/сағ)',
        alerts: 'Ескертулер', alertsPeriod: 'Кезеңдегі ескертулер',
        time: 'Уақыт', level: 'Деңгей', description: 'Сипаттама', metric: 'Метрика',
        summary: 'Қорытынды', avgHealth: 'Орташа денсаулық индексі', minimum: 'Ең төмен',
        alertCount: 'Ескертулер саны', criticalCount: 'Сыни',
        riskFactors: 'Тәуекел факторлары', penalty: 'айыппұл',
        alertLog: 'Ескертулер журналы', detailedTelemetry: 'Толық телеметрия',
        possibleCauses: 'Ықтимал себептер', fleetOverview: 'Парк шолуы',
        model: 'Модель', status: 'Мәртебе', normal: 'Қалыпты', attention: 'Назар аударыңыз', critical: 'Сыни',
        healthTimeline: 'Денсаулық индексі — уақыт шкаласы', health15min: 'Денсаулық индексі (15 мин)',
        noData: 'Деректер жоқ', avgHI: 'Орташа ДИ',
        footer: 'АҚ «ҰК «Қазақстан темір жолы» — автоматты түрде жасалған есеп',
    },
    ru: {
        companyName: 'КТЖ — Мониторинг в реальном времени',
        roles: { driver: 'Отчёт машиниста', dispatcher: 'Отчёт диспетчера', engineer: 'Инженерный отчёт', supervisor: 'Отчёт руководителя' },
        langLabel: 'РУССКИЙ',
        locomotive: 'Локомотив', period: 'Период', generated: 'Сгенерировано',
        healthIndex: 'Индекс здоровья', avg: 'Средний', min: 'Мин', max: 'Макс',
        speed: 'Скорость (км/ч)', brakePressure: 'Давление тормозов (бар)',
        transformerTemp: 'Температура трансформатора (°C)', transformerLoad: 'Нагрузка трансформатора (%)',
        converterTemp: 'Температура преобразователя (°C)', catenaryVoltage: 'Напряжение КС (кВ)',
        catenaryCurrent: 'Ток КС (А)', energyConsumption: 'Энергопотребление (кВт)',
        engineRpm: 'Обороты двигателя (об/мин)', engineLoad: 'Нагрузка двигателя (%)',
        fuelLevel: 'Уровень топлива (%)', fuelConsumption: 'Расход топлива (л/ч)',
        alerts: 'Алерты', alertsPeriod: 'Алерты за период',
        time: 'Время', level: 'Уровень', description: 'Описание', metric: 'Метрика',
        summary: 'Сводка', avgHealth: 'Средний индекс здоровья', minimum: 'Минимальный',
        alertCount: 'Количество алертов', criticalCount: 'Критических',
        riskFactors: 'Факторы риска', penalty: 'штраф',
        alertLog: 'Журнал алертов', detailedTelemetry: 'Детальная телеметрия',
        possibleCauses: 'Возможные причины', fleetOverview: 'Общий обзор флота',
        model: 'Модель', status: 'Статус', normal: 'В норме', attention: 'Внимание', critical: 'Критично',
        healthTimeline: 'Индекс здоровья — таймлайн', health15min: 'Индекс здоровья (15 мин)',
        noData: 'Нет данных', avgHI: 'Средний ИЗ',
        footer: 'АО «НК «Қазақстан темір жолы» — автоматически сгенерированный отчёт',
    },
    en: {
        companyName: 'KTZ — Realtime Monitoring',
        roles: { driver: 'Driver Report', dispatcher: 'Dispatcher Report', engineer: 'Engineer Report', supervisor: 'Supervisor Report' },
        langLabel: 'ENGLISH',
        locomotive: 'Locomotive', period: 'Period', generated: 'Generated',
        healthIndex: 'Health Index', avg: 'Average', min: 'Min', max: 'Max',
        speed: 'Speed (km/h)', brakePressure: 'Brake Pressure (bar)',
        transformerTemp: 'Transformer Temperature (°C)', transformerLoad: 'Transformer Load (%)',
        converterTemp: 'Converter Temperature (°C)', catenaryVoltage: 'Catenary Voltage (kV)',
        catenaryCurrent: 'Catenary Current (A)', energyConsumption: 'Energy Consumption (kW)',
        engineRpm: 'Engine RPM', engineLoad: 'Engine Load (%)',
        fuelLevel: 'Fuel Level (%)', fuelConsumption: 'Fuel Consumption (L/h)',
        alerts: 'Alerts', alertsPeriod: 'Alerts in period',
        time: 'Time', level: 'Severity', description: 'Description', metric: 'Metric',
        summary: 'Summary', avgHealth: 'Average Health Index', minimum: 'Minimum',
        alertCount: 'Alert Count', criticalCount: 'Critical',
        riskFactors: 'Risk Factors', penalty: 'penalty',
        alertLog: 'Alert Log', detailedTelemetry: 'Detailed Telemetry',
        possibleCauses: 'Possible Causes', fleetOverview: 'Fleet Overview',
        model: 'Model', status: 'Status', normal: 'Normal', attention: 'Attention', critical: 'Critical',
        healthTimeline: 'Health Index — Timeline', health15min: 'Health Index (15 min)',
        noData: 'No data', avgHI: 'Avg HI',
        footer: 'JSC NC Kazakhstan Temir Zholy — auto-generated report',
    },
};

/* ================================================================
   CONSTANTS
   ================================================================ */

const COLORS = {
    primary: '#1a56db', good: '#059669', warning: '#d97706',
    critical: '#dc2626', text: '#1f2937', muted: '#6b7280',
    bg: '#f9fafb', line: '#e5e7eb', white: '#ffffff',
};

/* ================================================================
   MOCK DATA
   ================================================================ */

function mockNormalizedRows(minutes, model) {
    const rows = [];
    const now = Date.now();
    for (let i = 0; i < minutes * 60; i += 5) {
        const ts = new Date(now - (minutes * 60 - i) * 1000);
        const base = {
            locomotive_id: model === 'KZ8A' ? 'KTZ-4021' : 'KTZ-7015',
            locomotive_model: model,
            speed_kmh: 70 + Math.sin(i / 60) * 15 + (Math.random() - 0.5) * 5,
            brake_system_pressure_bar: 5.0 + (Math.random() - 0.5) * 0.5,
        };
        if (model === 'KZ8A') {
            Object.assign(base, {
                main_transformer_temp_c: 38 + Math.sin(i / 100) * 5 + Math.random() * 3,
                main_transformer_load_pct: 42 + (Math.random() - 0.5) * 8,
                traction_converter_temp_c: 38 + Math.random() * 5,
                catenary_voltage_kv: 25 + (Math.random() - 0.5) * 1,
                catenary_current_a: 310 + (Math.random() - 0.5) * 40,
                energy_consumption_kw: 1800 + (Math.random() - 0.5) * 200,
            });
        } else {
            Object.assign(base, {
                engine_rpm: 1350 + (Math.random() - 0.5) * 200,
                engine_load_pct: 55 + (Math.random() - 0.5) * 15,
                fuel_level_pct: 92 - i * 0.002,
                fuel_consumption_lph: 155 + (Math.random() - 0.5) * 20,
            });
        }
        rows.push({ timestamp_utc: ts.toISOString(), metrics: base });
    }
    return rows;
}

function mockDerivedRows(minutes) {
    const rows = [];
    const now = Date.now();
    for (let i = 0; i < minutes * 60; i += 8) {
        const ts = new Date(now - (minutes * 60 - i) * 1000);
        const health = 92 + Math.sin(i / 50) * 5 + (Math.random() - 0.5) * 3;
        rows.push({
            timestamp_utc: ts.toISOString(),
            health_index: Math.round(Math.max(60, Math.min(100, health)) * 10) / 10,
            health_status: health >= 85 ? 'Good' : health >= 60 ? 'Warning' : 'Critical',
            payload: {
                top_factors: health < 90 ? [
                    { name: 'transformer_thermal', impact: 3.2, detail: 'Трансформатор: 42°C (норма)' },
                ] : [],
                root_cause_candidates: health < 88 ? ['Повышенная нагрузка', 'Окружающая среда'] : [],
            },
        });
    }
    return rows;
}

function mockAlerts() {
    const now = Date.now();
    return [
        { created_at: new Date(now - 300000).toISOString(), severity: 'warning', title: 'Повышение температуры трансформатора', metric: 'main_transformer_temp_c', value: 45, threshold: 44 },
        { created_at: new Date(now - 120000).toISOString(), severity: 'info', title: 'Температура вернулась в норму', metric: 'main_transformer_temp_c', value: 39, threshold: 44 },
    ];
}

/* ================================================================
   DRAWING HELPERS
   ================================================================ */

function downsample(series, maxPoints = 90) {
    if (series.length <= maxPoints) return series;
    const step = Math.ceil(series.length / maxPoints);
    return series.filter((_, i) => i % step === 0);
}

function drawLineChart(doc, x, y, w, h, series, opts = {}) {
    const { title, unit, color, minY, maxY, thresholdWarning, thresholdCritical, noDataText } = opts;
    if (!series || series.length < 2) {
        setFont(doc, 'regular');
        doc.fontSize(9).fillColor(COLORS.muted).text(noDataText || 'No data', x, y + h / 2 - 5, { width: w, align: 'center' });
        return;
    }
    const data = downsample(series);
    const values = data.map(d => d.v);
    const yMin = minY !== undefined ? minY : Math.min(...values) - 1;
    const yMax = maxY !== undefined ? maxY : Math.max(...values) + 1;
    const yRange = yMax - yMin || 1;
    const chartX = x + 40, chartW = w - 50, chartY = y + 18, chartH = h - 35;

    if (title) { setFont(doc, 'regular'); doc.fontSize(9).fillColor(COLORS.text).text(title, x, y, { width: w }); }
    doc.save();
    doc.rect(chartX, chartY, chartW, chartH).fill(COLORS.bg);

    doc.strokeColor(COLORS.line).lineWidth(0.3);
    for (let i = 0; i <= 4; i++) {
        const gy = chartY + (chartH / 4) * i;
        doc.moveTo(chartX, gy).lineTo(chartX + chartW, gy).stroke();
        const label = Math.round((yMax - (yRange / 4) * i) * 10) / 10;
        setFont(doc, 'regular');
        doc.fontSize(7).fillColor(COLORS.muted).text(String(label), x, gy - 4, { width: 36, align: 'right' });
    }

    if (thresholdWarning !== undefined) {
        const ty = chartY + chartH - ((thresholdWarning - yMin) / yRange) * chartH;
        if (ty >= chartY && ty <= chartY + chartH) {
            doc.strokeColor(COLORS.warning).lineWidth(0.5).dash(3, { space: 2 });
            doc.moveTo(chartX, ty).lineTo(chartX + chartW, ty).stroke(); doc.undash();
        }
    }
    if (thresholdCritical !== undefined) {
        const ty = chartY + chartH - ((thresholdCritical - yMin) / yRange) * chartH;
        if (ty >= chartY && ty <= chartY + chartH) {
            doc.strokeColor(COLORS.critical).lineWidth(0.5).dash(3, { space: 2 });
            doc.moveTo(chartX, ty).lineTo(chartX + chartW, ty).stroke(); doc.undash();
        }
    }

    doc.strokeColor(color || COLORS.primary).lineWidth(1.5);
    let started = false;
    for (let i = 0; i < data.length; i++) {
        const px = chartX + (i / (data.length - 1)) * chartW;
        const py = chartY + chartH - ((data[i].v - yMin) / yRange) * chartH;
        if (!started) { doc.moveTo(px, py); started = true; } else doc.lineTo(px, py);
    }
    doc.stroke();

    const fmt = d => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor(COLORS.muted);
    doc.text(fmt(data[0].t), chartX, chartY + chartH + 3, { width: 40 });
    doc.text(fmt(data[data.length - 1].t), chartX + chartW - 40, chartY + chartH + 3, { width: 40, align: 'right' });
    if (unit) doc.fontSize(7).fillColor(COLORS.muted).text(unit, chartX + chartW + 3, chartY, { width: 30 });
    doc.restore();
}

function drawHealthGauge(doc, x, y, value, status) {
    const clr = status === 'Critical' ? COLORS.critical : status === 'Warning' ? COLORS.warning : COLORS.good;
    doc.circle(x + 30, y + 30, 28).fill('#f3f4f6');
    doc.circle(x + 30, y + 30, 28).lineWidth(5).strokeColor(clr).stroke();
    setFont(doc, 'bold');
    doc.fontSize(18).fillColor(clr).text(String(Math.round(value)), x, y + 18, { width: 60, align: 'center' });
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor(COLORS.muted).text(status, x, y + 42, { width: 60, align: 'center' });
}

function drawAlertTable(doc, x, y, alerts, t, maxRows = 8) {
    const colWidths = [130, 60, 240, 80];
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const rowH = 14;
    doc.rect(x, y, totalW, rowH).fill(COLORS.primary);
    setFont(doc, 'bold');
    doc.fontSize(8).fillColor(COLORS.white);
    const hdrs = [t.time, t.level, t.description, t.metric];
    let cx = x + 4;
    hdrs.forEach((h, i) => { doc.text(h, cx, y + 3, { width: colWidths[i] - 8 }); cx += colWidths[i]; });

    setFont(doc, 'regular');
    const rows = (alerts || []).slice(0, maxRows);
    rows.forEach((a, i) => {
        const ry = y + rowH * (i + 1);
        doc.rect(x, ry, totalW, rowH).fill(i % 2 === 0 ? COLORS.bg : COLORS.white);
        doc.fontSize(7).fillColor(COLORS.text);
        const ts = a.created_at || a.timestamp_utc;
        doc.text(ts ? new Date(ts).toLocaleTimeString('ru-RU') : '—', x + 4, ry + 3, { width: 126 });
        doc.fillColor(a.severity === 'critical' ? COLORS.critical : a.severity === 'warning' ? COLORS.warning : COLORS.muted);
        doc.text(a.severity || '—', x + 134, ry + 3, { width: 56 });
        doc.fillColor(COLORS.text);
        doc.text(a.title || '—', x + 194, ry + 3, { width: 236 });
        doc.text(a.metric || '—', x + 434, ry + 3, { width: 76 });
    });
    return y + rowH * (rows.length + 1) + 5;
}

function addHeader(doc, role, locomotiveId, fromTs, lang) {
    const t = L[lang];
    doc.rect(0, 0, doc.page.width, 62).fill(COLORS.primary);
    setFont(doc, 'bold');
    doc.fontSize(15).fillColor(COLORS.white).text(t.companyName, 40, 10);
    doc.fontSize(11).text(t.roles[role], 40, 30);
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor('#ffffff99').text(t.langLabel, doc.page.width - 100, 48, { width: 55, align: 'right' });

    doc.fontSize(9).fillColor(COLORS.text);
    let y = 72;
    if (locomotiveId) { doc.text(`${t.locomotive}: ${locomotiveId}`, 40, y); y += 14; }
    const now = new Date();
    doc.text(`${t.period}: ${new Date(fromTs).toLocaleString('ru-RU')} — ${now.toLocaleString('ru-RU')}`, 40, y); y += 14;
    doc.text(`${t.generated}: ${now.toLocaleString('ru-RU')}`, 40, y);
    return y + 22;
}

function addFooter(doc, lang) {
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor(COLORS.muted)
        .text(L[lang].footer, 40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center' });
}

/* ================================================================
   MODEL-SPECIFIC CHART CONFIGS
   ================================================================ */

function getModelCharts(lang, model) {
    const t = L[lang];
    if (model === 'KZ8A') {
        return [
            { key: 'main_transformer_temp_c', title: t.transformerTemp, color: '#ef4444', unit: '°C', thresholdWarning: 90, thresholdCritical: 110 },
            { key: 'main_transformer_load_pct', title: t.transformerLoad, color: '#f59e0b', unit: '%', minY: 0, maxY: 100 },
            { key: 'traction_converter_temp_c', title: t.converterTemp, color: '#f97316', unit: '°C' },
            { key: 'catenary_voltage_kv', title: t.catenaryVoltage, color: '#6366f1', unit: 'kV' },
            { key: 'catenary_current_a', title: t.catenaryCurrent, color: '#8b5cf6', unit: 'A' },
            { key: 'energy_consumption_kw', title: t.energyConsumption, color: '#10b981', unit: 'kW' },
        ];
    }
    return [
        { key: 'engine_rpm', title: t.engineRpm, color: '#ef4444', unit: 'RPM' },
        { key: 'engine_load_pct', title: t.engineLoad, color: '#f59e0b', unit: '%', minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 95 },
        { key: 'fuel_level_pct', title: t.fuelLevel, color: '#3b82f6', unit: '%', minY: 0, maxY: 100 },
        { key: 'fuel_consumption_lph', title: t.fuelConsumption, color: '#10b981', unit: 'L/h' },
    ];
}

/* ================================================================
   SECTION BUILDERS — one language section per call
   ================================================================ */

function extractTS(normalizedRows, key) {
    return normalizedRows.filter(r => r.metrics && r.metrics[key] !== undefined).map(r => ({ t: new Date(r.timestamp_utc), v: r.metrics[key] }));
}

function extractHS(derivedRows) {
    return derivedRows.filter(r => r.health_index !== undefined).map(r => ({ t: new Date(r.timestamp_utc), v: r.health_index }));
}

function drawDriverSection(doc, lang, locoId, fromTs, derived, normalized, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'driver', locoId, fromTs, lang);

    const latest = derived[derived.length - 1];
    if (latest) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.healthIndex, 40, y);
        drawHealthGauge(doc, 40, y + 16, latest.health_index, latest.health_status);
        setFont(doc, 'regular');
        const avgH = derived.reduce((s, r) => s + (r.health_index || 0), 0) / derived.length;
        doc.fontSize(9).fillColor(COLORS.text);
        doc.text(`${t.avg}: ${Math.round(avgH * 10) / 10}`, 120, y + 30);
        doc.text(`${t.min}: ${Math.min(...derived.map(r => r.health_index || 100))}`, 120, y + 44);
        doc.text(`${t.max}: ${Math.max(...derived.map(r => r.health_index || 0))}`, 210, y + 44);
        y += 80;
    }

    drawLineChart(doc, 40, y, 510, 110, extractHS(derived), { title: t.health15min, color: COLORS.primary, minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData });
    y += 125;
    drawLineChart(doc, 40, y, 510, 95, extractTS(normalized, 'speed_kmh'), { title: t.speed, color: '#3b82f6', unit: 'km/h', minY: 0, noDataText: t.noData });
    y += 110;
    drawLineChart(doc, 40, y, 510, 95, extractTS(normalized, 'brake_system_pressure_bar'), { title: t.brakePressure, color: '#f59e0b', unit: 'bar', minY: 0, maxY: 7, thresholdWarning: 4.0, thresholdCritical: 3.0, noDataText: t.noData });
    y += 110;

    const model = normalized[0]?.metrics?.locomotive_model;
    if (model === 'KZ8A') {
        drawLineChart(doc, 40, y, 510, 95, extractTS(normalized, 'main_transformer_temp_c'), { title: t.transformerTemp, color: '#ef4444', unit: '°C', thresholdWarning: 90, thresholdCritical: 110, noDataText: t.noData });
    } else {
        drawLineChart(doc, 40, y, 510, 95, extractTS(normalized, 'engine_load_pct'), { title: t.engineLoad, color: '#ef4444', unit: '%', minY: 0, maxY: 100, noDataText: t.noData });
    }
    y += 110;

    if (alerts.length > 0 && y < 660) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alertsPeriod, 40, y);
        drawAlertTable(doc, 40, y + 16, alerts, t, 6);
    }
    addFooter(doc, lang);
}

function drawDispatcherSection(doc, lang, locoId, fromTs, derived, normalized, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'dispatcher', locoId, fromTs, lang);

    drawLineChart(doc, 40, y, 510, 120, extractHS(derived), { title: t.healthTimeline, color: COLORS.primary, minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData });
    y += 135;
    drawLineChart(doc, 40, y, 510, 95, extractTS(normalized, 'speed_kmh'), { title: t.speed, color: '#3b82f6', minY: 0, noDataText: t.noData });
    y += 110;

    if (derived.length > 0) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.summary, 40, y); y += 16;
        setFont(doc, 'regular');
        const avgH = derived.reduce((s, r) => s + (r.health_index || 0), 0) / derived.length;
        doc.fontSize(9).fillColor(COLORS.text);
        doc.text(`${t.avgHealth}: ${Math.round(avgH * 10) / 10}`, 40, y);
        doc.text(`${t.minimum}: ${Math.min(...derived.map(r => r.health_index || 100))}`, 300, y); y += 14;
        doc.text(`${t.alertCount}: ${alerts.length}`, 40, y);
        doc.text(`${t.criticalCount}: ${alerts.filter(a => a.severity === 'critical').length}`, 300, y); y += 18;
    }

    const latest = derived[derived.length - 1];
    if (latest?.payload?.top_factors?.length) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.riskFactors, 40, y); y += 16;
        setFont(doc, 'regular');
        for (const f of latest.payload.top_factors.slice(0, 5)) {
            doc.fontSize(8).fillColor(COLORS.text).text(`● ${f.name} — ${t.penalty}: ${f.impact}, ${f.detail}`, 50, y); y += 12;
        }
        y += 5;
    }

    if (alerts.length > 0 && y < 620) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alertLog, 40, y);
        drawAlertTable(doc, 40, y + 16, alerts, t, 8);
    }
    addFooter(doc, lang);
}

function drawEngineerSection(doc, lang, locoId, fromTs, derived, normalized, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'engineer', locoId, fromTs, lang);

    drawLineChart(doc, 40, y, 510, 105, extractHS(derived), { title: t.healthIndex, color: COLORS.primary, minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData });
    y += 118;
    drawLineChart(doc, 40, y, 510, 85, extractTS(normalized, 'speed_kmh'), { title: t.speed, color: '#3b82f6', unit: 'km/h', minY: 0, noDataText: t.noData });
    y += 100;
    drawLineChart(doc, 40, y, 510, 85, extractTS(normalized, 'brake_system_pressure_bar'), { title: t.brakePressure, color: '#f59e0b', unit: 'bar', minY: 0, maxY: 7, thresholdWarning: 4.0, thresholdCritical: 3.0, noDataText: t.noData });
    y += 100;

    doc.addPage(); addFooter(doc, lang); y = 40;
    setFont(doc, 'bold');
    doc.fontSize(12).fillColor(COLORS.text).text(t.detailedTelemetry, 40, y); y += 20;

    const model = normalized[0]?.metrics?.locomotive_model;
    const charts = getModelCharts(lang, model || 'KZ8A');
    for (const ch of charts) {
        if (y > 680) { doc.addPage(); addFooter(doc, lang); y = 40; }
        drawLineChart(doc, 40, y, 510, 85, extractTS(normalized, ch.key), { ...ch, noDataText: t.noData });
        y += 100;
    }

    if (alerts.length > 0) {
        if (y > 580) { doc.addPage(); addFooter(doc, lang); y = 40; }
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alerts, 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, t, 12);
    }

    const latest = derived[derived.length - 1];
    if (latest?.payload?.root_cause_candidates?.length) {
        if (y > 680) { doc.addPage(); addFooter(doc, lang); y = 40; }
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.possibleCauses, 40, y); y += 16;
        setFont(doc, 'regular');
        for (const rc of latest.payload.root_cause_candidates) {
            doc.fontSize(8).fillColor(COLORS.text).text(`● ${rc}`, 50, y); y += 12;
        }
    }
}

function drawSupervisorSection(doc, lang, fromTs, fleet) {
    const t = L[lang];
    let y = addHeader(doc, 'supervisor', null, fromTs, lang);

    setFont(doc, 'bold');
    doc.fontSize(11).fillColor(COLORS.text).text(t.fleetOverview, 40, y); y += 18;

    const cols = [120, 80, 100, 80, 130];
    const totalW = cols.reduce((a, b) => a + b, 0);
    const hdrs = [t.locomotive, t.model, t.avgHI, t.alerts, t.status];
    doc.rect(40, y, totalW, 16).fill(COLORS.primary);
    setFont(doc, 'bold');
    doc.fontSize(8).fillColor(COLORS.white);
    let cx = 44;
    hdrs.forEach((h, i) => { doc.text(h, cx, y + 4, { width: cols[i] - 8 }); cx += cols[i]; });
    y += 16;

    setFont(doc, 'regular');
    for (const loco of fleet) {
        const bg = fleet.indexOf(loco) % 2 === 0 ? COLORS.bg : COLORS.white;
        doc.rect(40, y, totalW, 16).fill(bg);
        doc.fontSize(8).fillColor(COLORS.text);
        cx = 44;
        const statusStr = loco.avgHealth >= 85 ? t.normal : loco.avgHealth >= 60 ? t.attention : t.critical;
        const statusClr = loco.avgHealth >= 85 ? COLORS.good : loco.avgHealth >= 60 ? COLORS.warning : COLORS.critical;
        doc.text(loco.locomotive_id, cx, y + 4, { width: cols[0] - 8 }); cx += cols[0];
        doc.text(loco.model_code, cx, y + 4, { width: cols[1] - 8 }); cx += cols[1];
        doc.text(String(loco.avgHealth), cx, y + 4, { width: cols[2] - 8 }); cx += cols[2];
        doc.text(String(loco.alertCount), cx, y + 4, { width: cols[3] - 8 }); cx += cols[3];
        doc.fillColor(statusClr).text(statusStr, cx, y + 4, { width: cols[4] - 8 });
        y += 16;
    }
    y += 15;

    for (const loco of fleet) {
        if (y > 600) { doc.addPage(); addFooter(doc, lang); y = 40; }
        drawLineChart(doc, 40, y, 510, 95, extractHS(loco.history), {
            title: `${loco.locomotive_id} (${loco.model_code}) — ${t.healthIndex}`,
            color: COLORS.primary, minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData,
        });
        y += 110;
    }
    addFooter(doc, lang);
}

/* ================================================================
   BUILD TRILINGUAL PDF (KZ → RU → EN)
   ================================================================ */

function buildPdf(drawFn, ...args) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        registerFonts(doc);
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        for (let i = 0; i < LANG_ORDER.length; i++) {
            if (i > 0) doc.addPage();
            drawFn(doc, LANG_ORDER[i], ...args);
        }
        doc.end();
    });
}

/* ================================================================
   MAIN TEST
   ================================================================ */

async function main() {
    const outDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log(`Font resolved: ${FONT_REGULAR || 'NONE (Helvetica fallback, no Cyrillic)'}`);

    const fromTs = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    for (const model of ['KZ8A', 'TE33A']) {
        const locoId = model === 'KZ8A' ? 'KTZ-4021' : 'KTZ-7015';
        const normalized = mockNormalizedRows(15, model);
        const derived = mockDerivedRows(15);
        const alerts = mockAlerts();

        // Driver
        const driverPdf = await buildPdf(drawDriverSection, locoId, fromTs, derived, normalized, alerts);
        fs.writeFileSync(path.join(outDir, `test_driver_${model}.pdf`), driverPdf);
        console.log(`  test_driver_${model}.pdf (${(driverPdf.length / 1024).toFixed(1)} KB)`);

        // Dispatcher
        const dispPdf = await buildPdf(drawDispatcherSection, locoId, fromTs, derived, normalized, alerts);
        fs.writeFileSync(path.join(outDir, `test_dispatcher_${model}.pdf`), dispPdf);
        console.log(`  test_dispatcher_${model}.pdf (${(dispPdf.length / 1024).toFixed(1)} KB)`);

        // Engineer
        const engPdf = await buildPdf(drawEngineerSection, locoId, fromTs, derived, normalized, alerts);
        fs.writeFileSync(path.join(outDir, `test_engineer_${model}.pdf`), engPdf);
        console.log(`  test_engineer_${model}.pdf (${(engPdf.length / 1024).toFixed(1)} KB)`);
    }

    // Supervisor — fleet overview
    const fleet = [
        { locomotive_id: 'KTZ-4021', model_code: 'KZ8A', avgHealth: 94.3, alertCount: 2, history: mockDerivedRows(15) },
        { locomotive_id: 'KTZ-7015', model_code: 'TE33A', avgHealth: 88.1, alertCount: 1, history: mockDerivedRows(15) },
    ];
    const supPdf = await buildPdf(drawSupervisorSection, fromTs, fleet);
    fs.writeFileSync(path.join(outDir, 'test_supervisor.pdf'), supPdf);
    console.log(`  test_supervisor.pdf (${(supPdf.length / 1024).toFixed(1)} KB)`);

    console.log(`\nAll files in: ${outDir}`);
}

main().catch(console.error);
