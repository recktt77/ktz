/**
 * Report Service — generates trilingual PDF (KZ → RU → EN) and CSV reports
 * with 15-minute telemetry data.
 *
 * Reports are role-specific:
 *   - driver:     speed, brakes, traction, model-specific gauges
 *   - dispatcher: health timeline + alerts + risk factors
 *   - engineer:   full technical telemetry + health breakdown
 *   - supervisor: fleet overview + per-loco KPIs
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const healthRepo = require('../models/healthRepo');
const { query } = require('../db/pool');

/* ================================================================
   FONT RESOLUTION — Cyrillic support (Kazakh + Russian)
   ================================================================ */

const FONT_CANDIDATES = {
    regular: [
        path.join(__dirname, '..', '..', 'fonts', 'DejaVuSans.ttf'),
        'C:\\Windows\\Fonts\\arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ],
    bold: [
        path.join(__dirname, '..', '..', 'fonts', 'DejaVuSans-Bold.ttf'),
        'C:\\Windows\\Fonts\\arialbd.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ],
};

let _fontRegular = null;
let _fontBold = null;

function resolveFont(candidates) {
    for (const p of candidates) {
        try { if (fs.existsSync(p)) return p; } catch (_) { /* skip */ }
    }
    return null;
}

function getFonts() {
    if (_fontRegular === null) {
        _fontRegular = resolveFont(FONT_CANDIDATES.regular) || false;
        _fontBold = resolveFont(FONT_CANDIDATES.bold) || _fontRegular || false;
    }
    return { regular: _fontRegular, bold: _fontBold };
}

function registerFonts(doc) {
    const { regular, bold } = getFonts();
    if (regular) {
        doc.registerFont('Regular', regular);
        doc.registerFont('Bold', bold || regular);
        doc.font('Regular');
    }
    // else: use built-in Helvetica (no Cyrillic — fallback)
}

function setFont(doc, style = 'regular') {
    const { regular } = getFonts();
    if (regular) {
        doc.font(style === 'bold' ? 'Bold' : 'Regular');
    } else {
        doc.font(style === 'bold' ? 'Helvetica-Bold' : 'Helvetica');
    }
}

/* ================================================================
   TRANSLATIONS — KZ (Cyrillic) / RU / EN
   ================================================================ */

const LANG_ORDER = ['kz', 'ru', 'en'];

const L = {
    kz: {
        companyName: 'ҚТЖ — Нақты уақыттағы мониторинг',
        roles: {
            driver: 'Машинист есебі',
            dispatcher: 'Диспетчер есебі',
            engineer: 'Инженерлік есеп',
            supervisor: 'Басшы есебі',
        },
        langLabel: 'ҚАЗАҚША',
        locomotive: 'Локомотив',
        period: 'Кезең',
        generated: 'Құрылған',
        healthIndex: 'Денсаулық индексі',
        avg: 'Орташа',
        min: 'Мин',
        max: 'Макс',
        speed: 'Жылдамдық (км/сағ)',
        brakePressure: 'Тежегіш қысымы (бар)',
        transformerTemp: 'Трансформатор температурасы (°C)',
        transformerLoad: 'Трансформатор жүктемесі (%)',
        converterTemp: 'Түрлендіргіш температурасы (°C)',
        converterLoad: 'Түрлендіргіш жүктемесі (%)',
        catenaryVoltage: 'Контакт желі кернеуі (кВ)',
        catenaryCurrent: 'Контакт желі тогы (А)',
        energyConsumption: 'Энергия тұтыну (кВт)',
        engineRpm: 'Қозғалтқыш айн. (айн/мин)',
        engineLoad: 'Қозғалтқыш жүктемесі (%)',
        fuelLevel: 'Отын деңгейі (%)',
        fuelConsumption: 'Отын шығыны (л/сағ)',
        alerts: 'Ескертулер',
        alertsPeriod: 'Кезеңдегі ескертулер',
        time: 'Уақыт',
        level: 'Деңгей',
        description: 'Сипаттама',
        metric: 'Метрика',
        summary: 'Қорытынды',
        avgHealth: 'Орташа денсаулық индексі',
        minimum: 'Ең төмен',
        alertCount: 'Ескертулер саны',
        criticalCount: 'Сыни',
        riskFactors: 'Тәуекел факторлары',
        penalty: 'айыппұл',
        alertLog: 'Ескертулер журналы',
        detailedTelemetry: 'Толық телеметрия',
        possibleCauses: 'Ықтимал себептер',
        fleetOverview: 'Парк шолуы',
        model: 'Модель',
        status: 'Мәртебе',
        normal: 'Қалыпты',
        attention: 'Назар аударыңыз',
        critical: 'Сыни',
        healthTimeline: 'Денсаулық индексі — уақыт шкаласы',
        health15min: 'Денсаулық индексі (15 мин)',
        noData: 'Деректер жоқ',
        footer: 'АҚ «ҰК «Қазақстан темір жолы» — автоматты түрде жасалған есеп',
        avgHI: 'Орташа ДИ',
    },
    ru: {
        companyName: 'КТЖ — Мониторинг в реальном времени',
        roles: {
            driver: 'Отчёт машиниста',
            dispatcher: 'Отчёт диспетчера',
            engineer: 'Инженерный отчёт',
            supervisor: 'Отчёт руководителя',
        },
        langLabel: 'РУССКИЙ',
        locomotive: 'Локомотив',
        period: 'Период',
        generated: 'Сгенерировано',
        healthIndex: 'Индекс здоровья',
        avg: 'Средний',
        min: 'Мин',
        max: 'Макс',
        speed: 'Скорость (км/ч)',
        brakePressure: 'Давление тормозов (бар)',
        transformerTemp: 'Температура трансформатора (°C)',
        transformerLoad: 'Нагрузка трансформатора (%)',
        converterTemp: 'Температура преобразователя (°C)',
        converterLoad: 'Нагрузка преобразователя (%)',
        catenaryVoltage: 'Напряжение КС (кВ)',
        catenaryCurrent: 'Ток КС (А)',
        energyConsumption: 'Энергопотребление (кВт)',
        engineRpm: 'Обороты двигателя (об/мин)',
        engineLoad: 'Нагрузка двигателя (%)',
        fuelLevel: 'Уровень топлива (%)',
        fuelConsumption: 'Расход топлива (л/ч)',
        alerts: 'Алерты',
        alertsPeriod: 'Алерты за период',
        time: 'Время',
        level: 'Уровень',
        description: 'Описание',
        metric: 'Метрика',
        summary: 'Сводка',
        avgHealth: 'Средний индекс здоровья',
        minimum: 'Минимальный',
        alertCount: 'Количество алертов',
        criticalCount: 'Критических',
        riskFactors: 'Факторы риска',
        penalty: 'штраф',
        alertLog: 'Журнал алертов',
        detailedTelemetry: 'Детальная телеметрия',
        possibleCauses: 'Возможные причины',
        fleetOverview: 'Общий обзор флота',
        model: 'Модель',
        status: 'Статус',
        normal: 'В норме',
        attention: 'Внимание',
        critical: 'Критично',
        healthTimeline: 'Индекс здоровья — таймлайн',
        health15min: 'Индекс здоровья (15 мин)',
        noData: 'Нет данных',
        footer: 'АО «НК «Қазақстан темір жолы» — автоматически сгенерированный отчёт',
        avgHI: 'Средний ИЗ',
    },
    en: {
        companyName: 'KTZ — Realtime Monitoring',
        roles: {
            driver: 'Driver Report',
            dispatcher: 'Dispatcher Report',
            engineer: 'Engineer Report',
            supervisor: 'Supervisor Report',
        },
        langLabel: 'ENGLISH',
        locomotive: 'Locomotive',
        period: 'Period',
        generated: 'Generated',
        healthIndex: 'Health Index',
        avg: 'Average',
        min: 'Min',
        max: 'Max',
        speed: 'Speed (km/h)',
        brakePressure: 'Brake Pressure (bar)',
        transformerTemp: 'Transformer Temperature (°C)',
        transformerLoad: 'Transformer Load (%)',
        converterTemp: 'Converter Temperature (°C)',
        converterLoad: 'Converter Load (%)',
        catenaryVoltage: 'Catenary Voltage (kV)',
        catenaryCurrent: 'Catenary Current (A)',
        energyConsumption: 'Energy Consumption (kW)',
        engineRpm: 'Engine RPM',
        engineLoad: 'Engine Load (%)',
        fuelLevel: 'Fuel Level (%)',
        fuelConsumption: 'Fuel Consumption (L/h)',
        alerts: 'Alerts',
        alertsPeriod: 'Alerts in period',
        time: 'Time',
        level: 'Severity',
        description: 'Description',
        metric: 'Metric',
        summary: 'Summary',
        avgHealth: 'Average Health Index',
        minimum: 'Minimum',
        alertCount: 'Alert Count',
        criticalCount: 'Critical',
        riskFactors: 'Risk Factors',
        penalty: 'penalty',
        alertLog: 'Alert Log',
        detailedTelemetry: 'Detailed Telemetry',
        possibleCauses: 'Possible Causes',
        fleetOverview: 'Fleet Overview',
        model: 'Model',
        status: 'Status',
        normal: 'Normal',
        attention: 'Attention',
        critical: 'Critical',
        healthTimeline: 'Health Index — Timeline',
        health15min: 'Health Index (15 min)',
        noData: 'No data',
        footer: 'JSC NC Kazakhstan Temir Zholy — auto-generated report',
        avgHI: 'Avg HI',
    },
};

/* ================================================================
   CONSTANTS
   ================================================================ */

const REPORT_MINUTES = 15;
const COLORS = {
    primary: '#1a56db',
    good: '#059669',
    warning: '#d97706',
    critical: '#dc2626',
    text: '#1f2937',
    muted: '#6b7280',
    bg: '#f9fafb',
    line: '#e5e7eb',
    white: '#ffffff',
};

/* ================================================================
   DATA FETCHING
   ================================================================ */

async function fetchReportData(locomotiveId) {
    const fromTs = new Date(Date.now() - REPORT_MINUTES * 60 * 1000).toISOString();

    const derivedRows = await healthRepo.findDerivedHistory(locomotiveId, {
        from: fromTs,
        limit: REPORT_MINUTES * 60,
    });
    derivedRows.reverse();

    const { rows: normalizedRows } = await query(
        `SELECT * FROM telemetry_normalized
         WHERE locomotive_id = $1 AND timestamp_utc >= $2
         ORDER BY timestamp_utc ASC LIMIT $3`,
        [locomotiveId, fromTs, REPORT_MINUTES * 60]
    );

    let alerts = [];
    try {
        const { rows: alertRows } = await query(
            `SELECT * FROM alerts
             WHERE locomotive_id = $1 AND created_at >= $2
             ORDER BY created_at DESC`,
            [locomotiveId, fromTs]
        );
        alerts = alertRows;
    } catch (_) { /* alerts table may not exist */ }

    return { derivedRows, normalizedRows, alerts, fromTs };
}

async function fetchFleetData() {
    const fromTs = new Date(Date.now() - REPORT_MINUTES * 60 * 1000).toISOString();
    const { rows: locoRows } = await query(
        `SELECT DISTINCT locomotive_id, model_code
         FROM derived_metrics WHERE timestamp_utc >= $1`,
        [fromTs]
    );

    const fleet = [];
    for (const { locomotive_id, model_code } of locoRows) {
        const derived = await healthRepo.findDerivedHistory(locomotive_id, {
            from: fromTs, limit: REPORT_MINUTES * 60,
        });
        derived.reverse();
        const avgHealth = derived.length > 0
            ? Math.round(derived.reduce((s, r) => s + (r.health_index || 0), 0) / derived.length * 10) / 10
            : 0;

        let alertCount = 0;
        try {
            const { rows } = await query(
                `SELECT count(*)::int AS cnt FROM alerts
                 WHERE locomotive_id = $1 AND created_at >= $2`,
                [locomotive_id, fromTs]
            );
            alertCount = rows[0]?.cnt || 0;
        } catch (_) { /* */ }

        fleet.push({ locomotive_id, model_code, avgHealth, alertCount, history: derived });
    }
    return { fleet, fromTs };
}

/* ================================================================
   METRIC HELPERS
   ================================================================ */

function extractTimeSeries(normalizedRows, key) {
    return normalizedRows
        .filter(r => r.metrics && r.metrics[key] !== undefined)
        .map(r => ({ t: new Date(r.timestamp_utc), v: r.metrics[key] }));
}

function extractHealthSeries(derivedRows) {
    return derivedRows
        .filter(r => r.health_index !== undefined)
        .map(r => ({ t: new Date(r.timestamp_utc), v: r.health_index }));
}

function downsample(series, maxPoints = 90) {
    if (series.length <= maxPoints) return series;
    const step = Math.ceil(series.length / maxPoints);
    return series.filter((_, i) => i % step === 0);
}

/* ================================================================
   PDF DRAWING FUNCTIONS
   ================================================================ */

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

    if (title) {
        setFont(doc, 'regular');
        doc.fontSize(9).fillColor(COLORS.text).text(title, x, y, { width: w });
    }

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
            doc.moveTo(chartX, ty).lineTo(chartX + chartW, ty).stroke();
            doc.undash();
        }
    }
    if (thresholdCritical !== undefined) {
        const ty = chartY + chartH - ((thresholdCritical - yMin) / yRange) * chartH;
        if (ty >= chartY && ty <= chartY + chartH) {
            doc.strokeColor(COLORS.critical).lineWidth(0.5).dash(3, { space: 2 });
            doc.moveTo(chartX, ty).lineTo(chartX + chartW, ty).stroke();
            doc.undash();
        }
    }

    doc.strokeColor(color || COLORS.primary).lineWidth(1.5);
    let started = false;
    for (let i = 0; i < data.length; i++) {
        const px = chartX + (i / (data.length - 1)) * chartW;
        const py = chartY + chartH - ((data[i].v - yMin) / yRange) * chartH;
        if (!started) { doc.moveTo(px, py); started = true; }
        else doc.lineTo(px, py);
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

    // Header
    doc.rect(x, y, totalW, rowH).fill(COLORS.primary);
    setFont(doc, 'bold');
    doc.fontSize(8).fillColor(COLORS.white);
    const hdrs = [t.time, t.level, t.description, t.metric];
    let cx = x + 4;
    hdrs.forEach((h, i) => { doc.text(h, cx, y + 3, { width: colWidths[i] - 8 }); cx += colWidths[i]; });

    // Rows
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
        doc.text(a.title || a.message || '—', x + 194, ry + 3, { width: 236 });
        doc.text(a.metric || '—', x + 434, ry + 3, { width: 76 });
    });
    return y + rowH * (rows.length + 1) + 5;
}

