import React, { useEffect, useState } from "react";
// Import các component tùy chỉnh của bạn
import ChartCard from "../components/ChartCard.jsx"; // Giả định ChartCard có props title, value, children, color, bgColor
import StatCard from "../components/StatCard.jsx"; // Giả định StatCard có props title, value, color, icon
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import GoogleTranslate from "../utils/GoogleTranslate.jsx"; // Giả định bạn có component này

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faUser, faCalendarAlt, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

// Import Recharts components
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  LineChart,
  CartesianGrid,
  Line,
} from "recharts";

// IMPORT CÁC HÀM API TỪ FILE API.JS CỦA BẠN
import {
  getMovieStats,
  getUserStats,
  getShowtimeStats,
  getBookingOverviewStats,
} from "../api/api.js"; // Đảm bảo các hàm này có trong src/api/api.js

export default function Dashboard({ userRole }) { // Nhận userRole từ props
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalUsers: 0,
    totalShowtimes: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const [
          moviesRes,
          usersRes,
          showtimesRes,
          bookingOverviewRes
        ] = await Promise.all([
          getMovieStats(), // Gọi hàm API đã import từ api.js
          getUserStats(),
          getShowtimeStats(),
          getBookingOverviewStats(),
        ]);

        // Xử lý dữ liệu trả về từ các API để cập nhật state
        setStats({
          // moviesRes.movieStats là mảng chứa object { totalMovies: X }
          totalMovies: moviesRes.totalMovies || (moviesRes.movieStats && moviesRes.movieStats.length > 0 ? moviesRes.movieStats[0].totalMovies : 0),
          totalUsers: usersRes.totalUsers || (usersRes.userStats || 0), // userStats có thể là trực tiếp giá trị
          totalShowtimes: showtimesRes.totalShowtimes || (showtimesRes.showtimeStats ? showtimesRes.showtimeStats.totalShowtimes : 0),
          totalBookings: bookingOverviewRes.totalBookings || (bookingOverviewRes.bookingStats ? bookingOverviewRes.bookingStats.totalBookings : 0),
          totalRevenue: bookingOverviewRes.totalRevenue || (bookingOverviewRes.bookingStats ? parseFloat(bookingOverviewRes.bookingStats.totalRevenue) || 0 : 0),
          pendingBookings: bookingOverviewRes.pendingBookings || (bookingOverviewRes.bookingStats ? bookingOverviewRes.bookingStats.pendingBookings : 0),
          cancelledBookings: bookingOverviewRes.cancelledBookings || (bookingOverviewRes.bookingStats ? bookingOverviewRes.bookingStats.cancelledBookings : 0),
        });
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi lấy dữ liệu thống kê.");
        console.error("Lỗi lấy thống kê:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Dữ liệu cho biểu đồ
  const moviesChartData = [{ name: "Phim", value: stats.totalMovies }];
//   const usersChartData = [{ name: "Người dùng", value: stats.totalUsers }];
  
  const revenueChartData = [{ name: "Doanh thu", value: stats.totalRevenue }];


  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-6 space-y-6"> {/* Tăng khoảng cách giữa các phần */}
      {/* Google Translate - Giữ nguyên vị trí nếu bạn muốn nó ở đầu trang */}
      {/* <div className="mb-4">
        <GoogleTranslate />
      </div> */}

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bảng điều khiển</h1>

      {/* Dòng Stat Cards thứ nhất (2 card) */}
      <div className="row g-4"> {/* g-4 tạo khoảng cách giữa các cột Bootstrap */}
        <div className="col-md-3 col-sm-3"> {/* Chiếm 50% chiều rộng trên màn hình md trở lên */}
          <StatCard
            title="Tổng số phim"
            value={stats.totalMovies}
            color="text-indigo-600"
            icon={<FontAwesomeIcon icon={faFilm} />}
          />
        </div>
        <div className="col-md-3 col-sm-3 "> {/* Chiếm 50% chiều rộng trên màn hình md trở lên */}
          <StatCard
            title="Tổng người dùng"
            value={stats.totalUsers}
            color="text-green-600"
            icon={<FontAwesomeIcon icon={faUser} />}
          />
        </div>
        <div className="col-md-3 col-sm-3"> {/* Chiếm 50% chiều rộng trên màn hình md trở lên */}
          <StatCard
            title="Tổng suất chiếu"
            value={stats.totalShowtimes}
            color="text-orange-600"
            icon={<FontAwesomeIcon icon={faCalendarAlt} />}
          />
        </div>
        <div className="col-md-3 col-sm-3"> {/* Chiếm 50% chiều rộng trên màn hình md trở lên */}
          <StatCard
            title="Tổng doanh thu"
            value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue)}
            color="text-yellow-600"
            icon={<FontAwesomeIcon icon={faMoneyBillWave} />}
          />
        </div>
      </div>

      


      {/* Dòng Chart Cards (Giữ nguyên bố cục 3 cột cho biểu đồ) */}
      <div className="row g-4 mt-4">
        <div className="col-md-4">
          <ChartCard
            title={<div className="text-sm text-gray-600">Tổng số phim</div>}
            value={stats.totalMovies}
            color="text-indigo-600"
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={moviesChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="col-md-4">
          <ChartCard
            title={<div className="text-sm text-gray-600">Tổng người dùng</div>}
            value={stats.totalUsers}
            color="text-green-600"
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[{ name: "Showtime", value: stats.totalUsers }]}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#34d399" />
                    </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="col-md-4">
          <ChartCard
            title={<div className="text-sm text-gray-600">Tổng số suất chiếu</div>}
            value={stats.totalShowtimes}
            color="text-orange-600"
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[{ name: "Showtime", value: stats.totalShowtimes }]}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f97316" />
                    </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="row g-4 mt-4">
        <div className="col-md-6">
          <ChartCard
            title={<div className="text-sm text-gray-600">Tổng doanh thu</div>}
            value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue)}
            color="text-yellow-600"
            icon={<FontAwesomeIcon icon={faMoneyBillWave} />}
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString('vi-VN')}₫`} />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div className="col-md-6">
            <ChartCard
                title={<div className="text-sm text-gray-600">Tổng số booking</div>}
                value={stats.totalBookings}
                color="text-purple-600"
            >
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[{ name: "Booking", value: stats.totalBookings }]}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
      </div>
    </div>
  );
}