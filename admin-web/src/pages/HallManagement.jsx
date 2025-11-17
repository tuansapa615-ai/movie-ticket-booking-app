import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal.jsx'; // Đảm bảo đường dẫn đúng
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Đảm bảo đường dẫn đúng
import ErrorMessage from '../components/ErrorMessage.jsx'; // Đảm bảo đường dẫn đúng
import { getHalls, addHall, updateHall, deleteHall, getCinemas } from '../api/api.js';
import { getUser } from '../utils/auth.js'; // Helper to get user role

const HallManagement = () => {
  const [halls, setHalls] = useState([]);
  const [cinemas, setCinemas] = useState([]); // State to store cinemas for dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false); // Dùng chung modal cho thêm/sửa
  const [currentHall, setCurrentHall] = useState(null); // Phòng đang được chỉnh sửa
  const [formData, setFormData] = useState({
    cinema_id: '',
    name: '',
    capacity: '',
    screen_type: '',
  });

  // State cho modal xác nhận xóa
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [hallToDelete, setHallToDelete] = useState(null);

  // State cho modal thông báo (thành công/lỗi)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success' hoặc 'danger'

  // Define allowed screen types
  const SCREEN_TYPES = ['2D', '3D', 'IMAX', '4DX'];

  const currentUser = getUser();
  const userRole = currentUser ? currentUser.role : 'guest';

  const ALLOWED_TO_EDIT_ROLES = ['admin', 'staff']; // Vai trò được phép thêm/sửa
  const ALLOWED_TO_DELETE_ROLES = ['admin']; // Vai trò được phép xóa (chỉ admin cho các hành động xóa quan trọng)

  // Fetch cinemas and halls from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cinemasResponse = await getCinemas();
      setCinemas(cinemasResponse.cinemas || []);

      const hallsResponse = await getHalls();
      setHalls(hallsResponse.halls || []);
    } catch (e) {
      // Cải thiện thông báo lỗi cho người dùng
      const msg = e.message || 'Đã xảy ra lỗi không xác định khi tải dữ liệu.';
      setError(msg);
      console.error("Error fetching data (cinemas/halls):", e);
      setAlertMessage(`Lỗi khi tải dữ liệu: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Effect hook để fetch dữ liệu khi component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle mở modal thêm phòng mới
  const handleAddHall = () => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền thêm phòng chiếu.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setCurrentHall(null); // Đặt null để báo hiệu là thêm mới
    setFormData({
      cinema_id: '',
      name: '',
      capacity: '',
      screen_type: '', // Reset to empty string for new hall
    });
    setShowAddEditModal(true);
  };

  // Handle mở modal chỉnh sửa phòng
  const handleEditHall = (hall) => {
    if (!ALLOWED_TO_EDIT_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền chỉnh sửa phòng chiếu.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setCurrentHall(hall);
    setFormData({
      cinema_id: hall.cinema_id,
      name: hall.name,
      capacity: hall.capacity,
      screen_type: hall.screen_type,
    });
    setShowAddEditModal(true);
  };

  // Handle xác nhận xóa
  const confirmDelete = (hallId) => {
    if (!ALLOWED_TO_DELETE_ROLES.includes(userRole)) {
      setAlertMessage('Bạn không có quyền xóa phòng chiếu.');
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }
    setHallToDelete(hallId);
    setShowConfirmDeleteModal(true);
  };

  // Thực hiện gọi API xóa phòng
  const executeDeleteHall = async () => {
    setShowConfirmDeleteModal(false); // Đóng modal xác nhận
    if (!hallToDelete) return;

    setLoading(true);
    setError(null);
    try {
      await deleteHall(hallToDelete);
      setAlertMessage('Phòng chiếu đã được xóa thành công!');
      setAlertType('success');
      setShowAlertModal(true);
      fetchData(); // Re-fetch dữ liệu
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Error deleting hall:", e);
      setAlertMessage(`Lỗi khi xóa phòng chiếu: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setHallToDelete(null);
    }
  };

  // Handle thay đổi input form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle submit form (Thêm hoặc Cập nhật)
  const handleSubmitHall = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation for screen_type
    if (!SCREEN_TYPES.includes(formData.screen_type)) {
      setAlertMessage('Loại màn hình không hợp lệ. Vui lòng chọn từ danh sách.');
      setAlertType('danger');
      setShowAlertModal(true);
      setLoading(false);
      return;
    }

    try {
      if (currentHall) { // Chỉnh sửa phòng
        await updateHall(currentHall.hall_id, formData);
        setAlertMessage('Phòng chiếu đã được cập nhật thành công!');
        setAlertType('success');
      } else { // Thêm phòng mới
        await addHall(formData);
        setAlertMessage('Phòng chiếu đã được thêm thành công!');
        setAlertType('success');
      }
      setShowAlertModal(true);
      setShowAddEditModal(false); // Đóng modal sau khi gửi thành công
      fetchData(); // Re-fetch dữ liệu để cập nhật danh sách
    } catch (e) {
      const msg = e.message || 'Không xác định';
      setError(msg);
      console.error("Error submitting hall:", e);
      setAlertMessage(`Lỗi khi lưu phòng chiếu: ${msg}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper để lấy tên rạp từ cinema_id (hiển thị trong bảng)
  const getCinemaName = (cinemaId) => {
    const cinema = cinemas.find(c => c.cinema_id === cinemaId);
    return cinema ? cinema.name : 'Không xác định';
  };

  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />; // Chỉ hiển thị nếu không có alert modal đang bật

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-4 text-dark">Quản lý Phòng Chiếu</h1>
      <button
        onClick={handleAddHall}
        className="btn btn-primary mb-4"
        disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)}
      >
        Thêm Phòng Chiếu Mới
      </button>

      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead className="thead-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Rạp Chiếu</th>
                  <th scope="col">Tên Phòng</th>
                  <th scope="col">Sức Chứa</th>
                  <th scope="col">Loại Màn Hình</th>
                  <th scope="col" className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {halls.map((hall) => (
                  <tr key={hall.hall_id}>
                    <td>{hall.hall_id}</td>
                    <td>{getCinemaName(hall.cinema_id)}</td>
                    <td>{hall.name}</td>
                    <td>{hall.capacity}</td>
                    <td>{hall.screen_type}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center align-items-center">
                        <button
                          onClick={() => handleEditHall(hall)}
                          className="btn btn-warning btn-sm me-2"
                          disabled={!ALLOWED_TO_EDIT_ROLES.includes(userRole)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button
                          onClick={() => confirmDelete(hall.hall_id)}
                          className="btn btn-danger btn-sm"
                          disabled={!ALLOWED_TO_DELETE_ROLES.includes(userRole)}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {halls.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      Không có phòng chiếu nào được tìm thấy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit Hall */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={currentHall ? 'Sửa Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
        showFooter={false}
      >
        <form onSubmit={handleSubmitHall}>
          <div className="mb-3">
            <label htmlFor="cinema_id" className="form-label">Chọn Rạp Chiếu:</label>
            <select
              className="form-select"
              id="cinema_id"
              name="cinema_id"
              value={formData.cinema_id}
              onChange={handleFormChange}
              required
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
            <label htmlFor="name" className="form-label">Tên Phòng:</label>
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
            <label htmlFor="capacity" className="form-label">Sức Chứa:</label>
            <input
              type="number"
              className="form-control"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="screen_type" className="form-label">Loại Màn Hình:</label>
            <select
              className="form-select"
              id="screen_type"
              name="screen_type"
              value={formData.screen_type}
              onChange={handleFormChange}
              required
            >
              <option value="">-- Chọn loại màn hình --</option>
              {SCREEN_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
              {currentHall ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Delete Confirmation */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa Phòng Chiếu"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteHall}
        confirmButtonVariant="danger"
      >
        <p>Bạn có chắc chắn muốn xóa phòng chiếu **{halls.find(h => h.hall_id === hallToDelete)?.name}** (Rạp: {getCinemaName(halls.find(h => h.hall_id === hallToDelete)?.cinema_id)}) này?</p>
        <p className="text-danger">Lưu ý: Thao tác này sẽ xóa **tất cả** suất chiếu và đặt chỗ liên quan đến phòng này. Hãy cẩn thận!</p>
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

export default HallManagement;