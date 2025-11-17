import express from 'express';
import {
    getAvailableSeats,
    getFoodItems,
    createBooking,
    createPaypalPayment,
    executePaypalPayment,
    cancelPaypalPayment,
    cancelBooking,
    getUserBookings,
    getAllBookingsForAdmin,
    getBookingDetails,
    getAllTicketsForAdmin,
    confirmBooking // <--- Make sure this is imported
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/showtimes/:showtimeId/seats', getAvailableSeats);
router.get('/food-items', getFoodItems);

// PayPal redirect routes (These must be public because PayPal redirects here directly,
// and does not send JWT token in the redirect. Authorization is handled internally in controller.)
router.get('/paypal/execute', executePaypalPayment);
router.get('/paypal/cancel', cancelPaypalPayment);

// Protected routes (require authentication via JWT)
router.post('', protect, createBooking);
router.post('/:bookingId/pay/paypal', protect, createPaypalPayment);
router.put('/:bookingId/confirm', protect, confirmBooking); // <--- ADD THIS LINE FOR CONFIRMATION
router.post('/:bookingId/cancel', protect, cancelBooking);
router.get('/users/:userId', protect, getUserBookings);
router.get('/:bookingId', protect, getBookingDetails);

// Admin route
router.get('/admin/bookings', protect, authorize(['admin']), getAllBookingsForAdmin);
router.get('/admin/tickets', protect, authorize(['admin']),  getAllTicketsForAdmin);
export default router;