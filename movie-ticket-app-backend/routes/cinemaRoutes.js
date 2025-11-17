// routes/cinemaRoutes.js
import express from 'express';
import * as cinemaController from '../controllers/cinemaController.js';
// import { protect, authorize } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
// <-- Cập nhật đường dẫn nếu authMiddleware ở thư mục middleware

const router = express.Router();

// @route POST /api/cinemas/add
// @desc Thêm rạp phim mới (Chỉ dành cho Admin/Staff)
router.post('/add', protect, authorize(['admin']), cinemaController.addCinema);

// @route GET /api/cinemas
// @desc Lấy tất cả rạp phim (Có thể công khai hoặc hạn chế)
router.get('/', cinemaController.getAllCinemas);

// @route GET /api/cinemas/:id
// @desc Lấy rạp phim theo ID (Có thể công khai hoặc hạn chế)
router.get('/:id', cinemaController.getCinemaById);

// @route PUT /api/cinemas/:id
// @desc Cập nhật rạp phim theo ID (Chỉ dành cho Admin/Staff)
router.put('/:id', protect, authorize(['admin']), cinemaController.updateCinema);

// @route DELETE /api/cinemas/:id
// @desc Xóa rạp phim theo ID (Chỉ dành cho Admin)
router.delete('/:id', protect, authorize(['admin']), cinemaController.deleteCinema);

export default router;