/* ================================================================
   HEADER / FOOTER (language-aware)
   ================================================================ */

function addHeader(doc, role, locomotiveId, fromTs, lang) {
    const t = L[lang];
    // Blue band
    doc.rect(0, 0, doc.page.width, 62).fill(COLORS.primary);
    setFont(doc, 'bold');
    doc.fontSize(15).fillColor(COLORS.white).text(t.companyName, 40, 10);
    doc.fontSize(11).text(t.roles[role], 40, 30);
    // Language badge
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor('#ffffff99').text(t.langLabel, doc.page.width - 100, 48, { width: 55, align: 'right' });

    setFont(doc, 'regular');
    doc.fontSize(9).fillColor(COLORS.text);
    let y = 72;
    if (locomotiveId) { doc.text(`${t.locomotive}: ${locomotiveId}`, 40, y); y += 14; }
    const now = new Date();
    doc.text(`${t.period}: ${new Date(fromTs).toLocaleString('ru-RU')} — ${now.toLocaleString('ru-RU')}`, 40, y);
    y += 14;
    doc.text(`${t.generated}: ${now.toLocaleString('ru-RU')}`, 40, y);
    return y + 22;
}

function addFooter(doc, lang) {
    const t = L[lang];
    setFont(doc, 'regular');
    doc.fontSize(7).fillColor(COLORS.muted)
        .text(t.footer, 40, doc.page.height - 30, { width: doc.page.width - 80, align: 'center' });
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
            { key: 'traction_converter_temp_c', title: t.converterTemp, color: '#f97316', unit: '°C', thresholdWarning: 80, thresholdCritical: 100 },
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
   SECTION BUILDERS — draw one language section
   ================================================================ */

function drawDriverSection(doc, lang, locomotiveId, fromTs, derivedRows, normalizedRows, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'driver', locomotiveId, fromTs, lang);

    // Health gauge
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
    if (latest) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.healthIndex, 40, y);
        drawHealthGauge(doc, 40, y + 16, latest.health_index, latest.health_status);
        setFont(doc, 'regular');
        const avgH = derivedRows.reduce((s, r) => s + (r.health_index || 0), 0) / derivedRows.length;
        doc.fontSize(9).fillColor(COLORS.text);
        doc.text(`${t.avg}: ${Math.round(avgH * 10) / 10}`, 120, y + 30);
        doc.text(`${t.min}: ${Math.min(...derivedRows.map(r => r.health_index || 100))}`, 120, y + 44);
        doc.text(`${t.max}: ${Math.max(...derivedRows.map(r => r.health_index || 0))}`, 210, y + 44);
        y += 80;
    }

    // Health chart
    drawLineChart(doc, 40, y, 510, 110, extractHealthSeries(derivedRows), {
        title: t.health15min, color: COLORS.primary,
        minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData,
    });
    y += 125;

    // Speed
    drawLineChart(doc, 40, y, 510, 95, extractTimeSeries(normalizedRows, 'speed_kmh'), {
        title: t.speed, color: '#3b82f6', unit: 'km/h', minY: 0, noDataText: t.noData,
    });
    y += 110;

    // Brake pressure
    drawLineChart(doc, 40, y, 510, 95, extractTimeSeries(normalizedRows, 'brake_system_pressure_bar'), {
        title: t.brakePressure, color: '#f59e0b', unit: 'bar',
        minY: 0, maxY: 7, thresholdWarning: 4.0, thresholdCritical: 3.0, noDataText: t.noData,
    });
    y += 110;

    // Model-specific
    const model = normalizedRows[0]?.metrics?.locomotive_model;
    if (model === 'KZ8A') {
        drawLineChart(doc, 40, y, 510, 95, extractTimeSeries(normalizedRows, 'main_transformer_temp_c'), {
            title: t.transformerTemp, color: '#ef4444', unit: '°C',
            thresholdWarning: 90, thresholdCritical: 110, noDataText: t.noData,
        });
    } else {
        drawLineChart(doc, 40, y, 510, 95, extractTimeSeries(normalizedRows, 'engine_load_pct'), {
            title: t.engineLoad, color: '#ef4444', unit: '%',
            minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 95, noDataText: t.noData,
        });
    }
    y += 110;

    // Alerts
    if (alerts.length > 0 && y < 660) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alertsPeriod, 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, t, 6);
    }

    addFooter(doc, lang);
}

