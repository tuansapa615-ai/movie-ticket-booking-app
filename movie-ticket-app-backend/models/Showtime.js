// // models/Showtime.js
// import {pool} from '../config/db.js';

// class Showtime {
    
//     constructor(id, movieId, hallId, startTime, endTime, basePrice, availableSeats, isFull) {
//         this.showtime_id = id;
//         this.movie_id = movieId;
//         this.hall_id = hallId;
//         this.start_time = startTime;
//         this.end_time = endTime;
//         this.base_price = basePrice;
//         this.available_seats = availableSeats;
//         this.is_full = isFull;
//     }

//     // Static method to create a new showtime
//     static async create(showtimeData) {
//         const { movie_id, hall_id, start_time, end_time, base_price } = showtimeData;
        
//         const [hallRows] = await pool.execute('SELECT capacity FROM halls WHERE hall_id = ?', [hall_id]);
//         if (hallRows.length === 0) {
//             throw new Error('Không tìm thấy phòng chiếu với hall_id đã cho.');
//         }
//         const hallCapacity = hallRows[0].capacity;

//         const [result] = await pool.execute(
//             'INSERT INTO showtimes (movie_id, hall_id, start_time, end_time, base_price, available_seats, is_full) VALUES (?, ?, ?, ?, ?, ?, ?)',
//             [movie_id, hall_id, start_time, end_time, base_price, hallCapacity, false]
//         );

//         if (result.affectedRows > 0) {
//             return new Showtime(result.insertId, movie_id, hall_id, start_time, end_time, base_price, hallCapacity, false);
//         }
//         return null;
//     }

//     // Static method to find all showtimes
//     static async findAll(filters = {}) {
//         let query = `
//             SELECT 
//                 st.showtime_id, st.movie_id, st.hall_id, st.start_time, st.end_time, st.base_price, st.available_seats, st.is_full,
//                 m.title as movie_title, m.poster_url, m.duration_minutes,
//                 h.name as hall_name, h.capacity as hall_capacity, h.screen_type,
//                 c.name as cinema_name, c.address as cinema_address, c.city as cinema_city
//             FROM showtimes st
//             JOIN movies m ON st.movie_id = m.movie_id
//             JOIN halls h ON st.hall_id = h.hall_id
//             JOIN cinemas c ON h.cinema_id = c.cinema_id
//             WHERE 1=1
//         `;
//         const queryParams = [];

//         if (filters.movieId) {
//             query += ' AND st.movie_id = ?';
//             queryParams.push(filters.movieId);
//         }
//         if (filters.hallId) {
//             query += ' AND st.hall_id = ?';
//             queryParams.push(filters.hallId);
//         }
//         if (filters.cinemaId) {
//             query += ' AND h.cinema_id = ?';
//             queryParams.push(filters.cinemaId);
//         }
//         if (filters.date) {
//             query += ' AND DATE(st.start_time) = ?';
//             queryParams.push(filters.date);
//         }
//         if (filters.minStartTime) {
//             query += ' AND st.start_time >= ?';
//             queryParams.push(filters.minStartTime);
//         }
//         if (filters.maxStartTime) {
//             query += ' AND st.start_time <= ?';
//             queryParams.push(filters.maxStartTime);
//         }

//         query += ' ORDER BY st.start_time ASC';

//         const [rows] = await pool.execute(query, queryParams);
//         // Khi findAll, vẫn trả về plain object vì không cần các phương thức instance ở đây
//         return rows.map(row => ({
//             showtime_id: row.showtime_id,
//             movie_id: row.movie_id,
//             hall_id: row.hall_id,
//             start_time: row.start_time,
//             end_time: row.end_time,
//             base_price: row.base_price,
//             available_seats: row.available_seats,
//             is_full: row.is_full,
//             movie_title: row.movie_title,
//             poster_url: row.poster_url,
//             duration_minutes: row.duration_minutes,
//             hall_name: row.hall_name,
//             hall_capacity: row.hall_capacity,
//             screen_type: row.screen_type,
//             cinema_name: row.cinema_name,
//             cinema_address: row.cinema_address,
//             cinema_city: row.cinema_city
//         }));
//     }

//     // Static method to find a showtime by ID
//     static async findById(id) {
//         const [rows] = await pool.execute(
//             `SELECT 
//                 st.showtime_id, st.movie_id, st.hall_id, st.start_time, st.end_time, st.base_price, st.available_seats, st.is_full
//             FROM showtimes st
//             WHERE st.showtime_id = ?`, [id]
//         );
//         if (rows.length === 0) {
//             return null;
//         }
//         const row = rows[0];
//         // SỬA LẠI: Trả về một instance của Showtime
//         return new Showtime(
//             row.showtime_id,
//             row.movie_id,
//             row.hall_id,
//             row.start_time,
//             row.end_time,
//             row.base_price,
//             row.available_seats,
//             row.is_full
//         );
//     }

