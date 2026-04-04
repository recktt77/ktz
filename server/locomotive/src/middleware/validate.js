/**
 * Express middleware factory for Joi validation.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: false });
    if (error) {
      const details = error.details
        ? error.details.map(d => d.message)
        : [error.message];
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate };
