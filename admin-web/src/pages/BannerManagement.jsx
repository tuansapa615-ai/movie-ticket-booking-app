  // src/pages/BannerManagement.jsx
  import React, { useState, useEffect } from 'react';
  import Modal from '../components/Modal.jsx'; // Make sure this path is correct
  import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Make sure this path is correct
  import ErrorMessage from '../components/ErrorMessage.jsx'; // Make sure this path is correct
  import { getBanners, addBanner, updateBanner, deleteBanner } from '../api/api.js'; // Import API functions

  const BannerManagement = ({ userRole }) => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(null); // Banner being edited
    const [formData, setFormData] = useState({ launchUrl: '' }); // Form data for launchUrl
    const [selectedImageFile, setSelectedImageFile] = useState(null); // File object for new image
    const [imagePreviewUrl, setImagePreviewUrl] = useState(''); // URL for image preview

    // State for delete confirmation modal
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState(null);

    // State for alert modal (success/error messages)
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success' or 'danger'

    // Fetch banners from API
    const fetchBanners = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBanners();
        setBanners(data.banners || []);
      } catch (e) {
        setError(e.message);
        console.error("Error fetching banners:", e);
      } finally {
        setLoading(false);
      }
    };

    // Effect hook to fetch banners on component mount
    useEffect(() => {
      fetchBanners();
    }, []);

    // Handle opening add new banner modal
    const handleAddBanner = () => {
      setCurrentBanner(null);
      setFormData({ launchUrl: '' });
      setSelectedImageFile(null); // Clear selected file
      setImagePreviewUrl(''); // Clear preview
      setShowAddEditModal(true);
    };

    // Handle opening edit banner modal
    const handleEditBanner = (banner) => {
      setCurrentBanner(banner);
      setFormData({ launchUrl: banner.launchUrl });
      setSelectedImageFile(null); // Clear selected file (user picks new one to change)
      setImagePreviewUrl(banner.imageUrl || ''); // Set preview to current banner image
      setShowAddEditModal(true);
    };

    // Handle confirming delete action
    const confirmDelete = (bannerId) => {
      setBannerToDelete(bannerId);
      setShowConfirmDeleteModal(true);
    };

    // Execute delete banner API call
    const executeDeleteBanner = async () => {
      setShowConfirmDeleteModal(false);
      if (!bannerToDelete) return;

      setLoading(true);
      setError(null);
      try {
        await deleteBanner(bannerToDelete);
        setAlertMessage('Banner deleted successfully!');
        setAlertType('success');
        setShowAlertModal(true);
        fetchBanners(); // Re-fetch banners
      } catch (e) {
        setError(e.message);
        console.error("Error deleting banner:", e);
        setAlertMessage(`Error deleting banner: ${e.message}`);
        setAlertType('danger');
        setShowAlertModal(true);
      } finally {
        setLoading(false);
        setBannerToDelete(null);
      }
    };

    // Handle form input changes (only for launchUrl)
    const handleFormChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle image file selection
    const handleImageFileChange = (e) => {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      if (file) {
        setImagePreviewUrl(URL.createObjectURL(file)); // Create URL for new image preview
      } else {
        // If no file selected, reset preview to current banner's image (if editing)
        setImagePreviewUrl(currentBanner?.imageUrl || '');
      }
    };

    // Handle removing selected/existing image
    const handleRemoveImage = () => {
      setSelectedImageFile(null); // Clear selected file
      setImagePreviewUrl(''); // Clear preview
      // For update: If user explicitly removes image, we might need to send a signal to backend
      // Backend logic should handle if 'image' field is empty or missing, or if a specific 'clear_image' flag is sent.
      // For this setup, if selectedImageFile is null and imagePreviewUrl is empty,
      // the backend 'image' field in FormData will be empty, which it can interpret as 'no change' or 'clear'.
      // If you need to explicitly tell the backend to delete the image if a new one is NOT uploaded,
      // you'd add a hidden field or similar here, e.g., setFormData(prev => ({ ...prev, clearImage: true }))
      document.getElementById('banner_image_upload').value = ''; // Reset file input
    };

    // Handle form submission (Add or Update banner)
    const handleSubmitBanner = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      const data = new FormData();
      data.append('launchUrl', formData.launchUrl);

      if (currentBanner) { // If editing existing banner
        if (selectedImageFile) { // If a new image is selected
          data.append('image', selectedImageFile); // 'image' must match backend's Multer field name
        } else if (imagePreviewUrl === '' && currentBanner.imageUrl !== '') {
          // If image was removed (preview is empty) AND there was an old image, send empty string to signal deletion
          // Backend should interpret an empty 'image' field for PUT requests as 'no change to image'
          // or a specific flag is needed for deletion.
          // Based on bannerController, if newImageUrl is null, it keeps the old one.
          // If image is truly meant to be removed without new upload,
          // you would need a separate field like data.append('clearImage', 'true')
          // and adjust backend to check for 'clearImage' OR send 'image' as empty/null.
          // For now, if no new file is selected, it implicitly means "keep existing image"
          // unless you specifically send a signal to delete it.
          // The current backend update logic doesn't explicitly clear if 'image' field is absent.
          // If the user wants to clear the image without uploading a new one,
          // the backend needs a specific 'delete_image' flag, or the 'imageUrl' field itself needs to be set to null.
          // Let's modify the frontend to send an empty image field if the user explicitly removes it.
          // Multer will not provide req.file if the input is empty.
          // The backend `updateBanner` would need to check for a field like `req.body.clear_image` if it wants to delete without new upload.
          // As per current backend, `newImageUrl` will be `undefined` if no file is uploaded.
          // To clear the image on update, the frontend should send a special flag or null for imageUrl.
          // Let's assume the backend expects an empty `image` file for "no change" and a specific
          // `deleteImage: true` for deletion.
          // For simplicity, we won't implement direct "clear image without new upload" for Banners
          // unless backend supports a specific flag for it.
          // For now, if `selectedImageFile` is null, the image won't be appended to FormData,
          // so the backend won't update it unless a new file is explicitly sent.
          // If the goal is to remove the image completely, a separate endpoint or logic is typically needed.
          // Given `handleRemoveImage` clears `imagePreviewUrl`, and `selectedImageFile` is null,
          // this implies "no new image provided". Backend will keep old image.
          // If you truly want to *delete* the image on update via empty field, backend needs to explicitly check req.file and req.body for a delete flag.
          // For this example, if user removes image in frontend but doesn't upload new, old image persists UNLESS backend has explicit logic.
          // The deleteBanner endpoint is for full deletion.
        }
      } else { // If adding new banner
        if (!selectedImageFile) {
          setLoading(false);
          setAlertMessage('Please select an image for the new banner.');
          setAlertType('danger');
          setShowAlertModal(true);
          return;
        }
        data.append('image', selectedImageFile); // 'image' must match backend's Multer field name
      }

      try {
        if (currentBanner) {
          await updateBanner(currentBanner.banner_id, data);
          setAlertMessage('Banner updated successfully!');
          setAlertType('success');
        } else {
          await addBanner(data);
          setAlertMessage('Banner added successfully!');
          setAlertType('success');
        }
        setShowAlertModal(true);
        setShowAddEditModal(false);
        fetchBanners(); // Re-fetch banners after add/update
      } catch (e) {
        setError(e.message);
        console.error("Error submitting banner:", e);
        setAlertMessage(`Error submitting banner: ${e.message}`);
        setAlertType('danger');
        setShowAlertModal(true);
      } finally {
        setLoading(false);
        setSelectedImageFile(null);
        setImagePreviewUrl('');
      }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;
    
    if (userRole !== 'admin') {
      return (
        <div className="container mt-5">
          <h2 className="text-center text-danger">Access Denied</h2>
          <p className="text-center">You do not have permission to access banner management.</p>
        </div>
      );
    }

    return (
      <div className="container-fluid py-3">
        <h1 className="mb-4 text-dark">Quản lý Banners</h1>
        <button
          onClick={handleAddBanner}
          className="btn btn-primary mb-4"
        >
          Thêm Banner Mới
        </button>

        <div className="card shadow mb-4">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead className="thead-light">
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Ảnh Banner</th>
                    <th scope="col">Launch URL</th>
                    <th scope="col" className="text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner) => (
                    <tr key={banner.banner_id}>
                      <td>{banner.banner_id}</td>
                      <td>
                        {banner.imageUrl && (
                          <img
                            src={banner.imageUrl}
                            alt="Banner"
                            className="img-thumbnail"
                            style={{ width: '100px', height: '60px', objectFit: 'cover' }}
                          />
                        )}
                      </td>
                      <td>{banner.launchUrl}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center">
                          <button
                            onClick={() => handleEditBanner(banner)}
                            className="btn btn-warning btn-sm me-2"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            onClick={() => confirmDelete(banner.banner_id)}
                            className="btn btn-danger btn-sm"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {banners.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        Không có banner nào được tìm thấy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Modal
          isOpen={showAddEditModal}
          onClose={() => setShowAddEditModal(false)}
          title={currentBanner ? 'Sửa Banner' : 'Thêm Banner Mới'}
          showFooter={false}
        >
          <form onSubmit={handleSubmitBanner}>
            <div className="mb-3">
              <label htmlFor="launchUrl" className="form-label">Launch URL:</label>
              <input
                type="url"
                className="form-control"
                id="launchUrl"
                name="launchUrl"
                value={formData.launchUrl}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="banner_image_upload" className="form-label">Ảnh Banner:</label>
              <input
                type="file"
                className="form-control"
                id="banner_image_upload"
                name="image" 
                onChange={handleImageFileChange}
                accept="image/*"
                required={!currentBanner && !imagePreviewUrl} 
              />
              {(imagePreviewUrl || (currentBanner && currentBanner.imageUrl)) && (
                <div className="mt-3">
                  <img
                    src={imagePreviewUrl || currentBanner.imageUrl}
                    alt="Banner Preview"
                    className="img-thumbnail"
                    style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-sm btn-danger ms-2 mt-2"
                  >
                    Xóa ảnh
                  </button>
                </div>
              )}
              {!currentBanner && !imagePreviewUrl && (
                  <small className="text-danger">Vui lòng chọn ảnh banner.</small>
              )}
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
                {currentBanner ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal for Delete Confirmation */}
        <Modal
          isOpen={showConfirmDeleteModal}
          onClose={() => setShowConfirmDeleteModal(false)}
          title="Xác nhận xóa Banner"
          showFooter={true}
          confirmButtonText="Xóa"
          cancelButtonText="Hủy"
          onConfirm={executeDeleteBanner}
          confirmButtonVariant="danger"
        >
          <p>Bạn có chắc chắn muốn xóa banner này?</p>
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

  export default BannerManagement;
