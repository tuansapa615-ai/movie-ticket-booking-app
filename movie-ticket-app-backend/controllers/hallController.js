// controllers/hallController.js
import Hall from '../models/Hall.js'; // <-- Import Hall model

// @route POST /api/halls/add
// @desc Thêm phòng chiếu mới
// @access Admin/Staff
export const addHall = async (req, res) => {
    const { cinema_id, name, capacity, screen_type, seat_map } = req.body;

    if (!cinema_id || !name || !capacity) {
        return res.status(400).json({ message: 'ID rạp, tên phòng và sức chứa là bắt buộc.' });
    }

    try {
        const newHall = await Hall.create({ cinema_id, name, capacity, screen_type, seat_map });

        if (!newHall) {
            return res.status(500).json({ message: 'Không thể thêm phòng chiếu.' });
        }

        res.status(201).json({
            message: 'Phòng chiếu đã được thêm thành công.',
            hall: newHall
        });

    } catch (error) {
        console.error('Lỗi khi thêm phòng chiếu:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Tên phòng chiếu đã tồn tại trong rạp này.' }); // Giả định có UNIQUE (cinema_id, name)
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi thêm phòng chiếu.' });
    }
};

// @route GET /api/halls
// @desc Lấy tất cả phòng chiếu (có thể lọc theo cinema_id)
// @access Public
export const getAllHalls = async (req, res) => {
    const { cinemaId } = req.query; // Lọc theo cinemaId: /api/halls?cinemaId=1

    try {
        const halls = await Hall.findAll(cinemaId);
        res.status(200).json({ halls });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng chiếu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy danh sách phòng chiếu.' });
    }
};

// @route GET /api/halls/:id
// @desc Lấy phòng chiếu theo ID
// @access Public
export const getHallById = async (req, res) => {
    const { id } = req.params;
    try {
        const hall = await Hall.findById(id);
        if (!hall) {
            return res.status(404).json({ message: 'Không tìm thấy phòng chiếu.' });
        }
        res.status(200).json({ hall });
    } catch (error) {
        console.error('Lỗi khi lấy phòng chiếu theo ID:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy phòng chiếu.' });
    }
};

// @route PUT /api/halls/:id
// @desc Cập nhật phòng chiếu theo ID
// @access Admin/Staff
export const updateHall = async (req, res) => {
    const { id } = req.params;
    const { cinema_id, name, capacity, screen_type, seat_map } = req.body;

    if (!cinema_id || !name || !capacity) {
        return res.status(400).json({ message: 'ID rạp, tên phòng và sức chứa là bắt buộc.' });
    }

    try {
        const hall = await Hall.findById(id);
        if (!hall) {
            return res.status(404).json({ message: 'Không tìm thấy phòng chiếu để cập nhật.' });
        }

        // Cập nhật thông tin của đối tượng hall
        hall.cinema_id = cinema_id;
        hall.name = name;
        hall.capacity = capacity;
        hall.screen_type = screen_type;
        hall.seat_map = seat_map;

        const success = await hall.update(); // Gọi instance method update

        if (!success) {
            return res.status(500).json({ message: 'Không thể cập nhật phòng chiếu.' });
        }

        res.status(200).json({ message: 'Phòng chiếu đã được cập nhật thành công.' });

    } catch (error) {
        console.error('Lỗi khi cập nhật phòng chiếu:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Tên phòng chiếu đã tồn tại trong rạp này.' });
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi cập nhật phòng chiếu.' });
    }
};

// @route DELETE /api/halls/:id
// @desc Xóa phòng chiếu theo ID
// @access Admin
export const deleteHall = async (req, res) => {
    const { id } = req.params;
    try {
        const success = await Hall.delete(id); // Gọi static method delete

        if (!success) {
            return res.status(404).json({ message: 'Không tìm thấy phòng chiếu để xóa hoặc không có gì bị xóa.' });
        }

        res.status(200).json({ message: 'Phòng chiếu và tất cả dữ liệu liên quan đã được xóa thành công.' });

    } catch (error) {
        console.error('Lỗi khi xóa phòng chiếu:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Không thể xóa phòng chiếu do có suất chiếu hoặc ghế ngồi liên quan. Vui lòng xóa các dữ liệu liên quan trước.' });
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi xóa phòng chiếu.' });
    }
};