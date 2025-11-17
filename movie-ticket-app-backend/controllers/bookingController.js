// controllers/bookingController.js
import Booking from '../models/Booking.js';
import paypal from '../config/paypalConfig.js';
import dotenv from 'dotenv';
dotenv.config();
export const getAvailableSeats = async (req, res) => {
    const { showtimeId } = req.params;
    try {
        const seats = await Booking.getAvailableSeats(showtimeId);
        res.status(200).json(seats);
    } catch (error) {
        console.error('Error in getAvailableSeats controller:', error);
        res.status(500).json({ message: 'Error fetching available seats.', error: error.message });
    }
};

export const getAllBookingsForAdmin = async (req, res) => {
    const { status } = req.query; 

    try {
        const bookings = await Booking.getAllBookings(status || null);
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error in getAllBookingsForAdmin controller:', error);
        res.status(500).json({ message: 'Error fetching all bookings.', error: error.message });
    }
};

export const getFoodItems = async (req, res) => {
    try {
        const foodItems = await Booking.getFoodItems();
        res.status(200).json(foodItems);
    } catch (error) {
        console.error('Error in getFoodItems controller:', error);
        res.status(500).json({ message: 'Error fetching food items.', error: error.message });
    }
};

export const createBooking = async (req, res) => {
    // 1. No base_price needed in req.body for booking creation
    const { showtime_id, seat_ids, food_items } = req.body;
    const userId = req.user?.userId;
    console.log('--- createBooking Controller Input ---');
    console.log('req.body:', req.body);
    console.log('userId from token:', userId, 'Type:', typeof userId);
    console.log('showtime_id from body:', showtime_id, 'Type:', typeof showtime_id);
    console.log('seat_ids from body:', seat_ids, 'Type:', typeof seat_ids);
    console.log('food_items from body:', food_items, 'Type:', typeof food_items);
    console.log('------------------------------------');
    if (userId === undefined || userId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }
    if (!showtime_id) {
        return res.status(400).json({ message: 'Showtime ID is required.' });
    }
    if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
        return res.status(400).json({ message: 'Seat IDs must be a non-empty array.' });
    }

    try {
        // 2. Call createBooking without passing base_price
        const booking = await Booking.createBooking(userId, showtime_id, seat_ids, food_items);
        res.status(201).json({
            message: 'Booking initiated successfully. Status: pending.',
            booking_id: booking.booking_id,
            status: booking.status,
            total_amount: booking.total_amount
        });
    } catch (error) {
        console.error('Error in createBooking controller:', error);
        if (error.sqlState === '45000') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error creating booking.', error: error.message });
    }
};

export const confirmBooking = async (req, res) => {
    const { bookingId } = req.params;
    const { payment_method, gateway_response } = req.body;
    const userId = req.user?.userId;

    if (userId === undefined || userId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }
    if (!payment_method) {
        return res.status(400).json({ message: 'Payment method is required.' });
    }

    try {
        // --- CHANGE THIS LINE ---
        // Before: const result = await Booking.confirmBooking(bookingId, payment_method, gateway_response || {});
        // After:
        const result = await Booking.updateBookingStatusAndCreateTransaction(
            parseInt(bookingId), // Ensure bookingId is an integer
            'confirmed',        // Pass 'confirmed' as the status
            payment_method,
            gateway_response || {} // Ensure gateway_response is an object
        );
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in confirmBooking controller:', error);
        if (error.sqlState === '45000') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error confirming booking.', error: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user?.userId; 

    if (userId === undefined || userId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }

    try {
        const result = await Booking.cancelBooking(bookingId, userId);
        res.status(200).json(result); 
    } catch (error) {
        console.error('Error in cancelBooking controller:', error);
        if (error.sqlState === '45000') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error cancelling booking.', error: error.message });
    }
};

export const getUserBookings = async (req, res) => {
    const { userId } = req.params;
    const authenticatedUserId = req.user?.userId; // Lấy userId từ token JWT
    const { status } = req.query; // Lọc theo trạng thái nếu có

    // Đảm bảo chỉ user đó hoặc admin mới được xem lịch sử booking của họ
    if (authenticatedUserId === undefined || authenticatedUserId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }
    // Chuyển userId từ params sang số nguyên để so sánh
    if (parseInt(userId) !== authenticatedUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized to view these bookings.' });
    }

    try {
        const bookings = await Booking. getUserBookings(userId, status || null); // Gọi hàm từ model
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error in getUserBookings controller:', error);
        res.status(500).json({ message: 'Error fetching user bookings.', error: error.message });
    }
};

export const getBookingDetails = async (req, res) => {
    const { bookingId } = req.params;
    // CHỈNH SỬA TỪ req.user?.user_id SANG req.user?.userId
    const authenticatedUserId = req.user?.userId; 

    if (authenticatedUserId === undefined || authenticatedUserId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }

    try {
        const booking = await Booking.getBookingDetails(bookingId);
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        // CHỈNH SỬA TỪ booking.user_id SANG booking.userId (nếu model trả về userId)
        if (booking.user_id && parseInt(booking.user_id) !== authenticatedUserId && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized to view this booking.' });
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error('Error in getBookingDetails controller:', error);
        res.status(500).json({ message: 'Error fetching booking details.', error: error.message });
    }
};
export const createPaypalPayment = async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user?.userId;

    if (userId === undefined || userId === null) {
        return res.status(401).json({ message: 'User ID not found in token. Please log in again.' });
    }

    try {
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        if (parseInt(booking.user_id) !== userId) {
            return res.status(403).json({ message: 'Unauthorized to pay for this booking.' });
        }
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: `Booking is already ${booking.status}. Cannot proceed with payment.` });
        }

        const totalAmount = parseFloat(booking.total_amount).toFixed(2); // Ensure 2 decimal places

        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                // Rất quan trọng: Các URL này là nơi PayPal sẽ chuyển hướng trình duyệt đến
                // sau khi thanh toán. Chúng ta muốn chúng trỏ đến backend của mình để xử lý
                // việc thực thi thanh toán, sau đó backend sẽ redirect về deep link của Flutter.
                "return_url": process.env.PAYPAL_RETURN_URL + `?bookingId=${booking.booking_id}`,
                "cancel_url": process.env.PAYPAL_CANCEL_URL + `?bookingId=${booking.booking_id}`
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": `Movie Ticket Booking for Showtime ${booking.showtime_id}`,
                        "sku": `BOOKING-${booking.booking_id}`,
                        "price": totalAmount,
                        "currency": "USD", // PayPal requires USD or other supported currencies
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": totalAmount
                },
                "description": `Payment for Booking ID: ${booking.booking_id} - ${booking.movie_title}`
            }]
        };

        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                console.error("Error creating PayPal payment:", error.response ? error.response.details : error);
                return res.status(500).json({ message: 'Error initiating PayPal payment.', error: error.message });
            } else {
                for (let i = 0; i < payment.links.length; i++) {
                    if (payment.links[i].rel === 'approval_url') {
                        return res.status(200).json({
                            message: 'PayPal payment initiated. Redirect to approval_url.',
                            approval_url: payment.links[i].href,
                            payment_id: payment.id
                        });
                    }
                }
                return res.status(500).json({ message: 'No approval URL found in PayPal response.' });
            }
        });

    } catch (error) {
        console.error('Error in createPaypalPayment controller:', error);
        res.status(500).json({ message: 'Error initiating PayPal payment.', error: error.message });
    }
};


