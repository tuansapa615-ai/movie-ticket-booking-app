// models/Booking.js
import { pool } from '../config/db.js'; // Đảm bảo import đúng từ config/db.js

class Booking {
    /**
     * Retrieves available seats for a specific showtime.
     * Calls the `sp_get_available_seats` stored procedure.
     * @param {number} showtimeId - The ID of the showtime.
     * @returns {Promise<Array<object>>} A list of seat objects with their status.
     * @throws {Error} If there's a database error.
     */
    static async getAvailableSeats(showtimeId) {
        try {
            const [rows] = await pool.execute('CALL sp_get_available_seats(?)', [showtimeId]);
            return rows[0];
        } catch (error) {
            console.error('Error in Booking.getAvailableSeats:', error);
            throw error;
        }
    }

    /**
     * Retrieves all available food items.
     * Calls the `sp_get_food_items` stored procedure.
     * @returns {Promise<Array<object>>} A list of food item objects.
     * @throws {Error} If there's a database error.
     */
    static async getFoodItems() {
        try {
            const [rows] = await pool.execute('CALL sp_get_food_items()');
            return rows[0];
        } catch (error) {
            console.error('Error in Booking.getFoodItems:', error);
            throw error;
        }
    }

    /**
     * Creates a new booking in pending status using direct SQL queries.
     * @param {number} userId - The ID of the user.
     * @param {number} showtimeId - The ID of the showtime.
     * @param {Array<number>} seatIds - An array of seat IDs.
     * @param {Array<object>} foodItems - An array of food item objects [{item_id, quantity}].
     * @returns {Promise<object>} The created booking details (booking_id, status, total_amount).
     * @throws {Error} If there's a database error or validation error.
     */
    static async createBooking(userId, showtimeId, seatIds, foodItems = []) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get showtime and hall capacity
            const [showtimeRows] = await connection.execute(
                'SELECT hall_id, available_seats FROM showtimes WHERE showtime_id = ? FOR UPDATE',
                [showtimeId]
            );

            if (showtimeRows.length === 0) {
                throw new Error('Showtime not found.');
            }
            const { hall_id, available_seats } = showtimeRows[0];

            if (!Array.isArray(seatIds) || seatIds.length === 0) {
                throw new Error('Seat IDs must be a non-empty array.');
            }

            if (seatIds.length > available_seats) {
                throw new Error('Not enough seats available for this showtime.');
            }

            // 2. Validate seats against the hall and current bookings
            for (const seatId of seatIds) {
                const [seatRows] = await connection.execute(
                    'SELECT seat_id FROM seats WHERE seat_id = ? AND hall_id = ?',
                    [seatId, hall_id]
                );

                if (seatRows.length === 0) {
                    throw new Error(`Seat ${seatId} is invalid for this showtime.`);
                }

                const [bookedSeatRows] = await connection.execute(
                    `SELECT bs.seat_id FROM booking_seats bs
                    JOIN bookings b ON bs.booking_id = b.booking_id
                    WHERE bs.seat_id = ? AND b.showtime_id = ? AND b.status IN ('confirmed', 'pending')`,
                    [seatId, showtimeId]
                );

                if (bookedSeatRows.length > 0) {
                    throw new Error(`Seat ${seatId} is already booked or pending for this showtime.`);
                }
            }

            let totalAmount = 0.00; // Initialize total amount for food items

            // 3. Calculate total amount for food items
            let foodItemsJson = null;
            if (foodItems && foodItems.length > 0) {
                foodItemsJson = JSON.stringify(foodItems);
                for (const foodItem of foodItems) {
                    const [foodRows] = await connection.execute(
                        'SELECT price FROM food_items WHERE item_id = ? AND is_available = 1',
                        [foodItem.item_id]
                    );

                    if (foodRows.length === 0 || foodItem.quantity <= 0) {
                        throw new Error('Invalid food item or quantity.');
                    }
                    totalAmount += parseFloat(foodRows[0].price) * foodItem.quantity;
                }
            }

