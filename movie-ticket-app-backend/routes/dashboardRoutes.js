import express from 'express';
// Đảm bảo bạn đã import protect và authorize từ middleware của bạn
import { protect, authorize } from '../middleware/authMiddleware.js'; // <-- Đảm bảo dòng này

export default function createDashboardRoutes(pool) {
  const router = express.Router();

  // Tổng số phim
  router.get('/stats/movies', protect, authorize(['admin']), async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) AS totalMovies FROM movies');
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tổng số suất chiếu
  router.get('/stats/showtimes', protect, authorize(['admin']), async (req, res) => {
    try {
      // Cập nhật truy vấn để khớp với showtimeDetails trong controllers/statsController.js
      const [rows] = await pool.query(`
        SELECT
            COUNT(showtime_id) AS totalShowtimes,
            SUM(available_seats) AS totalAvailableSeats,
            SUM(capacity) AS totalHallCapacity
        FROM showtimes s
        JOIN halls h ON s.hall_id = h.hall_id
        WHERE s.start_time >= CURDATE()
      `);
          //  WHERE s.start_time >= CURDATE() 
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tổng số người dùng
  router.get('/stats/users', protect, authorize(['admin']), async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // THÊM ROUTE NÀY: Tổng số booking và doanh thu
  router.get('/stats/bookings', protect, authorize(['admin']), async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
            COUNT(booking_id) AS totalBookings,
            SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) AS totalRevenue,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingBookings,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledBookings
        FROM bookings
      `);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}