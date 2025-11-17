// routes/seatPriceRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js'; // Nếu bạn muốn bảo vệ các route này
import {
    getSeatTypePrices,
    createSeatTypePrice,
    updateSeatTypePrice,
    deleteSeatTypePrice
} from '../controllers/seatPriceController.js';

const router = express.Router();

// Public route để lấy giá các loại ghế
router.get('/', getSeatTypePrices);

// Admin/Staff routes để quản lý giá loại ghế (cần xác thực và ủy quyền)
router.post('/', protect, authorize(['admin', 'staff']), createSeatTypePrice);
router.put('/:id', protect, authorize(['admin', 'staff']), updateSeatTypePrice);
router.delete('/:id', protect, authorize(['admin']), deleteSeatTypePrice); // Xóa thường chỉ Admin

export default router;