    // controllers/cinemaController.js
    import Cinema from '../models/Cinema.js'; // <-- Import Cinema model
    // Không cần import pool trực tiếp nữa vì model đã xử lý

    // @route POST /api/cinemas/add
    // @desc Thêm rạp phim mới
    // @access Admin/Staff
    export const addCinema = async (req, res) => {
        const { name, address, city, contact_number, Maps_url, opening_hours } = req.body;

        if (!name || !address || !city) {
            return res.status(400).json({ message: 'Tên, địa chỉ và thành phố của rạp chiếu phim là bắt buộc.' });
        }

        try {
            const newCinema = await Cinema.create({ name, address, city, contact_number, Maps_url, opening_hours });

            if (!newCinema) {
                return res.status(500).json({ message: 'Không thể thêm rạp chiếu phim.' });
            }

            res.status(201).json({
                message: 'Rạp chiếu phim đã được thêm thành công.',
                cinema: newCinema
            });

        } catch (error) {
            console.error('Lỗi khi thêm rạp chiếu phim:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Tên rạp chiếu phim đã tồn tại.' });
            }
            res.status(500).json({ message: 'Đã xảy ra lỗi server khi thêm rạp chiếu phim.' });
        }
    };

    // @route GET /api/cinemas
    // @desc Lấy tất cả rạp phim
    // @access Public (có thể thay đổi nếu cần)
    export const getAllCinemas = async (req, res) => {
        try {
            const cinemas = await Cinema.findAll();
            res.status(200).json({ cinemas });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách rạp chiếu phim:', error);
            res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy danh sách rạp chiếu phim.' });
        }
    };

    // @route GET /api/cinemas/:id
    // @desc Lấy rạp phim theo ID
    // @access Public (có thể thay đổi nếu cần)
    export const getCinemaById = async (req, res) => {
        const { id } = req.params;
        try {
            const cinema = await Cinema.findById(id);
            if (!cinema) {
                return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim.' });
            }
            res.status(200).json({ cinema });
        } catch (error) {
            console.error('Lỗi khi lấy rạp chiếu phim theo ID:', error);
            res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy rạp chiếu phim.' });
        }
    };

    // @route PUT /api/cinemas/:id
    // @desc Cập nhật rạp phim theo ID
    // @access Admin/Staff
    export const updateCinema = async (req, res) => {
        const { id } = req.params;
        const { name, address, city, contact_number, Maps_url, opening_hours } = req.body;

        if (!name || !address || !city) {
            return res.status(400).json({ message: 'Tên, địa chỉ và thành phố của rạp chiếu phim là bắt buộc.' });
        }

        try {
            const cinema = await Cinema.findById(id);
            if (!cinema) {
                return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim để cập nhật.' });
            }

            // Cập nhật thông tin của đối tượng cinema
            cinema.name = name;
            cinema.address = address;
            cinema.city = city;
            cinema.contact_number = contact_number;
            cinema.Maps_url = Maps_url;
            cinema.opening_hours = opening_hours;

            const success = await cinema.update(); // Gọi instance method update

            if (!success) {
                return res.status(500).json({ message: 'Không thể cập nhật rạp chiếu phim.' });
            }

            res.status(200).json({ message: 'Rạp chiếu phim đã được cập nhật thành công.' });

        } catch (error) {
            console.error('Lỗi khi cập nhật rạp chiếu phim:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Tên rạp chiếu phim đã tồn tại.' });
            }
            res.status(500).json({ message: 'Đã xảy ra lỗi server khi cập nhật rạp chiếu phim.' });
        }
    };

    // @route DELETE /api/cinemas/:id
    // @desc Xóa rạp phim theo ID
    // @access Admin
    export const deleteCinema = async (req, res) => {
        const { id } = req.params;
        try {
            const success = await Cinema.delete(id); // Gọi static method delete

            if (!success) {
                return res.status(404).json({ message: 'Không tìm thấy rạp chiếu phim để xóa hoặc không có gì bị xóa.' });
            }

            res.status(200).json({ message: 'Rạp chiếu phim và tất cả dữ liệu liên quan đã được xóa thành công.' });

        } catch (error) {
            console.error('Lỗi khi xóa rạp chiếu phim:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ message: 'Không thể xóa rạp chiếu phim do có dữ liệu liên quan. Vui lòng thử lại.' });
            }
            res.status(500).json({ message: 'Đã xảy ra lỗi server khi xóa rạp chiếu phim.' });
        }
    };