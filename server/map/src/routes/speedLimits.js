const { Router } = require("express");
const ctrl = require("../controllers/speedLimitController");
const v = require("../validation/schemas");
const validate = require("../middleware/validate");

const router = Router();

router.get("/", [...v.listBySegment, validate], ctrl.list);
router.post("/", [...v.speedLimit.create, validate], ctrl.create);
router.delete("/:id", [v.uuid("id"), validate], ctrl.remove);

module.exports = router;
