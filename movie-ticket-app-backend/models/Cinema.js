// models/Cinema.js
import {pool} from '../config/db.js';

class Cinema {
    constructor(id, name, address, city, contact_number, google_maps_url, opening_hours) {
        this.cinema_id = id;
        this.name = name;
        this.address = address;
        this.city = city;
        this.contact_number = contact_number;
        this.google_maps_url = google_maps_url;
        this.opening_hours = opening_hours;
    }

    // Static method to create a new cinema
    static async create(cinemaData) {
        const { name, address, city, contact_number, google_maps_url, opening_hours } = cinemaData;
        const [result] = await pool.execute(
            'INSERT INTO cinemas (name, address, city, contact_number, google_maps_url, opening_hours) VALUES (?, ?, ?, ?, ?, ?)',
            [name, address, city, contact_number || null, google_maps_url || null, opening_hours || null]
        );
        if (result.affectedRows > 0) {
            return new Cinema(result.insertId, name, address, city, contact_number, google_maps_url, opening_hours);
        }
        return null;
    }

    // Static method to find all cinemas
    static async findAll() {
        const [rows] = await pool.execute('SELECT * FROM cinemas');
        return rows.map(row => new Cinema(
            row.cinema_id,
            row.name,
            row.address,
            row.city,
            row.contact_number,
            row.google_maps_url,
            row.opening_hours
        ));
    }

    // Static method to find a cinema by ID
    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM cinemas WHERE cinema_id = ?', [id]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return new Cinema(
            row.cinema_id,
            row.name,
            row.address,
            row.city,
            row.contact_number,
            row.google_maps_url,
            row.opening_hours
        );
    }

    // Instance method to update a cinema
    async update() {
        const [result] = await pool.execute(
            'UPDATE cinemas SET name = ?, address = ?, city = ?, contact_number = ?, google_maps_url = ?, opening_hours = ? WHERE cinema_id = ?',
            [this.name, this.address, this.city, this.contact_number || null, this.google_maps_url || null, this.opening_hours || null, this.cinema_id]
        );
        return result.affectedRows > 0;
    }

    // Static method to delete a cinema by ID
    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [halls] = await connection.execute('SELECT hall_id FROM halls WHERE cinema_id = ?', [id]);
            const hallIds = halls.map(hall => hall.hall_id);

            if (hallIds.length > 0) {
                // Tạo chuỗi placeholders (?, ?, ...) dựa trên số lượng hallIds
                const placeholders = hallIds.map(() => '?').join(', ');

                // Xóa booking_seats liên quan
                await connection.execute(`
                    DELETE bs FROM booking_seats bs
                    JOIN bookings b ON bs.booking_id = b.booking_id
                    JOIN showtimes st ON b.showtime_id = st.showtime_id
                    WHERE st.hall_id IN (${placeholders})
                `, hallIds); // <-- Truyền mảng hallIds trực tiếp ở đây

                // Xóa bookings liên quan
                await connection.execute(`
                    DELETE b FROM bookings b
                    JOIN showtimes st ON b.showtime_id = st.showtime_id
                    WHERE st.hall_id IN (${placeholders})
                `, hallIds); // <-- Truyền mảng hallIds trực tiếp ở đây

                // Xóa showtimes
                await connection.execute(`DELETE FROM showtimes WHERE hall_id IN (${placeholders})`, hallIds); // <-- Truyền mảng hallIds trực tiếp ở đây
                
                // Xóa seats
                await connection.execute(`DELETE FROM seats WHERE hall_id IN (${placeholders})`, hallIds); // <-- Truyền mảng hallIds trực tiếp ở đây

                // Xóa halls
                await connection.execute('DELETE FROM halls WHERE cinema_id = ?', [id]);
            }
            
            const [result] = await connection.execute('DELETE FROM cinemas WHERE cinema_id = ?', [id]);

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

export default Cinema;