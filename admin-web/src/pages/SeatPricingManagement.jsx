// src/pages/SeatPricingManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal.jsx'; // Đảm bảo bạn có component Modal này
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Giả định bạn có component LoadingSpinner
import ErrorMessage from '../components/ErrorMessage.jsx'; // Giả định bạn có component ErrorMessage
import {
    getSeatTypePrices,
    addSeatTypePrice,
    updateSeatTypePrice,
    deleteSeatTypePrice
} from '../api/api.js';

const SeatPricingManagement = ({ userRole }) => { // Nhận userRole từ props để kiểm tra quyền
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [currentPriceEntry, setCurrentPriceEntry] = useState(null); // Entry being edited (null if adding)
    const [formData, setFormData] = useState({ seat_type: 'standard', price: '' }); // Dữ liệu form cho thêm/sửa ghế

    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [priceEntryToDeleteId, setPriceEntryToDeleteId] = useState(null);
    const [priceEntryToDeleteType, setPriceEntryToDeleteType] = useState('');

    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success' or 'danger'

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSeatTypePrices(); // API trả về { prices: [...] }
            setPrices(data.prices || []);
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi tải giá loại ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error fetching seat prices:", err);
        } finally {
            setLoading(false);
        }
    }, []); // useCallback để tránh tạo lại hàm không cần thiết

    useEffect(() => {
        fetchPrices(); // Tải giá khi component mount
    }, [fetchPrices]); // Dependency array để fetchPrices được gọi lại khi fetchPrices thay đổi (nhờ useCallback)

    // Xử lý thay đổi trong form input
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Mở modal Thêm Giá
    const handleAddPrice = () => {
        setCurrentPriceEntry(null); // Không có entry hiện tại = thêm mới
        setFormData({
            seat_type: 'standard', // Mặc định
            price: ''
        });
        setShowAddEditModal(true);
    };

    // Mở modal Sửa Giá
    const handleEditPrice = (priceEntry) => {
        setCurrentPriceEntry(priceEntry);
        setFormData({
            seat_type: priceEntry.seat_type,
            price: priceEntry.price.toString() // Chuyển số sang chuỗi cho input
        });
        setShowAddEditModal(true);
    };

    // Xử lý submit form (Thêm hoặc Cập nhật)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                seat_type: formData.seat_type,
                price: parseFloat(formData.price) // Chuyển giá sang số
            };

            if (isNaN(payload.price)) {
                setAlertMessage('Giá không hợp lệ. Vui lòng nhập một số.');
                setAlertType('danger');
                setShowAlertModal(true);
                setLoading(false);
                return;
            }

            if (currentPriceEntry) {
                // Cập nhật giá ghế hiện có
                await updateSeatTypePrice(currentPriceEntry.seat_type_price_id, payload.price); // Chỉ gửi ID và giá
                setAlertMessage('Giá loại ghế đã được cập nhật thành công!');
                setAlertType('success');
            } else {
                // Thêm giá ghế mới
                await addSeatTypePrice(payload.seat_type, payload.price);
                setAlertMessage('Giá loại ghế đã được thêm thành công!');
                setAlertType('success');
            }
            setShowAddEditModal(false); // Đóng modal thêm/sửa
            setShowAlertModal(true); // Hiển thị modal thông báo
            fetchPrices(); // Tải lại danh sách giá
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi lưu giá loại ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error saving seat price:", err);
        } finally {
            setLoading(false);
        }
    };

    // Mở modal xác nhận xóa
    const confirmDelete = (id, seatType) => {
        setPriceEntryToDeleteId(id);
        setPriceEntryToDeleteType(seatType);
        setShowConfirmDeleteModal(true);
    };

    // Thực hiện xóa giá ghế
    const executeDelete = async () => {
        setShowConfirmDeleteModal(false);
        if (!priceEntryToDeleteId) return;

        setLoading(true);
        setError(null);
        try {
            await deleteSeatTypePrice(priceEntryToDeleteId);
            setAlertMessage(`Giá loại ghế ${priceEntryToDeleteType} đã được xóa thành công!`);
            setAlertType('success');
            setShowAlertModal(true);
            fetchPrices(); // Tải lại danh sách giá
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi xóa giá loại ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error deleting seat price:", err);
        } finally {
            setLoading(false);
            setPriceEntryToDeleteId(null);
            setPriceEntryToDeleteType('');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error && !showAlertModal) return <ErrorMessage message={error} />;
    
    // Kiểm tra quyền truy cập: chỉ admin hoặc staff
    if (userRole !== 'admin' && userRole !== 'staff') {
        return (
            <div className="container mt-5">
                <h2 className="text-center text-danger">Truy cập bị từ chối</h2>
                <p className="text-center">Bạn không có quyền truy cập vào quản lý giá ghế.</p>
            </div>
        );
    }

    return (
        <div className="container-fluid py-3">
            <h1 className="mb-4 text-dark">Quản lý Giá Ghế</h1>

            {/* <button onClick={handleAddPrice} className="btn btn-primary mb-4">
                Thêm Giá Ghế Mới
            </button> */}

            <div className="card shadow mb-4">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover table-striped">
                            <thead className="thead-light">
                                <tr>
                                    <th scope="col">ID</th>
                                    <th scope="col">Loại Ghế</th>
                                    <th scope="col">Giá</th>
                                    <th scope="col" className="text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prices.map(priceEntry => (
                                    <tr key={priceEntry.seat_type_price_id}>
                                        <td>{priceEntry.seat_type_price_id}</td>
                                        <td>{priceEntry.seat_type}</td>
                                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceEntry.price)}</td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center align-items-center">
                                                <button onClick={() => handleEditPrice(priceEntry)} className="btn btn-warning btn-sm me-2">
                                                    <i className="bi bi-pencil-fill"></i>
                                                </button>
                                                {/* {userRole === 'admin' && ( // Chỉ admin mới được xóa
                                                    <button onClick={() => confirmDelete(priceEntry.seat_type_price_id, priceEntry.seat_type)} className="btn btn-danger btn-sm">
                                                        <i className="bi bi-trash-fill"></i>
                                                    </button>
                                                )} */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {prices.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-4">
                                            Không có giá loại ghế nào được tìm thấy.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Add/Edit Price */}
            <Modal
                isOpen={showAddEditModal}
                onClose={() => setShowAddEditModal(false)}
                title={currentPriceEntry ? 'Sửa Giá Ghế' : 'Thêm Giá Ghế Mới'}
                showFooter={false}
            >
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="seat_type" className="form-label">Loại Ghế:</label>
                        <select
                            className="form-select"
                            id="seat_type"
                            name="seat_type"
                            value={formData.seat_type}
                            onChange={handleFormChange}
                            required
                            disabled={currentPriceEntry !== null} // Cannot change seat type for existing entry
                        >
                            <option value="standard">Standard</option>
                            <option value="vip">VIP</option>
                            <option value="couple">Couple</option>
                        </select>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="price" className="form-label">Giá:</label>
                        <input
                            type="number"
                            className="form-control"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleFormChange}
                            step="0.01" // Cho phép số thập phân
                            min="0"
                            required
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
                            {currentPriceEntry ? 'Cập nhật' : 'Thêm'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal for Delete Confirmation */}
            <Modal
                isOpen={showConfirmDeleteModal}
                onClose={() => setShowConfirmDeleteModal(false)}
                title="Xác nhận xóa giá ghế"
                showFooter={true}
                confirmButtonText="Xóa"
                cancelButtonText="Hủy"
                onConfirm={executeDelete}
                confirmButtonVariant="danger"
                hideCancelButton={false}
            >
                <p>Bạn có chắc chắn muốn xóa giá cho loại ghế **{priceEntryToDeleteType}** (ID: {priceEntryToDeleteId}) này không?</p>
            </Modal>

            {/* Alert Modal */}
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

export default SeatPricingManagement;