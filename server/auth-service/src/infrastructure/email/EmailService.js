const nodemailer = require('nodemailer');
const config = require('../../config');

let transporter = null;

function getTransporter() {
    if (!transporter) {
        if (!config.smtp.user || !config.smtp.pass) {
            console.warn('SMTP credentials not configured — emails will be logged to console');
            return null;
        }
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
    }
    return transporter;
}

async function sendInvitation(email, inviteCode, roleName) {
    const registrationUrl = `${config.frontendUrl}/register?code=${inviteCode}`;

    const subject = 'Приглашение в систему «Цифровой двойник локомотива»';
    const html = `
    <h2>Вас пригласили в систему мониторинга локомотивов</h2>
    <p>Роль: <strong>${roleName}</strong></p>
    <p>Для завершения регистрации перейдите по ссылке:</p>
    <p><a href="${registrationUrl}">${registrationUrl}</a></p>
    <p>Код приглашения: <strong>${inviteCode}</strong></p>
    <p>Ссылка действительна 72 часа.</p>
  `;

    const transport = getTransporter();
    if (!transport) {
        console.log('===== EMAIL (console fallback) =====');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Invite code: ${inviteCode}`);
        console.log(`Registration URL: ${registrationUrl}`);
        console.log('====================================');
        return;
    }

    await transport.sendMail({
        from: `"Locomotive Twin" <${config.smtp.user}>`,
        to: email,
        subject,
        html,
    });
}

module.exports = { sendInvitation };
