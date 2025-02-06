const nodemailer = require('nodemailer');
const { createTransport } = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

class EmailNotificationService {
    constructor() {
        this.transporter = createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async loadTemplate(templateName) {
        const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
        const template = await fs.readFile(templatePath, 'utf-8');
        return handlebars.compile(template);
    }

    async sendSecurityAlert(user, activity) {
        const template = await this.loadTemplate('security-alert');
        const html = template({
            username: user.username,
            activity: activity.action,
            device: activity.device,
            location: activity.location,
            time: new Date(activity.createdAt).toLocaleString(),
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Security Alert - Fish in the Pool',
            html
        });
    }

    async sendLoginNotification(user, session) {
        const template = await this.loadTemplate('login-notification');
        const html = template({
            username: user.username,
            device: session.device,
            location: session.location,
            time: new Date().toLocaleString(),
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'New Login Detected - Fish in the Pool',
            html
        });
    }

    async sendPasswordChangeNotification(user) {
        const template = await this.loadTemplate('password-change');
        const html = template({
            username: user.username,
            time: new Date().toLocaleString(),
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Password Changed - Fish in the Pool',
            html
        });
    }

    async sendAccountRecoveryCode(user, code) {
        const template = await this.loadTemplate('recovery-code');
        const html = template({
            username: user.username,
            code,
            expiresIn: '1 hour',
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Account Recovery Code - Fish in the Pool',
            html
        });
    }

    async sendDataExportNotification(user, downloadUrl) {
        const template = await this.loadTemplate('data-export');
        const html = template({
            username: user.username,
            downloadUrl,
            expiresIn: '24 hours',
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Your Data Export is Ready - Fish in the Pool',
            html
        });
    }

    async sendPrivacySettingsUpdate(user, changes) {
        const template = await this.loadTemplate('privacy-update');
        const html = template({
            username: user.username,
            changes,
            time: new Date().toLocaleString(),
            supportEmail: process.env.SUPPORT_EMAIL
        });

        await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Privacy Settings Updated - Fish in the Pool',
            html
        });
    }
}

module.exports = new EmailNotificationService();
