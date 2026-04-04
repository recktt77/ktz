const { Router } = require("express");
const ctrl = require("../controllers/stationController");
const v = require("../validation/schemas");
const validate = require("../middleware/validate");

const router = Router();

router.get("/", [...v.listByRailway, validate], ctrl.list);
router.get("/:id", [v.uuid("id"), validate], ctrl.getById);
router.post("/", [...v.station.create, validate], ctrl.create);
router.patch("/:id", [...v.station.update, validate], ctrl.update);
router.delete("/:id", [v.uuid("id"), validate], ctrl.remove);

module.exports = router;
