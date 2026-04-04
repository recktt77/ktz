/**
 * Report Service — generates PDF and CSV reports with 15-minute telemetry data.
 *
 * Reports are role-specific:
 *   - driver:     speed, brakes, traction, model-specific gauges
 *   - dispatcher: health timeline + alerts + risk factors
 *   - engineer:   full technical telemetry + health breakdown
 *   - supervisor: fleet overview + per-loco KPIs
 */

const PDFDocument = require('pdfkit');
const healthRepo = require('../models/healthRepo');
const { query } = require('../db/pool');

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

const ROLE_TITLES = {
    driver: 'Отчёт машиниста',
    dispatcher: 'Отчёт диспетчера',
    engineer: 'Инженерный отчёт',
    supervisor: 'Отчёт руководителя',
};

/* ================================================================
   DATA FETCHING
   ================================================================ */

async function fetchReportData(locomotiveId, role) {
    const fromTs = new Date(Date.now() - REPORT_MINUTES * 60 * 1000).toISOString();

    // Fetch derived metrics (contains health_index, health_status, payload with full processed data)
    const derivedRows = await healthRepo.findDerivedHistory(locomotiveId, {
        from: fromTs,
        limit: REPORT_MINUTES * 60, // ~1 per second
    });
    derivedRows.reverse(); // chronological order

    // Fetch normalized telemetry from DB
    const { rows: normalizedRows } = await query(
        `SELECT * FROM telemetry_normalized
     WHERE locomotive_id = $1 AND timestamp_utc >= $2
     ORDER BY timestamp_utc ASC
     LIMIT $3`,
        [locomotiveId, fromTs, REPORT_MINUTES * 60]
    );

    // Fetch alerts within the window
    let alerts = [];
    try {
        const { rows: alertRows } = await query(
            `SELECT * FROM alerts
       WHERE locomotive_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
            [locomotiveId, fromTs]
        );
        alerts = alertRows;
    } catch (_) {
        // alerts table may not exist yet — proceed without
    }

    return { derivedRows, normalizedRows, alerts, fromTs };
}

async function fetchFleetData() {
    const fromTs = new Date(Date.now() - REPORT_MINUTES * 60 * 1000).toISOString();

    // Get all locomotiveIds from recent data
    const { rows: locoRows } = await query(
        `SELECT DISTINCT locomotive_id, model_code
     FROM derived_metrics
     WHERE timestamp_utc >= $1`,
        [fromTs]
    );

    const fleet = [];
    for (const { locomotive_id, model_code } of locoRows) {
        const derived = await healthRepo.findDerivedHistory(locomotive_id, {
            from: fromTs,
            limit: REPORT_MINUTES * 60,
        });
        derived.reverse();

        const latestHealth = derived.length > 0 ? derived[derived.length - 1] : null;
        const avgHealth = derived.length > 0
            ? derived.reduce((s, r) => s + (r.health_index || 0), 0) / derived.length
            : 0;

        const { rows: alertRows } = await query(
            `SELECT * FROM alerts
       WHERE locomotive_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
            [locomotive_id, fromTs]
        );

        fleet.push({
            locomotive_id,
            model_code,
            latest: latestHealth,
            avgHealth: Math.round(avgHealth * 10) / 10,
            alertCount: alertRows.length,
            alerts: alertRows.slice(0, 5),
            history: derived,
        });
    }

    return { fleet, fromTs };
}

/* ================================================================
   METRIC EXTRACTION HELPERS
   ================================================================ */

function extractTimeSeries(normalizedRows, key) {
    return normalizedRows
        .filter(r => r.metrics && r.metrics[key] !== undefined)
        .map(r => ({
            t: new Date(r.timestamp_utc),
            v: r.metrics[key],
        }));
}

function extractHealthSeries(derivedRows) {
    return derivedRows
        .filter(r => r.health_index !== undefined)
        .map(r => ({
            t: new Date(r.timestamp_utc),
            v: r.health_index,
        }));
}

