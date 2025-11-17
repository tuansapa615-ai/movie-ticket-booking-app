// middleware/authMiddleware.js
import { verifyToken } from '../utils/jwt.js'; // Import hàm verifyToken

/**
 * Middleware để bảo vệ các route, yêu cầu token xác thực hợp lệ.
 * Gán thông tin người dùng từ token vào req.user.
 */
export const protect = (req, res, next) => {
    let token;

    // Kiểm tra xem token có trong header Authorization (Bearer token) không
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Nếu không có token, trả về lỗi 401
    if (!token) {
        return res.status(401).json({ message: 'Truy cập bị từ chối: Không có token xác thực.' });
    }

    try {
        // Xác minh token bằng hàm verifyToken từ utils/jwt.js
        const decoded = verifyToken(token);

        // Debugging: Log the decoded object (giữ lại để debug nếu cần)
        console.log('--- protect middleware: decoded token ---');
        console.log('Decoded object:', decoded);
        console.log('Type of decoded:', typeof decoded);
        console.log('decoded.userId:', decoded ? decoded.userId : 'N/A');
        console.log('decoded.role:', decoded ? decoded.role : 'N/A');
        console.log('-----------------------------------------');

        // Nếu token không hợp lệ hoặc đã hết hạn, trả về lỗi 401
        if (!decoded) {
            return res.status(401).json({ message: 'Token xác thực không hợp lệ hoặc đã hết hạn.' });
        }

        // Gán thông tin người dùng giải mã được vào req.user để các middleware/controller tiếp theo có thể sử dụng
        req.user = decoded;
        next(); // Chuyển sang middleware/controller tiếp theo
    } catch (error) {
        console.error('Lỗi xác thực token trong middleware protect:', error);
        return res.status(401).json({ message: 'Token xác thực không hợp lệ hoặc đã hết hạn.' });
    }
};

/**
 * Middleware để kiểm tra vai trò của người dùng.
 * Chỉ cho phép người dùng có vai trò được chỉ định truy cập.
 * @param {string[]} roles - Mảng các vai trò được phép (ví dụ: ['admin', 'staff']).
 */
export const authorize = (roles = []) => {
    // Đảm bảo roles là một mảng
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // Kiểm tra xem req.user đã được gán bởi middleware 'protect' chưa
        // Và kiểm tra xem vai trò của người dùng có nằm trong danh sách các vai trò được phép không
        if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
            let msg = 'Bạn không có quyền truy cập vào tài nguyên này.';
            if (!req.user) {
                msg = 'Không tìm thấy thông tin người dùng. Đảm bảo middleware "protect" đã chạy trước đó.';
            } else if (!req.user.role) {
                msg = 'Vai trò người dùng không xác định trong token.';
            } else if (roles.length > 0 && !roles.includes(req.user.role)) {
                msg = `Vai trò của bạn (${req.user.role}) không được phép. Yêu cầu các vai trò: ${roles.join(', ')}.`;
            }
            return res.status(403).json({ message: msg });
        }
        next(); // Chuyển sang middleware/controller tiếp theo
    };
};