export const executePaypalPayment = async (req, res) => {
    const { paymentId, PayerID, bookingId } = req.query; // Parameters from PayPal redirect

    if (!paymentId || !PayerID || !bookingId) {
        // Redirect về deep link của ứng dụng Flutter khi có lỗi
        return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId || 'N/A'}&message=Missing payment details.`);
    }

    try {
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId}&message=Booking not found.`);
        }
        if (booking.status !== 'pending') {
            return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId}&message=Booking is already ${booking.status}.`);
        }

        const execute_payment_json = {
            "payer_id": PayerID,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": parseFloat(booking.total_amount).toFixed(2)
                }
            }]
        };

        paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
            if (error) {
                console.error("Error executing PayPal payment:", error.response ? error.response.details : error);
                return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId}&message=Payment execution failed.`);
            } else {
                console.log("PayPal payment executed successfully:", payment);
                const gatewayResponse = {
                    paypal_payment_id: payment.id,
                    paypal_payer_id: payment.payer.payer_info.payer_id,
                    state: payment.state,
                    amount: payment.transactions[0].amount.total,
                    currency: payment.transactions[0].amount.currency,
                    create_time: payment.create_time,
                    update_time: payment.update_time,
                };

                try {
                    await Booking.updateBookingStatusAndCreateTransaction(
                        bookingId,
                        'confirmed',
                        'paypal',
                        gatewayResponse
                    );
                    // REDIRECT VỀ DEEP LINK CỦA ỨNG DỤNG FLUTTER KHI THÀNH CÔNG
                    return res.redirect(`movieticketapp://payment?status=success&bookingId=${bookingId}`);
                } catch (dbError) {
                    console.error("Error updating booking status after PayPal execution:", dbError);
                    return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId}&message=Internal server error after payment.`);
                }
            }
        });

    } catch (error) {
        console.error('Error in executePaypalPayment controller:', error);
        return res.redirect(`movieticketapp://payment?status=failed&bookingId=${bookingId || 'N/A'}&message=An unexpected error occurred.`);
    }
};

export const cancelPaypalPayment = async (req, res) => {
    const { bookingId } = req.query; 

    console.log(`PayPal payment cancelled for booking ID: ${bookingId}`);

    return res.redirect(`${process.env.FRONTEND_URL}/payment-cancelled?bookingId=${bookingId}`);
};
export const getAllTicketsForAdmin = async (req, res) => {
    try {
        const tickets = await Booking.getAllTickets(); // Gọi hàm từ model
        res.status(200).json(tickets);
    } catch (error) {
        console.error('Error in getAllTicketsForAdmin controller:', error);
        res.status(500).json({ message: 'Error fetching all tickets.', error: error.message });
    }
};