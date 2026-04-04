const { Router } = require('express');
const locomotiveController = require('../controllers/locomotiveController');
const { validate } = require('../middleware/validate');
const { createLocomotiveSchema, updateLocomotiveSchema } = require('../validators/schemas');

const router = Router();

router.get('/', locomotiveController.getAll);
router.get('/:id', locomotiveController.getById);
router.post('/', validate(createLocomotiveSchema), locomotiveController.create);
router.patch('/:id', validate(updateLocomotiveSchema), locomotiveController.update);
router.delete('/:id', locomotiveController.delete);

module.exports = router;
