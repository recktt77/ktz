const Joi = require('joi');

const UpdateUserDto = Joi.object({
    full_name: Joi.string().min(2).max(255),
    phone: Joi.string().max(50).allow('', null),
    station_id: Joi.string().uuid().allow(null),
    is_active: Joi.boolean(),
}).min(1);

const AssignRoleDto = Joi.object({
    role_id: Joi.string().uuid().required(),
});

module.exports = { UpdateUserDto, AssignRoleDto };
