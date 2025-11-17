// // controllers/showtimeController.js
// import Showtime from '../models/Showtime.js'; // Import Showtime model
// import Movie from '../models/Movie.js'; // Cần để lấy duration của phim
// import Hall from '../models/Hall.js';   // Cần để lấy capacity của phòng
// import moment from 'moment-timezone'; // Để xử lý thời gian

// // Helper function to validate and parse time
// const parseAndValidateTime = (timeString) => {
//     // Định dạng thời gian chấp nhận: 'YYYY-MM-DD HH:MM:SS'
//     // Ví dụ: '2025-07-20 18:30:00'
//     const format = 'YYYY-MM-DD HH:mm:ss';
//     const parsedTime = moment.tz(timeString, format, 'Asia/Ho_Chi_Minh'); // Sử dụng múi giờ Việt Nam

//     if (!parsedTime.isValid()) {
//         throw new Error(`Thời gian '${timeString}' không hợp lệ hoặc sai định dạng (${format}).`);
//     }
//     return parsedTime.format(format); // Trả về định dạng chuẩn để lưu vào DB
// };


// // @route POST /api/showtimes/add
// // @desc Thêm suất chiếu mới
// // @access Admin/Staff
// export const addShowtime = async (req, res) => {
//     const { movie_id, hall_id, start_time, base_price } = req.body;

//     if (!movie_id || !hall_id || !start_time || !base_price) {
//         return res.status(400).json({ message: 'Movie ID, Hall ID, Thời gian bắt đầu và Giá cơ sở là bắt buộc.' });
//     }

//     try {
//         const parsedStartTime = parseAndValidateTime(start_time);

//         // Lấy thông tin phim để tính end_time
//         const movie = await Movie.findById(movie_id);
//         if (!movie) {
//             return res.status(404).json({ message: 'Không tìm thấy phim.' });
//         }
//         if (!movie.duration_minutes) {
//             return res.status(400).json({ message: 'Phim không có thông tin thời lượng. Không thể tạo suất chiếu.' });
//         }

//         // Tính toán end_time
//         const end_time = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');

//         // Kiểm tra xung đột thời gian trong cùng một phòng chiếu
//         const hasConflict = await Showtime.checkConflict(hall_id, parsedStartTime, end_time);
//         if (hasConflict) {
//             return res.status(409).json({ message: 'Có suất chiếu khác trùng lịch trong phòng này. Vui lòng chọn thời gian khác.' });
//         }

//         const newShowtime = await Showtime.create({
//             movie_id,
//             hall_id,
//             start_time: parsedStartTime,
//             end_time,
//             base_price
//         });

//         if (!newShowtime) {
//             return res.status(500).json({ message: 'Không thể thêm suất chiếu.' });
//         }

//         res.status(201).json({
//             message: 'Suất chiếu đã được thêm thành công.',
//             showtime: newShowtime
//         });

//     } catch (error) {
//         console.error('Lỗi khi thêm suất chiếu:', error);
//         res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi thêm suất chiếu.' });
//     }
// };

// // @route GET /api/showtimes
// // @desc Lấy tất cả suất chiếu (có thể lọc)
// // @access Public
// export const getAllShowtimes = async (req, res) => {
//     const filters = req.query; // { movieId, hallId, cinemaId, date, minStartTime, maxStartTime }

//     try {
//         const showtimes = await Showtime.findAll(filters);
//         res.status(200).json({ showtimes });
//     } catch (error) {
//         console.error('Lỗi khi lấy danh sách suất chiếu:', error);
//         res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy danh sách suất chiếu.' });
//     }
// };

// // @route GET /api/showtimes/:id
// // @desc Lấy suất chiếu theo ID
// // @access Public
// export const getShowtimeById = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const showtime = await Showtime.findById(id);
//         if (!showtime) {
//             return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });
//         }
//         res.status(200).json({ showtime });
//     } catch (error) {
//         console.error('Lỗi khi lấy suất chiếu theo ID:', error);
//         res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy suất chiếu.' });
//     }
// };

// // @route PUT /api/showtimes/:id
// // @desc Cập nhật suất chiếu theo ID
// // @access Admin/Staff
// export const updateShowtime = async (req, res) => {
//     const { id } = req.params;
//     const { movie_id, hall_id, start_time, base_price, available_seats, is_full } = req.body;

//     if (!movie_id || !hall_id || !start_time || !base_price || available_seats === undefined || is_full === undefined) {
//         return res.status(400).json({ message: 'Tất cả các trường bắt buộc là cần thiết để cập nhật suất chiếu.' });
//     }

//     try {
//         const existingShowtime = await Showtime.findById(id);
//         if (!existingShowtime) {
//             return res.status(404).json({ message: 'Không tìm thấy suất chiếu để cập nhật.' });
//         }

//         const parsedStartTime = parseAndValidateTime(start_time);

