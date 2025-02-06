const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Define email options
    const mailOptions = {
        from: `Fish in the Pool <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, verificationUrl) => {
    const html = `
        <h1>Email Verification</h1>
        <p>Hi ${user.username},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>The verification link will expire in 24 hours.</p>
    `;

    await sendEmail({
        email: user.email,
        subject: 'Email Verification - Fish in the Pool',
        html
    });
};

const sendPasswordResetEmail = async (user, resetUrl) => {
    const html = `
        <h1>Password Reset</h1>
        <p>Hi ${user.username},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>The password reset link will expire in 1 hour.</p>
    `;

    await sendEmail({
        email: user.email,
        subject: 'Password Reset - Fish in the Pool',
        html
    });
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail
};
