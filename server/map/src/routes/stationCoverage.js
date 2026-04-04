const { Router } = require("express");
const ctrl = require("../controllers/stationCoverageController");
const v = require("../validation/schemas");
const validate = require("../middleware/validate");

const router = Router();

router.get("/", ctrl.list);
router.post("/", [...v.stationCoverage.create, validate], ctrl.create);
router.delete("/:id", [v.uuid("id"), validate], ctrl.remove);

module.exports = router;
