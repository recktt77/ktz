const { Router } = require("express");
const ctrl = require("../controllers/mapController");
const v = require("../validation/schemas");
const validate = require("../middleware/validate");

const router = Router();

router.get("/overview", ctrl.overview);
router.get("/station/:stationId", [v.uuid("stationId"), validate], ctrl.byStation);
router.get("/segment/:segmentId", [v.uuid("segmentId"), validate], ctrl.bySegment);

module.exports = router;
