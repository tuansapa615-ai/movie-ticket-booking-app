// routes/showtimeRoutes.js
import express from 'express';
import * as showtimeController from '../controllers/showtimeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // Đảm bảo đường dẫn đúng

const router = express.Router();

// @route POST /api/showtimes/add
// @desc Thêm suất chiếu mới (Chỉ dành cho Admin/Staff)
router.post('/add', protect, authorize(['admin', 'staff']), showtimeController.addShowtime);

// @route GET /api/showtimes
// @desc Lấy tất cả suất chiếu (có thể lọc theo movie, hall, cinema, date)
router.get('/', showtimeController.getAllShowtimes);

// @route GET /api/showtimes/:id
// @desc Lấy suất chiếu theo ID
router.get('/:id', showtimeController.getShowtimeById);

// @route PUT /api/showtimes/:id
// @desc Cập nhật suất chiếu theo ID (Chỉ dành cho Admin/Staff)
router.put('/:id', protect, authorize(['admin', 'staff']), showtimeController.updateShowtime);

// @route DELETE /api/showtimes/:id
// @desc Xóa suất chiếu theo ID (Chỉ dành cho Admin)
router.delete('/:id', protect, authorize(['admin']), showtimeController.deleteShowtime);

export default router;