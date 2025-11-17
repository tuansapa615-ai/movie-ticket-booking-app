import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:flutter/foundation.dart'; // For debugPrint
import 'package:barcode_widget/barcode_widget.dart'; // UNCOMMENTED: Import for BarcodeWidget

class TransactionDetailsScreen extends StatefulWidget {
  final int bookingId;

  const TransactionDetailsScreen({super.key, required this.bookingId});

  @override
  State<TransactionDetailsScreen> createState() =>
      _TransactionDetailsScreenState();
}

class _TransactionDetailsScreenState extends State<TransactionDetailsScreen> {
  late Future<Map<String, dynamic>> _bookingDetailsFuture;

  final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _bookingDetailsFuture = _fetchBookingDetails();
  }

  Future<Map<String, dynamic>> _fetchBookingDetails() async {
    try {
      final details = await apiService.getBookingDetails(
        widget.bookingId.toString(),
      );
      debugPrint('Fetched Booking Details: $details');
      return details;
    } catch (e) {
      debugPrint('Error fetching booking details: $e');
      throw Exception('Không thể tải chi tiết giao dịch: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'Chi tiết giao dịch',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _bookingDetailsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  '${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            );
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(
              child: Text('Không tìm thấy chi tiết giao dịch.'),
            );
          } else {
            final booking = snapshot.data!;
            // Dữ liệu từ booking object
            final String movieTitle = booking['movie_title'] ?? 'N/A';
            final String cinemaName = booking['cinema_name'] ?? 'N/A';
            final String hallName = booking['hall_name'] ?? 'N/A';

            // show_start_time từ booking
            // Sử dụng as String? an toàn hơn cho các trường có thể là null
            final DateTime showStartTime =
                (booking['show_start_time'] is String)
                ? DateTime.parse(booking['show_start_time'] as String)
                : (booking['show_start_time'] is DateTime
                      ? booking['show_start_time'] as DateTime
                      : DateTime.now()); // Fallback an toàn

            final String formattedShowDate = DateFormat(
              'dd/MM/yyyy',
            ).format(showStartTime.toLocal()); // Chuyển về local
            final String formattedShowTime = DateFormat(
              'HH:mm',
            ).format(showStartTime.toLocal()); // Chuyển về local

            // === SỬA DÒNG NÀY CHO totalAmount ===
            final double totalAmount;
            final dynamic rawTotalAmount = booking['total_amount'];
            debugPrint(
              'Booking ID: ${booking['booking_id']}, Raw Total Amount: $rawTotalAmount (Type: ${rawTotalAmount.runtimeType})',
            );
            if (rawTotalAmount is num) {
              totalAmount = rawTotalAmount.toDouble();
            } else if (rawTotalAmount is String) {
              totalAmount = double.tryParse(rawTotalAmount) ?? 0.0;
            } else {
              totalAmount =
                  0.0; // Mặc định là 0.0 nếu không phải num hay String
            }

            // Thông tin chi tiết ghế đã đặt
            final List<dynamic> bookedSeatsDetails =
                booking['booked_seats_details'] ?? [];
            final String seatNumbers = bookedSeatsDetails
                .map((seat) => '${seat['seat_row']}${seat['seat_number']}')
                .join(', ');
            final int totalSeats = bookedSeatsDetails.length;

            // Thông tin food_items từ booking
            final List<dynamic> foodItems = booking['food_items'] ?? [];
            final String foodSummary = foodItems.isNotEmpty
                ? foodItems
                      .map(
                        (item) =>
                            '${item['name'] ?? 'Combo'} (${item['quantity'] ?? 1})',
                      )
                      .join(', ')
                : 'Không có';
            final int totalFoodItems = foodItems.fold(
              0,
              (sum, item) => sum + (item['quantity'] ?? 0) as int,
            );

            // Thông tin transaction_details (lấy transaction đầu tiên nếu có nhiều)
            final List<dynamic> transactionDetails =
                booking['transaction_details'] ?? [];
            final Map<String, dynamic>? firstTransaction =
                transactionDetails.isNotEmpty ? transactionDetails.first : null;
            final String paymentMethod = _mapPaymentMethodToVietnamese(
              firstTransaction?['payment_method'] ?? 'N/A',
            );
            // === SỬA DÒNG NÀY CHO paidAmount ===
            final double paidAmount;
            final dynamic rawPaidAmount = firstTransaction?['amount'];
            debugPrint(
              'Booking ID: ${booking['booking_id']}, Raw Paid Amount: $rawPaidAmount (Type: ${rawPaidAmount.runtimeType})',
            );
            if (rawPaidAmount is num) {
              paidAmount = rawPaidAmount.toDouble();
            } else if (rawPaidAmount is String) {
              paidAmount = double.tryParse(rawPaidAmount) ?? 0.0;
            } else {
              paidAmount = 0.0; // Mặc định là 0.0 nếu không phải num hay String
            }

            // Thông tin ticket_details (lấy ticket đầu tiên nếu có nhiều)
            final List<dynamic> ticketDetails = booking['ticket_details'] ?? [];
            final Map<String, dynamic>? firstTicket = ticketDetails.isNotEmpty
                ? ticketDetails.first
                : null;
            final String ticketCode = firstTicket?['ticket_code'] ?? 'N/A';

            // === SỬA DÒNG NÀY CHO loyaltyPoints ===
            final int loyaltyPoints;
            final dynamic rawLoyaltyPoints = booking['loyalty_points'];
            debugPrint(
              'Booking ID: ${booking['booking_id']}, Raw Loyalty Points: $rawLoyaltyPoints (Type: ${rawLoyaltyPoints.runtimeType})',
            );
            if (rawLoyaltyPoints is num) {
              loyaltyPoints = rawLoyaltyPoints.toInt();
            } else if (rawLoyaltyPoints is String) {
              loyaltyPoints = int.tryParse(rawLoyaltyPoints) ?? 0;
            } else {
              loyaltyPoints = 0; // Mặc định là 0 nếu không phải num hay String
            }

            final String loyaltyExpiry =
                booking['loyalty_points_expiry'] as String? ?? 'N/A';

            // Lấy screen_type và duration_minutes từ booking (đã thêm vào trong getBookingDetails của backend)
            final String screenType = booking['screen_type'] ?? 'N/A';
            final int durationMinutes =
                (booking['duration_minutes'] as num?)?.toInt() ?? 0;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Phần thông tin phim và lịch chiếu
                  Card(
                    margin: const EdgeInsets.only(bottom: 16.0),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            movieTitle,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${screenType} | ${durationMinutes} phút',
                            // Sử dụng screenType và durationMinutes
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[700],
                            ),
                          ),
                          const Divider(height: 20),
                          _buildDetailRow('Rạp chiếu', cinemaName),
                          _buildDetailRow('Ngày chiếu', formattedShowDate),
                          _buildDetailRow('Giờ chiếu', formattedShowTime),
                          _buildDetailRow('Phòng chiếu', hallName),
                          _buildDetailRow(
                            'Ghế ngồi ($totalSeats)',
                            seatNumbers,
                          ),
                          _buildDetailRow(
                            'Combo ($totalFoodItems)',
                            foodSummary,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Phần Tổng tiền và thanh toán
                  Card(
                    margin: const EdgeInsets.only(bottom: 16.0),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        children: [
                          _buildSummaryRow('Tổng tiền', totalAmount, true),
                          const Divider(),
                          _buildSummaryRow(paymentMethod, paidAmount, false),
                          // paidAmount đã được làm an toàn
                          const Divider(),
                          _buildSummaryRow(
                            'Điểm tích lũy',
                            loyaltyPoints,
                            // TRUYỀN loyaltyPoints (kiểu int) trực tiếp
                            false,
                          ),
                          _buildSummaryRow(
                            'Thời hạn của điểm',
                            loyaltyExpiry,
                            false,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // // Phần mã vạch
                  // Container(
                  //   width: double.infinity,
                  //   padding: const EdgeInsets.all(16.0),
                  //   decoration: BoxDecoration(
                  //     color: Colors.white,
                  //     borderRadius: BorderRadius.circular(12),
                  //   ),
                  //   child: Column(
                  //     children: [
                  //       // Sử dụng BarcodeWidget
                  //       BarcodeWidget(
                  //         barcode: Barcode.code128(),
                  //         data: ticketCode,
                  //         width: MediaQuery.of(context).size.width * 0.8,
                  //         height: 80,
                  //         drawText: false,
                  //       ),
                  //       const SizedBox(height: 10),
                  //       Text(
                  //         ticketCode,
                  //         style: const TextStyle(
                  //           fontSize: 18,
                  //           fontWeight: FontWeight.bold,
                  //         ),
                  //       ),
                  //     ],
                  //   ),
                  // ),
                  const SizedBox(height: 16),

                  // Phần lưu ý
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: Text(
                      'Vui lòng đưa mã số này đến quầy vé Aptech để nhận vé',
                      style: TextStyle(fontSize: 14, color: Colors.grey[800]),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Lưu ý: Aptech không chấp nhận hoàn tiền hoặc đổi vé đã thanh toán thành công trên website và Ứng dụng Aptech',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          }
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100, // Cố định chiều rộng nhãn
            child: Text(
              '$label:',
              style: TextStyle(fontSize: 15, color: Colors.grey[700]),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 15, color: Colors.black),
              textAlign: TextAlign.end, // Canh phải giá trị
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, dynamic value, bool isTotal) {
    final String formattedValue;
    if (value is double) {
      formattedValue = _currencyFormatter.format(value);
    } else if (value is int) {
      formattedValue = value.toString(); // For loyalty points
    } else {
      formattedValue = value.toString();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 18 : 16,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.black : Colors.black87,
            ),
          ),
          Text(
            formattedValue,
            style: TextStyle(
              fontSize: isTotal ? 20 : 16,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.red : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  // Hàm chuyển đổi payment_method sang tiếng Việt (giữ lại nếu có thể dùng ở nơi khác)
  String _mapPaymentMethodToVietnamese(String method) {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'credit_card':
        return 'Thẻ tín dụng';
      case 'momo':
        return 'MoMo';
      case 'zalopay':
        return 'ZaloPay';
      case 'bank_transfer':
        return 'Chuyển khoản NH';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  }
}
