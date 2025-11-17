// src/pages/FoodItemManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal.jsx'; // Make sure this path is correct
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Make sure this path is correct
import ErrorMessage from '../components/ErrorMessage.jsx'; // Make sure this path is correct
import { getFoodItems, addFoodItem, updateFoodItem, deleteFoodItem } from '../api/api.js';

const FoodItemManagement = ({ userRole }) => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Add/Edit Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentFoodItem, setCurrentFoodItem] = useState(null); // Food item being edited
  const [formData, setFormData] = useState({ // Form data for general fields
    category_name: '',
    name: '',
    description: '',
    price: '',
    is_available: true,
  });
  const [selectedImageFile, setSelectedImageFile] = useState(null); // File object for new image
  const [imagePreviewUrl, setImagePreviewUrl] = useState(''); // URL for image preview
  const fileInputRef = useRef(null); // Ref to reset file input

  // State for delete confirmation modal
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [foodItemToDelete, setFoodItemToDelete] = useState(null);

  // State for alert modal (success/error messages)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success' or 'danger'

  // Fetch food items from API
  const fetchFoodItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFoodItems();
      if (data.success) {
        setFoodItems(data.foodItems || []);
      } else {
        throw new Error(data.message || 'Lỗi khi tải danh sách món ăn.');
      }
    } catch (e) {
      setError('Lỗi khi tải danh sách món ăn: ' + e.message);
      console.error("Error fetching food items:", e);
    } finally {
      setLoading(false);
    }
  };

  // Effect hook to fetch food items on component mount
  useEffect(() => {
    fetchFoodItems();
  }, []);

  // Handle opening add new food item modal
  const handleAddFoodItem = () => {
    setCurrentFoodItem(null);
    setFormData({
      category_name: '',
      name: '',
      description: '',
      price: '',
      is_available: true,
    });
    setSelectedImageFile(null); // Clear selected file
    setImagePreviewUrl(''); // Clear preview
    if (fileInputRef.current) { // Reset file input element
        fileInputRef.current.value = '';
    }
    setShowAddEditModal(true);
  };

  // Handle opening edit food item modal
  const handleEditFoodItem = (item) => {
    setCurrentFoodItem(item);
    setFormData({
      category_name: item.category_name,
      name: item.name,
      description: item.description || '',
      price: item.price,
      is_available: item.is_available,
    });
    setSelectedImageFile(null); // Clear selected file (user picks new one to change)
    setImagePreviewUrl(item.image_url || ''); // Set preview to current image
    if (fileInputRef.current) { // Reset file input element
        fileInputRef.current.value = '';
    }
    setShowAddEditModal(true);
  };

  // Handle confirming delete action
  const confirmDelete = (item) => {
    setFoodItemToDelete(item);
    setShowConfirmDeleteModal(true);
  };

  // Execute delete food item API call
  const executeDeleteFoodItem = async () => {
    setShowConfirmDeleteModal(false);
    if (!foodItemToDelete) return;

    setLoading(true);
    setError(null);
    try {
      const result = await deleteFoodItem(foodItemToDelete.item_id);
      setAlertMessage(result.message || 'Món ăn đã được xóa thành công!');
      setAlertType('success');
      setShowAlertModal(true);
      fetchFoodItems(); // Re-fetch list
    } catch (e) {
      setError(e.message);
      console.error("Lỗi khi xóa món ăn:", e);
      setAlertMessage(`Lỗi khi xóa món ăn: ${e.message}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setFoodItemToDelete(null);
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle image file selection
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedImageFile(file);
    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file)); // Create URL for new image preview
    } else {
      // If no file selected, reset preview to current item's image (if editing)
      setImagePreviewUrl(currentFoodItem?.image_url || '');
    }
  };

  // Handle removing selected/existing image
  const handleRemoveImage = () => {
    setSelectedImageFile(null); // Clear selected file
    setImagePreviewUrl(''); // Clear preview
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input element
    }
  };

  // Handle form submission (Add or Update food item)
  const handleSubmitFoodItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    const errors = [];
    if (!formData.category_name.trim()) errors.push('Tên danh mục không được trống.');
    if (!formData.name.trim()) errors.push('Tên món ăn không được trống.');
    if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) errors.push('Giá tiền phải là số dương.');
    
    // For new food item, image is required
    if (!currentFoodItem && !selectedImageFile) {
        errors.push('Vui lòng chọn ảnh cho món ăn mới.');
    }

    if (errors.length > 0) {
      setLoading(false);
      setAlertMessage('Vui lòng kiểm tra các lỗi sau:\n' + errors.join('\n'));
      setAlertType('danger');
      setShowAlertModal(true);
      return;
    }

    const data = new FormData();
    data.append('category_name', formData.category_name);
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', parseFloat(formData.price));
    data.append('is_available', formData.is_available);

    if (selectedImageFile) {
      data.append('image', selectedImageFile); // 'image' must match backend's Multer field name
    } else if (currentFoodItem && imagePreviewUrl === '' && currentFoodItem.image_url) {
      // If editing, no new file is selected, preview is empty, and there was an old image:
      // This signals to the backend that the image should be removed.
      data.append('image_action', 'clear'); // Custom flag for backend to clear image
    }
    
    try {
      if (currentFoodItem) {
        const result = await updateFoodItem(currentFoodItem.item_id, data);
        setAlertMessage(result.message || 'Cập nhật món ăn thành công!');
        setAlertType('success');
      } else {
        const result = await addFoodItem(data);
        setAlertMessage(result.message || 'Thêm món ăn thành công!');
        setAlertType('success');
      }
      setShowAlertModal(true);
      setShowAddEditModal(false); // Close modal
      fetchFoodItems(); // Re-fetch list
    } catch (err) {
      setError(err.message);
      console.error('Lỗi khi lưu món ăn:', err);
      setAlertMessage(`Lỗi khi lưu món ăn: ${err.message}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
      setSelectedImageFile(null);
      setImagePreviewUrl('');
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
    }
  };

  // Only allow admin role to manage food items
  if (userRole !== 'admin') {
    return (
      <div className="container mt-5">
        <h2 className="text-center text-danger">Truy Cập Bị Từ Chối</h2>
        <p className="text-center">Bạn không có quyền truy cập chức năng quản lý món ăn.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <h1 className="mb-4 text-dark">Quản Lý Món Ăn</h1>

      <button
        onClick={handleAddFoodItem}
        className="btn btn-primary mb-4"
      >
        Thêm Món Ăn Mới
      </button>

      {/* Display general error (if any) */}
      {error && <ErrorMessage message={error} />}

      {/* Display loading state */}
      {loading && <LoadingSpinner />}

      {/* Food Item List Table */}
      {!loading && (
        <div className="card shadow mb-4">
          <div className="card-header bg-info text-white">
            <h2 className="h5 mb-0">Danh Sách Món Ăn</h2>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead className="thead-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Ảnh</th>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Tên món</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Mô tả</th>
                    <th scope="col">Có sẵn</th>
                    <th scope="col" className="text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {foodItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        Không có món ăn nào.
                      </td>
                    </tr>
                  ) : (
                    foodItems.map((item) => (
                      <tr key={item.item_id}>
                        <td>{item.item_id}</td>
                        <td>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="img-thumbnail"
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                              onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://placehold.co/60x60/CCCCCC/666666?text=NoImg`;
                              }}
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ width: '60px', height: '60px' }}>
                                <span className="text-muted small">NoImg</span>
                            </div>
                          )}
                        </td>
                        <td>{item.category_name}</td>
                        <td>{item.name}</td>
                        <td>{item.price.toLocaleString('vi-VN')} VNĐ</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                          {item.description}
                        </td>
                        <td>
                          {item.is_available ? (
                            <span className="badge bg-success">Có</span>
                          ) : (
                            <span className="badge bg-danger">Không</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center align-items-center">
                            <button
                              onClick={() => handleEditFoodItem(item)}
                              className="btn btn-warning btn-sm me-2"
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="btn btn-danger btn-sm"
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
      )}

      {/* Modal for Add/Edit Food Item */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={currentFoodItem ? 'Sửa Món Ăn' : 'Thêm Món Ăn Mới'}
        showFooter={false}
      >
        <form onSubmit={handleSubmitFoodItem} className="p-2">
          <div className="mb-3">
            <label htmlFor="category_name" className="form-label">Tên danh mục:</label>
            <input
              type="text"
              className="form-control"
              id="category_name"
              name="category_name"
              value={formData.category_name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Tên món ăn:</label>
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
            <label htmlFor="description" className="form-label">Mô tả:</label>
            <textarea
              className="form-control"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows="3"
            ></textarea>
          </div>
          <div className="mb-3">
            <label htmlFor="price" className="form-label">Giá tiền:</label>
            <input
              type="number"
              className="form-control"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleFormChange}
              required
              step="any"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="food_item_image_upload" className="form-label">Ảnh món ăn:</label>
            <input
              type="file"
              className="form-control"
              id="food_item_image_upload"
              name="image" 
              accept="image/*"
              onChange={handleImageFileChange}
              ref={fileInputRef}
              required={!currentFoodItem && !imagePreviewUrl} // Required only for new item if no preview
            />
            {(imagePreviewUrl || (currentFoodItem && currentFoodItem.image_url)) && (
              <div className="mt-3 d-flex align-items-center">
                <img
                  src={imagePreviewUrl || currentFoodItem.image_url}
                  alt="Preview"
                  className="img-thumbnail me-2"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = `https://placehold.co/100x100/CCCCCC/666666?text=NoImg`; 
                  }}
                />
                <button type="button" className="btn btn-sm btn-danger" onClick={handleRemoveImage}>
                  Xóa ảnh
                </button>
              </div>
            )}
            {!currentFoodItem && !imagePreviewUrl && (
                <small className="text-danger">Vui lòng chọn ảnh món ăn.</small>
            )}
          </div>
          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="is_available"
              name="is_available"
              checked={formData.is_available}
              onChange={handleFormChange}
            />
            <label className="form-check-label" htmlFor="is_available">
              Có sẵn
            </label>
          </div>
          <div className="d-flex justify-content-end">
            <button
              type="button"
              onClick={() => setShowAddEditModal(false)}
              className="btn btn-secondary me-2"
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {currentFoodItem ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Delete Confirmation */}
      <Modal
        isOpen={showConfirmDeleteModal}
        onClose={() => setShowConfirmDeleteModal(false)}
        title="Xác nhận xóa Món Ăn"
        showFooter={true}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        onConfirm={executeDeleteFoodItem}
        confirmButtonVariant="danger"
      >
        <p>Bạn có chắc chắn muốn xóa món ăn "{foodItemToDelete?.name}" không?</p>
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

export default FoodItemManagement;
