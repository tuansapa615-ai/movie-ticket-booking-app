// utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(email, verificationLink) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Xác thực tài khoản của bạn',
        html: `
            <h1>Chào mừng bạn!</h1>
            <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấp vào liên kết dưới đây để xác thực email của bạn:</p>
            <a href="${verificationLink}">Xác thực Email</a>
            <p>Liên kết này sẽ hết hạn sau một thời gian ngắn.</p>
            <p>Trân trọng,</p>
            <p>Đội ngũ của chúng tôi</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending verification email to ${email}:`, error);
        throw new Error('Failed to send verification email.');
    }
}

async function sendTemporaryPasswordEmail(email, temporaryPassword) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Mật khẩu tạm thời của bạn để truy cập tài khoản',
        html: `
            <h1>Mật khẩu tạm thời của bạn</h1>
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Dưới đây là mật khẩu tạm thời của bạn:</p>
            <p style="font-size: 20px; font-weight: bold; color: #007bff;">${temporaryPassword}</p>
            <p>Vui lòng sử dụng mật khẩu này để đăng nhập. Để đảm bảo an toàn cho tài khoản, chúng tôi **khuyên bạn nên đổi mật khẩu ngay lập tức** sau khi đăng nhập thành công.</p>
            <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
            <p>Trân trọng,</p>
            <p>Đội ngũ của chúng tôi</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Temporary password email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending temporary password email to ${email}:`, error);
        throw new Error('Failed to send temporary password email.');
    }
}

export {
    sendVerificationEmail,
    sendTemporaryPasswordEmail
};