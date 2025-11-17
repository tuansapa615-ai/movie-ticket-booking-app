import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import {
  getShowtimes, addShowtime, updateShowtime, deleteShowtime,
  getMovies, getCinemas, getHalls
} from '../api/api.js';
import { getUser } from '../utils/auth.js';
import moment from 'moment'; // Cần cài đặt: npm install moment

const ShowtimeManagement = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentShowtime, setCurrentShowtime] = useState(null);
  const [formData, setFormData] = useState({
    movie_id: '',
    hall_id: '',
    start_time: '',
    // base_price: '', // <-- XÓA TRƯỜNG NÀY KHỎI STATE
    cinema_id: '',
    available_seats: '',
    is_full: false,
  });

  const [filterCinemaId, setFilterCinemaId] = useState('');
  const [filterMovieId, setFilterMovieId] = useState('');

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showtimeToDelete, setShowtimeToDelete] = useState(null);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : 'guest';

  const ALLOWED_TO_EDIT_ROLES = ['admin', 'staff'];
  const ALLOWED_TO_DELETE_ROLES = ['admin'];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [moviesResponse, cinemasResponse, allHallsResponse] = await Promise.all([
        getMovies(),
        getCinemas(),
        getHalls(),
      ]);
      setMovies(moviesResponse.movies || []);
      setCinemas(cinemasResponse.cinemas || []);
      setHalls(allHallsResponse.halls || []);

      const initialFilters = {
        cinemaId: filterCinemaId,
        movieId: filterMovieId,
      };
      const showtimesResponse = await getShowtimes(initialFilters);
      setShowtimes(showtimesResponse.showtimes || []);

    } catch (e) {
      const msg = e.message || 'Đã xảy ra lỗi không xác định khi tải dữ liệu.';
      setError(msg);
      console.error("Error fetching initial data for ShowtimeManagement:", e);
      setAlertMessage(`Lỗi khi tải dữ liệu: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchFilteredShowtimesData = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {};
        if (filterCinemaId) {
          filters.cinemaId = filterCinemaId;
        }
        if (filterMovieId) {
          filters.movieId = filterMovieId;
        }
        const showtimesResponse = await getShowtimes(filters);
        setShowtimes(showtimesResponse.showtimes || []);
      } catch (e) {
        const msg = e.message || 'Đã xảy ra lỗi không xác định khi tải suất chiếu.';
        setError(msg);
        console.error("Error fetching filtered showtimes:", e);
        setAlertMessage(`Lỗi khi tải suất chiếu: ${msg}`);
        setAlertType('danger');
        setShowAlertModal(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredShowtimesData();
  }, [filterCinemaId, filterMovieId]);


  const showFeedback = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const handleAddShowtime = () => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      showFeedback('Bạn không có quyền thêm suất chiếu.', 'danger');
      return;
    }
    setCurrentShowtime(null);
    setFormData({
      movie_id: '',
      hall_id: '',
      start_time: '',
      // base_price: '', // <-- XÓA TRƯỜNG NÀY KHI THÊM MỚI
      cinema_id: cinemas.length > 0 ? cinemas[0].cinema_id : '',
      available_seats: '',
      is_full: false,
    });
    setShowAddEditModal(true);
  };

  const handleEditShowtime = (showtime) => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      showFeedback('Bạn không có quyền chỉnh sửa suất chiếu.', 'danger');
      return;
    }
    setCurrentShowtime(showtime);
    const formattedStartTime = moment(showtime.start_time).format('YYYY-MM-DDTHH:mm');

    const currentHall = halls.find(h => h.hall_id === showtime.hall_id);
    const currentCinemaId = currentHall ? currentHall.cinema_id : '';

    setFormData({
      movie_id: showtime.movie_id,
      hall_id: showtime.hall_id,
      start_time: formattedStartTime,
      // base_price: showtime.base_price, // <-- XÓA TRƯỜNG NÀY KHI EDIT, HOẶC CHUYỂN THÀNH min_seat_price NẾU BẠN MUỐN HIỂN THỊ
      cinema_id: currentCinemaId,
      available_seats: showtime.available_seats,
      is_full: showtime.is_full,
    });
    setShowAddEditModal(true);
  };

  const confirmDelete = (showtimeId) => {
    if (!ALLOWED_TO_DELETE_ROLES.includes(userRole)) {
      showFeedback('Bạn không có quyền xóa suất chiếu.', 'danger');
      return;
    }
    setShowtimeToDelete(showtimeId);
    setShowConfirmDeleteModal(true);
  };

  const executeDeleteShowtime = async () => {
    setShowConfirmDeleteModal(false);
    if (!showtimeToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await deleteShowtime(showtimeToDelete);
      showFeedback('Suất chiếu đã được xóa thành công!', 'success');
      fetchData();
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Error deleting showtime:", e);
      showFeedback(`Lỗi khi xóa suất chiếu: ${msg}`, 'danger');
    } finally {
      setLoading(false);
      setShowtimeToDelete(null);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      if (name === "cinema_select_in_form") {
        const selectedCinemaId = parseInt(value);
        const hallsForSelectedCinema = halls.filter(h => h.cinema_id === selectedCinemaId);
        return {
          ...prev,
          cinema_id: selectedCinemaId,
          hall_id: hallsForSelectedCinema.length > 0 ? hallsForSelectedCinema[0].hall_id : '',
        };
      }
      if (type === 'checkbox') {
        return { ...prev, [name]: checked };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmitShowtime = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Loại bỏ kiểm tra 'base_price' nếu bạn không còn gửi nó từ frontend.
    // Nếu vẫn cần kiểm tra giá tối thiểu cho vé, bạn sẽ cần một input mới hoặc logic khác.
    if (!formData.movie_id || !formData.hall_id || !formData.start_time || (currentShowtime && (formData.available_seats === '' || formData.is_full === undefined))) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      showFeedback('Vui lòng điền đầy đủ các trường bắt buộc.', 'danger');
      setLoading(false);
      return;
    }

    try {
      const formattedStartTime = moment(formData.start_time).format('YYYY-MM-DD HH:mm:ss');

      const dataToSend = {
        movie_id: parseInt(formData.movie_id),
        hall_id: parseInt(formData.hall_id),
        start_time: formattedStartTime,
        // 2. KHÔNG GỬI base_price NỮA. Backend sẽ không mong đợi nó.
        // base_price: parseFloat(formData.base_price), // <-- XÓA DÒNG NÀY
      };

      if (currentShowtime) {
        dataToSend.available_seats = parseInt(formData.available_seats);
        dataToSend.is_full = formData.is_full;
        await updateShowtime(currentShowtime.showtime_id, dataToSend);
        showFeedback('Suất chiếu đã được cập nhật thành công!', 'success');
      } else {
        await addShowtime(dataToSend);
        showFeedback('Suất chiếu đã được thêm thành công!', 'success');
      }
      setShowAddEditModal(false);
      fetchData();
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Error submitting showtime:", e);
      showFeedback(`Lỗi khi lưu suất chiếu: ${msg}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const getMovieTitle = (movieId) => {
    const movie = movies.find(m => m.movie_id === movieId);
    return movie ? movie.title : 'Không xác định';
  };

  const getCinemaHallInfo = (hallId) => {
    const hall = halls.find(h => h.hall_id === hallId);
    if (hall) {
      const cinema = cinemas.find(c => c.cinema_id === hall.cinema_id);
      return `${cinema ? cinema.name : 'Không xác định'} - ${hall.name}`;
    }
    return 'Không xác định';
  };

  const formFilteredHalls = formData.cinema_id
    ? halls.filter(hall => hall.cinema_id === parseInt(formData.cinema_id))
    : halls;

  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />;

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-4 text-dark">Quản lý Suất Chiếu</h1>

      <div className="mb-4 d-flex justify-content-between align-items-center">
        <button
          onClick={handleAddShowtime}
          className="btn btn-primary"
          disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)}
        >
          Thêm Suất Chiếu Mới
        </button>
        <div className="d-flex gap-3">
          <select
            className="form-select w-auto"
            value={filterCinemaId}
            onChange={(e) => {
              setFilterCinemaId(e.target.value);
              setFilterMovieId('');
            }}
          >
            <option value="">Lọc theo Rạp (Tất cả)</option>
            {cinemas.map(cinema => (
              <option key={cinema.cinema_id} value={cinema.cinema_id}>
                {cinema.name}
              </option>
            ))}
          </select>
          <select
            className="form-select w-auto"
            value={filterMovieId}
            onChange={(e) => setFilterMovieId(e.target.value)}
          >
            <option value="">Lọc theo Phim (Tất cả)</option>
            {movies.map(movie => (
              <option key={movie.movie_id} value={movie.movie_id}>
                {movie.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead className="thead-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Phim</th>
                  <th scope="col">Rạp - Phòng</th>
                  <th scope="col">Thời gian Bắt đầu</th>
                  <th scope="col">Thời gian Kết thúc</th>
                  {/* <th scope="col">Giá cơ sở</th>  <-- XÓA CỘT NÀY KHỎI BẢNG */}
                  <th scope="col">Giá thấp nhất (dự kiến)</th> {/* <-- THÊM CỘT NÀY */}
                  <th scope="col">Ghế còn lại</th>
                  <th scope="col">Đã đầy?</th>
                  <th scope="col" className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {showtimes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4"> {/* <-- SỬA colSpan TỪ 9 THÀNH 8 */}
                      Không có suất chiếu nào được tìm thấy.
                    </td>
                  </tr>
                ) : (
                  showtimes.map((showtime) => (
                    <tr key={showtime.showtime_id}>
                      <td>{showtime.showtime_id}</td>
                      <td>{showtime.movie_title}</td>
                      <td>{getCinemaHallInfo(showtime.hall_id)}</td>
                      <td>{moment(showtime.start_time).format('HH:mm DD/MM/YYYY')}</td>
                      <td>{moment(showtime.end_time).format('HH:mm DD/MM/YYYY')}</td>
                      {/* <td>{showtime.base_price.toLocaleString('vi-VN')} VNĐ</td>  <-- XÓA DÒNG NÀY */}
                      <td>{showtime.min_seat_price ? showtime.min_seat_price.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}</td> {/* <-- THÊM DÒNG NÀY */}
                      <td>{showtime.available_seats}</td>
                      <td>{showtime.is_full ? 'Có' : 'Không'}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center">
                          <button
                            onClick={() => handleEditShowtime(showtime)}
                            className="btn btn-warning btn-sm me-2"
                            disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)}
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            onClick={() => confirmDelete(showtime.showtime_id)}
                            className="btn btn-danger btn-sm"
                            disabled={!ALLOWED_TO_DELETE_ROLES.includes(userRole)}
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit Showtime */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={currentShowtime ? 'Sửa Suất Chiếu' : 'Thêm Suất Chiếu Mới'}
        showFooter={false}
      >
        <form onSubmit={handleSubmitShowtime}>
          <div className="mb-3">
            <label htmlFor="movie_id" className="form-label">Chọn Phim:</label>
            <select
              className="form-select"
              id="movie_id"
              name="movie_id"
              value={formData.movie_id}
              onChange={handleFormChange}
              required
            >
              <option value="">-- Chọn Phim --</option>
              {movies.map(movie => (
                <option key={movie.movie_id} value={movie.movie_id}>
                  {movie.title} ({movie.duration_minutes} phút)
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="cinema_select_in_form" className="form-label">Chọn Rạp (để lọc phòng):</label>
            <select
              className="form-select"
              id="cinema_select_in_form"
              name="cinema_select_in_form"
              value={formData.cinema_id}
              onChange={handleFormChange}
            >
              <option value="">-- Chọn Rạp --</option>
              {cinemas.map(cinema => (
                <option key={cinema.cinema_id} value={cinema.cinema_id}>
                  {cinema.name} ({cinema.city})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="hall_id" className="form-label">Chọn Phòng Chiếu:</label>
            <select
              className="form-select"
              id="hall_id"
              name="hall_id"
              value={formData.hall_id}
              onChange={handleFormChange}
              required
              disabled={!formData.cinema_id || formFilteredHalls.length === 0}
            >
              <option value="">-- Chọn Phòng --</option>
              {formFilteredHalls.map(hall => (
                <option key={hall.hall_id} value={hall.hall_id}>
                  {hall.name} (Sức chứa: {hall.capacity})
                </option>
              ))}
            </select>
            {formData.cinema_id && formFilteredHalls.length === 0 && (
              <small className="form-text text-danger">Không có phòng chiếu nào trong rạp đã chọn. Vui lòng chọn rạp khác hoặc thêm phòng.</small>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="start_time" className="form-label">Thời gian Bắt đầu:</label>
            <input
              type="datetime-local"
              id="start_time"
              name="start_time"
              className="form-control"
              value={formData.start_time}
              onChange={handleFormChange}
              required
            />
            {formData.movie_id && formData.start_time && (
              <small className="form-text text-muted">
                Thời gian kết thúc dự kiến: {moment(formData.start_time).add(movies.find(m => m.movie_id === formData.movie_id)?.duration_minutes || 0, 'minutes').format('HH:mm DD/MM/YYYY')}
              </small>
            )}
          </div>
          {/* <div className="mb-3">  <-- XÓA HOẶC ẨN TOÀN BỘ DIV NÀY */}
          {/* <label htmlFor="base_price" className="form-label">Giá cơ sở:</label> */}
          {/* <input */}
          {/* type="number" */}
          {/* id="base_price" */}
          {/* name="base_price" */}
          {/* className="form-control" */}
          {/* value={formData.base_price} */}
          {/* onChange={handleFormChange} */}
          {/* min="0" */}
          {/* step="1000" */}
          {/* required */}
          {/* /> */}
          {/* </div> */}
          {currentShowtime && (
            <>
              <div className="mb-3">
                <label htmlFor="available_seats" className="form-label">Ghế còn lại:</label>
                <input
                  type="number"
                  id="available_seats"
                  name="available_seats"
                  className="form-control"
                  value={formData.available_seats}
                  onChange={handleFormChange}
                  min="0"
                  required
                />
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  id="is_full"
                  name="is_full"
                  className="form-check-input"
                  checked={formData.is_full}
                  onChange={handleFormChange}
                />
                <label htmlFor="is_full" className="form-check-label">Đã đầy?</label>
              </div>
            </>
          )}

          <div className="d-flex justify-content-end mt-4">
            <button
              type="button"
              onClick={() => setShowAddEditModal(false)}
              className="btn btn-secondary me-2"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {currentShowtime ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Delete Confirmation */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa Suất Chiếu"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteShowtime}
        confirmButtonVariant="danger"
      >
        <p>Bạn có chắc chắn muốn xóa suất chiếu này?</p>
        <p className="text-danger">Lưu ý: Thao tác này sẽ xóa **tất cả** đặt chỗ và giao dịch liên quan đến suất chiếu này. Hãy cẩn thận!</p>
      </Modal>

      {/* Modal for Alerts (Success/Error) */}
      <Modal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertType === 'success' ? 'Thành công!' : 'Lỗi!'}
        showFooter={true}
        confirmButtonText="Đóng"
        onConfirm={() => setShowAlertModal(false)}
        confirmButtonVariant={alertType === 'success' ? 'primary' : 'danger'}
        hideCancelButton={true}
      >
        <div className={`alert ${alertType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {alertMessage}
        </div>
      </Modal>
    </div>
  );
};

export default ShowtimeManagement;