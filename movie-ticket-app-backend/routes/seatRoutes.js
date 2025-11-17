// routes/seatRoutes.js
import express from 'express';
import {
    getSeatsByHall,
    getSeatById,
    addSeat,
    updateSeat,
    deleteSeat
} from '../controllers/seatController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---
// Lấy tất cả ghế trong một phòng chiếu (dành cho hiển thị trên giao diện người dùng, không cần đăng nhập)
router.get('/hall/:hallId', getSeatsByHall); // Lấy ghế theo ID phòng chiếu từ tham số URL
router.get('/', getSeatsByHall); // Lấy ghế theo hallId từ query param (ví dụ: /api/seats?hallId=1&showtimeId=2)


// --- Protected Routes (Dành cho Admin/Staff quản lý) ---

// Lấy thông tin một ghế cụ thể theo ID
// Cho phép 'admin' HOẶC 'staff'
router.get('/:id', protect, authorize(['admin']), getSeatById); // <--- SỬA QUYỀN Ở ĐÂY

// Thêm ghế mới
// Cho phép 'admin' HOẶC 'staff'
router.post('/', protect, authorize(['admin']), addSeat); // <--- SỬA QUYỀN Ở ĐÂY

// Cập nhật thông tin ghế
// Cho phép 'admin' HOẶC 'staff'
router.put('/:id', protect, authorize(['admin']), updateSeat); // <--- SỬA QUYỀN Ở ĐÂY

// Xóa ghế
// Chỉ cần quyền 'admin' (giữ nguyên nếu mong muốn)
router.delete('/:id', protect, authorize(['admin']), deleteSeat); // <--- GIỮ NGUYÊN HOẶC SỬA TÙY QUYỀN XÓA


export default router;