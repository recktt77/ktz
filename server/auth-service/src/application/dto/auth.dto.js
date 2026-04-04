const Joi = require('joi');

const RegisterDto = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    full_name: Joi.string().min(2).max(255).required(),
    invite_code: Joi.string().required(),
});

const LoginDto = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const RefreshDto = Joi.object({
    refresh_token: Joi.string().required(),
});

const UpdateProfileDto = Joi.object({
    full_name: Joi.string().min(2).max(255),
    phone: Joi.string().max(50).allow('', null),
}).min(1);

module.exports = { RegisterDto, LoginDto, RefreshDto, UpdateProfileDto };
