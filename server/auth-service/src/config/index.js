require('dotenv').config();

const config = {
    port: parseInt(process.env.PORT, 10) || 8081,

    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        name: process.env.DB_NAME || 'auth_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-me',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    },

    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3002',

    admin: {
        email: process.env.ADMIN_EMAIL || '',
        password: process.env.ADMIN_PASSWORD || '',
    },

    cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost:3002')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
    },
};

module.exports = config;