//     // Instance method to update a showtime
//     async update() {
//         const [result] = await pool.execute(
//             'UPDATE showtimes SET movie_id = ?, hall_id = ?, start_time = ?, end_time = ?, base_price = ?, available_seats = ?, is_full = ? WHERE showtime_id = ?',
//             [this.movie_id, this.hall_id, this.start_time, this.end_time, this.base_price, this.available_seats, this.is_full, this.showtime_id]
//         );
//         return result.affectedRows > 0;
//     }

//     // Static method to delete a showtime by ID
//     static async delete(id) {
//         const connection = await pool.getConnection();
//         try {
//             await connection.beginTransaction();

//             const [bookings] = await connection.execute('SELECT booking_id FROM bookings WHERE showtime_id = ?', [id]);
//             const bookingIds = bookings.map(b => b.booking_id);

//             if (bookingIds.length > 0) {
//                 const placeholders = bookingIds.map(() => '?').join(', ');
//                 await connection.execute(`DELETE FROM booking_seats WHERE booking_id IN (${placeholders})`, bookingIds);
//                 await connection.execute(`DELETE FROM transactions WHERE booking_id IN (${placeholders})`, bookingIds);
//                 await connection.execute(`DELETE FROM tickets WHERE booking_id IN (${placeholders})`, bookingIds);
//             }

//             await connection.execute('DELETE FROM bookings WHERE showtime_id = ?', [id]);
//             const [result] = await connection.execute('DELETE FROM showtimes WHERE showtime_id = ?', [id]);

//             await connection.commit();
//             return result.affectedRows > 0;

//         } catch (error) {
//             await connection.rollback();
//             throw error;
//         } finally {
//             connection.release();
//         }
//     }

//     // Static method to check for time conflicts in the same hall
//     static async checkConflict(hallId, startTime, endTime, excludeShowtimeId = null) {
//         let query = `
//             SELECT COUNT(*) AS conflict_count
//             FROM showtimes
//             WHERE hall_id = ?
//             AND (
//                 (? < end_time AND ? > start_time) OR
//                 (? = start_time) OR
//                 (? = end_time)
//             )
//         `;
//         const queryParams = [hallId, startTime, endTime, startTime, endTime];

//         if (excludeShowtimeId) {
//             query += ' AND showtime_id != ?';
//             queryParams.push(excludeShowtimeId);
//         }

//         const [rows] = await pool.execute(query, queryParams);
//         return rows[0].conflict_count > 0;
//     }
// }

// export default Showtime;
// models/Showtime.js
import {pool} from '../config/db.js';

class Showtime {
    // 1. REMOVE basePrice from constructor
    constructor(id, movieId, hallId, startTime, endTime, availableSeats, isFull) {
        this.showtime_id = id;
        this.movie_id = movieId;
        this.hall_id = hallId;
        this.start_time = startTime;
        this.end_time = endTime;
        // this.base_price = basePrice; // REMOVED
        this.available_seats = availableSeats;
        this.is_full = isFull;
    }

    // Static method to create a new showtime
    static async create(showtimeData) {
        // 2. REMOVE base_price from destructuring
        const { movie_id, hall_id, start_time, end_time } = showtimeData; // REMOVED base_price
        
        const [hallRows] = await pool.execute('SELECT capacity FROM halls WHERE hall_id = ?', [hall_id]);
        if (hallRows.length === 0) {
            throw new Error('Không tìm thấy phòng chiếu với hall_id đã cho.');
        }
        const hallCapacity = hallRows[0].capacity;

        // 3. REMOVE base_price from INSERT query and values
        const [result] = await pool.execute(
            'INSERT INTO showtimes (movie_id, hall_id, start_time, end_time, available_seats, is_full) VALUES (?, ?, ?, ?, ?, ?)', // REMOVED base_price column
            [movie_id, hall_id, start_time, end_time, hallCapacity, false] // REMOVED base_price value
        );

        if (result.affectedRows > 0) {
            // 4. REMOVE basePrice from new Showtime instance creation
            return new Showtime(result.insertId, movie_id, hall_id, start_time, end_time, hallCapacity, false); // REMOVED basePrice
        }
        return null;
    }

