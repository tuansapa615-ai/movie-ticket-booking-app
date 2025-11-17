// // controllers/seatController.js
import Seat from '../models/Seat.js';
import { pool } from '../config/db.js'; 

// Helper to check user role - UNCHANGED
const checkAdminStaffRole = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }
};

/**
 * @route GET /api/seats/:id
 * @description Get a single seat by ID
 * @access Private (Admin/Staff) - UNCHANGED
 */
export const getSeatById = async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập thông tin ghế này.' });
    }

    const { id } = req.params;
    try {
        const seat = await Seat.findById(id);
        if (!seat) {
            return res.status(404).json({ message: 'Không tìm thấy ghế.' });
        }
        res.status(200).json(seat);
    } catch (error) {
        console.error('Lỗi khi lấy ghế theo ID:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông tin ghế.', error: error.message });
    }
};

/**
 * @route GET /api/halls/:hallId/seats OR /api/seats?hallId=:hallId
 * @description Get all seats for a specific hall, optionally with availability for a showtime.
 * @access Public (for showtime display) or Private (for management) - UNCHANGED
 * @queryParam hallId - Required. The ID of the hall.
 * @queryParam showtimeId - Optional. If provided, uses sp_get_available_seats to determine availability.
 */
export const getSeatsByHall = async (req, res) => {
    const hallId = req.params.hallId || req.query.hallId;
    const showtimeId = req.query.showtimeId;

    if (!hallId) {
        return res.status(400).json({ message: 'Vui lòng cung cấp ID phòng chiếu.' });
    }

    try {
        if (showtimeId) {
            const [rows] = await pool.execute('CALL sp_get_available_seats(?)', [showtimeId]);
            
            // CHỈNH SỬA ĐỂ ĐẢM BẢO CHUỖI JSON ĐƯỢC CHUYỂN ĐỔI CHÍNH XÁC VÀ ĐẦY ĐỦ
            // MySQL2 pool.execute trả về mảng các hàng dữ liệu ở rows[0]
            // và thông tin metadata ở các phần tử sau.
            const rawSeatsData = rows[0]; 

            // IMPORTANT: Ép kiểu mỗi hàng thành một đối tượng JSON thuần túy nếu cần
            // (đôi khi kết quả từ DB driver là RowDataPacket, không phải plain object)
            const seats = rawSeatsData.map(row => {
                // Chuyển đổi RowDataPacket sang plain JavaScript object
                return JSON.parse(JSON.stringify(row));
            });

            if (!seats || seats.length === 0) {
                const [hallExists] = await pool.execute('SELECT hall_id FROM halls WHERE hall_id = ?', [hallId]);
                if (hallExists.length === 0) {
                    return res.status(404).json({ message: 'Không tìm thấy phòng chiếu hoặc suất chiếu cho ghế.' });
                }
                return res.status(200).json({ message: 'Không tìm thấy ghế nào cho suất chiếu này hoặc phòng chiếu không có ghế.', seats: [] });
            }

            // --- THÊM DÒNG DEBUG NÀY ĐỂ XEM JSON THỰC SỰ ĐƯỢC GỬI ---
            const responsePayload = { seats: seats };
            const jsonStringToSend = JSON.stringify(responsePayload);
            console.log("DEBUG BACKEND: Full JSON response string length:", jsonStringToSend.length);
            console.log("DEBUG BACKEND: First 500 chars of JSON response:", jsonStringToSend.substring(0, Math.min(jsonStringToSend.length, 500)));
            console.log("DEBUG BACKEND: Last 500 chars of JSON response:", jsonStringToSend.substring(Math.max(0, jsonStringToSend.length - 500)));
            // --- KẾT THÚC DÒNG DEBUG NÀY ---

            res.status(200).json(responsePayload); // Gửi đối tượng payload đã tạo

        } else {
            const seats = await Seat.findByHallId(hallId);
            if (seats.length === 0) {
                const [hallExists] = await pool.execute('SELECT hall_id FROM halls WHERE hall_id = ?', [hallId]);
                if (hallExists.length === 0) {
                    return res.status(404).json({ message: 'Không tìm thấy phòng chiếu.' });
                }
                return res.status(200).json({ message: 'Phòng chiếu này chưa có ghế nào được thêm.', seats: [] });
            }
            res.status(200).json({ seats: seats });
        }
    } catch (error) {
        console.error('Lỗi khi lấy danh sách ghế theo phòng chiếu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách ghế.', error: error.message });
    }
};

/**
 * @route POST /api/seats
 * @description Add a new seat.
 * @access Private (Admin/Staff) - UNCHANGED, model handles updated values.
 */
export const addSeat = [
    checkAdminStaffRole,
    async (req, res) => {
        const { hall_id, seat_row, seat_number, seat_type = 'standard' } = req.body;

        if (!hall_id || !seat_row || seat_number === undefined || seat_number === null) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ hall_id, seat_row và seat_number.' });
        }

        try {
            const newSeat = await Seat.create({
                hall_id,
                seat_row,
                seat_number,
                seat_type,
            });

            if (newSeat) {
                res.status(201).json({ message: 'Ghế đã được thêm thành công!', seat: newSeat });
            } else {
                res.status(500).json({ message: 'Không thể thêm ghế mới.' });
            }
        } catch (error) {
            console.error('Lỗi khi thêm ghế:', error);
            res.status(500).json({ message: error.message || 'Đã xảy ra lỗi khi thêm ghế.' });
        }
    }
];

/**
 * @route PUT /api/seats/:id
 * @description Update an existing seat.
 * @access Private (Admin) - UNCHANGED, model handles updated values.
 */
export const updateSeat = [
    checkAdminStaffRole,
    async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu để cập nhật ghế.' });
        }

        try {
            const success = await Seat.update(id, updateData);
            if (success) {
                res.status(200).json({ message: 'Ghế đã được cập nhật thành công!' });
            } else {
                const seatExists = await Seat.findById(id);
                if (!seatExists) {
                    return res.status(404).json({ message: 'Không tìm thấy ghế để cập nhật.' });
                }
                res.status(200).json({ message: 'Không có thay đổi nào được áp dụng cho ghế.' });
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật ghế:', error);
            res.status(500).json({ message: error.message || 'Đã xảy ra lỗi khi cập nhật ghế.' });
        }
    }
];

/**
 * @route DELETE /api/seats/:id
 * @description Delete a seat.
 * @access Private (Admin) - UNCHANGED, logic is fine.
 */
export const deleteSeat = [
    checkAdminStaffRole,
    async (req, res) => {
        const { id } = req.params;
        try {
            const success = await Seat.delete(id);
            if (success) {
                res.status(200).json({ message: 'Ghế đã được xóa thành công!' });
            } else {
                res.status(404).json({ message: 'Không tìm thấy ghế để xóa hoặc ghế không thể bị xóa do có dữ liệu liên quan.' });
            }
        } catch (error) {
            console.error('Lỗi khi xóa ghế:', error);
            res.status(500).json({ message: error.message || 'Đã xảy ra lỗi khi xóa ghế.' });
        }
    }
];