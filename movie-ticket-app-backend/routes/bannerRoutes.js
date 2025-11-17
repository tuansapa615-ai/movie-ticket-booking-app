// routes/bannerRoutes.js
import express from 'express';
import {
    getAllBanners,
    addBanner,
    updateBanner,
    deleteBanner
} from '../controllers/bannerController.js';
import { uploadBanner } from '../config/cloudinaryConfig.js'; // Import middleware upload
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Ai cũng có thể xem banners
router.get('/', getAllBanners);

// Admin routes - Chỉ admin mới có thể thêm/sửa/xóa
// Sử dụng upload.single('image') để xử lý file ảnh
router.post('/', protect, authorize(['admin']), uploadBanner.single('image'), addBanner);
router.put('/:id', protect, authorize(['admin']), uploadBanner.single('image'), updateBanner);
router.delete('/:id', protect, authorize(['admin']), deleteBanner);

export default router;