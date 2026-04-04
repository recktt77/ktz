const Joi = require('joi');

const CreateInvitationDto = Joi.object({
    email: Joi.string().email().required(),
    role_id: Joi.string().uuid().required(),
    station_id: Joi.string().uuid().allow(null),
});

module.exports = { CreateInvitationDto };
