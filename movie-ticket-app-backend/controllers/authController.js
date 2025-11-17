// controllers/authController.js
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sendVerificationEmail, sendTemporaryPasswordEmail } from '../utils/emailService.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { v2 as cloudinaryV2 } from '../config/cloudinaryConfig.js';
import { pool } from '../config/db.js';
dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getPublicIdFromCloudinaryUrl = (url) => {
    if (!url) return null;
    try {
        const urlParts = url.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
            return null;
        }
        const pathSegments = urlParts.slice(uploadIndex + 2);
        const filenameWithExtension = pathSegments.pop();
        const publicIdBase = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));
        
        const publicId = pathSegments.length > 0
            ? `${pathSegments.join('/')}/${publicIdBase}`
            : publicIdBase;
            
        return publicId;
    } catch (e) {
        console.error("Error extracting public ID:", e);
        return null;
    }
};

export const register = async (req, res) => {
        const { username, email, password, fullName, phoneNumber, gender, dateOfBirth, identityCardNumber, city, district, addressLine } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường bắt buộc (tên người dùng, email, mật khẩu).' });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'Email đã được sử dụng bởi một tài khoản khác.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = await User.createUser(username, email, passwordHash, fullName, phoneNumber, null, 'customer', gender, dateOfBirth, identityCardNumber, city, district, addressLine);

        const emailVerificationToken = generateToken({ userId, email, type: 'emailVerification' }, '1h');
        const verificationLink = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${emailVerificationToken}`;

        await sendVerificationEmail(email, verificationLink);

        res.status(201).json({
            message: 'Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản.',
            userId: userId
        });

    } catch (error) {
        console.error('Lỗi trong quá trình đăng ký:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình đăng ký tài khoản.' });
    }
};

export const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Thiếu token xác thực. Vui lòng kiểm tra lại liên kết.');
    }

    try {
        const decoded = verifyToken(token);
        console.log('Decoded Token:', decoded);

        if (!decoded || decoded.type !== 'emailVerification') {
            return res.status(401).send('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
        }

        const user = await User.findById(decoded.userId);
        console.log('User found for verification:', user);

        if (!user) {
            return res.status(404).send('Người dùng không tồn tại.');
        }

        if (user.is_verified) {
            return res.status(200).send('Email đã được xác thực trước đó.');
        }

        await User.updateEmailVerificationStatus(user.user_id, 1);
        console.log(`User ${user.user_id} email verified successfully.`);

        res.status(200).send('Email của bạn đã được xác thực thành công! Bạn có thể đóng trang này.');

    } catch (error) {
        console.error('Lỗi trong quá trình xác thực email:', error);
        res.status(500).send('Đã xảy ra lỗi trong quá trình xác thực email.');
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findByEmail(email); 

        const token = generateToken({ userId: user.user_id, email: user.email, role: user.role });

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                userId: user.user_id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                avatarUrl: user.avatar_url,
                role: user.role,
                phoneNumber: user.phone_number,
                gender: user.gender,
                dateOfBirth: user.date_of_birth ? user.date_of_birth.toISOString().split('T')[0] : null,
                identityCardNumber: user.identity_card_number,
                city: user.city,
                district: user.district,
                addressLine: user.address_line
            }
        });
    } catch (error) { /* ... */ }
};

export const googleLogin = async (req, res) => {
    const { idToken } = req.body;
    try {
        // ...
        let user = await User.findByEmail(email); // Re-fetch user để có đầy đủ thông tin
        if (!user) { // Nếu user chưa tồn tại, tạo mới
            // ... (tạo user, chú ý các trường mới có thể là null)
            const userId = await User.createUser(username, email, passwordHash, name, null, picture, 'customer', null, null, null, null, null, null);
            await User.updateEmailVerificationStatus(userId, 1);
            user = await User.findById(userId); // PHẢI FETCH LẠI để có các trường mới đầy đủ
        }
        // ...
        res.status(200).json({
            message: 'Đăng nhập bằng Google thành công!',
            token,
            user: { // Trả về user object đầy đủ các trường mới nhất
                userId: user.user_id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                avatarUrl: user.avatar_url,
                role: user.role,
                phoneNumber: user.phone_number,
                gender: user.gender,
                dateOfBirth: user.date_of_birth ? user.date_of_birth.toISOString().split('T')[0] : null,
                identityCardNumber: user.identity_card_number,
                city: user.city,
                district: user.district,
                addressLine: user.address_line
            }
        });
    } catch (error) { /* ... */ }
};


export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp email của bạn.' });
    }

    try {
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, mật khẩu tạm thời đã được gửi đến địa chỉ đó.' });
        }

        const temporaryPassword = crypto.randomBytes(8).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(temporaryPassword, salt);

        await User.updatePassword(user.user_id, passwordHash);

        await sendTemporaryPasswordEmail(email, temporaryPassword);

        res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, mật khẩu tạm thời đã được gửi đến địa chỉ đó.' });

    } catch (error) {
        console.error('Lỗi trong quá trình yêu cầu đặt lại mật khẩu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu đặt lại mật khẩu.' });
    }
};

export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await User.updatePassword(userId, newPasswordHash);

        res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công!' });

    } catch (error) {
        console.error('Lỗi trong quá trình đổi mật khẩu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình đổi mật khẩu.' });
    }
};

export const uploadAvatar = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng chọn một tệp ảnh để tải lên.' });
    }
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        const oldAvatarUrl = user.avatar_url;
        const newAvatarUrl = req.file.path; // req.file.path là URL đầy đủ từ Cloudinary

        await User.updateAvatarUrl(userId, newAvatarUrl);

        if (oldAvatarUrl && oldAvatarUrl.includes('res.cloudinary.com')) {
            const publicId = getPublicIdFromCloudinaryUrl(oldAvatarUrl);
            if (publicId) {
                try {
                    const result = await cloudinaryV2.uploader.destroy(publicId);
                    console.log(`Đã xóa avatar cũ (${publicId}) khỏi Cloudinary:`, result);
                } catch (cloudinaryError) {
                    console.error(`Lỗi khi xóa avatar cũ (${publicId}) khỏi Cloudinary:`, cloudinaryError);
                }
            } else {
                console.warn('Không thể trích xuất public ID từ URL avatar cũ:', oldAvatarUrl);
            }
        } else if (oldAvatarUrl) {
            console.log('Avatar cũ không phải là URL Cloudinary, bỏ qua việc xóa:', oldAvatarUrl);
        }

        // Fetch the updated user data to return all fields including new ones
        const updatedUser = await User.findById(userId);

        res.status(200).json({
            message: 'Ảnh đại diện đã được cập nhật thành công!',
            avatarUrl: newAvatarUrl, // Vẫn trả về avatarUrl riêng
            // Trả về user object đầy đủ để frontend cập nhật SharedPreferences
            user: {
                userId: updatedUser.user_id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.full_name,
                avatarUrl: updatedUser.avatar_url,
                role: updatedUser.role,
                phoneNumber: updatedUser.phone_number,
                gender: updatedUser.gender,
                dateOfBirth: updatedUser.date_of_birth ? updatedUser.date_of_birth.toISOString().split('T')[0] : null,
                identityCardNumber: updatedUser.identity_card_number,
                city: updatedUser.city,
                district: updatedUser.district,
                addressLine: updatedUser.address_line
            }
        });
    } catch (error) {
        console.error('Lỗi trong quá trình tải lên ảnh đại diện:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tải lên ảnh đại diện.' });
    }
};

export const logout = async (req, res) => {
    res.status(200).json({ message: 'Đăng xuất thành công.' });
};


export const getAllUsers = async (req, res) => {
    const { searchTerm, role } = req.query; 
    try {
        const users = await User.findAllUsers(searchTerm, role || 'customer');
        res.status(200).json({ message: 'Lấy danh sách người dùng thành công.', users });
    } catch (error) {
        console.error('Lỗi khi lấy tất cả người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách người dùng.' });
    }
};

export const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        res.status(200).json({ message: 'Lấy thông tin người dùng thành công.', user });
    } catch (error) {
        console.error('Lỗi khi lấy người dùng theo ID:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng.' });
    }
};


export const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const userData = req.body;

    // Loại bỏ các trường không được phép cập nhật qua API này (hoặc nên có API riêng)
    delete userData.userId;
    delete userData.email;
    delete userData.role;
    delete userData.is_verified;
    delete userData.created_at;
    delete userData.password_hash;
    // Kiểm tra và chuyển đổi ngày sinh thành Date object nếu cần
    if (userData.dateOfBirth) {
        userData.date_of_birth = new Date(userData.dateOfBirth);
    } else if (userData.dateOfBirth === '') { // Nếu frontend gửi chuỗi rỗng cho ngày sinh
        userData.date_of_birth = null; // Gán null để lưu vào DB
    } else {
        delete userData.dateOfBirth; // Nếu không có hoặc undefined, không cập nhật
    }
    // Chuyển đổi tên trường từ camelCase của Flutter sang snake_case của DB
    if (userData.fullName !== undefined) { userData.full_name = userData.fullName; delete userData.fullName; }
    if (userData.phoneNumber !== undefined) { userData.phone_number = userData.phoneNumber; delete userData.phoneNumber; }
    if (userData.identityCardNumber !== undefined) { userData.identity_card_number = userData.identityCardNumber; delete userData.identityCardNumber; }
    if (userData.addressLine !== undefined) { userData.address_line = userData.addressLine; delete userData.addressLine; }
    // Giới tính, thành phố, quận huyện đã khớp tên rồi

    try {
        const result = await User.updateUser(userId, userData);

        if (result.affectedRows === 0) {
            const userExists = await User.findById(userId);
            if (!userExists) {
                return res.status(404).json({ message: 'Người dùng không tồn tại.' });
            }
            return res.status(200).json({ message: 'Không có thông tin nào được cập nhật.' });
        }

        const updatedUser = await User.findById(userId); // Fetch lại user đã cập nhật để trả về

        res.status(200).json({
            message: 'Thông tin cá nhân đã được cập nhật thành công!',
            user: { // Trả về user object đầy đủ các trường mới nhất cho frontend
                userId: updatedUser.user_id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.full_name,
                avatarUrl: updatedUser.avatar_url,
                role: updatedUser.role,
                phoneNumber: updatedUser.phone_number,
                gender: updatedUser.gender,
                dateOfBirth: updatedUser.date_of_birth ? updatedUser.date_of_birth.toISOString().split('T')[0] : null,
                identityCardNumber: updatedUser.identity_card_number,
                city: updatedUser.city,
                district: updatedUser.district,
                addressLine: updatedUser.address_line
            }
        });

    } catch (error) {
        console.error('Lỗi trong quá trình cập nhật thông tin cá nhân:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật thông tin cá nhân.' });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params; 
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role; 

    let connection; 

    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction(); 

        const userToDelete = await User.findById(id, connection); 

        if (!userToDelete) {
            await connection.rollback(); 
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        if (requestingUserRole !== 'admin' && requestingUserId !== userToDelete.user_id) {
            await connection.rollback();
            return res.status(403).json({ message: 'Bạn không có quyền xóa tài khoản này.' });
        }

        const [userBookings] = await connection.execute(
            'SELECT booking_id FROM bookings WHERE user_id = ?',
            [id]
        );
        const bookingIds = userBookings.map(row => row.booking_id);

        if (bookingIds.length > 0) {
            const placeholders = bookingIds.map(() => '?').join(', ');

            await connection.execute(
                `DELETE FROM tickets WHERE booking_id IN (${placeholders})`,
                bookingIds
            );

            await connection.execute(
                `DELETE FROM booking_seats WHERE booking_id IN (${placeholders})`,
                bookingIds
            );

            await connection.execute(
                `DELETE FROM transactions WHERE booking_id IN (${placeholders})`,
                bookingIds
            );
        }

        await connection.execute(
            'DELETE FROM bookings WHERE user_id = ?',
            [id]
        );

        if (userToDelete.avatar_url && userToDelete.avatar_url.includes('res.cloudinary.com')) {
            const publicId = getPublicIdFromCloudinaryUrl(userToDelete.avatar_url);
            if (publicId) {
                try {
                    await cloudinaryV2.uploader.destroy(publicId);
                    console.log(`Đã xóa avatar của người dùng (${publicId}) khỏi Cloudinary.`);
                } catch (cloudinaryError) {
                    console.error(`Lỗi khi xóa avatar Cloudinary của người dùng (${publicId}):`, cloudinaryError);
                }
            }
        }

        const [result] = await connection.execute('DELETE FROM users WHERE user_id = ?', [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(500).json({ message: 'Không thể xóa tài khoản của bạn.' });
        }

        await connection.commit();

        res.status(200).json({ message: 'Tài khoản người dùng và tất cả dữ liệu liên quan đã được xóa thành công.' });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Lỗi trong quá trình xóa tài khoản người dùng:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi xóa tài khoản người dùng.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

export const deleteMyAccount = async (req, res) => {
    const userIdToDelete = req.user.userId;

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const userToDelete = await User.findById(userIdToDelete, connection);

        if (!userToDelete) {
            await connection.rollback();
            return res.status(404).json({ message: 'Tài khoản của bạn không tồn tại.' });
        }

        const [userBookings] = await connection.execute(
            'SELECT booking_id FROM bookings WHERE user_id = ?',
            [userIdToDelete]
        );
        const bookingIds = userBookings.map(row => row.booking_id);

        if (bookingIds.length > 0) {
            const placeholders = bookingIds.map(() => '?').join(', ');

            await connection.execute(
                `DELETE FROM tickets WHERE booking_id IN (${placeholders})`,
                bookingIds
            );

            await connection.execute(
                `DELETE FROM booking_seats WHERE booking_id IN (${placeholders})`,
                bookingIds
            );

            await connection.execute(
                `DELETE FROM transactions WHERE booking_id IN (${placeholders})`,
                bookingIds
            );
        }

        await connection.execute(
            'DELETE FROM bookings WHERE user_id = ?',
            [userIdToDelete]
        );

        if (userToDelete.avatar_url && userToDelete.avatar_url.includes('res.cloudinary.com')) {
            const publicId = getPublicIdFromCloudinaryUrl(userToDelete.avatar_url);
            if (publicId) {
                try {
                    await cloudinaryV2.uploader.destroy(publicId);
                    console.log(`Đã xóa avatar của người dùng (${publicId}) khỏi Cloudinary.`);
                } catch (cloudinaryError) {
                    console.error(`Lỗi khi xóa avatar Cloudinary của người dùng (${publicId}):`, cloudinaryError);
                }
            }
        }

        const [result] = await connection.execute('DELETE FROM users WHERE user_id = ?', [userIdToDelete]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(500).json({ message: 'Không thể xóa tài khoản của bạn.' });
        }

        await connection.commit();

        res.status(200).json({ message: 'Tài khoản của bạn và tất cả dữ liệu liên quan đã được xóa thành công.' });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Lỗi trong quá trình xóa tài khoản của tôi:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi xóa tài khoản của bạn.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};