// controllers/seatPriceController.js
import { pool } from '../config/db.js'; // Đảm bảo import pool
import { protect, authorize } from '../middleware/authMiddleware.js'; // Có thể cần nếu bạn muốn bảo vệ các route này

// Lấy tất cả giá loại ghế
export const getSeatTypePrices = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT seat_type_price_id, seat_type, price FROM seat_type_prices ORDER BY seat_type');
        res.status(200).json({
            message: 'Lấy giá loại ghế thành công.',
            prices: rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy giá loại ghế:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy giá loại ghế.' });
    }
};

// Có thể thêm các hàm cho Admin để quản lý giá loại ghế
export const createSeatTypePrice = async (req, res) => {
    const { seat_type, price } = req.body;
    if (!seat_type || price === undefined) {
        return res.status(400).json({ message: 'Loại ghế và giá là bắt buộc.' });
    }
    try {
        const [result] = await pool.execute(
            'INSERT INTO seat_type_prices (seat_type, price) VALUES (?, ?)',
            [seat_type, price]
        );
        res.status(201).json({ message: 'Giá loại ghế đã được thêm.', id: result.insertId });
    } catch (error) {
        console.error('Lỗi khi tạo giá loại ghế:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi tạo giá loại ghế.' });
    }
};

export const updateSeatTypePrice = async (req, res) => {
    const { id } = req.params;
    const { price } = req.body; // Chỉ cho phép update giá
    if (price === undefined) {
        return res.status(400).json({ message: 'Giá là bắt buộc để cập nhật.' });
    }
    try {
        const [result] = await pool.execute(
            'UPDATE seat_type_prices SET price = ? WHERE seat_type_price_id = ?',
            [price, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giá loại ghế.' });
        }
        res.status(200).json({ message: 'Giá loại ghế đã được cập nhật.' });
    } catch (error) {
        console.error('Lỗi khi cập nhật giá loại ghế:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi cập nhật giá loại ghế.' });
    }
};

export const deleteSeatTypePrice = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM seat_type_prices WHERE seat_type_price_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giá loại ghế.' });
        }
        res.status(200).json({ message: 'Giá loại ghế đã được xóa.' });
    } catch (error) {
        console.error('Lỗi khi xóa giá loại ghế:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi xóa giá loại ghế.' });
    }
};