function drawDispatcherSection(doc, lang, locomotiveId, fromTs, derivedRows, normalizedRows, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'dispatcher', locomotiveId, fromTs, lang);

    // Health timeline
    drawLineChart(doc, 40, y, 510, 120, extractHealthSeries(derivedRows), {
        title: t.healthTimeline, color: COLORS.primary,
        minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData,
    });
    y += 135;

    // Speed
    drawLineChart(doc, 40, y, 510, 95, extractTimeSeries(normalizedRows, 'speed_kmh'), {
        title: t.speed, color: '#3b82f6', minY: 0, noDataText: t.noData,
    });
    y += 110;

    // Summary stats
    if (derivedRows.length > 0) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.summary, 40, y); y += 16;
        setFont(doc, 'regular');
        const avgH = derivedRows.reduce((s, r) => s + (r.health_index || 0), 0) / derivedRows.length;
        doc.fontSize(9).fillColor(COLORS.text);
        doc.text(`${t.avgHealth}: ${Math.round(avgH * 10) / 10}`, 40, y);
        doc.text(`${t.minimum}: ${Math.min(...derivedRows.map(r => r.health_index || 100))}`, 300, y);
        y += 14;
        doc.text(`${t.alertCount}: ${alerts.length}`, 40, y);
        doc.text(`${t.criticalCount}: ${alerts.filter(a => a.severity === 'critical').length}`, 300, y);
        y += 18;
    }

    // Risk factors
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
    if (latest?.payload?.top_factors?.length) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.riskFactors, 40, y); y += 16;
        setFont(doc, 'regular');
        for (const f of latest.payload.top_factors.slice(0, 5)) {
            doc.fontSize(8).fillColor(COLORS.text).text(`● ${f.name} — ${t.penalty}: ${f.impact}, ${f.detail}`, 50, y);
            y += 12;
        }
        y += 5;
    }

    // Alerts
    if (alerts.length > 0 && y < 620) {
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alertLog, 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, t, 8);
    }

    addFooter(doc, lang);
}

