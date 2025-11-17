// src/pages/UserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';
import { getUsers, deleteUser } from '../api/api.js';

const UserManagement = ({ userRole }) => { // Nhận userRole từ props
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);
  const [userToDeleteName, setUserToDeleteName] = useState('');

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  const fetchUsers = useCallback(async (term = '') => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API getUsers, backend đã được sửa để chỉ trả về customer mặc định
      const data = await getUsers(term); 
      setUsers(data.users || []);
    } catch (e) {
      const errorMessageText = e?.message || e?.toString() || 'Đã xảy ra lỗi không xác định.';
      setError(errorMessageText);
      console.error("Lỗi khi tải người dùng:", e);
      setAlertMessage(`Lỗi khi tải người dùng: ${errorMessageText}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(searchTerm);
  };

  const confirmDelete = (userId, username) => {
    setUserToDeleteId(userId);
    setUserToDeleteName(username);
    setShowConfirmDeleteModal(true);
  };

  const executeDeleteUser = async () => {
    setShowConfirmDeleteModal(false);
    if (!userToDeleteId) return;

    setLoading(true);
    setError(null);
    try {
      await deleteUser(userToDeleteId);
      setAlertMessage(`Người dùng ${userToDeleteName} đã được xóa thành công!`);
      setAlertType('success');
      setShowAlertModal(true);
      fetchUsers(searchTerm);
    } catch (e) {
      const errorMessageText = e?.message || e?.toString() || 'Đã xảy ra lỗi không xác định.';
      setError(errorMessageText);
      console.error("Lỗi khi xóa người dùng:", e);
      setAlertMessage(`Lỗi khi xóa người dùng ${userToDeleteName}: ${errorMessageText}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setUserToDeleteId(null);
      setUserToDeleteName('');
    }
  };


  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />;
  
  if (userRole !== 'admin') { // Chỉ admin mới có quyền truy cập trang User Management
      return (
          <div className="container mt-5">
              <h2 className="text-center text-danger">Truy cập bị từ chối</h2>
              <p className="text-center">Bạn không có quyền truy cập vào quản lý người dùng.</p>
          </div>
      );
  }

  const visibleColumnCount = 9; // ID, Email, Tên đầy đủ, SĐT, Giới tính, Ngày sinh, CMND, Vai trò, Đã xác minh, Hành động (Bỏ Sửa)

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Quản lý Người dùng</h1>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <form onSubmit={handleSearchSubmit} className="d-flex w-50">
          <input
            type="text"
            className="form-control me-2"
            placeholder="Tìm kiếm theo tên người dùng, email, hoặc tên đầy đủ..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <button type="submit" className="btn btn-primary">
            Tìm kiếm
          </button>
        </form>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="table table-hover table-striped">
          <thead className="thead-light">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Email</th>
              <th scope="col">Tên đầy đủ</th>
              <th scope="col">Số điện thoại</th>
              <th scope="col">Giới tính</th>
              <th scope="col">Ngày sinh</th>
              <th scope="col">CMND/Hộ chiếu</th>
              <th scope="col">Vai trò</th>
              <th scope="col" className="text-center">Đã xác minh</th>
              <th scope="col" className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-b border-gray-200 hover:bg-gray-50">
                <td>{user.user_id}</td>
                <td>{user.email}</td>
                <td>{user.full_name || 'N/A'}</td>
                <td>{user.phone_number || 'N/A'}</td>
                <td>{user.gender || 'N/A'}</td>
                <td>{user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('vi-VN') : 'N/A'}</td>
                <td>{user.identity_card_number || 'N/A'}</td>
                <td>{user.role}</td>
                <td className="text-center">
                  <span className={`relative inline-block px-3 py-1 font-semibold leading-tight ${user.is_verified ? 'text-green-900 bg-green-200' : 'text-red-900 bg-red-200'} rounded-full`}>
                    {user.is_verified ? 'Có' : 'Không'}
                  </span>
                </td>
                <td className="text-center">
                  <div className="d-flex justify-content-center align-items-center">
                    {/* Nút Sửa đã bị bỏ đi */}
                    {/* {userRole === 'admin' && ( // Có thể thêm nút sửa nếu cần, nhưng chỉ cho admin
                      <button className="btn btn-warning btn-sm me-2">
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                    )} */}
                    {userRole === 'admin' && ( // Chỉ admin mới có quyền xóa
                      <button onClick={() => confirmDelete(user.user_id, user.username)} className="btn btn-danger btn-sm">
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={visibleColumnCount} className="py-6 text-center text-gray-500">
                  Không có người dùng nào được tìm thấy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa người dùng"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteUser}
        confirmButtonVariant="danger"
        hideCancelButton={false}
      >
        <p>Bạn có chắc chắn muốn xóa người dùng **{userToDeleteName}** (ID: {userToDeleteId}) này không?</p>
        <p className="text-danger small">Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.</p>
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

export default UserManagement;