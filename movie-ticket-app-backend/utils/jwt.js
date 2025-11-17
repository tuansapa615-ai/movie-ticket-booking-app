// utils/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
/**
 * Generates a JWT token.
 * @param {object} payload - The data to be encoded in the token (e.g., { userId: 1, role: 'customer' }).
 * @param {string} expiresIn - Token expiration time (e.g., '1h', '7d'). Defaults to '1h' from JWT_EXPIRES_IN if defined.
 * @returns {string} The generated JWT token.
 */
// const JWT_SECRET = process.env.JWT_SECRET;
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
export const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '1h') => {
    // Đảm bảo JWT_SECRET được lấy trực tiếp từ process.env
    if (!process.env.JWT_SECRET) {
        console.error("Lỗi: JWT_SECRET không được định nghĩa trong biến môi trường!");
        throw new Error("JWT_SECRET is not defined.");
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiresIn });
};
// function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
//     return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
// }
export const verifyToken = (token) => {
    // Đảm bảo JWT_SECRET được lấy trực tiếp từ process.env
    if (!process.env.JWT_SECRET) {
        console.error("Lỗi: JWT_SECRET không được định nghĩa trong biến môi trường!");
        return null; // Hoặc throw new Error("JWT_SECRET is not defined.");
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return null; // Token không hợp lệ hoặc đã hết hạn
    }
};

// function verifyToken(token) {
//     try {
//         return jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//         return null; // Token không hợp lệ hoặc đã hết hạn
//     }
// }

// export {
//     generateToken,
//     verifyToken
// };