function downsample(series, maxPoints = 90) {
    if (series.length <= maxPoints) return series;
    const step = Math.ceil(series.length / maxPoints);
    return series.filter((_, i) => i % step === 0);
}

/* ================================================================
   PDF CHART DRAWING (pdfkit native — no external chart lib)
   ================================================================ */

function drawLineChart(doc, x, y, w, h, series, { title, unit, color, minY, maxY, thresholdWarning, thresholdCritical } = {}) {
    if (!series || series.length < 2) {
        doc.fontSize(9).fillColor(COLORS.muted).text('Нет данных', x, y + h / 2 - 5, { width: w, align: 'center' });
        return;
    }

    const data = downsample(series);
    const values = data.map(d => d.v);
    const yMin = minY !== undefined ? minY : Math.min(...values) - 1;
    const yMax = maxY !== undefined ? maxY : Math.max(...values) + 1;
    const yRange = yMax - yMin || 1;

    const chartX = x + 40;
    const chartW = w - 50;
    const chartY = y + 18;
    const chartH = h - 35;

    // Title
    if (title) {
        doc.fontSize(9).fillColor(COLORS.text).text(title, x, y, { width: w });
    }

    // Background
    doc.save();
    doc.rect(chartX, chartY, chartW, chartH).fill(COLORS.bg);

    // Grid lines + Y labels
    doc.strokeColor(COLORS.line).lineWidth(0.3);
    for (let i = 0; i <= 4; i++) {
        const gy = chartY + (chartH / 4) * i;
        doc.moveTo(chartX, gy).lineTo(chartX + chartW, gy).stroke();
        const label = Math.round((yMax - (yRange / 4) * i) * 10) / 10;
        doc.fontSize(7).fillColor(COLORS.muted).text(String(label), x, gy - 4, { width: 36, align: 'right' });
    }

    // Threshold lines
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

    // Data line
    doc.strokeColor(color || COLORS.primary).lineWidth(1.5);
    let started = false;
    for (let i = 0; i < data.length; i++) {
        const px = chartX + (i / (data.length - 1)) * chartW;
        const py = chartY + chartH - ((data[i].v - yMin) / yRange) * chartH;
        if (!started) { doc.moveTo(px, py); started = true; }
        else doc.lineTo(px, py);
    }
    doc.stroke();

    // X labels (start / middle / end)
    const fmt = d => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    doc.fontSize(7).fillColor(COLORS.muted);
    doc.text(fmt(data[0].t), chartX, chartY + chartH + 3, { width: 40 });
    doc.text(fmt(data[data.length - 1].t), chartX + chartW - 40, chartY + chartH + 3, { width: 40, align: 'right' });
    if (data.length > 2) {
        const mid = Math.floor(data.length / 2);
        doc.text(fmt(data[mid].t), chartX + chartW / 2 - 20, chartY + chartH + 3, { width: 40, align: 'center' });
    }

    // Unit
    if (unit) {
        doc.fontSize(7).fillColor(COLORS.muted).text(unit, chartX + chartW + 3, chartY, { width: 30 });
    }

    doc.restore();
}

function drawHealthGauge(doc, x, y, value, status) {
    const color = status === 'Critical' ? COLORS.critical : status === 'Warning' ? COLORS.warning : COLORS.good;
    // Circle background
    doc.circle(x + 30, y + 30, 28).fill('#f3f4f6');
    // Arc
    const angle = (value / 100) * 360;
    doc.circle(x + 30, y + 30, 28).lineWidth(5).strokeColor(color).stroke();
    // Value
    doc.fontSize(18).fillColor(color).text(String(Math.round(value)), x, y + 18, { width: 60, align: 'center' });
    doc.fontSize(7).fillColor(COLORS.muted).text(status, x, y + 42, { width: 60, align: 'center' });
}

