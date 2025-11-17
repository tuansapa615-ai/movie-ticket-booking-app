// controllers/movieController.js
import Movie from '../models/Movie.js';
import Showtime from '../models/Showtime.js';
import { pool } from '../config/db.js';
import { v2 as cloudinary } from '../config/cloudinaryConfig.js'; // <-- SỬA ĐỔI: Import Cloudinary từ file cấu hình

// Hàm trợ giúp để trích xuất public ID từ URL Cloudinary
// Hàm này vẫn cần thiết vì chúng ta sẽ xóa ảnh dựa trên URL đã lưu
const getPublicIdFromCloudinaryUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
        return null;
    }
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1 || uploadIndex + 2 >= parts.length) {
        return null;
    }
    const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.split('.')[0];
    return publicId;
};


// --- Add New Movie ---
export const addMovie = async (req, res) => {
    // Only allow admin or staff roles to perform this action
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ message: 'Bạn không có quyền để thêm phim mới.' });
    }

    const {
        title,
        description,
        duration_minutes,
        release_date,
        end_date,
        genre,
        director,
        cast,
        trailer_url,
        rating,
        display_status = 'coming_soon'
    } = req.body;

    // Poster URL sẽ được lấy từ req.file sau khi Multer xử lý
    const poster_url = req.file ? req.file.path : null; // req.file.path chứa secure_url từ CloudinaryStorage

    if (!title || !duration_minutes || !release_date || !genre || !poster_url) {
        // Nếu không có poster_url (không upload file), trả về lỗi
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ các thông tin bắt buộc: title, duration_minutes, release_date, genre, và ảnh poster.' });
    }

    try {
        let castJson = null;
        if (cast) {
            try {
                // Đảm bảo cast là JSON string nếu nó được gửi dưới dạng mảng/đối tượng
                castJson = JSON.stringify(cast);
            } catch (e) {
                console.warn('Could not stringify cast data, saving as null:', e);
                castJson = null;
            }
        }

        const movieId = await Movie.createMovie(
            title,
            description,
            duration_minutes,
            release_date,
            end_date,
            genre,
            director,
            castJson,
            poster_url, // Sử dụng URL từ req.file.path
            trailer_url,
            rating,
            display_status
        );

        res.status(201).json({
            message: 'Phim đã được thêm thành công!',
            movieId: movieId,
            posterUrl: poster_url // Trả về URL của poster đã upload
        });

    } catch (error) {
        console.error('Lỗi khi thêm phim mới:', error);
        // Nếu có lỗi, và ảnh đã được upload lên Cloudinary, nên xóa nó đi
        if (poster_url && poster_url.includes('res.cloudinary.com')) {
            const publicId = getPublicIdFromCloudinaryUrl(poster_url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId).catch(err => console.error('Error deleting uploaded image on addMovie error:', err));
            }
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi khi thêm phim mới.' });
    }
};

// --- Get All Movies ---