    // Static method to find all showtimes
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                st.showtime_id, st.movie_id, st.hall_id, st.start_time, st.end_time, st.available_seats, st.is_full,
                m.title as movie_title, m.poster_url, m.duration_minutes,
                h.name as hall_name, h.capacity as hall_capacity, h.screen_type,
                c.name as cinema_name, c.address as cinema_address, c.city as cinema_city,
                stp.price as min_seat_price -- ADDED: Get a representative price from seat_type_prices
            FROM showtimes st
            JOIN movies m ON st.movie_id = m.movie_id
            JOIN halls h ON st.hall_id = h.hall_id
            JOIN cinemas c ON h.cinema_id = c.cinema_id
            LEFT JOIN (SELECT MIN(price) as price FROM seat_type_prices) stp ON 1=1 -- ADDED: Join to get minimum seat price
            WHERE 1=1
        `;
        const queryParams = [];

        if (filters.movieId) {
            query += ' AND st.movie_id = ?';
            queryParams.push(filters.movieId);
        }
        if (filters.hallId) {
            query += ' AND st.hall_id = ?';
            queryParams.push(filters.hallId);
        }
        if (filters.cinemaId) {
            query += ' AND h.cinema_id = ?';
            queryParams.push(filters.cinemaId);
        }
        if (filters.date) {
            query += ' AND DATE(st.start_time) = ?';
            queryParams.push(filters.date);
        }
        if (filters.minStartTime) {
            query += ' AND st.start_time >= ?';
            queryParams.push(filters.minStartTime);
        }
        if (filters.maxStartTime) {
            query += ' AND st.start_time <= ?';
            queryParams.push(filters.maxStartTime);
        }

        query += ' ORDER BY st.start_time ASC';

        const [rows] = await pool.execute(query, queryParams);
        return rows.map(row => ({
            showtime_id: row.showtime_id,
            movie_id: row.movie_id,
            hall_id: row.hall_id,
            start_time: row.start_time,
            end_time: row.end_time,
            // base_price: row.base_price, // REMOVED
            min_seat_price: row.min_seat_price, // ADDED: Representative price
            available_seats: row.available_seats,
            is_full: row.is_full,
            movie_title: row.movie_title,
            poster_url: row.poster_url,
            duration_minutes: row.duration_minutes,
            hall_name: row.hall_name,
            hall_capacity: row.hall_capacity,
            screen_type: row.screen_type,
            cinema_name: row.cinema_name,
            cinema_address: row.cinema_address,
            cinema_city: row.cinema_city
        }));
    }

    // Static method to find a showtime by ID
    static async findById(id) {
        const [rows] = await pool.execute(
            `SELECT 
                st.showtime_id, st.movie_id, st.hall_id, st.start_time, st.end_time, st.available_seats, st.is_full -- REMOVED base_price
            FROM showtimes st
            WHERE st.showtime_id = ?`, [id]
        );
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return new Showtime(
            row.showtime_id,
            row.movie_id,
            row.hall_id,
            row.start_time,
            row.end_time,
            // row.base_price, // REMOVED
            row.available_seats,
            row.is_full
        );
    }

    // Instance method to update a showtime
    async update() {
        // 5. REMOVE base_price from UPDATE query and values
        const [result] = await pool.execute(
            'UPDATE showtimes SET movie_id = ?, hall_id = ?, start_time = ?, end_time = ?, available_seats = ?, is_full = ? WHERE showtime_id = ?', // REMOVED base_price column
            [this.movie_id, this.hall_id, this.start_time, this.end_time, this.available_seats, this.is_full, this.showtime_id] // REMOVED base_price value
        );
        return result.affectedRows > 0;
    }

    // Static method to delete a showtime by ID - NO CHANGES REQUIRED, logic is fine.
    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [bookings] = await connection.execute('SELECT booking_id FROM bookings WHERE showtime_id = ?', [id]);
            const bookingIds = bookings.map(b => b.booking_id);

            if (bookingIds.length > 0) {
                const placeholders = bookingIds.map(() => '?').join(', ');
                await connection.execute(`DELETE FROM booking_seats WHERE booking_id IN (${placeholders})`, bookingIds);
                await connection.execute(`DELETE FROM transactions WHERE booking_id IN (${placeholders})`, bookingIds);
                await connection.execute(`DELETE FROM tickets WHERE booking_id IN (${placeholders})`, bookingIds);
            }

            await connection.execute('DELETE FROM bookings WHERE showtime_id = ?', [id]);
            const [result] = await connection.execute('DELETE FROM showtimes WHERE showtime_id = ?', [id]);

            await connection.commit();
            return result.affectedRows > 0;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Static method to check for time conflicts in the same hall - NO CHANGES REQUIRED, logic is fine.
    static async checkConflict(hallId, startTime, endTime, excludeShowtimeId = null) {
        let query = `
            SELECT COUNT(*) AS conflict_count
            FROM showtimes
            WHERE hall_id = ?
            AND (
                (? < end_time AND ? > start_time) OR
                (? = start_time) OR
                (? = end_time)
            )
        `;
        const queryParams = [hallId, startTime, endTime, startTime, endTime];

        if (excludeShowtimeId) {
            query += ' AND showtime_id != ?';
            queryParams.push(excludeShowtimeId);
        }

        const [rows] = await pool.execute(query, queryParams);
        return rows[0].conflict_count > 0;
    }
}

export default Showtime;