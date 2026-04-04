const { getLocomotiveSnapshot, buildFleetSummary } = require('../services/pipeline');
const { buildDriverView, buildDispatcherView, buildEngineerView } = require('../services/roleViewBuilder');

const roleViewController = {
  /**
   * GET /role-view/driver/:locomotiveId
   */
  async driverView(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const state = getLocomotiveSnapshot(locomotiveId);
      if (!state?.normalized || !state?.processed) {
        return res.status(404).json({ error: 'No data for this locomotive' });
      }
      const view = buildDriverView(state.normalized, state.processed);
      res.json(view);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /role-view/dispatcher/:locomotiveId
   */
  async dispatcherView(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const state = getLocomotiveSnapshot(locomotiveId);
      if (!state?.normalized || !state?.processed) {
        return res.status(404).json({ error: 'No data for this locomotive' });
      }
      const view = buildDispatcherView(state.normalized, state.processed, null);
      res.json(view);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /role-view/engineer/:locomotiveId
   */
  async engineerView(req, res, next) {
    try {
      const { locomotiveId } = req.params;
      const state = getLocomotiveSnapshot(locomotiveId);
      if (!state?.normalized || !state?.processed) {
        return res.status(404).json({ error: 'No data for this locomotive' });
      }
      const view = buildEngineerView(state.normalized, state.processed);
      res.json(view);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /role-view/supervisor — fleet overview (no locomotiveId)
   */
  async supervisorView(req, res, next) {
    try {
      const fleet = buildFleetSummary();
      res.json({
        role: 'supervisor',
        fleet_count: fleet.length,
        fleet,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = roleViewController;