export const getAllMovies = async (req, res) => {
    // Lấy tất cả các tham số từ req.query
    const { limit, offset, sortBy, sortOrder, display_status, searchTerm } = req.query;
    console.log('Received display_status from frontend:', display_status);

    try {
        // Chuẩn bị object filters để truyền vào Movie.getAllMovies
        const filters = {
            limit: limit ? parseInt(limit) : undefined, // undefined để model dùng default nếu không có
            offset: offset ? parseInt(offset) : undefined,
            sortBy: sortBy,
            sortOrder: sortOrder,
            displayStatus: display_status, // Match with 'display_status' from frontend query
            searchTerm: searchTerm
        };

        const { movies, total, limit: actualLimit, offset: actualOffset } = await Movie.getAllMovies(filters);

        const processedMovies = movies.map(movie => {
            if (movie.cast && typeof movie.cast === 'string') {
                try {
                    movie.cast = JSON.parse(movie.cast);
                } catch (e) {
                    console.warn(`Could not parse cast for movie_id ${movie.movie_id}:`, e);
                    movie.cast = null;
                }
            }
            return movie;
        });

        res.status(200).json({
            movies: processedMovies,
            total,
            limit: actualLimit,
            offset: actualOffset
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phim:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách phim.' });
    }
};

// --- Get Movie by ID ---
export const getMovieById = async (req, res) => {
    const { id } = req.params;

    try {
        const movie = await Movie.findById(id);

        if (!movie) {
            return res.status(404).json({ message: 'Không tìm thấy phim.' });
        }

        res.status(200).json(movie);
    } catch (error) {
        console.error('Lỗi khi lấy phim theo ID:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy phim theo ID.' });
    }
};

// --- Update Movie ---
export const updateMovie = async (req, res) => {
    console.log('--- Start updateMovie controller ---');
    console.log('User Role:', req.user.role);
    console.log('Movie ID:', req.params.id);
    console.log('Raw Request Body:', req.body); // Dữ liệu text từ form-data
    console.log('Request File (from Multer):', req.file); // Dữ liệu file từ Multer

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ message: 'Bạn không có quyền để cập nhật phim.' });
    }

    const { id } = req.params;
    // SỬA ĐỔI: Trim keys từ req.body
    const updateData = {};
    for (const key in req.body) {
        if (Object.hasOwnProperty.call(req.body, key)) {
            updateData[key.trim()] = req.body[key]; // Cắt bỏ khoảng trắng ở đây
        }
    }
    console.log('Trimmed updateData from Body:', updateData);


    try {
        const existingMovie = await Movie.findById(id);
        console.log('Existing Movie from DB:', existingMovie);

        if (!existingMovie) {
            return res.status(404).json({ message: 'Không tìm thấy phim để cập nhật.' });
        }

        // Xử lý upload ảnh mới và xóa ảnh cũ nếu có
        if (req.file) { // Nếu có file mới được gửi lên
            const newPosterUrl = req.file.path; // URL của ảnh mới đã upload lên Cloudinary
            console.log('New Poster URL from Multer:', newPosterUrl);

            // Xóa ảnh cũ trên Cloudinary nếu nó tồn tại và là ảnh của Cloudinary
            if (existingMovie.poster_url && existingMovie.poster_url.includes('res.cloudinary.com')) {
                const oldPublicId = getPublicIdFromCloudinaryUrl(existingMovie.poster_url);
                const newPublicId = getPublicIdFromCloudinaryUrl(newPosterUrl); // Lấy publicId của ảnh mới để so sánh

                if (oldPublicId && oldPublicId !== newPublicId) { // Chỉ xóa nếu là ảnh Cloudinary và khác ảnh mới
                    console.log('Deleting old Cloudinary image:', oldPublicId);
                    await cloudinary.uploader.destroy(oldPublicId);
                    console.log('Old Cloudinary image deleted successfully.');
                } else if (oldPublicId && oldPublicId === newPublicId) {
                    console.log('New image is same as old image, skipping deletion of old image.');
                } else {
                    console.log('Old poster_url is not a Cloudinary URL or publicId is null, skipping deletion.');
                }
            }
            updateData.poster_url = newPosterUrl; // Cập nhật poster_url trong updateData
            console.log('updateData.poster_url set to new URL:', updateData.poster_url);

        } else if (Object.hasOwnProperty.call(updateData, 'poster_url') && updateData.poster_url === '') { // Kiểm tra nếu frontend gửi poster_url là chuỗi rỗng
            console.log('Frontend requested to clear poster_url.');
            if (existingMovie.poster_url && existingMovie.poster_url.includes('res.cloudinary.com')) {
                const oldPublicId = getPublicIdFromCloudinaryUrl(existingMovie.poster_url);
                if (oldPublicId) {
                    console.log('Deleting Cloudinary image because poster_url was set to empty:', oldPublicId);
                    await cloudinary.uploader.destroy(oldPublicId);
                    console.log('Cloudinary image deleted successfully (set to empty).');
                }
            }
            updateData.poster_url = null; // Đặt về null trong database
            console.log('updateData.poster_url set to null.');
        }
        // Nếu không có req.file và updateData.poster_url không có trong body (người dùng không gửi file và không muốn xóa),
        // thì không cần làm gì với poster_url trong updateData, nó sẽ giữ nguyên giá trị cũ trong DB.


        // Xử lý trường cast: đảm bảo nó được lưu dưới dạng JSON string trong DB
        // Frontend gửi `cast` dưới dạng chuỗi "Diễn viên 1, Diễn viên 2" hoặc mảng JSON stringify
        if (Object.hasOwnProperty.call(updateData, 'cast')) { // Chỉ xử lý nếu 'cast' tồn tại trong updateData
            let processedCast = null;
            if (updateData.cast !== null && updateData.cast !== undefined && updateData.cast !== '') {
                try {
                    // Cố gắng parse JSON nếu nó đã là JSON string
                    processedCast = JSON.parse(updateData.cast);
                } catch (e) {
                    // Nếu không phải JSON, giả định là chuỗi comma-separated
                    processedCast = updateData.cast.split(',').map(item => item.trim()).filter(item => item !== '');
                }
            }
            // Đảm bảo cast là mảng trước khi stringify, hoặc null
            if (Array.isArray(processedCast)) {
                updateData.cast = JSON.stringify(processedCast);
            } else {
                 // Nếu không phải mảng sau khi xử lý, đặt về null
                 updateData.cast = null;
            }
        } else {
             // Nếu trường 'cast' không được gửi trong request body, không thay đổi nó
             // hoặc xóa nó khỏi updateData nếu bạn không muốn nó bị cập nhật
             delete updateData.cast; // Giữ nguyên giá trị cũ trong DB nếu không được gửi
        }
        console.log('Processed cast data for DB:', updateData.cast);


        console.log('Final updateData object sent to Movie.updateMovie:', updateData);
        const affectedRows = await Movie.updateMovie(id, updateData);
        console.log('Affected Rows from Movie.updateMovie:', affectedRows);


        if (affectedRows === 0) {
            // Kiểm tra xem liệu có phải không có sự thay đổi dữ liệu hoặc phim không tồn tại
            const latestMovie = await Movie.findById(id);
            const isDataUnchanged = Object.keys(updateData).every(key => {
                // Chú ý: cần so sánh phức tạp hơn cho object/array (cast)
                if (key === 'cast') {
                    try {
                        return JSON.stringify(updateData.cast) === JSON.stringify(latestMovie.cast);
                    } catch (e) {
                        return updateData.cast === latestMovie.cast; // Fallback
                    }
                }
                // Chuyển đổi ngày tháng về định dạng so sánh được
                if (key === 'release_date' || key === 'end_date') {
                    const updatedDate = updateData[key] ? new Date(updateData[key]).toISOString().split('T')[0] : null;
                    const existingDate = latestMovie[key] ? new Date(latestMovie[key]).toISOString().split('T')[0] : null;
                    return updatedDate === existingDate;
                }
                // Poster URL: cần xử lý null/undefined
                if (key === 'poster_url') {
                    return (updateData[key] || null) === (latestMovie[key] || null);
                }
                return String(updateData[key]) === String(latestMovie[key]);
            });

            if (isDataUnchanged && latestMovie) {
                return res.status(200).json({ message: 'Không có thông tin nào được cập nhật vì dữ liệu đã giống với hiện tại.' });
            } else {
                return res.status(400).json({ message: 'Không có thông tin nào được cập nhật hoặc không tìm thấy phim.' });
            }
        }

        res.status(200).json({ message: 'Phim đã được cập nhật thành công!' });
        console.log('--- End updateMovie controller ---');

    } catch (error) {
        console.error('Lỗi khi cập nhật phim:', error);
        // Nếu có lỗi và có ảnh mới được upload, nên xóa nó đi
        if (req.file && req.file.path && req.file.path.includes('res.cloudinary.com')) {
             const newPublicId = getPublicIdFromCloudinaryUrl(req.file.path);
             if (newPublicId) {
                 await cloudinary.uploader.destroy(newPublicId).catch(err => console.error('Error deleting newly uploaded image on updateMovie error:', err));
             }
         }
        res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật phim.' });
        console.log('--- updateMovie controller ended with error ---');
    }
};

