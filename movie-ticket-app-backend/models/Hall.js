// models/Hall.js
import {pool} from '../config/db.js';

class Hall {
    constructor(id, cinemaId, name, capacity, screenType, seatMap) {
        this.hall_id = id;
        this.cinema_id = cinemaId;
        this.name = name;
        this.capacity = capacity;
        this.screen_type = screenType;
        this.seat_map = seatMap; // seat_map là JSON string
    }
    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM halls WHERE hall_id = ?', [id]);
        return rows[0];
    }
    // Static method to create a new hall
    static async create(hallData) {
        const { cinema_id, name, capacity, screen_type, seat_map } = hallData;
        const [result] = await pool.execute(
            'INSERT INTO halls (cinema_id, name, capacity, screen_type, seat_map) VALUES (?, ?, ?, ?, ?)',
            [cinema_id, name, capacity, screen_type || '2D', seat_map ? JSON.stringify(seat_map) : null]
        );
        if (result.affectedRows > 0) {
            return new Hall(result.insertId, cinema_id, name, capacity, screen_type, seat_map);
        }
        return null;
    }

    // Static method to find all halls (optionally by cinema_id)
    static async findAll(cinemaId = null) {
        let query = 'SELECT * FROM halls';
        const queryParams = [];
        if (cinemaId) {
            query += ' WHERE cinema_id = ?';
            queryParams.push(cinemaId);
        }
        query += ' ORDER BY cinema_id, name ASC'; // Sắp xếp để dễ nhìn
        const [rows] = await pool.execute(query, queryParams);
        return rows.map(row => new Hall(
            row.hall_id,
            row.cinema_id,
            row.name,
            row.capacity,
            row.screen_type,
            row.seat_map ? JSON.parse(row.seat_map) : null // Parse JSON string back to object
        ));
    }

    // Static method to find a hall by ID
    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM halls WHERE hall_id = ?', [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return new Hall(
            row.hall_id,
            row.cinema_id,
            row.name,
            row.capacity,
            row.screen_type,
            row.seat_map ? JSON.parse(row.seat_map) : null
        );
    }

    // Instance method to update a hall
    async update() {
        const [result] = await pool.execute(
            'UPDATE halls SET cinema_id = ?, name = ?, capacity = ?, screen_type = ?, seat_map = ? WHERE hall_id = ?',
            [this.cinema_id, this.name, this.capacity, this.screen_type, this.seat_map ? JSON.stringify(this.seat_map) : null, this.hall_id]
        );
        return result.affectedRows > 0;
    }

    // Static method to delete a hall by ID
    // Cần xử lý các ràng buộc khóa ngoại (showtimes, seats)
    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Bước 1: Xóa các booking_seats liên quan đến showtimes trong hall này
            await connection.execute(`
                DELETE bs FROM booking_seats bs
                JOIN bookings b ON bs.booking_id = b.booking_id
                WHERE b.showtime_id IN (SELECT showtime_id FROM showtimes WHERE hall_id = ?)
            `, [id]);

            // Bước 2: Xóa các bookings liên quan đến showtimes trong hall này
            await connection.execute(`
                DELETE FROM bookings
                WHERE showtime_id IN (SELECT showtime_id FROM showtimes WHERE hall_id = ?)
            `, [id]);

            // Bước 3: Xóa các showtimes liên quan đến hall này
            await connection.execute('DELETE FROM showtimes WHERE hall_id = ?', [id]);

            // Bước 4: Xóa các seats liên quan đến hall này
            await connection.execute('DELETE FROM seats WHERE hall_id = ?', [id]);

            // Bước 5: Xóa hall
            const [result] = await connection.execute('DELETE FROM halls WHERE hall_id = ?', [id]);

            await connection.commit();
            return result.affectedRows > 0;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default Hall;