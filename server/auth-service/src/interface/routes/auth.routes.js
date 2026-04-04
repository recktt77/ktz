const { Router } = require('express');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../../infrastructure/middleware/authMiddleware');
const validate = require('../../infrastructure/middleware/validateDto');
const { RegisterDto, LoginDto, RefreshDto, UpdateProfileDto } = require('../../application/dto/auth.dto');

const router = Router();

// Public
router.post('/auth/register', validate(RegisterDto), AuthController.register);
router.post('/auth/login', validate(LoginDto), AuthController.login);
router.post('/auth/refresh', validate(RefreshDto), AuthController.refresh);

// Authenticated
router.post('/auth/logout', authMiddleware, AuthController.logout);
router.get('/auth/me', authMiddleware, AuthController.getMe);
router.patch('/auth/me', authMiddleware, validate(UpdateProfileDto), AuthController.updateProfile);

module.exports = router;
