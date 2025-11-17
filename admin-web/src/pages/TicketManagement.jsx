import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Modal from '../components/Modal.jsx'; // Đảm bảo import Modal
import { getAllTicketsForAdmin } from '../api/api.js'; // Import API function
import Barcode from 'react-barcode'; // Giả sử đã cài đặt và sử dụng react-barcode

const TicketManagement = ({ userRole }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States cho modal thông báo (thành công/lỗi)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success' or 'danger'

  // States cho modal in vé
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState(null); // Vé đang được in


  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllTicketsForAdmin(); // API call to fetch all tickets
      console.log("DEBUG: Raw API response data (Tickets):", data);

      if (Array.isArray(data)) {
        setTickets(data);
      } else if (data && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      } else {
        setTickets([]);
        console.warn("DEBUG: API response for tickets is not in expected format.", data);
      }

    } catch (e) {
      const errorMessageText = e?.message || e?.toString() || 'Đã xảy ra lỗi khi tải vé.';
      setError(errorMessageText);
      console.error("Lỗi khi tải vé:", e);
      setAlertMessage(`Lỗi khi tải vé: ${errorMessageText}`);
      setAlertType('danger');
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(); // Tải vé khi component mount
  }, [fetchTickets]); // Dependency array

  // Mở modal in vé
  const handlePrintTicket = (ticket) => {
    setTicketToPrint(ticket);
    setShowPrintModal(true);
  };

  // Kích hoạt chức năng in của trình duyệt
  const triggerBrowserPrint = () => {
    if (showPrintModal) { // Đảm bảo modal đang mở trước khi in
      window.print();
    }
  };

  // Hàm xử lý khi click "Quản lý vé đồ ăn"
  const handleManageFoodTickets = () => {
    setAlertMessage('Tính năng quản lý vé đồ ăn đang được phát triển!');
    setAlertType('info'); // Dùng 'info' hoặc 'warning' cho thông báo phát triển
    setShowAlertModal(true);
  };


  // UI rendering
  if (loading) return <LoadingSpinner />;
  if (error && !showAlertModal) return <ErrorMessage message={error} />;
  
  if (userRole !== 'admin' && userRole !== 'staff') { // Chỉ admin hoặc staff mới được truy cập
      return (
          <div className="container mt-5">
              <h2 className="text-center text-danger">Truy cập bị từ chối</h2>
              <p className="text-center">Bạn không có quyền truy cập vào quản lý vé.</p>
          </div>
      );
  }

  // headerColumnCount đã được điều chỉnh vì không còn nút xóa
  const headerColumnCount = 10; // ID Vé, Mã Vé, Phim, Giờ chiếu, Rạp, Phòng, Ghế, Người đặt, Giá, Trạng thái, Hành động (chỉ còn in)

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Quản lý Vé</h1>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        {/* Nút Quản lý vé đồ ăn */}
        <button
          onClick={handleManageFoodTickets}
          className="btn btn-secondary"
        >
          Quản lý Vé đồ ăn
        </button>
        {/* Có thể thêm các nút khác ở đây nếu cần */}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="table table-hover table-striped">
          <thead className="thead-light">
            <tr>
              <th scope="col">ID Vé</th>
              <th scope="col">Mã Vé</th>
              <th scope="col">Phim</th>
              <th scope="col">Giờ chiếu</th>
              <th scope="col">Rạp</th>
              <th scope="col">Phòng</th>
              <th scope="col">Ghế</th>
              <th scope="col">Người đặt</th>
              <th scope="col">Giá</th>
              <th scope="col">Trạng thái</th>
              <th scope="col" className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.ticket_id}>
                <td>{ticket.ticket_id}</td>
                <td>{ticket.ticket_code}</td>
                <td>{ticket.movie_title || 'N/A'}</td>
                <td>
                  {ticket.show_start_time
                    ? new Date(ticket.show_start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </td>
                <td>{ticket.cinema_name|| 'N/A'}</td>
                <td>{ticket.hall_name || 'N/A'}</td>
                <td>{`${ticket.seat_row || ''}${ticket.seat_number || ''}`.trim() || 'N/A'}</td>
                <td>{ticket.booked_by_username || 'N/A'}</td>
                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticket.price || 0)}</td>
                <td className="text-center">
                  <span className={`badge rounded-pill 
                    ${ticket.status === 'active' ? 'bg-success' : ''}
                    ${ticket.status === 'used' ? 'bg-secondary' : ''}
                    ${ticket.status === 'cancelled' ? 'bg-danger' : ''}
                  `}>
                    {ticket.status === 'active' ? 'Hoạt động' : ticket.status === 'used' ? 'Đã dùng' : 'Đã hủy'}
                  </span>
                </td>
                <td className="text-center">
                  <div className="d-flex justify-content-center align-items-center">
                    {/* Nút In vé */}
                    <button onClick={() => handlePrintTicket(ticket)} className="btn btn-info btn-sm"> {/* Bỏ me-2 vì không còn nút bên cạnh */}
                      <i className="bi bi-printer-fill"></i>
                    </button>
                    {/* Nút Xóa đã bị loại bỏ hoàn toàn */}
                  </div>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={headerColumnCount} className="py-6 text-center text-gray-500">
                  Không có vé nào được tìm thấy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận xóa đã bị loại bỏ hoàn toàn */}

      {/* Modal in vé */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="In Vé"
        showFooter={true}
        confirmButtonText="In"
        cancelButtonText="Đóng"
        onConfirm={triggerBrowserPrint} // Gọi hàm in của trình duyệt
        hideCancelButton={false}
      >
        {ticketToPrint && (
          <div className="ticket-print-area" style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
            <h4 className="text-center mb-3">Vé Xem Phim Aptech Cinemas</h4>
            <p><strong>Mã Vé:</strong> {ticketToPrint.ticket_code}</p>
            {/* Sử dụng component Barcode */}
            <div className="text-center mb-3">
              <Barcode 
                value={ticketToPrint.ticket_code} 
                width={2} 
                height={80} 
                format="CODE128" 
                displayValue={false} // Không hiển thị text dưới mã vạch
              />
            </div>
            <p><strong>Phim:</strong> {ticketToPrint.movie_title}</p>
            <p><strong>Thời gian:</strong> {new Date(ticketToPrint.show_start_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>
            <p><strong>Rạp:</strong> {ticketToPrint.cinema_name}</p>
            <p><strong>Phòng:</strong> {ticketToPrint.hall_name}</p>
            <p><strong>Ghế:</strong> {`${ticketToPrint.seat_row || ''}${ticketToPrint.seat_number || ''}`.trim()}</p>
            <p><strong>Người đặt:</strong> {ticketToPrint.booked_by_username}</p>
            <p><strong>Giá vé:</strong> {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketToPrint.price || 0)}</p>
            <p className="mt-3 text-sm text-muted">
              Vui lòng đưa mã số này đến quầy vé để nhận vé.
            </p>
            <p className="text-sm text-danger fw-bold">
              Lưu ý: Không chấp nhận hoàn tiền hoặc đổi vé đã thanh toán.
            </p>
          </div>
        )}
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

export default TicketManagement;