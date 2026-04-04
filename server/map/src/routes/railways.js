const { Router } = require("express");
const ctrl = require("../controllers/railwayController");
const v = require("../validation/schemas");
const validate = require("../middleware/validate");

const router = Router();

router.get("/", ctrl.list);
router.get("/:id", [v.uuid("id"), validate], ctrl.getById);
router.post("/", [...v.railway.create, validate], ctrl.create);
router.patch("/:id", [...v.railway.update, validate], ctrl.update);
router.delete("/:id", [v.uuid("id"), validate], ctrl.remove);

module.exports = router;