function drawEngineerSection(doc, lang, locomotiveId, fromTs, derivedRows, normalizedRows, alerts) {
    const t = L[lang];
    let y = addHeader(doc, 'engineer', locomotiveId, fromTs, lang);

    // Health
    drawLineChart(doc, 40, y, 510, 105, extractHealthSeries(derivedRows), {
        title: t.healthIndex, color: COLORS.primary,
        minY: 0, maxY: 100, thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData,
    });
    y += 118;

    // Speed
    drawLineChart(doc, 40, y, 510, 85, extractTimeSeries(normalizedRows, 'speed_kmh'), {
        title: t.speed, color: '#3b82f6', unit: 'km/h', minY: 0, noDataText: t.noData,
    });
    y += 100;

    // Brake
    drawLineChart(doc, 40, y, 510, 85, extractTimeSeries(normalizedRows, 'brake_system_pressure_bar'), {
        title: t.brakePressure, color: '#f59e0b', unit: 'bar',
        minY: 0, maxY: 7, thresholdWarning: 4.0, thresholdCritical: 3.0, noDataText: t.noData,
    });
    y += 100;

    // Model-specific on new page
    doc.addPage(); addFooter(doc, lang); y = 40;
    setFont(doc, 'bold');
    doc.fontSize(12).fillColor(COLORS.text).text(t.detailedTelemetry, 40, y); y += 20;

    const model = normalizedRows[0]?.metrics?.locomotive_model;
    const charts = getModelCharts(lang, model || 'KZ8A');
    for (const ch of charts) {
        if (y > 680) { doc.addPage(); addFooter(doc, lang); y = 40; }
        drawLineChart(doc, 40, y, 510, 85, extractTimeSeries(normalizedRows, ch.key), {
            ...ch, noDataText: t.noData,
        });
        y += 100;
    }

    // Alerts
    if (alerts.length > 0) {
        if (y > 580) { doc.addPage(); addFooter(doc, lang); y = 40; }
        setFont(doc, 'bold');
        doc.fontSize(11).fillColor(COLORS.text).text(t.alerts, 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, t, 12);
    }

    // Root cause
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
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
        const healthSeries = extractHealthSeries(loco.history);
        drawLineChart(doc, 40, y, 510, 95, healthSeries, {
            title: `${loco.locomotive_id} (${loco.model_code}) — ${t.healthIndex}`,
            color: COLORS.primary, minY: 0, maxY: 100,
            thresholdWarning: 85, thresholdCritical: 60, noDataText: t.noData,
        });
        y += 110;
    }

    addFooter(doc, lang);
}