// --- Delete Movie ---
export const deleteMovie = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bạn không có quyền để xóa phim.' });
    }

    const { id } = req.params;

    try {
        // Kiểm tra xem có suất chiếu liên quan không trước khi xóa phim
        const [showtimeCount] = await pool.execute('SELECT COUNT(*) AS count FROM showtimes WHERE movie_id = ?', [id]);
        if (showtimeCount[0].count > 0) {
            return res.status(400).json({ message: 'Không thể xóa phim vì có suất chiếu liên quan. Vui lòng xóa các suất chiếu trước.' });
        }

        // Lấy thông tin phim để lấy poster_url
        const movieToDelete = await Movie.findById(id);
        if (!movieToDelete) {
            return res.status(404).json({ message: 'Không tìm thấy phim để xóa.' });
        }

        // Xóa ảnh cũ trên Cloudinary nếu có
        if (movieToDelete.poster_url && movieToDelete.poster_url.includes('res.cloudinary.com')) {
            const publicId = getPublicIdFromCloudinaryUrl(movieToDelete.poster_url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log('Cloudinary image deleted for movie:', publicId);
            }
        }

        // Tiến hành xóa phim khỏi database
        const affectedRows = await Movie.deleteMovie(id);

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy phim để xóa (sau khi kiểm tra).' });
        }

        res.status(200).json({ message: 'Phim đã được xóa thành công!' });

    } catch (error) {
        console.error('Lỗi khi xóa phim:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa phim.' });
    }
};