            // 4. Insert the main booking record first with a temporary total_amount
            const [bookingResult] = await connection.execute(
                'INSERT INTO bookings (user_id, showtime_id, total_amount, status, food_items) VALUES (?, ?, ?, ?, ?)',
                [userId, showtimeId, totalAmount, 'pending', foodItemsJson]
            );
            const bookingId = bookingResult.insertId;

            // 5. Insert booking_seats records (trigger will set price)
            for (const seatId of seatIds) {
                await connection.execute(
                    'INSERT INTO booking_seats (booking_id, seat_id) VALUES (?, ?)',
                    [bookingId, seatId]
                );
            }

            // 6. Calculate the final total_amount after booking_seats are inserted (with prices)
            const [calculatedSeatPriceRows] = await connection.execute(
                'SELECT SUM(price) as seat_total FROM booking_seats WHERE booking_id = ?',
                [bookingId]
            );
            const seatTotal = parseFloat(calculatedSeatPriceRows[0].seat_total || 0);
            totalAmount += seatTotal;

            // 7. Update the main booking record with the final calculated total_amount
            await connection.execute(
                'UPDATE bookings SET total_amount = ? WHERE booking_id = ?',
                [totalAmount, bookingId]
            );

            await connection.commit();
            return { booking_id: bookingId, status: 'pending', total_amount: totalAmount.toFixed(2) };

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error in Booking.createBooking (Direct SQL):', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Finds a booking by its ID.
     * @param {number} bookingId - The ID of the booking.
     * @returns {Promise<object|null>} The booking object or null if not found.
     * @throws {Error} If there's a database error.
     */
    static async findById(bookingId) {
        try {
            const [rows] = await pool.execute('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
            if (rows.length === 0) {
                return null;
            }
            const booking = rows[0];
            if (booking.food_items) {
                try {
                    booking.food_items = JSON.parse(booking.food_items);
                } catch (e) {
                    console.warn('Failed to parse food_items for booking:', booking.booking_id, e);
                    booking.food_items = [];
                }
            }
            return booking;
        } catch (error) {
            console.error('Error in Booking.findById:', error);
            throw error;
        }
    }

    /**
     * Updates the status of a booking and creates a transaction record.
     * This function is designed to be called after a payment gateway confirms payment.
     * @param {number} bookingId - The ID of the booking to update.
     * @param {string} status - The new status ('confirmed', 'cancelled', 'completed').
     * @param {string} paymentMethod - The payment method used.
     * @param {object} gatewayResponse - JSON object of the payment gateway response.
     * @returns {Promise<object>} A message indicating success.
     * @throws {Error} If the booking is not found or status update fails.
     */
    static async updateBookingStatusAndCreateTransaction(bookingId, status, paymentMethod, gatewayResponse = {}) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [bookingRows] = await connection.execute(
                'SELECT total_amount, status FROM bookings WHERE booking_id = ? FOR UPDATE',
                [bookingId]
            );

            if (bookingRows.length === 0) {
                throw new Error('Booking not found.');
            }

            const { total_amount, status: currentStatus } = bookingRows[0];

            if (currentStatus !== 'pending') {
                throw new Error(`Booking is not in pending status and cannot be updated to '${status}'.`);
            }

            await connection.execute(
                'UPDATE bookings SET status = ? WHERE booking_id = ?',
                [status, bookingId]
            );

            const gatewayResponseJson = JSON.stringify(gatewayResponse);
            await connection.execute(
                'INSERT INTO transactions (booking_id, amount, payment_method, payment_status, gateway_response) VALUES (?, ?, ?, ?, ?)',
                [bookingId, total_amount, paymentMethod, 'completed', gatewayResponseJson]
            );

            if (status === 'confirmed') {
                await connection.execute(`
                    INSERT INTO tickets (booking_id, seat_id, ticket_code, ticket_type, price, status)
                    SELECT
                        bs.booking_id,
                        bs.seat_id,
                        CONCAT('TICKET-', bs.booking_id, '-', bs.seat_id, '-', LPAD(FLOOR(RAND() * 100000), 5, '0')),
                        s.seat_type,
                        bs.price,
                        'active'
                    FROM booking_seats bs
                    JOIN seats s ON bs.seat_id = s.seat_id
                    WHERE bs.booking_id = ?
                `, [bookingId]);
            }

            await connection.commit();
            return { message: `Booking ${bookingId} updated to ${status} and transaction recorded.` };

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error in Booking.updateBookingStatusAndCreateTransaction:', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Cancels a booking using direct SQL queries.
     * This version does NOT call `sp_cancel_booking`.
     * @param {number} bookingId - The ID of the booking to cancel.
     * @param {number} userId - The ID of the user attempting to cancel (for authorization).
     * @returns {Promise<object>} A message indicating success.
     * @throws {Error} If there's a database error or authorization/validation error.
     */
    static async cancelBooking(bookingId, userId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [bookingRows] = await connection.execute(
                'SELECT status, user_id, total_amount FROM bookings WHERE booking_id = ? FOR UPDATE',
                [bookingId]
            );

            if (bookingRows.length === 0) {
                throw new Error('Booking not found.');
            }

            const { status: currentStatus, user_id: bookingUserId, total_amount } = bookingRows[0];

            if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
                throw new Error('Booking cannot be cancelled in its current status.');
            }

            if (bookingUserId !== userId) {
                // For admin, you might add a check like: if (req.user.role !== 'admin')
                throw new Error('You are not authorized to cancel this booking.');
            }

            await connection.execute(
                'UPDATE bookings SET status = ? WHERE booking_id = ?',
                ['cancelled', bookingId]
            );

            // If the booking was confirmed, create a refund transaction
            if (currentStatus === 'confirmed') {
                await connection.execute(
                    'INSERT INTO transactions (booking_id, amount, payment_method, payment_status, transaction_date, gateway_response) ' +
                    'SELECT ?, -total_amount, payment_method, ?, NOW(), JSON_OBJECT("refund_reason", "User cancelled booking") ' +
                    'FROM transactions WHERE booking_id = ? AND payment_status = "completed" LIMIT 1',
                    [bookingId, 'refunded', bookingId]
                );
            }

            // The 'after_booking_status_change_handle_seats' trigger will handle deleting seats
            // from booking_seats, which in turn will update showtimes.available_seats.

            await connection.commit();
            return { message: 'Booking cancelled successfully.' };

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error in Booking.cancelBooking (Direct SQL):', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }


    /**
     * Retrieves detailed information for a single booking using direct SQL queries.
     * This version does NOT call `sp_get_booking_details`.
     * @param {number} bookingId - The ID of the booking.
     * @returns {Promise<object|null>} The booking details object, or null if not found.
     * @throws {Error} If there's a database error.
     */
    static async getBookingDetails(bookingId) {
        let connection; // Đảm bảo connection được định nghĩa ở đây để dùng finally
        try {
            connection = await pool.getConnection(); // Lấy connection từ pool

            const [bookingRows] = await connection.execute(
                `SELECT
                    b.booking_id,
                    b.booking_date,
                    b.total_amount,
                    b.status AS booking_status,
                    b.movie_title,
                    b.cinema_name,
                    b.hall_name,
                    b.show_start_time,
                    b.food_items,
                    b.user_id,
                    b.showtime_id, -- <--- THÊM DÒNG NÀY ĐỂ CHỌN showtime_id
                    u.username,
                    u.email,
                    u.full_name
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                WHERE b.booking_id = ?`,
                [bookingId]
            );

            if (bookingRows.length === 0) {
                return null;
            }

            const booking = bookingRows[0];

            // Fetch booked seats details
            const [seatsDetailsRows] = await connection.execute(
                `SELECT
                    bs.seat_id,
                    s.seat_row,
                    s.seat_number,
                    s.seat_type,
                    bs.price
                FROM booking_seats bs
                JOIN seats s ON bs.seat_id = s.seat_id
                WHERE bs.booking_id = ?`,
                [bookingId]
            );
            booking.booked_seats_details = seatsDetailsRows;

            // Fetch transaction details
            const [transactionDetailsRows] = await connection.execute(
                `SELECT
                    transaction_id, amount, payment_method, payment_status, transaction_date, gateway_response
                FROM transactions
                WHERE booking_id = ?`,
                [bookingId]
            );
            booking.transaction_details = transactionDetailsRows.map(t => {
                if (t.gateway_response) {
                    try {
                        t.gateway_response = JSON.parse(t.gateway_response);
                    } catch (e) {
                        console.warn('Failed to parse gateway_response for transaction:', t.transaction_id, e);
                        t.gateway_response = {};
                    }
                }
                return t;
            });

            // Fetch ticket details - ĐÃ XÓA checkin_time
            const [ticketDetailsRows] = await connection.execute(
                `SELECT
                    ticket_id, ticket_code, ticket_type, price, status
                FROM tickets
                WHERE booking_id = ?`,
                [bookingId]
            );
            booking.ticket_details = ticketDetailsRows;

            // Parse food_items JSON from the main booking query
            if (booking.food_items) {
                try {
                    booking.food_items = JSON.parse(booking.food_items);
                } catch (e) {
                    console.warn('Failed to parse food_items for booking details:', booking.booking_id, e);
                    booking.food_items = [];
                }
            }

            // Add loyalty_points and loyalty_points_expiry for consistency with getUserBookings
            // Make sure the total_amount is parsed correctly for calculation
            const totalAmountFloat = parseFloat(booking.total_amount);
            booking.loyalty_points = Math.floor(totalAmountFloat / 10000); // Giả định tính toán điểm
            const bookingDateForExpiry = new Date(booking.booking_date); // Use booking_date from DB
            bookingDateForExpiry.setMonth(bookingDateForExpiry.getMonth() + 1);
            booking.loyalty_points_expiry = bookingDateForExpiry.toISOString().split('T')[0];

            // Assuming 'screen_type' and 'duration_minutes' from 'v_showtime_details' view
            // are needed and not directly available in `bookings` table.
            // You'd need to explicitly fetch them from showtimes or movies table/view if not aliased.
            // For now, if they are not part of `bookings` SELECT, they will be undefined.
            // If you need these, you'd add a JOIN to `showtimes` or `v_showtime_details` in the main query.
            // Example: Add them to the main SELECT if a join to showtimes is suitable.
            const [showtimeDetails] = await connection.execute(
                `SELECT
                    h.screen_type,      -- Lấy screen_type từ bảng halls
                    m.duration_minutes  -- Lấy duration_minutes từ bảng movies
                FROM showtimes s
                JOIN movies m ON s.movie_id = m.movie_id
                JOIN halls h ON s.hall_id = h.hall_id -- THÊM JOIN BẢNG HALLS
                WHERE s.showtime_id = ?`,
                [booking.showtime_id]
            );
            if (showtimeDetails.length > 0) {
                booking.screen_type = showtimeDetails[0].screen_type;
                booking.duration_minutes = showtimeDetails[0].duration_minutes;
            } else {
                booking.screen_type = 'N/A'; // Default if not found
                booking.duration_minutes = 0;
            }


            return booking;

        } catch (error) {
            console.error('Error in Booking.getBookingDetails (Direct SQL):', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Retrieves a user's bookings with transaction details.
     * @param {number} userId - The ID of the user.
     * @param {string} [status=null] - Optional booking status to filter.
     * @returns {Promise<Array<object>>} A list of booking objects with their associated transaction details.
     * @throws {Error} If there's a database error.
     */
    static async getUserBookings(userId, status = null) {
        let connection;
        try {
            connection = await pool.getConnection();
            let query = `
                SELECT
                    b.booking_id,
                    t.transaction_date AS booking_date,
                    b.total_amount,
                    b.status AS booking_status,
                    b.movie_title,
                    b.cinema_name,
                    b.hall_name,
                    b.show_start_time,
                    b.food_items,
                    t.transaction_id,
                    t.payment_method,
                    t.payment_status AS transaction_status,
                    t.gateway_response
                FROM bookings b
                JOIN transactions t ON b.booking_id = t.booking_id
                WHERE b.user_id = ? AND b.status = 'confirmed'
            `;
            const params = [userId];

            if (status) {
                query += ` AND b.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY t.transaction_date DESC`; // Sắp xếp theo ngày giao dịch

            const [rows] = await connection.execute(query, params);

            return rows.map(booking => {
                // Parse JSON fields
                if (booking.food_items) {
                    try {
                        booking.food_items = JSON.parse(booking.food_items);
                    } catch (e) {
                        console.warn('Failed to parse food_items for booking:', booking.booking_id, e);
                        booking.food_items = [];
                    }
                }
                if (booking.gateway_response) {
                    try {
                        booking.gateway_response = JSON.parse(booking.gateway_response);
                    } catch (e) {
                        console.warn('Failed to parse gateway_response for booking:', booking.booking_id, e);
                        booking.gateway_response = {}; // Fix: Ensure assignment is to booking.gateway_response
                    }
                }

                // Điểm tích lũy và thời hạn điểm giả định
                booking.loyalty_points = Math.floor(parseFloat(booking.total_amount) / 10000);
                const expiryDate = new Date(booking.booking_date); // booking_date giờ là transaction_date
                expiryDate.setMonth(expiryDate.getMonth() + 1);
                booking.loyalty_points_expiry = expiryDate.toISOString().split('T')[0];

                return booking;
            });
        } catch (error) {
            console.error('Error in Booking.getUserBookings (Direct SQL with transactions):', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Retrieves all tickets for administrative purposes.
     * @returns {Promise<Array<object>>} A list of all ticket objects.
     * @throws {Error} If there's a database error.
     */
    static async getAllTickets() {
        try {
            const [rows] = await pool.execute(
                `SELECT
                    t.ticket_id,
                    t.booking_id,
                    t.seat_id,
                    t.ticket_code,
                    t.ticket_type,
                    t.price,
                    t.status,
                    b.movie_title,
                    b.show_start_time,
                    b.cinema_name,
                    b.hall_name,
                    u.username AS booked_by_username,
                    s.seat_row,
                    s.seat_number
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                JOIN users u ON b.user_id = u.user_id
                JOIN seats s ON t.seat_id = s.seat_id
                ORDER BY t.ticket_id DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error in Booking.getAllTickets:', error);
            throw error;
        }
    }
    /**
     * Retrieves all bookings for administrative purposes.
     * Optionally filters by status.
     * @param {string} [status=null] - Optional status to filter bookings.
     * @returns {Promise<Array<object>>} A list of all booking objects.
     * @throws {Error} If there's a database error.
     */
    static async getAllBookings(status = null) {
        try {
            let query = `
                SELECT 
                    b.booking_id,
                    b.user_id,
                    u.username, 
                    m.title AS movie_title, 
                    s.start_time, 
                    b.booking_date,
                    b.total_amount,
                    b.status,
                    b.food_items,
                    b.created_at
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
            `;
            const params = [];

            if (status) {
                query += ` WHERE b.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY b.created_at DESC`;

            const [rows] = await pool.execute(query, params);
            
            // Parse food_items JSON for each booking
            return rows.map(booking => {
                if (booking.food_items) {
                    try {
                        booking.food_items = JSON.parse(booking.food_items);
                    } catch (e) {
                        console.warn('Failed to parse food_items for booking:', booking.booking_id, e);
                        booking.food_items = [];
                    }
                }
                return booking;
            });
        } catch (error) {
            console.error('Error in Booking.getAllBookings:', error);
            throw error;
        }
    }
}

export default Booking;