function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

        if (error) {
            const details = error.details.map((d) => ({
                field: d.path.join('.'),
                message: d.message,
            }));
            return res.status(400).json({ error: true, message: 'Validation failed', details });
        }

        req[source] = value;
        next();
    };
}

module.exports = validate;