/* ================================================================
   PDF BUILDERS — trilingual (KZ → RU → EN)
   ================================================================ */

function createDoc() {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    registerFonts(doc);
    return doc;
}

async function buildDriverPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId);
    const doc = createDoc();
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    for (let i = 0; i < LANG_ORDER.length; i++) {
        if (i > 0) doc.addPage();
        drawDriverSection(doc, LANG_ORDER[i], locomotiveId, fromTs, derivedRows, normalizedRows, alerts);
    }

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildDispatcherPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId);
    const doc = createDoc();
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    for (let i = 0; i < LANG_ORDER.length; i++) {
        if (i > 0) doc.addPage();
        drawDispatcherSection(doc, LANG_ORDER[i], locomotiveId, fromTs, derivedRows, normalizedRows, alerts);
    }

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildEngineerPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId);
    const doc = createDoc();
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    for (let i = 0; i < LANG_ORDER.length; i++) {
        if (i > 0) doc.addPage();
        drawEngineerSection(doc, LANG_ORDER[i], locomotiveId, fromTs, derivedRows, normalizedRows, alerts);
    }

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildSupervisorPdf() {
    const { fleet, fromTs } = await fetchFleetData();
    const doc = createDoc();
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    for (let i = 0; i < LANG_ORDER.length; i++) {
        if (i > 0) doc.addPage();
        drawSupervisorSection(doc, LANG_ORDER[i], fromTs, fleet);
    }

    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

/* ================================================================
   CSV GENERATION (Russian headers)
   ================================================================ */

function buildCsvForRole(role, normalizedRows, derivedRows, alerts) {
    const rows = [];

    if (role === 'driver') {
        rows.push(['Время', 'Скорость (км/ч)', 'Давление тормозов (бар)', 'Индекс здоровья', 'Статус здоровья'].join(';'));
        const derivedMap = new Map(derivedRows.map(d => [d.timestamp_utc, d]));
        for (const n of normalizedRows) {
            const d = derivedMap.get(n.timestamp_utc) || findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                m.speed_kmh ?? '', m.brake_system_pressure_bar ?? '',
                d?.health_index ?? '', d?.health_status ?? '',
            ].join(';'));
        }
    } else if (role === 'dispatcher') {
        rows.push(['Время', 'Скорость', 'ИЗ', 'Статус', 'Fault Code', 'Связь'].join(';'));
        for (const n of normalizedRows) {
            const d = findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                m.speed_kmh ?? '', d?.health_index ?? '', d?.health_status ?? '',
                m.fault_code ?? '', m.communication_status ?? '',
            ].join(';'));
        }
    } else if (role === 'engineer') {
        if (normalizedRows.length === 0) return 'Нет данных';
        const sampleMetrics = normalizedRows.find(r => r.metrics)?.metrics || {};
        const keys = Object.keys(sampleMetrics).sort();
        rows.push(['Время', 'ИЗ', 'Статус ИЗ', ...keys].join(';'));
        for (const n of normalizedRows) {
            const d = findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                d?.health_index ?? '', d?.health_status ?? '',
                ...keys.map(k => m[k] ?? ''),
            ].join(';'));
        }
    } else {
        rows.push(['Локомотив', 'Модель', 'Средний ИЗ', 'Кол-во алертов'].join(';'));
    }

    if (alerts.length > 0) {
        rows.push('');
        rows.push('--- АЛЕРТЫ ---');
        rows.push(['Время', 'Уровень', 'Описание', 'Метрика', 'Значение', 'Порог'].join(';'));
        for (const a of alerts) {
            const ts = a.created_at || a.timestamp_utc;
            rows.push([
                ts ? new Date(ts).toLocaleString('ru-RU') : '',
                a.severity ?? '', a.title ?? '', a.metric ?? '', a.value ?? '', a.threshold ?? '',
            ].join(';'));
        }
    }
    return '\uFEFF' + rows.join('\n');
}

async function buildCsv(locomotiveId, role) {
    if (role === 'supervisor') return buildSupervisorCsv();
    const { derivedRows, normalizedRows, alerts } = await fetchReportData(locomotiveId);
    return buildCsvForRole(role, normalizedRows, derivedRows, alerts);
}

async function buildSupervisorCsv() {
    const { fleet } = await fetchFleetData();
    const rows = ['Локомотив;Модель;Ср. индекс здоровья;Мин ИЗ;Макс ИЗ;Алертов'];
    for (const loco of fleet) {
        const healths = loco.history.map(r => r.health_index || 0);
        rows.push([
            loco.locomotive_id, loco.model_code, loco.avgHealth,
            healths.length > 0 ? Math.min(...healths) : '',
            healths.length > 0 ? Math.max(...healths) : '',
            loco.alertCount,
        ].join(';'));
    }
    return '\uFEFF' + rows.join('\n');
}

/* ================================================================
   HELPERS
   ================================================================ */

function findClosest(derivedRows, timestamp) {
    if (derivedRows.length === 0) return null;
    const t = new Date(timestamp).getTime();
    let best = derivedRows[0];
    let bestDist = Math.abs(new Date(best.timestamp_utc).getTime() - t);
    for (const r of derivedRows) {
        const dist = Math.abs(new Date(r.timestamp_utc).getTime() - t);
        if (dist < bestDist) { best = r; bestDist = dist; }
    }
    return bestDist < 10000 ? best : null;
}

/* ================================================================
   PUBLIC API
   ================================================================ */

async function generatePdf(locomotiveId, role) {
    switch (role) {
        case 'driver': return buildDriverPdf(locomotiveId);
        case 'dispatcher': return buildDispatcherPdf(locomotiveId);
        case 'engineer': return buildEngineerPdf(locomotiveId);
        case 'supervisor': return buildSupervisorPdf();
        default: throw new Error(`Unknown role: ${role}`);
    }
}

async function generateCsv(locomotiveId, role) {
    return buildCsv(locomotiveId, role);
}

module.exports = { generatePdf, generateCsv };
