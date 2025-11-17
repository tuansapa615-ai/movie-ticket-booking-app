// src/components/Modal.js
import React from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  // Props mới cho footer
  showFooter = false, // Mặc định ẩn footer để bạn có thể tùy chỉnh nó bên ngoài nếu cần
  confirmButtonText = 'Xác nhận',
  cancelButtonText = 'Hủy',
  onConfirm, // Hàm được gọi khi nhấn nút xác nhận
  confirmButtonVariant = 'primary', // Màu sắc của nút xác nhận (primary, danger, success, etc.)
  hideCancelButton = false // Ẩn nút Hủy nếu không cần
}) => {
  if (!isOpen) {
    return null; // Không render gì khi modal không mở
  }

  // backdrop của modal và container chính
  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document"> {/* modal-lg cho kích thước lớn hơn */}
        <div className="modal-content">
          {/* Header của modal: Tiêu đề và nút đóng */}
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close" // Bootstrap 5 close button
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>

          {/* Body của modal: Chứa nội dung chính được truyền vào */}
          <div className="modal-body">
            {children}
          </div>

          {/* Footer của modal: hiển thị các nút hành động nếu showFooter là true */}
          {showFooter && (
            <div className="modal-footer">
              {!hideCancelButton && ( // Chỉ hiển thị nút Hủy nếu hideCancelButton là false
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  {cancelButtonText}
                </button>
              )}
              {onConfirm && ( // Chỉ hiển thị nút Xác nhận nếu có hàm onConfirm
                <button
                  type="button"
                  className={`btn btn-${confirmButtonVariant}`} // Sử dụng confirmButtonVariant cho màu sắc
                  onClick={onConfirm}
                >
                  {confirmButtonText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
