const { Router } = require('express');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../../infrastructure/middleware/authMiddleware');
const requireRole = require('../../infrastructure/middleware/roleMiddleware');
const validate = require('../../infrastructure/middleware/validateDto');
const { UpdateUserDto, AssignRoleDto } = require('../../application/dto/user.dto');

const router = Router();

router.get('/users', authMiddleware, requireRole('admin'), UserController.getAll);
router.get('/users/:id', authMiddleware, requireRole('admin'), UserController.getById);
router.patch('/users/:id', authMiddleware, requireRole('admin'), validate(UpdateUserDto), UserController.update);
router.delete('/users/:id', authMiddleware, requireRole('admin'), UserController.delete);

router.post('/users/:id/roles', authMiddleware, requireRole('admin'), validate(AssignRoleDto), UserController.assignRole);
router.delete('/users/:id/roles/:roleId', authMiddleware, requireRole('admin'), UserController.removeRole);

module.exports = router;
