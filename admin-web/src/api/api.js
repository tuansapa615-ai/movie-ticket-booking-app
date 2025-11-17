// src/api/api.js

import { getToken } from '../utils/auth.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Hàm chung để xử lý phản hồi API
const handleResponse = async (response) => {
    const clonedResponse = response.clone();
    let data;

    try {
        data = await clonedResponse.json();
    } catch (e) {
        data = await clonedResponse.text();
        console.warn('Response was not JSON:', data.substring(0, 200));
    }

    if (!response.ok) {
        const errorMessage = (typeof data === 'object' && data !== null && data.message)
                               ? data.message
                               : data || `Đã xảy ra lỗi khi gọi API: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
    }
    return data;
};

// Hàm chung để thực hiện fetch request
const fetchData = async (url, method, body = null, isFormData = false) => {
    const config = {
        method: method,
        headers: {}, // Khởi tạo headers rỗng
    };

    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Chỉ thêm body và Content-Type cho các phương thức cần body
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (isFormData) {
            config.body = body; // body đã là FormData object
            // Không set 'Content-Type' cho FormData, trình duyệt sẽ tự set
        } else {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    } else {
        // Đối với GET, HEAD, DELETE, không có body.
        // Đảm bảo không có body trong config.
        // Cần xóa Content-Type nếu có vì nó không phù hợp với GET/HEAD/DELETE
        delete config.headers['Content-Type'];
    }

    const response = await fetch(url, config);
    return handleResponse(response);
};

// ... (các hàm API khác của bạn)
// --- AUTH API ---
export const loginUser = async (email, password) => {
    return fetchData(`${BASE_URL}/api/auth/login`, 'POST', { email, password });
};
export const requestPasswordReset = async (email, password) => {
    return fetchData(`${BASE_URL}/api/auth/request-password-reset`, 'POST', { email, password });
};

// --- MOVIE API ---
export const getMovies = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.displayStatus) {
        params.append('display_status', filters.displayStatus);
    }
    if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
    }
    const queryString = params.toString();
    const url = `${BASE_URL}/api/movies${queryString ? `?${queryString}` : ''}`;
    return fetchData(url, 'GET');
};

export const addMovie = async (movieData) => {
    return fetchData(`${BASE_URL}/api/movies/add`, 'POST', movieData, true);
};

export const updateMovie = async (movieId, movieData) => {
    return fetchData(`${BASE_URL}/api/movies/${movieId}`, 'PUT', movieData, true);
};

export const deleteMovie = async (movieId) => {
    return fetchData(`${BASE_URL}/api/movies/${movieId}`, 'DELETE');
};

export const getMovieById = async (movieId) => {
    return fetchData(`${BASE_URL}/api/movies/${movieId}`, 'GET');
};

// --- USER API ---
export const getUsers = async (searchTerm = '') => { // Đã sửa để nhận searchTerm
    const params = new URLSearchParams();
    if (searchTerm) {
        params.append('searchTerm', searchTerm);
    }
    const queryString = params.toString();
    const url = `${BASE_URL}/api/auth/users${queryString ? `?${queryString}` : ''}`;
    return fetchData(url, 'GET');
};

export const deleteUser = async (userId) => {
    return fetchData(`${BASE_URL}/api/auth/users/${userId}`, 'DELETE');
};
export const uploadAvatar = async (file) => { // Nhận file trực tiếp
    const formData = new FormData();
    formData.append('avatar', file); // 'avatar' phải khớp với tên field trong Multer
    return fetchData(`${BASE_URL}/api/auth/upload-avatar`, 'POST', formData, true); // isFormData = true
};
// --- BANNER API ---
export const getBanners = async () => {
    return fetchData(`${BASE_URL}/api/banners`, 'GET');
};

export const addBanner = async (bannerData) => {
    return fetchData(`${BASE_URL}/api/banners`, 'POST', bannerData, true);
};

export const updateBanner = async (bannerId, bannerData) => {
    return fetchData(`${BASE_URL}/api/banners/${bannerId}`, 'PUT', bannerData, true);
};

export const deleteBanner = async (bannerId) => {
    return fetchData(`${BASE_URL}/api/banners/${bannerId}`, 'DELETE');
};

// --- CINEMA API ---
export const getCinemas = async () => {
    return fetchData(`${BASE_URL}/api/cinemas`, 'GET');
};

export const addCinema = async (cinemaData) => {
    return fetchData(`${BASE_URL}/api/cinemas/add`, 'POST', cinemaData);
};

export const updateCinema = async (cinemaId, cinemaData) => {
    return fetchData(`${BASE_URL}/api/cinemas/${cinemaId}`, 'PUT', cinemaData);
};

export const deleteCinema = async (cinemaId) => {
    return fetchData(`${BASE_URL}/api/cinemas/${cinemaId}`, 'DELETE');
};

// -- Hall API --
export const getHalls = async (cinemaId = '') => {
    const query = cinemaId ? `?cinemaId=${cinemaId}` : '';
    return fetchData(`${BASE_URL}/api/halls${query}`, 'GET');
};

export const addHall = async (hallData) => {
    return fetchData(`${BASE_URL}/api/halls/add`, 'POST', hallData);
};

export const updateHall = async (hallId, hallData) => {
    return fetchData(`${BASE_URL}/api/halls/${hallId}`, 'PUT', hallData);
};

export const deleteHall = async (hallId) => {
    return fetchData(`${BASE_URL}/api/halls/${hallId}`, 'DELETE');
};

// Showtime Management APIs
export const getShowtimes = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.cinemaId) {
        params.append('cinemaId', filters.cinemaId);
    }
    if (filters.movieId) {
        params.append('movieId', filters.movieId);
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/showtimes?${queryString}` : '/showtimes';
    return fetchData(`${BASE_URL}/api${endpoint}`, 'GET');
};

export const addShowtime = async (showtimeData) => {
    return fetchData(`${BASE_URL}/api/showtimes/add`, 'POST', showtimeData);
};

export const updateShowtime = async (showtimeId, showtimeData) => {
    return fetchData(`${BASE_URL}/api/showtimes/${showtimeId}`, 'PUT', showtimeData);
};

export const deleteShowtime = async (showtimeId) => {
    return fetchData(`${BASE_URL}/api/showtimes/${showtimeId}`, 'DELETE');
};
// --- SEAT API (Đảm bảo đã có, hàm getSeatsByHall nhận hallId) ---
export const getSeatsByHall = async (hallId, showtimeId = '') => {
    const params = new URLSearchParams();
    if (hallId) params.append('hallId', hallId);
    if (showtimeId) params.append('showtimeId', showtimeId);

    const queryString = params.toString();
    const url = `${BASE_URL}/api/seats${queryString ? `?${queryString}` : ''}`;
    return fetchData(url, 'GET');
};

export const addSeat = async (seatData) => {
    return fetchData(`${BASE_URL}/api/seats`, 'POST', seatData);
};
    
export const updateSeat = async (seatId, seatData) => {
    return fetchData(`${BASE_URL}/api/seats/${seatId}`, 'PUT', seatData);
};

export const deleteSeat = async (seatId) => {
    return fetchData(`${BASE_URL}/api/seats/${seatId}`, 'DELETE');
};
// --- Các hàm API cho Food Items ---
export const getFoodItems = async () => {
    return fetchData(`${BASE_URL}/api/food-items`, 'GET'); // Thêm 'GET' rõ ràng
};

export const addFoodItem = async (formData) => {
    return fetchData(`${BASE_URL}/api/food-items`, 'POST', formData, true);
};

export const updateFoodItem = async (id, formData) => {
    return fetchData(`${BASE_URL}/api/food-items/${id}`, 'PUT', formData, true);
};

export const deleteFoodItem = async (id) => {
    return fetchData(`${BASE_URL}/api/food-items/${id}`, 'DELETE');
};
// --- SEAT PRICING API ---
export const getSeatTypePrices = async () => {
    return fetchData(`${BASE_URL}/api/seat-type-prices`, 'GET');
};

export const addSeatTypePrice = async (seatType, price) => {
    return fetchData(`${BASE_URL}/api/seat-type-prices`, 'POST', { seat_type: seatType, price: price });
};

export const updateSeatTypePrice = async (id, newPrice) => {
    return fetchData(`${BASE_URL}/api/seat-type-prices/${id}`, 'PUT', { price: newPrice });
};

export const deleteSeatTypePrice = async (id) => {
    return fetchData(`${BASE_URL}/api/seat-type-prices/${id}`, 'DELETE');
};
// --- BOOKING/TICKET API (cho Admin) ---
export const getAllTicketsForAdmin = async () => {
    return fetchData(`${BASE_URL}/api/bookings/admin/tickets`, 'GET');
};
// --- STATS API ---
export const getMovieStats = async () => {
    // Hàm này phải gọi endpoint /api/stats/movies
    // Backend trả về { totalMovies: X }
    return fetchData(`${BASE_URL}/api/stats/movies`, 'GET');
};

export const getUserStats = async () => {
    // Hàm này phải gọi endpoint /api/stats/users
    // Backend trả về { totalUsers: X }
    return fetchData(`${BASE_URL}/api/stats/users`, 'GET');
};

export const getShowtimeStats = async () => {
    // Hàm này phải gọi endpoint /api/stats/showtimes
    // Backend trả về { totalShowtimes: X, totalAvailableSeats: Y, totalHallCapacity: Z }
    return fetchData(`${BASE_URL}/api/stats/showtimes`, 'GET');
};

export const getBookingOverviewStats = async () => {
    // Hàm này phải gọi endpoint /api/stats/bookings
    // Backend trả về { totalBookings: X, totalRevenue: Y, pendingBookings: Z, cancelledBookings: A }
    return fetchData(`${BASE_URL}/api/stats/bookings`, 'GET');
};