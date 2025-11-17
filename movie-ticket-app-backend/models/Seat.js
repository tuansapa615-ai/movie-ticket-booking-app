// models/Seat.js
import { pool } from '../config/db.js';

class Seat {
    constructor(seatId, hallId, seatRow, seatNumber, seatType) {
        this.seat_id = seatId;
        this.hall_id = hallId;
        this.seat_row = seatRow;
        this.seat_number = seatNumber;
        this.seat_type = seatType;
       
    }

    /**
     * Finds all seats belonging to a specific hall.
     * @param {number} hallId - The ID of the hall.
     * @returns {Promise<Seat[]>} A promise that resolves to an array of Seat objects.
     */
    static async findByHallId(hallId) {
        const query = 'SELECT * FROM seats WHERE hall_id = ? ORDER BY seat_row, seat_number';
        const [rows] = await pool.execute(query, [hallId]);
        return rows.map(row => new Seat(
            row.seat_id,
            row.hall_id,
            row.seat_row,
            row.seat_number,
            row.seat_type,
        ));
    }

    /**
     * Finds a single seat by its ID.
     * @param {number} seatId - The ID of the seat.
     * @returns {Promise<Seat|null>} A promise that resolves to a Seat object or null if not found.
     */
    static async findById(seatId) {
        const query = 'SELECT * FROM seats WHERE seat_id = ?';
        const [rows] = await pool.execute(query, [seatId]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return new Seat(
            row.seat_id,
            row.hall_id,
            row.seat_row,
            row.seat_number,
            row.seat_type,
        );
    }

        /**
     * Creates a new seat in the database.
     * @param {object} seatData - Object containing seat details (hall_id, seat_row, seat_number, seat_type, x_position, y_position).
     * @returns {Promise<Seat|null>} A promise that resolves to the newly created Seat object or null on failure.
     */
    static async create(seatData) {
        // 2. REMOVE x_position, y_position from destructuring and INSERT query
        const { hall_id, seat_row, seat_number, seat_type } = seatData;
        const query = `
            INSERT INTO seats (hall_id, seat_row, seat_number, seat_type)
            VALUES (?, ?, ?, ?) -- REMOVED x_position, y_position placeholders
        `;
        try {
            const [result] = await pool.execute(query, [hall_id, seat_row, seat_number, seat_type]); // REMOVED x_position, y_position values
            if (result.affectedRows > 0) {
                return new Seat(
                    result.insertId,
                    hall_id,
                    seat_row,
                    seat_number,
                    seat_type,
                );
            }
            return null;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ghế này đã tồn tại trong phòng chiếu này (hàng và số ghế bị trùng).');
            }
            throw error;
        }
    }
    // static async create(seatData) {
    //     const { hall_id, seat_row, seat_number, seat_type } = seatData; // Đảm bảo đã destructuring đúng là y_position
    //     const query = `
    //         INSERT INTO seats (hall_id, seat_row, seat_number, seat_type)
    //         VALUES (?, ?, ?, ?, ?, ?)
    //     `;
    //     try {
    //         // Sửa từ yPosition thành y_position
    //         const [result] = await pool.execute(query, [hall_id, seat_row, seat_number, seat_type,]);
    //         if (result.affectedRows > 0) {
    //             return new Seat(
    //                 result.insertId,
    //                 hall_id,
    //                 seat_row,
    //                 seat_number,
    //                 seat_type,
              
    //             );
    //         }
    //         return null;
    //     } catch (error) {
    //         if (error.code === 'ER_DUP_ENTRY') {
    //             throw new Error('Ghế này đã tồn tại trong phòng chiếu này (hàng và số ghế bị trùng).');
    //         }
    //         throw error;
    //     }
    // }

    /**
     * Updates an existing seat in the database.
     * @param {number} seatId - The ID of the seat to update.
     * @param {object} updateData - Object containing fields to update.
     * @returns {Promise<boolean>} A promise that resolves to true if updated, false otherwise.
     */
    static async update(seatId, updateData) {
        const updates = [];
        const values = [];

        // Define allowed updatable fields
        const validFields = ['hall_id', 'seat_row', 'seat_number', 'seat_type'];

        for (const field of validFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) {
            return false; // No fields to update
        }

        const query = `UPDATE seats SET ${updates.join(', ')} WHERE seat_id = ?`;
        values.push(seatId);

        try {
            const [result] = await pool.execute(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            // Check for duplicate entry error during update
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ghế này đã tồn tại trong phòng chiếu này (hàng và số ghế bị trùng).');
            }
            throw error; // Re-throw other errors
        }
    }

    /**
     * Deletes a seat from the database.
     * @param {number} seatId - The ID of the seat to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if deleted, false otherwise.
     */
    static async delete(seatId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if there are any bookings for this seat (via booking_seats)
            const [bookingSeats] = await connection.execute('SELECT booking_seat_id FROM booking_seats WHERE seat_id = ?', [seatId]);

            if (bookingSeats.length > 0) {
                // If there are associated booking_seats, we cannot just delete the seat
                // You might want to throw an error, or update the related bookings/showtimes
                // For now, let's just disallow deletion if booked seats exist to prevent data integrity issues.
                throw new Error('Không thể xóa ghế vì có dữ liệu đặt chỗ liên quan.');
            }

            const [result] = await connection.execute('DELETE FROM seats WHERE seat_id = ?', [seatId]);
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

export default Seat;
