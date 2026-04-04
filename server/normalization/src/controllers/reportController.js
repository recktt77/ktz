const { generatePdf, generateCsv } = require('../services/reportService');

const VALID_ROLES = new Set(['driver', 'dispatcher', 'engineer', 'supervisor']);

const reportController = {
    /**
     * GET /reports/pdf/:role/:locomotiveId
     * GET /reports/pdf/supervisor          (no locomotiveId needed)
     */
    async downloadPdf(req, res, next) {
        try {
            const { role, locomotiveId } = req.params;
            if (!VALID_ROLES.has(role)) {
                return res.status(400).json({ error: `Invalid role. Use: ${[...VALID_ROLES].join(', ')}` });
            }
            if (role !== 'supervisor' && !locomotiveId) {
                return res.status(400).json({ error: 'locomotiveId is required for this role' });
            }

            const buffer = await generatePdf(locomotiveId || null, role);
            const filename = role === 'supervisor'
                ? `fleet_report_${role}_${Date.now()}.pdf`
                : `report_${role}_${locomotiveId}_${Date.now()}.pdf`;

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });
            res.send(buffer);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /reports/csv/:role/:locomotiveId
     * GET /reports/csv/supervisor
     */
    async downloadCsv(req, res, next) {
        try {
            const { role, locomotiveId } = req.params;
            if (!VALID_ROLES.has(role)) {
                return res.status(400).json({ error: `Invalid role. Use: ${[...VALID_ROLES].join(', ')}` });
            }
            if (role !== 'supervisor' && !locomotiveId) {
                return res.status(400).json({ error: 'locomotiveId is required for this role' });
            }

            const csv = await generateCsv(locomotiveId || null, role);
            const filename = role === 'supervisor'
                ? `fleet_report_${role}_${Date.now()}.csv`
                : `report_${role}_${locomotiveId}_${Date.now()}.csv`;

            res.set({
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            });
            res.send(csv);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = reportController;