//         // Lấy thông tin phim để tính end_time mới nếu movie_id thay đổi
//         let calculatedEndTime = existingShowtime.end_time;
//         if (movie_id !== existingShowtime.movie_id) {
//             const movie = await Movie.findById(movie_id);
//             if (!movie || !movie.duration_minutes) {
//                 return res.status(400).json({ message: 'Không tìm thấy phim hoặc thiếu thời lượng phim.' });
//             }
//             calculatedEndTime = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
//         } else {
//             // Nếu movie_id không đổi, tính lại end_time dựa trên thời lượng phim hiện có
//             const movie = await Movie.findById(movie_id);
//             if (movie && movie.duration_minutes) {
//                  calculatedEndTime = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
//             }
//             // else giữ nguyên calculatedEndTime là existingShowtime.end_time
//         }
        
//         // Kiểm tra xung đột thời gian chỉ khi hall_id HOẶC start_time thay đổi
//         if (hall_id !== existingShowtime.hall_id || start_time !== existingShowtime.start_time) {
//             const hasConflict = await Showtime.checkConflict(hall_id, parsedStartTime, calculatedEndTime, id); // Truyền id để loại trừ chính nó
//             if (hasConflict) {
//                 return res.status(409).json({ message: 'Có suất chiếu khác trùng lịch trong phòng này. Vui lòng chọn thời gian khác.' });
//             }
//         }

//         // Cập nhật thông tin của đối tượng showtime
//         existingShowtime.movie_id = movie_id;
//         existingShowtime.hall_id = hall_id;
//         existingShowtime.start_time = parsedStartTime;
//         existingShowtime.end_time = calculatedEndTime; // Sử dụng end_time đã tính toán
//         existingShowtime.base_price = base_price;
//         existingShowtime.available_seats = available_seats;
//         existingShowtime.is_full = is_full;

//         const success = await existingShowtime.update();

//         if (!success) {
//             return res.status(500).json({ message: 'Không thể cập nhật suất chiếu.' });
//         }

//         res.status(200).json({ message: 'Suất chiếu đã được cập nhật thành công.' });

//     } catch (error) {
//         console.error('Lỗi khi cập nhật suất chiếu:', error);
//         res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi cập nhật suất chiếu.' });
//     }
// };

// // @route DELETE /api/showtimes/:id
// // @desc Xóa suất chiếu theo ID
// // @access Admin
// export const deleteShowtime = async (req, res) => {
//     const { id } = req.params;
//     try {
//         const success = await Showtime.delete(id);

//         if (!success) {
//             return res.status(404).json({ message: 'Không tìm thấy suất chiếu để xóa hoặc không có gì bị xóa.' });
//         }

//         res.status(200).json({ message: 'Suất chiếu và tất cả dữ liệu liên quan đã được xóa thành công.' });

//     } catch (error) {
//         console.error('Lỗi khi xóa suất chiếu:', error);
//         if (error.code === 'ER_ROW_IS_REFERENCED_2') {
//             return res.status(409).json({ message: 'Không thể xóa suất chiếu do có ràng buộc dữ liệu. Vui lòng kiểm tra các đặt chỗ liên quan.' });
//         }
//         res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi xóa suất chiếu.' });
//     }
// };
// controllers/showtimeController.js
import Showtime from '../models/Showtime.js'; // Import Showtime model
import Movie from '../models/Movie.js'; // Cần để lấy duration của phim
import Hall from '../models/Hall.js';   // Cần để lấy capacity của phòng
import moment from 'moment-timezone'; // Để xử lý thời gian

// Helper function to validate and parse time
const parseAndValidateTime = (timeString) => {
    const format = 'YYYY-MM-DD HH:mm:ss';
    const parsedTime = moment.tz(timeString, format, 'Asia/Ho_Chi_Minh');

    if (!parsedTime.isValid()) {
        throw new Error(`Thời gian '${timeString}' không hợp lệ hoặc sai định dạng (${format}).`);
    }
    return parsedTime.format(format);
};


// @route POST /api/showtimes/add
// @desc Thêm suất chiếu mới
// @access Admin/Staff
export const addShowtime = async (req, res) => {
    // 1. REMOVE base_price from destructuring req.body
    const { movie_id, hall_id, start_time } = req.body; // REMOVED base_price

    // 2. REMOVE base_price from validation
    if (!movie_id || !hall_id || !start_time) { // REMOVED base_price
        return res.status(400).json({ message: 'Movie ID, Hall ID và Thời gian bắt đầu là bắt buộc.' });
    }

    try {
        const parsedStartTime = parseAndValidateTime(start_time);

        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({ message: 'Không tìm thấy phim.' });
        }
        if (!movie.duration_minutes) {
            return res.status(400).json({ message: 'Phim không có thông tin thời lượng. Không thể tạo suất chiếu.' });
        }

        const end_time = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');

        const hasConflict = await Showtime.checkConflict(hall_id, parsedStartTime, end_time);
        if (hasConflict) {
            return res.status(409).json({ message: 'Có suất chiếu khác trùng lịch trong phòng này. Vui lòng chọn thời gian khác.' });
        }

        // 3. REMOVE base_price from Showtime.create arguments
        const newShowtime = await Showtime.create({
            movie_id,
            hall_id,
            start_time: parsedStartTime,
            end_time,
            // base_price // REMOVED
        });

        if (!newShowtime) {
            return res.status(500).json({ message: 'Không thể thêm suất chiếu.' });
        }

        res.status(201).json({
            message: 'Suất chiếu đã được thêm thành công.',
            showtime: newShowtime
        });

    } catch (error) {
        console.error('Lỗi khi thêm suất chiếu:', error);
        res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi thêm suất chiếu.' });
    }
};

