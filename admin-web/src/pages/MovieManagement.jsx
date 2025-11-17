// src/pages/MovieManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { getMovies, addMovie, updateMovie, deleteMovie } from '../api/api.js';

const MovieManagement = ({ userRole }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedPosterFile, setSelectedPosterFile] = useState(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // NEW STATES FOR FILTERING AND SEARCHING
  const [filterStatus, setFilterStatus] = useState(''); // '' for all, 'showing', 'coming_soon', etc.
  const [searchTerm, setSearchTerm] = useState(''); // For movie title search
  // New state for debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // This will trigger the fetch

  // useCallback để tránh tạo lại hàm fetchMovies mỗi lần render
  const fetchMovies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovies(filters);
      const processedMovies = data.movies.map(movie => ({
        ...movie,
        rating: movie.rating !== null && movie.rating !== undefined ? parseFloat(movie.rating) : null,
        cast: movie.cast ? (typeof movie.cast === 'string' ? JSON.parse(movie.cast) : movie.cast) : null
      }));
      setMovies(processedMovies || []);
    } catch (e) {
      const msg = e.message || 'Đã xảy ra lỗi không xác định khi tải phim.';
      setError(msg);
      console.error("Lỗi khi tải phim:", e);
      setAlertMessage(`Lỗi khi tải phim: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to debounce searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce time

    // Cleanup function: This will run if searchTerm changes again before the timeout
    // or if the component unmounts.
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Only re-run if searchTerm changes

  useEffect(() => {
    // Fetch movies initially and whenever filters or debounced search term change
    const filters = {
      displayStatus: filterStatus,
      searchTerm: debouncedSearchTerm // Use debounced search term here
    };
    fetchMovies(filters);
  }, [filterStatus, debouncedSearchTerm, fetchMovies]); // Depend on filterStatus, debouncedSearchTerm, and fetchMovies


  const handleAddMovie = () => {
    setCurrentMovie(null);
    setFormData({
      title: '', description: '', duration_minutes: '', release_date: '',
      end_date: '', genre: '', director: '', cast: '', trailer_url: '',
      rating: '', display_status: 'coming_soon'
    });
    setSelectedPosterFile(null);
    setPosterPreviewUrl('');
    setShowAddEditModal(true);
  };

  const handleEditMovie = (movie) => {
    setCurrentMovie(movie);
    setFormData({
      ...movie,
      release_date: movie.release_date ? new Date(movie.release_date).toISOString().split('T')[0] : '',
      end_date: movie.end_date ? new Date(movie.end_date).toISOString().split('T')[0] : '',
      cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast || '',
      rating: movie.rating !== null && movie.rating !== undefined ? movie.rating : ''
    });
    setSelectedPosterFile(null);
    setPosterPreviewUrl(movie.poster_url || '');
    setShowAddEditModal(true);
  };

  const confirmDelete = (movieId) => {
    setMovieToDelete(movieId);
    setShowConfirmDeleteModal(true);
  };

  const executeDeleteMovie = async () => {
    setShowConfirmDeleteModal(false);
    if (!movieToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await deleteMovie(movieToDelete);
      setAlertMessage('Phim đã được xóa thành công!');
      setAlertType('success');
      setShowAlertModal(true);
      // Use the debounced search term for refetching after delete
      fetchMovies({ display_status: filterStatus, searchTerm: debouncedSearchTerm });
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Lỗi khi xóa phim:", e);
      setAlertMessage(`Lỗi khi xóa phim: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setMovieToDelete(null);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePosterFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedPosterFile(file);
    if (file) {
      setPosterPreviewUrl(URL.createObjectURL(file));
    } else {
      setPosterPreviewUrl(currentMovie?.poster_url || '');
    }
  };

  const handleRemovePoster = () => {
    setSelectedPosterFile(null);
    setPosterPreviewUrl('');
    setFormData(prev => ({ ...prev, poster_url: '' }));
    document.getElementById('poster_image_upload').value = '';
  };

  const handleSubmitMovie = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();

    for (const key in formData) {
      if (formData[key] !== null && formData[key] !== undefined) {
        if (key === 'cast') {
            const castValue = formData[key];
            if (Array.isArray(castValue)) {
                data.append(key, JSON.stringify(castValue));
            } else if (typeof castValue === 'string' && castValue.trim() !== '') {
                const castArray = castValue.split(',').map(item => item.trim()).filter(item => item !== '');
                data.append(key, JSON.stringify(castArray));
            } else {
                data.append(key, JSON.stringify(null));
            }
        } else {
          data.append(key, formData[key]);
        }
      }
    }

    data.set('duration_minutes', parseInt(formData.duration_minutes || 0));
    data.set('rating', formData.rating === '' ? null : parseFloat(formData.rating || 0));
    if (isNaN(data.get('rating'))) {
      data.set('rating', null);
    }
    if (formData.release_date) {
        data.set('release_date', new Date(formData.release_date).toISOString().split('T')[0]);
    } else {
        data.set('release_date', null);
    }
    if (formData.end_date) {
        data.set('end_date', new Date(formData.end_date).toISOString().split('T')[0]);
    } else {
        data.set('end_date', null);
    }

    if (selectedPosterFile) {
      data.append('posterImage', selectedPosterFile);
    } else if (currentMovie && !posterPreviewUrl && formData.poster_url === '') {
      data.append('poster_url', '');
    } else if (currentMovie && !selectedPosterFile && currentMovie.poster_url === posterPreviewUrl) {
        // Do nothing, keep existing poster_url
    } else if (currentMovie && !selectedPosterFile && currentMovie.poster_url !== posterPreviewUrl && posterPreviewUrl === '') {
        data.append('poster_url', '');
    }
    

    try {
      if (currentMovie) {
        await updateMovie(currentMovie.movie_id, data);
        setAlertMessage('Phim đã được cập nhật thành công!');
        setAlertType('success');
      } else {
        await addMovie(data);
        setAlertMessage('Phim đã được thêm thành công!');
        setAlertType('success');
      }
      setShowAlertModal(true);
      setShowAddEditModal(false);
      // Use the debounced search term for refetching after submit
      fetchMovies({ display_status: filterStatus, searchTerm: debouncedSearchTerm });
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Lỗi khi gửi phim:", e);
      setAlertMessage(`Lỗi khi gửi phim: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setSelectedPosterFile(null);
      setPosterPreviewUrl('');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />;

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-4 text-dark">Quản lý Phim</h1>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          onClick={handleAddMovie}
          className="btn btn-primary"
        >
          Thêm Phim Mới
        </button>

        {/* Filter and Search Section */}
        <div className="d-flex gap-3">
          {/* Filter by Status */}
          <select
              className="form-select w-auto"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
          >
              <option value="">Tất cả trạng thái</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="showing">Showing</option>
              <option value="early_showing">Early Showing</option>
              <option value="hidden">Hidden</option>
          </select>

          {/* Search by Title */}
          <input
            type="text"
            className="form-control w-auto"
            placeholder="Tìm kiếm theo tên phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} // searchTerm updates immediately
          />
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead className="thead-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Tiêu đề</th>
                  <th scope="col">Thể loại</th>
                  <th scope="col">Đạo diễn</th>
                  <th scope="col" className="text-center">Thời lượng (phút)</th>
                  <th scope="col" className="text-center">Rating</th>
                  <th scope="col" className="text-center">Trạng thái</th>
                  <th scope="col" className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {movies.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      Không có phim nào được tìm thấy.
                    </td>
                  </tr>
                ) : (
                  movies.map((movie) => (
                    <tr key={movie.movie_id}>
                      <td>{movie.movie_id}</td>
                      <td>{movie.title}</td>
                      <td>{movie.genre}</td>
                      <td>{movie.director}</td>
                      <td className="text-center">{movie.duration_minutes}</td>
                      <td className="text-center">
                        {movie.rating !== null && movie.rating !== undefined && !isNaN(movie.rating) ? movie.rating.toFixed(1) : 'N/A'}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${movie.display_status === 'showing' ? 'bg-success' : movie.display_status === 'coming_soon' ? 'bg-info' : movie.display_status === 'early_showing' ? 'bg-primary' : 'bg-secondary'} rounded-pill`}>
                          {movie.display_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center">
                          <button onClick={() => handleEditMovie(movie)} className="btn btn-warning btn-sm me-2">
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          {userRole === 'admin' && (
                            <button onClick={() => confirmDelete(movie.movie_id)} className="btn btn-danger btn-sm">
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          )}
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

      {/* Modal for Add/Edit Movie */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={currentMovie ? 'Sửa Phim' : 'Thêm Phim Mới'}
        showFooter={false}
      >
        <form onSubmit={handleSubmitMovie}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="title" className="form-label">Tiêu đề:</label>
              <input
                type="text"
                className="form-control"
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="duration_minutes" className="form-label">Thời lượng (phút):</label>
              <input
                type="number"
                className="form-control"
                id="duration_minutes"
                name="duration_minutes"
                value={formData.duration_minutes || ''}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="release_date" className="form-label">Ngày phát hành:</label>
              <input
                type="date"
                className="form-control"
                id="release_date"
                name="release_date"
                value={formData.release_date || ''}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="end_date" className="form-label">Ngày kết thúc:</label>
              <input
                type="date"
                className="form-control"
                id="end_date"
                name="end_date"
                value={formData.end_date || ''}
                onChange={handleFormChange}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="genre" className="form-label">Thể loại:</label>
              <input
                type="text"
                className="form-control"
                id="genre"
                name="genre"
                value={formData.genre || ''}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="director" className="form-label">Đạo diễn:</label>
              <input
                type="text"
                className="form-control"
                id="director"
                name="director"
                value={formData.director || ''}
                onChange={handleFormChange}
              />
            </div>
            <div className="col-12">
              <label htmlFor="cast" className="form-label">Diễn viên (cách nhau bởi dấu phẩy):</label>
              <input
                type="text"
                className="form-control"
                id="cast"
                name="cast"
                value={formData.cast || ''}
                onChange={handleFormChange}
              />
            </div>
            <div className="col-12">
              <label htmlFor="description" className="form-label">Mô tả:</label>
              <textarea
                className="form-control"
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleFormChange}
                rows="3"
              ></textarea>
            </div>
            <div className="col-md-6">
                <label htmlFor="poster_image_upload" className="form-label">Ảnh Poster:</label>
                <input
                    type="file"
                    className="form-control"
                    id="poster_image_upload"
                    name="posterImage"
                    onChange={handlePosterFileChange}
                    accept="image/*"
                />
                {(posterPreviewUrl || (currentMovie && currentMovie.poster_url)) && (
                    <div className="mt-3">
                        <img
                            src={posterPreviewUrl || currentMovie.poster_url}
                            alt="Poster Preview"
                            className="img-thumbnail"
                            style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                        />
                        <button
                            type="button"
                            onClick={handleRemovePoster}
                            className="btn btn-sm btn-danger ms-2 mt-2"
                        >
                            Xóa ảnh
                        </button>
                    </div>
                )}
                {!currentMovie && !posterPreviewUrl && (
                    <small className="text-muted">Vui lòng chọn ảnh poster.</small>
                )}
            </div>
            <div className="col-md-6">
              <label htmlFor="trailer_url" className="form-label">Trailer URL:</label>
              <input
                type="url"
                className="form-control"
                id="trailer_url"
                name="trailer_url"
                value={formData.trailer_url || ''}
                onChange={handleFormChange}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="rating" className="form-label">Rating:</label>
              <input
                type="number"
                className="form-control"
                id="rating"
                name="rating"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating || ''}
                onChange={handleFormChange}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="display_status" className="form-label">Trạng thái hiển thị:</label>
              <select
                className="form-select"
                id="display_status"
                name="display_status"
                value={formData.display_status || 'coming_soon'}
                onChange={handleFormChange}
              >
                <option value="coming_soon">Coming Soon</option>
                <option value="showing">Showing</option>
                <option value="early_showing">Early Showing</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
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
              {currentMovie ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa phim"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteMovie}
        confirmButtonVariant="danger"
      >
        <p>Bạn có chắc chắn muốn xóa phim này? Điều này cũng có thể xóa các suất chiếu liên quan.</p>
      </Modal>

      {/* Modal thông báo */}
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

export default MovieManagement;