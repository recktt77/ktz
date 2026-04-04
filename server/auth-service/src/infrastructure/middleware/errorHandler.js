function errorHandler(err, _req, res, _next) {
    console.error('Unhandled error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.expose ? err.message : 'Internal server error';

    res.status(statusCode).json({
        error: true,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
}

module.exports = errorHandler;