function drawAlertTable(doc, x, y, alerts, maxRows = 8) {
    const colWidths = [130, 60, 240, 80];
    const rowH = 14;

    // Header
    doc.fontSize(8).fillColor(COLORS.white);
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill(COLORS.primary);
    doc.fillColor(COLORS.white);
    let cx = x + 4;
    for (const h of ['Время', 'Уровень', 'Описание', 'Метрика']) {
        doc.text(h, cx, y + 3, { width: colWidths.shift() - 8 });
        cx += (colWidths.length > 0 ? [130, 60, 240, 80][[130, 60, 240, 80].length - colWidths.length - 1] : 80);
    }

    // Rows
    const rows = (alerts || []).slice(0, maxRows);
    rows.forEach((a, i) => {
        const ry = y + rowH * (i + 1);
        const bg = i % 2 === 0 ? COLORS.bg : COLORS.white;
        doc.rect(x, ry, 510, rowH).fill(bg);
        doc.fontSize(7).fillColor(COLORS.text);
        const ts = a.created_at || a.timestamp_utc;
        const time = ts ? new Date(ts).toLocaleTimeString('ru-RU') : '—';
        doc.text(time, x + 4, ry + 3, { width: 126 });
        doc.fillColor(a.severity === 'critical' ? COLORS.critical : a.severity === 'warning' ? COLORS.warning : COLORS.muted);
        doc.text(a.severity || '—', x + 134, ry + 3, { width: 56 });
        doc.fillColor(COLORS.text);
        doc.text(a.title || a.message || '—', x + 194, ry + 3, { width: 236 });
        doc.text(a.metric || '—', x + 434, ry + 3, { width: 76 });
    });
    return y + rowH * (rows.length + 1) + 5;
}

/* ================================================================
   PDF HEADER / FOOTER
   ================================================================ */

function addHeader(doc, title, locomotiveId, fromTs) {
    // Header band
    doc.rect(0, 0, doc.page.width, 60).fill(COLORS.primary);
    doc.fontSize(16).fillColor(COLORS.white).text('ҚТЖ — Realtime Monitoring', 40, 12);
    doc.fontSize(11).text(title, 40, 32);

    doc.fontSize(9).fillColor(COLORS.text);
    const metaY = 70;
    if (locomotiveId) {
        doc.text(`Локомотив: ${locomotiveId}`, 40, metaY);
    }
    const now = new Date();
    doc.text(`Период: ${new Date(fromTs).toLocaleString('ru-RU')} — ${now.toLocaleString('ru-RU')}`, 40, metaY + 14);
    doc.text(`Сгенерировано: ${now.toLocaleString('ru-RU')}`, 40, metaY + 28);

    return metaY + 48;
}

function addFooter(doc) {
    const bottom = doc.page.height - 30;
    doc.fontSize(7).fillColor(COLORS.muted)
        .text('АО «НК «Қазақстан темір жолы» — автоматически сгенерированный отчёт', 40, bottom, { width: doc.page.width - 80, align: 'center' });
}

/* ================================================================
   ROLE-SPECIFIC PDF BUILDERS
   ================================================================ */

async function buildDriverPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId, 'driver');
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    let y = addHeader(doc, ROLE_TITLES.driver, locomotiveId, fromTs);

    // Health gauge
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
    if (latest) {
        doc.fontSize(11).fillColor(COLORS.text).text('Индекс здоровья', 40, y);
        drawHealthGauge(doc, 40, y + 16, latest.health_index, latest.health_status);
        const avgHealth = derivedRows.reduce((s, r) => s + (r.health_index || 0), 0) / derivedRows.length;
        doc.fontSize(9).fillColor(COLORS.text).text(`Средний: ${Math.round(avgHealth * 10) / 10}`, 120, y + 30);
        doc.text(`Мин: ${Math.min(...derivedRows.map(r => r.health_index || 100))}`, 120, y + 44);
        doc.text(`Макс: ${Math.max(...derivedRows.map(r => r.health_index || 0))}`, 200, y + 44);
        y += 80;
    }

    // Health index chart
    const healthSeries = extractHealthSeries(derivedRows);
    drawLineChart(doc, 40, y, 510, 120, healthSeries, {
        title: 'Индекс здоровья (15 мин)',
        color: COLORS.primary,
        minY: 0, maxY: 100,
        thresholdWarning: 85,
        thresholdCritical: 60,
    });
    y += 135;

    // Speed chart
    const speedSeries = extractTimeSeries(normalizedRows, 'speed_kmh');
    drawLineChart(doc, 40, y, 510, 100, speedSeries, {
        title: 'Скорость (км/ч)',
        unit: 'км/ч',
        color: '#3b82f6',
        minY: 0,
    });
    y += 115;

    // Brake pressure chart
    const brakeSeries = extractTimeSeries(normalizedRows, 'brake_system_pressure_bar');
    drawLineChart(doc, 40, y, 510, 100, brakeSeries, {
        title: 'Давление тормозов (бар)',
        unit: 'бар',
        color: '#f59e0b',
        minY: 0, maxY: 7,
        thresholdWarning: 4.0,
        thresholdCritical: 3.0,
    });
    y += 115;

    // Model-specific chart
    const model = normalizedRows.length > 0 ? normalizedRows[0].metrics?.locomotive_model : null;
    if (model === 'KZ8A') {
        const tSeries = extractTimeSeries(normalizedRows, 'main_transformer_temp_c');
        drawLineChart(doc, 40, y, 510, 100, tSeries, {
            title: 'Температура трансформатора (°C)',
            unit: '°C',
            color: '#ef4444',
            thresholdWarning: 90, thresholdCritical: 110,
        });
    } else {
        const eSeries = extractTimeSeries(normalizedRows, 'engine_load_pct');
        drawLineChart(doc, 40, y, 510, 100, eSeries, {
            title: 'Нагрузка двигателя (%)',
            unit: '%',
            color: '#ef4444',
            minY: 0, maxY: 100,
            thresholdWarning: 85, thresholdCritical: 95,
        });
    }
    y += 115;

    // Alerts
    if (alerts.length > 0) {
        if (y > 650) { doc.addPage(); y = 40; }
        doc.fontSize(11).fillColor(COLORS.text).text('Алерты за период', 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, 10);
    }

    addFooter(doc);
    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildDispatcherPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId, 'dispatcher');
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    let y = addHeader(doc, ROLE_TITLES.dispatcher, locomotiveId, fromTs);

    // Health timeline
    const healthSeries = extractHealthSeries(derivedRows);
    drawLineChart(doc, 40, y, 510, 130, healthSeries, {
        title: 'Индекс здоровья — таймлайн',
        color: COLORS.primary,
        minY: 0, maxY: 100,
        thresholdWarning: 85, thresholdCritical: 60,
    });
    y += 145;

    // Speed
    const speedSeries = extractTimeSeries(normalizedRows, 'speed_kmh');
    drawLineChart(doc, 40, y, 510, 100, speedSeries, {
        title: 'Скорость (км/ч)',
        color: '#3b82f6', minY: 0,
    });
    y += 115;

    // Summary stats
    if (derivedRows.length > 0) {
        doc.fontSize(11).fillColor(COLORS.text).text('Сводка', 40, y);
        y += 16;
        const avgH = derivedRows.reduce((s, r) => s + (r.health_index || 0), 0) / derivedRows.length;
        const minH = Math.min(...derivedRows.map(r => r.health_index || 100));
        doc.fontSize(9).fillColor(COLORS.text);
        doc.text(`Средний индекс здоровья: ${Math.round(avgH * 10) / 10}`, 40, y);
        doc.text(`Минимальный: ${minH}`, 280, y);
        y += 14;
        doc.text(`Количество алертов: ${alerts.length}`, 40, y);
        doc.text(`Критических: ${alerts.filter(a => a.severity === 'critical').length}`, 280, y);
        y += 20;
    }

    // Risk factors from latest
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
    if (latest?.payload?.top_factors?.length) {
        doc.fontSize(11).fillColor(COLORS.text).text('Факторы риска', 40, y);
        y += 16;
        for (const f of latest.payload.top_factors.slice(0, 5)) {
            doc.fontSize(8).fillColor(COLORS.text);
            doc.text(`● ${f.name} — штраф: ${f.impact}, ${f.detail}`, 50, y);
            y += 12;
        }
        y += 5;
    }

    // Alerts table
    if (alerts.length > 0) {
        if (y > 600) { doc.addPage(); y = 40; }
        doc.fontSize(11).fillColor(COLORS.text).text('Журнал алертов', 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, 12);
    }

    addFooter(doc);
    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildEngineerPdf(locomotiveId) {
    const { derivedRows, normalizedRows, alerts, fromTs } = await fetchReportData(locomotiveId, 'engineer');
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    let y = addHeader(doc, ROLE_TITLES.engineer, locomotiveId, fromTs);

    // Health timeline
    const healthSeries = extractHealthSeries(derivedRows);
    drawLineChart(doc, 40, y, 510, 110, healthSeries, {
        title: 'Индекс здоровья',
        color: COLORS.primary, minY: 0, maxY: 100,
        thresholdWarning: 85, thresholdCritical: 60,
    });
    y += 125;

    // Detect model
    const model = normalizedRows.length > 0 ? normalizedRows[0].metrics?.locomotive_model : null;

    // Full technical charts
    const charts = model === 'KZ8A' ? [
        { key: 'main_transformer_temp_c', title: 'Трансформатор (°C)', color: '#ef4444', unit: '°C', tw: 90, tc: 110 },
        { key: 'main_transformer_load_pct', title: 'Нагрузка трансф. (%)', color: '#f59e0b', unit: '%', minY: 0, maxY: 100 },
        { key: 'traction_converter_temp_c', title: 'Преобразователь (°C)', color: '#f97316', unit: '°C', tw: 80, tc: 100 },
        { key: 'catenary_voltage_kv', title: 'Напряжение КС (кВ)', color: '#6366f1', unit: 'кВ' },
        { key: 'catenary_current_a', title: 'Ток КС (А)', color: '#8b5cf6', unit: 'А' },
        { key: 'energy_consumption_kw', title: 'Энергопотребление (кВт)', color: '#10b981', unit: 'кВт' },
    ] : [
        { key: 'engine_rpm', title: 'Обороты двигателя (RPM)', color: '#ef4444', unit: 'об/мин' },
        { key: 'engine_load_pct', title: 'Нагрузка двигателя (%)', color: '#f59e0b', unit: '%', minY: 0, maxY: 100, tw: 85, tc: 95 },
        { key: 'fuel_level_pct', title: 'Уровень топлива (%)', color: '#3b82f6', unit: '%', minY: 0, maxY: 100 },
        { key: 'fuel_consumption_lph', title: 'Расход топлива (л/ч)', color: '#10b981', unit: 'л/ч' },
    ];

    // Speed first
    const speedSeries = extractTimeSeries(normalizedRows, 'speed_kmh');
    drawLineChart(doc, 40, y, 510, 90, speedSeries, {
        title: 'Скорость (км/ч)', color: '#3b82f6', unit: 'км/ч', minY: 0,
    });
    y += 105;

    // Brake pressure
    const brakeSeries = extractTimeSeries(normalizedRows, 'brake_system_pressure_bar');
    drawLineChart(doc, 40, y, 510, 90, brakeSeries, {
        title: 'Давление тормозов (бар)', color: '#f59e0b', unit: 'бар',
        minY: 0, maxY: 7, thresholdWarning: 4.0, thresholdCritical: 3.0,
    });
    y += 105;

    // New page for model-specific charts
    doc.addPage();
    addFooter(doc);
    y = 40;

    doc.fontSize(12).fillColor(COLORS.text).text('Детальная телеметрия', 40, y);
    y += 20;

    for (const ch of charts) {
        if (y > 680) { doc.addPage(); addFooter(doc); y = 40; }
        const series = extractTimeSeries(normalizedRows, ch.key);
        drawLineChart(doc, 40, y, 510, 90, series, {
            title: ch.title,
            color: ch.color,
            unit: ch.unit,
            minY: ch.minY,
            maxY: ch.maxY,
            thresholdWarning: ch.tw,
            thresholdCritical: ch.tc,
        });
        y += 105;
    }

    // Alerts
    if (alerts.length > 0) {
        if (y > 600) { doc.addPage(); addFooter(doc); y = 40; }
        doc.fontSize(11).fillColor(COLORS.text).text('Алерты (инженерный)', 40, y);
        y = drawAlertTable(doc, 40, y + 16, alerts, 15);
    }

    // Root cause candidates
    const latest = derivedRows.length > 0 ? derivedRows[derivedRows.length - 1] : null;
    if (latest?.payload?.root_cause_candidates?.length) {
        if (y > 680) { doc.addPage(); addFooter(doc); y = 40; }
        doc.fontSize(11).fillColor(COLORS.text).text('Возможные причины', 40, y);
        y += 16;
        for (const rc of latest.payload.root_cause_candidates) {
            doc.fontSize(8).fillColor(COLORS.text).text(`● ${rc}`, 50, y);
            y += 12;
        }
    }

    addFooter(doc);
    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

async function buildSupervisorPdf() {
    const { fleet, fromTs } = await fetchFleetData();
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    let y = addHeader(doc, ROLE_TITLES.supervisor, null, fromTs);

    // Fleet summary table
    doc.fontSize(11).fillColor(COLORS.text).text('Общий обзор флота', 40, y);
    y += 18;

    const cols = [120, 80, 100, 80, 130];
    const headers = ['Локомотив', 'Модель', 'Средний ИЗ', 'Алерты', 'Статус'];

    // Table header
    doc.rect(40, y, cols.reduce((a, b) => a + b, 0), 16).fill(COLORS.primary);
    doc.fontSize(8).fillColor(COLORS.white);
    let cx = 44;
    headers.forEach((h, i) => { doc.text(h, cx, y + 4, { width: cols[i] - 8 }); cx += cols[i]; });
    y += 16;

    // Table rows
    for (const loco of fleet) {
        const bg = fleet.indexOf(loco) % 2 === 0 ? COLORS.bg : COLORS.white;
        doc.rect(40, y, cols.reduce((a, b) => a + b, 0), 16).fill(bg);
        doc.fontSize(8).fillColor(COLORS.text);
        cx = 44;
        const statusStr = loco.avgHealth >= 85 ? 'В норме' : loco.avgHealth >= 60 ? 'Внимание' : 'Критично';
        const statusColor = loco.avgHealth >= 85 ? COLORS.good : loco.avgHealth >= 60 ? COLORS.warning : COLORS.critical;
        doc.text(loco.locomotive_id, cx, y + 4, { width: cols[0] - 8 }); cx += cols[0];
        doc.text(loco.model_code, cx, y + 4, { width: cols[1] - 8 }); cx += cols[1];
        doc.text(String(loco.avgHealth), cx, y + 4, { width: cols[2] - 8 }); cx += cols[2];
        doc.text(String(loco.alertCount), cx, y + 4, { width: cols[3] - 8 }); cx += cols[3];
        doc.fillColor(statusColor).text(statusStr, cx, y + 4, { width: cols[4] - 8 });
        y += 16;
    }
    y += 15;

    // Per-locomotive health charts
    for (const loco of fleet) {
        if (y > 600) { doc.addPage(); addFooter(doc); y = 40; }
        const healthSeries = extractHealthSeries(loco.history);
        drawLineChart(doc, 40, y, 510, 100, healthSeries, {
            title: `${loco.locomotive_id} (${loco.model_code}) — Индекс здоровья`,
            color: COLORS.primary, minY: 0, maxY: 100,
            thresholdWarning: 85, thresholdCritical: 60,
        });
        y += 115;
    }

    addFooter(doc);
    doc.end();
    return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

/* ================================================================
   CSV GENERATION
   ================================================================ */

function buildCsvForRole(role, normalizedRows, derivedRows, alerts) {
    const rows = [];

    if (role === 'driver') {
        rows.push(['Время', 'Скорость (км/ч)', 'Давление тормозов (бар)', 'Индекс здоровья', 'Статус здоровья'].join(';'));
        // Merge normalized + derived by timestamp alignment
        const derivedMap = new Map(derivedRows.map(d => [d.timestamp_utc, d]));
        for (const n of normalizedRows) {
            const d = derivedMap.get(n.timestamp_utc) || findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                m.speed_kmh ?? '',
                m.brake_system_pressure_bar ?? '',
                d?.health_index ?? '',
                d?.health_status ?? '',
            ].join(';'));
        }
    } else if (role === 'dispatcher') {
        rows.push(['Время', 'Скорость', 'ИЗ', 'Статус', 'Fault Code', 'Связь'].join(';'));
        for (const n of normalizedRows) {
            const d = findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                m.speed_kmh ?? '',
                d?.health_index ?? '',
                d?.health_status ?? '',
                m.fault_code ?? '',
                m.communication_status ?? '',
            ].join(';'));
        }
    } else if (role === 'engineer') {
        // Full telemetry dump
        if (normalizedRows.length === 0) {
            rows.push('Нет данных');
            return rows.join('\n');
        }
        const sampleMetrics = normalizedRows.find(r => r.metrics)?.metrics || {};
        const keys = Object.keys(sampleMetrics).sort();
        rows.push(['Время', 'ИЗ', 'Статус ИЗ', ...keys].join(';'));
        for (const n of normalizedRows) {
            const d = findClosest(derivedRows, n.timestamp_utc);
            const m = n.metrics || {};
            rows.push([
                new Date(n.timestamp_utc).toLocaleString('ru-RU'),
                d?.health_index ?? '',
                d?.health_status ?? '',
                ...keys.map(k => m[k] ?? ''),
            ].join(';'));
        }
    } else {
        // supervisor — fleet summary (built separately)
        rows.push(['Локомотив', 'Модель', 'Средний ИЗ', 'Кол-во алертов'].join(';'));
    }

    // Alerts section
    if (alerts.length > 0) {
        rows.push('');
        rows.push('--- АЛЕРТЫ ---');
        rows.push(['Время', 'Уровень', 'Описание', 'Метрика', 'Значение', 'Порог'].join(';'));
        for (const a of alerts) {
            const ts = a.created_at || a.timestamp_utc;
            rows.push([
                ts ? new Date(ts).toLocaleString('ru-RU') : '',
                a.severity ?? '',
                a.title ?? '',
                a.metric ?? '',
                a.value ?? '',
                a.threshold ?? '',
            ].join(';'));
        }
    }

    return '\uFEFF' + rows.join('\n'); // BOM for Excel compatibility
}

async function buildCsv(locomotiveId, role) {
    if (role === 'supervisor') {
        return buildSupervisorCsv();
    }

    const { derivedRows, normalizedRows, alerts } = await fetchReportData(locomotiveId, role);
    return buildCsvForRole(role, normalizedRows, derivedRows, alerts);
}

async function buildSupervisorCsv() {
    const { fleet } = await fetchFleetData();
    const rows = [];
    rows.push(['Локомотив', 'Модель', 'Ср. индекс здоровья', 'Мин ИЗ', 'Макс ИЗ', 'Алертов'].join(';'));
    for (const loco of fleet) {
        const healths = loco.history.map(r => r.health_index || 0);
        rows.push([
            loco.locomotive_id,
            loco.model_code,
            loco.avgHealth,
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
    return bestDist < 10000 ? best : null; // within 10 seconds
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
