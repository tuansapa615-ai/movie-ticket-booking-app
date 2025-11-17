// src/pages/CinemaManagement.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal.jsx'; // Đảm bảo đường dẫn đúng
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Đảm bảo đường dẫn đúng
import ErrorMessage from '../components/ErrorMessage.jsx'; // Đảm bảo đường dẫn đúng
import { getCinemas, addCinema, updateCinema, deleteCinema } from '../api/api.js'; // Import các hàm API

const CinemaManagement = ({ userRole }) => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentCinema, setCurrentCinema] = useState(null); // Rạp đang được chỉnh sửa
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    contact_number: '',
    google_maps_url: '',
    opening_hours: '',
  });

  // State cho modal xác nhận xóa
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [cinemaToDelete, setCinemaToDelete] = useState(null);

  // State cho modal thông báo (thành công/lỗi)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success' hoặc 'danger'

  const ALLOWED_TO_EDIT_ROLES = ['admin', 'staff']; // Vai trò được phép thêm/sửa
  const ALLOWED_TO_DELETE_ROLES = ['admin']; // Vai trò được phép xóa

  // Fetch cinemas from API
  const fetchCinemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCinemas();
      setCinemas(data.cinemas || []);
    } catch (e) {
      setError(e.message);
      console.error("Error fetching cinemas:", e);
    } finally {
      setLoading(false);
    }
  };

  // Effect hook để fetch cinemas khi component mount
  useEffect(() => {
    fetchCinemas();
  }, []);

  // Handle mở modal thêm rạp mới
  const handleAddCinema = () => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền thêm rạp chiếu phim.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setCurrentCinema(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      contact_number: '',
      google_maps_url: '',
      opening_hours: '',
    });
    setShowAddEditModal(true);
  };

  // Handle mở modal chỉnh sửa rạp
  const handleEditCinema = (cinema) => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền chỉnh sửa rạp chiếu phim.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setCurrentCinema(cinema);
    setFormData({
      name: cinema.name,
      address: cinema.address,
      city: cinema.city,
      contact_number: cinema.contact_number || '',
      google_maps_url: cinema.google_maps_url || '',
      opening_hours: cinema.opening_hours || '',
    });
    setShowAddEditModal(true);
  };

  // Handle xác nhận xóa
  const confirmDelete = (cinemaId) => {
    if (!ALLOWED_TO_DELETE_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền xóa rạp chiếu phim.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setCinemaToDelete(cinemaId);
    setShowConfirmDeleteModal(true);
  };

  // Thực hiện gọi API xóa rạp
  const executeDeleteCinema = async () => {
    setShowConfirmDeleteModal(false);
    if (!cinemaToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await deleteCinema(cinemaToDelete);
      setAlertMessage('Rạp chiếu phim đã được xóa thành công!');
      setAlertType('success');
      setShowAlertModal(true);
      fetchCinemas(); // Re-fetch cinemas
    } catch (e) {
      setError(e.message);
      console.error("Error deleting cinema:", e);
      setAlertMessage(`Lỗi khi xóa rạp chiếu phim: ${e.message}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setCinemaToDelete(null);
    }
  };

  // Handle thay đổi input form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle submit form (Thêm hoặc Cập nhật)
  const handleSubmitCinema = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (currentCinema) { // Chỉnh sửa rạp
        await updateCinema(currentCinema.cinema_id, formData);
        setAlertMessage('Rạp chiếu phim đã được cập nhật thành công!');
        setAlertType('success');
      } else { // Thêm rạp mới
        await addCinema(formData);
        setAlertMessage('Rạp chiếu phim đã được thêm thành công!');
        setAlertType('success');
      }
      setShowAlertModal(true);
      setShowAddEditModal(false);
      fetchCinemas(); // Re-fetch cinemas sau khi thêm/cập nhật
    } catch (e) {
      setError(e.message);
      console.error("Error submitting cinema:", e);
      setAlertMessage(`Lỗi khi lưu rạp chiếu phim: ${e.message}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />; // Chỉ hiển thị nếu không có alert modal đang bật

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-4 text-dark">Quản lý Rạp Chiếu Phim</h1>
      <button
        onClick={handleAddCinema}
        className="btn btn-primary mb-4"
        disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)} // Disable nếu không có quyền
      >
        Thêm Rạp Mới
      </button>

      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead className="thead-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Tên Rạp</th>
                  <th scope="col">Địa chỉ</th>
                  <th scope="col">Thành phố</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Giờ mở cửa</th>
                  <th scope="col" className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {cinemas.map((cinema) => (
                  <tr key={cinema.cinema_id}>
                    <td>{cinema.cinema_id}</td>
                    <td>{cinema.name}</td>
                    <td>{cinema.address}</td>
                    <td>{cinema.city}</td>
                    <td>{cinema.contact_number || 'N/A'}</td>
                    <td>{cinema.opening_hours || 'N/A'}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center align-items-center">
                        <button
                          onClick={() => handleEditCinema(cinema)}
                          className="btn btn-warning btn-sm me-2"
                          disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button
                          onClick={() => confirmDelete(cinema.cinema_id)}
                          className="btn btn-danger btn-sm"
                          disabled={!ALLOWED_TO_DELETE_ROLES.includes(userRole)}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cinemas.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      Không có rạp chiếu phim nào được tìm thấy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit Cinema */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={currentCinema ? 'Sửa Rạp Chiếu Phim' : 'Thêm Rạp Chiếu Phim Mới'}
        showFooter={false}
      >
        <form onSubmit={handleSubmitCinema}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Tên Rạp:</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="address" className="form-label">Địa chỉ:</label>
            <input
              type="text"
              className="form-control"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="city" className="form-label">Thành phố:</label>
            <input
              type="text"
              className="form-control"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="contact_number" className="form-label">Số điện thoại liên hệ:</label>
            <input
              type="text"
              className="form-control"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="google_maps_url" className="form-label">Google Maps URL:</label>
            <input
              type="url"
              className="form-control"
              id="google_maps_url"
              name="google_maps_url"
              value={formData.google_maps_url}
              onChange={handleFormChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="opening_hours" className="form-label">Giờ mở cửa:</label>
            <input
              type="text"
              className="form-control"
              id="opening_hours"
              name="opening_hours"
              value={formData.opening_hours}
              onChange={handleFormChange}
            />
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
              {currentCinema ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Delete Confirmation */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa Rạp Chiếu Phim"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteCinema}
        confirmButtonVariant="danger"
      >
        <p>Bạn có chắc chắn muốn xóa rạp chiếu phim **{cinemas.find(c => c.cinema_id === cinemaToDelete)?.name}** này?</p>
        <p className="text-danger">Lưu ý: Thao tác này sẽ xóa **tất cả** phòng chiếu, suất chiếu, và đặt chỗ liên quan đến rạp này. Hãy cẩn thận!</p>
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

export default CinemaManagement;