// @route GET /api/showtimes
// @desc Lấy tất cả suất chiếu (có thể lọc)
// @access Public - NO CHANGES REQUIRED HERE, `findAll` in model is already updated.
export const getAllShowtimes = async (req, res) => {
    const filters = req.query;

    try {
        const showtimes = await Showtime.findAll(filters);
        res.status(200).json({ showtimes });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách suất chiếu:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy danh sách suất chiếu.' });
    }
};

// @route GET /api/showtimes/:id
// @desc Lấy suất chiếu theo ID
// @access Public - NO CHANGES REQUIRED HERE, `findById` in model is already updated.
export const getShowtimeById = async (req, res) => {
    const { id } = req.params;
    try {
        const showtime = await Showtime.findById(id);
        if (!showtime) {
            return res.status(404).json({ message: 'Không tìm thấy suất chiếu.' });
        }
        res.status(200).json({ showtime });
    } catch (error) {
        console.error('Lỗi khi lấy suất chiếu theo ID:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi server khi lấy suất chiếu.' });
    }
};

// @route PUT /api/showtimes/:id
// @desc Cập nhật suất chiếu theo ID
// @access Admin/Staff
export const updateShowtime = async (req, res) => {
    const { id } = req.params;
    // 4. REMOVE base_price from destructuring req.body
    const { movie_id, hall_id, start_time, available_seats, is_full } = req.body; // REMOVED base_price

    // 5. REMOVE base_price from validation
    if (!movie_id || !hall_id || !start_time || available_seats === undefined || is_full === undefined) { // REMOVED base_price
        return res.status(400).json({ message: 'Tất cả các trường bắt buộc là cần thiết để cập nhật suất chiếu.' });
    }

    try {
        const existingShowtime = await Showtime.findById(id);
        if (!existingShowtime) {
            return res.status(404).json({ message: 'Không tìm thấy suất chiếu để cập nhật.' });
        }

        const parsedStartTime = parseAndValidateTime(start_time);

        let calculatedEndTime = existingShowtime.end_time;
        if (movie_id !== existingShowtime.movie_id) {
            const movie = await Movie.findById(movie_id);
            if (!movie || !movie.duration_minutes) {
                return res.status(400).json({ message: 'Không tìm thấy phim hoặc thiếu thời lượng phim.' });
            }
            calculatedEndTime = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        } else {
             // If movie_id does not change, recalculate end_time based on existing movie duration
             const movie = await Movie.findById(movie_id);
             if (movie && movie.duration_minutes) {
                  calculatedEndTime = moment(parsedStartTime).add(movie.duration_minutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');
             }
        }
        
        if (hall_id !== existingShowtime.hall_id || start_time !== existingShowtime.start_time) {
            const hasConflict = await Showtime.checkConflict(hall_id, parsedStartTime, calculatedEndTime, id);
            if (hasConflict) {
                return res.status(409).json({ message: 'Có suất chiếu khác trùng lịch trong phòng này. Vui lòng chọn thời gian khác.' });
            }
        }

        // 6. REMOVE base_price from existingShowtime object update
        existingShowtime.movie_id = movie_id;
        existingShowtime.hall_id = hall_id;
        existingShowtime.start_time = parsedStartTime;
        existingShowtime.end_time = calculatedEndTime;
        // existingShowtime.base_price = base_price; // REMOVED
        existingShowtime.available_seats = available_seats;
        existingShowtime.is_full = is_full;

        const success = await existingShowtime.update();

        if (!success) {
            return res.status(500).json({ message: 'Không thể cập nhật suất chiếu.' });
        }

        res.status(200).json({ message: 'Suất chiếu đã được cập nhật thành công.' });

    } catch (error) {
        console.error('Lỗi khi cập nhật suất chiếu:', error);
        res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi cập nhật suất chiếu.' });
    }
};

// @route DELETE /api/showtimes/:id - NO CHANGES REQUIRED, logic is fine.
export const deleteShowtime = async (req, res) => {
    const { id } = req.params;
    try {
        const success = await Showtime.delete(id);

        if (!success) {
            return res.status(404).json({ message: 'Không tìm thấy suất chiếu để xóa hoặc không có gì bị xóa.' });
        }

        res.status(200).json({ message: 'Suất chiếu và tất cả dữ liệu liên quan đã được xóa thành công.' });

    } catch (error) {
        console.error('Lỗi khi xóa suất chiếu:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Không thể xóa suất chiếu do có ràng buộc dữ liệu. Vui lòng kiểm tra các đặt chỗ liên quan.' });
        }
        res.status(500).json({ message: error.message || 'Đã xảy ra lỗi server khi xóa suất chiếu.' });
    }
};