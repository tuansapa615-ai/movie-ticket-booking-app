// models/SeatTypePrice.js
import { pool } from '../config/db.js';

class SeatTypePrice {
    constructor(id, seatType, price) {
        this.seat_type_price_id = id;
        this.seat_type = seatType;
        this.price = price;
    }

    /**
     * Retrieves the price for a specific seat type.
     * @param {string} seatType - The type of seat ('standard', 'vip', 'couple').
     * @returns {Promise<number|null>} The price of the seat type, or null if not found.
     * @throws {Error} If there's a database error.
     */
    static async getPriceByType(seatType) {
        try {
            const [rows] = await pool.execute('SELECT price FROM seat_type_prices WHERE seat_type = ?', [seatType]);
            if (rows.length === 0) {
                return null;
            }
            return parseFloat(rows[0].price);
        } catch (error) {
            console.error('Error in SeatTypePrice.getPriceByType:', error);
            throw error;
        }
    }

    /**
     * Retrieves all seat types and their prices.
     * @returns {Promise<Array<object>>} A list of seat type price objects.
     * @throws {Error} If there's a database error.
     */
    static async findAll() {
        try {
            const [rows] = await pool.execute('SELECT * FROM seat_type_prices ORDER BY price ASC');
            return rows.map(row => new SeatTypePrice(
                row.seat_type_price_id,
                row.seat_type,
                parseFloat(row.price)
            ));
        } catch (error) {
            console.error('Error in SeatTypePrice.findAll:', error);
            throw error;
        }
    }

    // You might want to add methods for admin to update/create these prices if needed in the future
    /*
    static async create(seatType, price) { ... }
    static async update(id, newPrice) { ... }
    */
}

export default SeatTypePrice;