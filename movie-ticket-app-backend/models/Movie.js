// models/Movie.js
import { pool } from '../config/db.js';

class Movie {
    static async getMovieById(id) { // Renamed from findById to avoid conflict
        const [rows] = await pool.execute('SELECT * FROM movies WHERE movie_id = ?', [id]);
        return rows[0];
    }
    static async createMovie(title, description, durationMinutes, releaseDate, endDate, genre, director, cast, posterUrl, trailerUrl, rating, displayStatus) {
        const query = `
            INSERT INTO movies (title, description, duration_minutes, release_date, end_date, genre, director, cast, poster_url, trailer_url, rating, display_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // Đảm bảo cast được stringify tại đây nếu nó được truyền dưới dạng mảng/đối tượng
        const values = [title, description, durationMinutes, releaseDate, endDate, genre, director, cast, posterUrl, trailerUrl, rating, displayStatus];
        const [result] = await pool.execute(query, values);
        return result.insertId;
    }

    static async findById(movieId) {
        const query = 'SELECT * FROM movies WHERE movie_id = ?';
        const [rows] = await pool.execute(query, [movieId]);
        if (rows[0] && rows[0].cast) {
            try {
                rows[0].cast = JSON.parse(rows[0].cast);
            } catch (e) {
                console.warn(`Could not parse cast for movie_id ${movieId}:`, e);
                rows[0].cast = null;
            }
        }
        return rows[0];
    }

    static async getAllMovies({ 
        limit = 1000000000, 
        offset = 0, 
        sortBy = 'title', 
        sortOrder = 'ASC', 
        displayStatus = '', // Thêm tham số displayStatus
        searchTerm = ''      // Thêm tham số searchTerm
    } = {}) {
        const validSortColumns = ['title', 'release_date', 'rating', 'duration_minutes']; // 'avg_rating' is not a direct column, use 'rating'
        if (!validSortColumns.includes(sortBy)) {
            sortBy = 'title';
        }
        const validSortOrders = ['ASC', 'DESC'];
        if (!validSortOrders.includes(sortOrder.toUpperCase())) {
            sortOrder = 'ASC';
        }

        let whereClauses = [];
        const queryParams = [];

        // Add display_status filter
        if (displayStatus) {
             console.log('Applying display_status filter:', displayStatus);
            whereClauses.push('display_status = ?');
            queryParams.push(displayStatus);
        }

        // Add searchTerm filter (case-insensitive search on title and description)
        if (searchTerm) {
            whereClauses.push('(title LIKE ? OR description LIKE ?)');
            queryParams.push(`%${searchTerm}%`);
            queryParams.push(`%${searchTerm}%`);
        }

        let whereClauseString = '';
        if (whereClauses.length > 0) {
            whereClauseString = ` WHERE ${whereClauses.join(' AND ')}`;
        }

        const query = `
            SELECT * FROM movies
            ${whereClauseString}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
       
        // Add limit and offset to queryParams
        queryParams.push(limit);
        queryParams.push(offset);

        // For total count
        const countQuery = `
            SELECT COUNT(*) AS total FROM movies
            ${whereClauseString}
        `;
        // Pass only the filtering parameters for count query
        const countQueryParams = queryParams.slice(0, queryParams.length - 2); 


        const [movies] = await pool.execute(query, queryParams);
        const [countRows] = await pool.execute(countQuery, countQueryParams);
        const total = countRows[0].total;


        return {
            movies: movies.map(movie => {
                if (movie.cast) {
                    try {
                        movie.cast = JSON.parse(movie.cast);
                    } catch (e) {
                        console.warn(`Could not parse cast for movie_id ${movie.movie_id}:`, e);
                        movie.cast = null;
                    }
                }
                return movie;
            }),
            total,
            limit,
            offset
        };
    }

    // SỬA ĐỔI LỚN HÀM NÀY
    static async updateMovie(movieId, updateData) { // Nhận toàn bộ updateData object
        const updates = [];
        const values = [];

        // Các tên cột trong DB của bạn phải khớp chính xác với các key trong updateData
        // (đã được xử lý trim() và định dạng cast/poster_url trong controller)
        const validColumns = [
            'title', 'description', 'duration_minutes', 'release_date', 'end_date',
            'genre', 'director', 'cast', 'poster_url', 'trailer_url', 'rating', 'display_status'
        ];

        for (const key of validColumns) {
            // Kiểm tra nếu updateData có thuộc tính này (không phải undefined)
            // và không phải là null (nếu bạn muốn cho phép cập nhật thành null)
            if (updateData[key] !== undefined) {
                updates.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        }

        // Logging để kiểm tra các phần tử updates và values được tạo
        console.log('Movie Model: Updates array:', updates);
        console.log('Movie Model: Values array:', values);

        if (updates.length === 0) {
            console.log('Movie Model: No columns to update, returning affectedRows: 0.');
            return { affectedRows: 0 };
        }

        const query = `UPDATE movies SET ${updates.join(', ')} WHERE movie_id = ?`;
        values.push(movieId); // Thêm movieId vào cuối mảng values

        console.log('Movie Model: SQL Query:', query);
        console.log('Movie Model: SQL Values:', values);

        const [result] = await pool.execute(query, values);
        return result.affectedRows; // Trả về số hàng bị ảnh hưởng
    }

    static async deleteMovie(movieId) {
        const query = 'DELETE FROM movies WHERE movie_id = ?';
        const [result] = await pool.execute(query, [movieId]);
        return result.affectedRows;
    }
}

export default Movie;