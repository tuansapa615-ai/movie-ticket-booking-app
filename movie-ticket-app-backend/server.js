// app.js
import express from 'express';
import dotenv from 'dotenv';
import { pool, testDbConnection } from './config/db.js'; 
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import cinemaRoutes from './routes/cinemaRoutes.js';
import hallRoutes from './routes/hallRoutes.js';
import showtimeRoutes from './routes/showtimeRoutes.js';
import seatRoutes from './routes/seatRoutes.js';
import foodItemRoutes from './routes/foodItemRoutes.js';
import seatPriceRoutes from './routes/seatPriceRoutes.js';
import createDashboardRoutes from './routes/dashboardRoutes.js';
import cors from 'cors'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // <--- Thêm dòng này để kích hoạt CORS

// Test database connection khi khởi động ứng dụng
testDbConnection();

// Routes
app.use('/api/seat-type-prices', seatPriceRoutes);  
app.use('/api/cinemas', cinemaRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/halls', hallRoutes)
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/food-items', foodItemRoutes);
app.use('/api', createDashboardRoutes(pool));
// Simple root route
app.get('/', (req, res) => {
    res.send('API Node.js Authentication đang chạy!');
});

// Global error handler (tùy chọn) - xử lý các lỗi không mong muốn
app.use((err, req, res, next) => {
    console.error(err.stack); // Log lỗi chi tiết ra console
    res.status(500).send('Đã xảy ra lỗi từ máy chủ nội bộ!');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});