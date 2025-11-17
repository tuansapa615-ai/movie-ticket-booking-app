// src/pages/SeatManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal.jsx'; // Giả định bạn có component Modal này
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Giả định bạn có component LoadingSpinner
import ErrorMessage from '../components/ErrorMessage.jsx'; // Giả định bạn có component ErrorMessage
import {
    getHalls, // Để lấy danh sách các phòng chiếu
    getSeatsByHall, // Để lấy ghế theo ID phòng chiếu (sử dụng query param hallId)
    addSeat,
    updateSeat,
    deleteSeat
} from '../api/api.js';

const SeatManagement = ({ userRole }) => {
    const [halls, setHalls] = useState([]);
    const [selectedHallId, setSelectedHallId] = useState(''); // ID của phòng chiếu đang được chọn
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [currentSeat, setCurrentSeat] = useState(null); // Ghế đang được chỉnh sửa (null nếu thêm mới)
    const [formData, setFormData] = useState({}); // Dữ liệu form cho thêm/sửa ghế

    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [seatToDelete, setSeatToDelete] = useState(null); // ID của ghế sẽ bị xóa

    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success' or 'danger'

    // Fetch Halls on component mount
    useEffect(() => {
        const fetchHalls = async () => {
            try {
                setLoading(true);
                // getHalls() without cinemaId will fetch all halls
                const data = await getHalls(); 
                setHalls(data.halls || []);
                if (data.halls && data.halls.length > 0) {
                    setSelectedHallId(data.halls[0].hall_id); // Select the first hall by default
                }
            } catch (err) {
                const msg = err.message || 'Đã xảy ra lỗi khi tải danh sách phòng chiếu.';
                setError(msg);
                setAlertMessage(`Lỗi: ${msg}`);
                setAlertType('danger');
                setShowAlertModal(true);
                console.error("Error fetching halls:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHalls();
    }, []);

    // Fetch Seats when selectedHallId changes
    const fetchSeats = useCallback(async () => {
        if (!selectedHallId) {
            setSeats([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Use getSeatsByHall with hallId as query parameter
            // The API is designed to return { seats: [...] }
            const data = await getSeatsByHall(selectedHallId);
            setSeats(data.seats || []);
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi tải danh sách ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error fetching seats:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedHallId]); // Re-run when selectedHallId changes

    useEffect(() => {
        fetchSeats();
    }, [fetchSeats]); // Re-run when fetchSeats (or selectedHallId) changes

    // Handle form input changes
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Open Add Seat Modal
    const handleAddSeat = () => {
        setCurrentSeat(null); // No current seat means we are adding
        setFormData({
            hall_id: selectedHallId, // Pre-fill with currently selected hall
            seat_row: '',
            seat_number: '',
            seat_type: 'standard', // Default
        });
        setShowAddEditModal(true);
    };

    // Open Edit Seat Modal
    const handleEditSeat = (seat) => {
        setCurrentSeat(seat);
        setFormData({
            hall_id: seat.hall_id,
            seat_row: seat.seat_row,
            seat_number: seat.seat_number,
            seat_type: seat.seat_type,
        });
        setShowAddEditModal(true);
    };

    // Handle form submission (Add or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Convert numerical inputs to numbers
            const payload = {
                ...formData,
                hall_id: parseInt(formData.hall_id),
                seat_number: parseInt(formData.seat_number),
            };
            
            if (currentSeat) {
                // Update existing seat
                await updateSeat(currentSeat.seat_id, payload);
                setAlertMessage('Ghế đã được cập nhật thành công!');
                setAlertType('success');
            } else {
                // Add new seat
                await addSeat(payload);
                setAlertMessage('Ghế đã được thêm thành công!');
                setAlertType('success');
            }
            setShowAddEditModal(false);
            setShowAlertModal(true);
            fetchSeats(); // Refresh seat list
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi lưu ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error saving seat:", err);
        } finally {
            setLoading(false);
        }
    };

    // Open Delete Confirmation Modal
    const confirmDelete = (seatId) => {
        setSeatToDelete(seatId);
        setShowConfirmDeleteModal(true);
    };

    // Execute Delete
    const executeDelete = async () => {
        setShowConfirmDeleteModal(false);
        if (!seatToDelete) return;

        setLoading(true);
        setError(null);
        try {
            await deleteSeat(seatToDelete);
            setAlertMessage('Ghế đã được xóa thành công!');
            setAlertType('success');
            setShowAlertModal(true);
            fetchSeats(); // Refresh seat list
        } catch (err) {
            const msg = err.message || 'Đã xảy ra lỗi khi xóa ghế.';
            setError(msg);
            setAlertMessage(`Lỗi: ${msg}`);
            setAlertType('danger');
            setShowAlertModal(true);
            console.error("Error deleting seat:", err);
        } finally {
            setLoading(false);
            setSeatToDelete(null);
        }
    };

    if (loading && halls.length === 0) return <LoadingSpinner />;
    if (error && !showAlertModal) return <ErrorMessage message={error} />;
    
    return (
        <div className="container-fluid py-3">
            <h1 className="mb-4 text-dark">Quản lý Ghế ngồi</h1>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <button
                    onClick={handleAddSeat}
                    className="btn btn-primary"
                    disabled={!selectedHallId} // Disable if no hall is selected
                >
                    Thêm Ghế Mới
                </button>

                <div className="d-flex align-items-center gap-3">
                    <label htmlFor="hallSelect" className="form-label mb-0">Chọn Phòng chiếu:</label>
                    <select
                        id="hallSelect"
                        className="form-select w-auto"
                        value={selectedHallId}
                        onChange={(e) => setSelectedHallId(parseInt(e.target.value))}
                        disabled={loading}
                    >
                        {halls.length === 0 ? (
                            <option value="">Không có phòng chiếu nào</option>
                        ) : (
                            <>
                                <option value="">Chọn một phòng...</option> {/* Optional placeholder */}
                                {halls.map(hall => (
                                    <option key={hall.hall_id} value={hall.hall_id}>
                                        {hall.name} (ID: {hall.hall_id})
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
            </div>

            {selectedHallId && (
                <div className="card shadow mb-4">
                    <div className="card-body">
                        {loading ? (
                            <LoadingSpinner />
                        ) : seats.length === 0 ? (
                            <p className="text-center text-muted py-4">Chưa có ghế nào trong phòng chiếu này.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover table-striped">
                                    <thead className="thead-light">
                                        <tr>
                                            <th scope="col">ID Ghế</th>
                                            <th scope="col">Hàng</th>
                                            <th scope="col">Số</th>
                                            <th scope="col">Loại</th>                                
                                            <th scope="col" className="text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {seats.map(seat => (
                                            <tr key={seat.seat_id}>
                                                <td>{seat.seat_id}</td>
                                                <td>{seat.seat_row}</td>
                                                <td>{seat.seat_number}</td>
                                                <td>
                                                    <span className={`badge rounded-pill 
                                                        ${seat.seat_type === 'standard' ? 'bg-secondary' : ''}
                                                        ${seat.seat_type === 'vip' ? 'bg-warning text-dark' : ''}
                                                        ${seat.seat_type === 'couple' ? 'bg-info text-dark' : ''}
                                                    `}>
                                                        {seat.seat_type}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center align-items-center">
                                                        <button onClick={() => handleEditSeat(seat)} className="btn btn-warning btn-sm me-2">
                                                            <i className="bi bi-pencil-fill"></i>
                                                        </button>
                                                        {userRole === 'admin' && ( // Only admin can delete
                                                            <button onClick={() => confirmDelete(seat.seat_id)} className="btn btn-danger btn-sm">
                                                                <i className="bi bi-trash-fill"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {!selectedHallId && !loading && halls.length > 0 && (
                 <p className="text-center text-muted py-4">Vui lòng chọn một phòng chiếu từ danh sách trên để quản lý ghế.</p>
            )}
            {!loading && halls.length === 0 && (
                <p className="text-center text-danger py-4">Không có phòng chiếu nào được tìm thấy. Vui lòng thêm phòng chiếu trước.</p>
            )}


            {/* Modal for Add/Edit Seat */}
            <Modal
                isOpen={showAddEditModal}
                onClose={() => setShowAddEditModal(false)}
                title={currentSeat ? 'Sửa Ghế' : 'Thêm Ghế Mới'}
                showFooter={false}
            >
                <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label htmlFor="hall_id" className="form-label">ID Phòng chiếu:</label>
                            <select
                                className="form-select"
                                id="hall_id"
                                name="hall_id"
                                value={formData.hall_id || ''}
                                onChange={handleFormChange}
                                required
                                disabled={currentSeat !== null} // Cannot change hall_id for existing seat
                            >
                                <option value="">Chọn phòng chiếu...</option>
                                {halls.map(hall => (
                                    <option key={hall.hall_id} value={hall.hall_id}>
                                        {hall.name} (ID: {hall.hall_id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="seat_row" className="form-label">Hàng ghế (ví dụ: A, B, C):</label>
                            <input
                                type="text"
                                className="form-control"
                                id="seat_row"
                                name="seat_row"
                                value={formData.seat_row || ''}
                                onChange={handleFormChange}
                                maxLength="1" // Typically single character
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="seat_number" className="form-label">Số ghế:</label>
                            <input
                                type="number"
                                className="form-control"
                                id="seat_number"
                                name="seat_number"
                                value={formData.seat_number || ''}
                                onChange={handleFormChange}
                                min="1"
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="seat_type" className="form-label">Loại ghế:</label>
                            <select
                                className="form-select"
                                id="seat_type"
                                name="seat_type"
                                value={formData.seat_type || 'standard'}
                                onChange={handleFormChange}
                            >
                                <option value="standard">Standard</option>
                                <option value="vip">VIP</option>
                                <option value="couple">Couple</option>
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
                            {currentSeat ? 'Cập nhật' : 'Thêm'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal for Delete Confirmation */}
            <Modal
                isOpen={showConfirmDeleteModal}
                onClose={() => setShowConfirmDeleteModal(false)}
                title="Xác nhận xóa ghế"
                showFooter={true}
                confirmButtonText="Xóa"
                cancelButtonText="Hủy"
                onConfirm={executeDelete}
                confirmButtonVariant="danger"
            >
                <p>Bạn có chắc chắn muốn xóa ghế này không? Hành động này không thể hoàn tác.</p>
                <p className="text-danger small">Lưu ý: Ghế có thể không xóa được nếu có dữ liệu đặt chỗ liên quan.</p>
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

export default SeatManagement;
