// routes/hallRoutes.js
import express from 'express';
import * as hallController from '../controllers/hallController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // Đảm bảo đường dẫn đúng

const router = express.Router();

// @route POST /api/halls/add
// @desc Thêm phòng chiếu mới (Chỉ dành cho Admin/Staff)
router.post('/add', protect, authorize(['admin']), hallController.addHall);

// @route GET /api/halls
// @desc Lấy tất cả phòng chiếu (có thể lọc theo cinema_id)
router.get('/', hallController.getAllHalls);

// @route GET /api/halls/:id
// @desc Lấy phòng chiếu theo ID
router.get('/:id', hallController.getHallById);

// @route PUT /api/halls/:id
// @desc Cập nhật phòng chiếu theo ID (Chỉ dành cho Admin/Staff)
router.put('/:id', protect, authorize(['admin']), hallController.updateHall);

// @route DELETE /api/halls/:id
// @desc Xóa phòng chiếu theo ID (Chỉ dành cho Admin)
router.delete('/:id', protect, authorize(['admin']), hallController.deleteHall);

export default router;