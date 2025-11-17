// routes/authRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadAvatars } from '../config/cloudinaryConfig.js';// <-- Import Multer instance

import { // <-- Đảm bảo import uploadAvatar từ authController.js
    logout,
    register,
    verifyEmail,
    login,
    googleLogin,
    requestPasswordReset,
    changePassword,
    uploadAvatar,
    getAllUsers,
    getUserById,
    deleteUser,
    deleteMyAccount,
    updateProfile // Thêm updateProfile
} from '../controllers/authController.js';

const router = express.Router();

// Routes công khai (không cần xác thực)
router.delete('/me', protect, deleteMyAccount);
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/request-password-reset', requestPasswordReset);

// Routes được bảo vệ (cần token xác thực)
router.post('/logout', protect, logout);
router.post('/upload-avatar', protect, uploadAvatars.single('avatar'), uploadAvatar);
router.post('/change-password', protect, changePassword);
router.get('/profile', protect, (req, res) => {
    // Trả về thông tin profile đầy đủ bao gồm các trường mới
    res.status(200).json({
        message: 'Đây là thông tin profile của bạn',
        user: {
            userId: req.user.userId,
            username: req.user.username,
            email: req.user.email,
            fullName: req.user.fullName, 
            avatarUrl: req.user.avatarUrl, 
            role: req.user.role,
            phoneNumber: req.user.phoneNumber, 
            dateOfBirth: req.user.dateOfBirth,
            identityCardNumber: req.user.identityCardNumber,
            city: req.user.city,
            district: req.user.district,
            addressLine: req.user.addressLine
        }
    });
});
router.put('/profile', protect, updateProfile); // NEW: Route để cập nhật thông tin profile

// Route chỉ dành cho admin (cần token và vai trò admin)
router.get('/admin-dashboard', protect, authorize('admin'), (req, res) => {
    res.status(200).json({ message: 'Chào mừng Admin! Đây là khu vực riêng của bạn.', user: req.user });
});
router.get('/users', protect, authorize(['admin']), getAllUsers);
router.delete('/users/:id', protect, authorize(['admin']), deleteUser);
router.get('/users/:id', protect, authorize(['admin']), getUserById);

export default router;