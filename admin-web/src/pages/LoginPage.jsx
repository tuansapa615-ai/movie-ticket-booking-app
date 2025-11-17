// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, requestPasswordReset } from '../api/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx';

export default function LoginPage({ onLoginSuccess, initialAuthError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialAuthError);
  const navigate = useNavigate();

  // States cho modal quên mật khẩu
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordType, setForgotPasswordType] = useState('success');


  useEffect(() => {
    if (initialAuthError) {
      setError(initialAuthError);
    }
  }, [initialAuthError]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginUser(email, password);
      onLoginSuccess(response.token, response.user);
    } catch (err) {
      setError(err?.message || "Email hoặc mật khẩu không đúng."); // Thông báo lỗi phù hợp
      console.error("Lỗi đăng nhập:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');
    setForgotPasswordType('success');

    try {
      const response = await requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordMessage(response.message);
      setForgotPasswordType('success');
    } catch (err) {
      const errorMessageText = err?.message || err?.toString() || 'Đã xảy ra lỗi không xác định.';
      setForgotPasswordMessage(`Lỗi: ${errorMessageText}`);
      setForgotPasswordType('danger');
      console.error("Lỗi yêu cầu đặt lại mật khẩu:", err);
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light"> {/* Dùng flexbox để căn giữa */}
      <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%' }}> {/* Dùng card của Bootstrap */}
        <div className="card-body">
          <h2 className="card-title text-center mb-4">Đăng nhập Admin</h2> {/* text-center mb-4 */}
          {error && <ErrorMessage message={error} />} {/* Hiển thị lỗi đăng nhập */}
          <form onSubmit={handleLogin} noValidate> {/* noValidate để tắt kiểm tra HTML5 mặc định */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Mật khẩu</label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? <LoadingSpinner /> : 'Đăng nhập'}
            </button>
          </form>
          {/* Nút/Liên kết quên mật khẩu */}
          <div className="mt-3 text-center">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotPasswordModal(true); setForgotPasswordMessage(''); setForgotPasswordEmail(''); }} className="text-primary">Quên mật khẩu?</a>
          </div>
        </div>
      </div>

      {/* Modal Quên Mật Khẩu */}
      <Modal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        title="Đặt lại mật khẩu Admin"
        showFooter={false}
      >
        <form onSubmit={handleRequestPasswordReset}>
          <div className="mb-3">
            <label htmlFor="forgotEmail" className="form-label">Email tài khoản Admin:</label>
            <input
              type="email"
              className="form-control"
              id="forgotEmail"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
              disabled={forgotPasswordLoading}
            />
          </div>
          {forgotPasswordMessage && (
            <div className={`alert ${forgotPasswordType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
              {forgotPasswordMessage}
            </div>
          )}
          <div className="d-flex justify-content-end mt-4">
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(false)}
              className="btn btn-secondary me-2"
              disabled={forgotPasswordLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}