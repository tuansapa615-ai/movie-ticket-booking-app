import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:movie_ticket_app/api/api_service.dart'; // Đảm bảo api_service.dart có BookingApi
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart'; // Import for debugPrint
import 'package:movie_ticket_app/screens/auth/transaction_details_screen.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() =>
      _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  late Future<List<Map<String, dynamic>>> _bookingsFuture;
  int? _currentUserId;

  @override
  void initState() {
    super.initState();
    _loadUserIdAndFetchBookings();
  }

  Future<void> _loadUserIdAndFetchBookings() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? userJson = prefs.getString('user_data');

    if (userJson != null) {
      try {
        final Map<String, dynamic> userMap =
            jsonDecode(userJson) as Map<String, dynamic>;
        setState(() {
          _currentUserId = userMap['userId'] as int?;
        });
        if (_currentUserId != null) {
          _bookingsFuture = apiService.getUserBookings(
            _currentUserId!,
            status: 'confirmed', // Lấy chỉ các booking confirmed
          );
        } else {
          // Handle case where userId is null after parsing
          _bookingsFuture = Future.error('Không tìm thấy ID người dùng.');
        }
      } catch (e) {
        debugPrint('Error decoding user data: $e');
        _bookingsFuture = Future.error('Lỗi tải dữ liệu người dùng.');
      }
    } else {
      _bookingsFuture = Future.error('Người dùng chưa đăng nhập.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100], // Màu nền nhẹ nhàng
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'Lịch sử giao dịch',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16.0),
            width: double.infinity,
            color: Colors.white,
            child: const Text(
              'Hiển thị giao dịch trong 3 tháng gần nhất. Vui lòng truy cập website để xem toàn bộ lịch sử giao dịch',
              style: TextStyle(fontSize: 14, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: _currentUserId == null
                ? const Center(
                    child: Text('Vui lòng đăng nhập để xem lịch sử giao dịch.'),
                  )
                : FutureBuilder<List<Map<String, dynamic>>>(
                    future: _bookingsFuture,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      } else if (snapshot.hasError) {
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Text(
                              'Lỗi tải lịch sử giao dịch: ${snapshot.error}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.red),
                            ),
                          ),
                        );
                      } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                        return const Center(
                          child: Text('Không có giao dịch nào.'),
                        );
                      } else {
                        final List<Map<String, dynamic>> bookings =
                            snapshot.data!;

                        if (bookings.isEmpty) {
                          return const Center(
                            child: Text(
                              'Không có giao dịch nào đã được xác nhận.',
                            ),
                          );
                        }

                        return ListView.builder(
                          padding: const EdgeInsets.all(16.0),
                          itemCount: bookings.length,
                          itemBuilder: (context, index) {
                            final booking = bookings[index];
                            return _buildBookingCard(booking);
                          },
                        );
                      }
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final NumberFormat currencyFormatter = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: 'đ',
      decimalDigits: 0,
    );

    // Xử lý show_start_time, đảm bảo nó là DateTime
    // Backend trả về `datetime` nên nó có thể là String hoặc DateTime object tùy driver.
    final DateTime showStartTime = (booking['show_start_time'] is String)
        ? DateTime.parse(booking['show_start_time'] as String)
        : booking['show_start_time'] as DateTime;

    final String formattedShowTime = DateFormat('HH:mm').format(showStartTime);
    final String formattedShowDate = DateFormat(
      'dd/MM/yyyy',
    ).format(showStartTime);

    // Lấy booking_date (transaction_date từ backend)
    final dynamic rawBookingDate = booking['booking_date'];
    final DateTime bookingDate = (rawBookingDate is String)
        ? DateTime.parse(rawBookingDate as String) // Parse chuỗi ISO 8601
        : rawBookingDate as DateTime; // Nếu nó đã là DateTime object

    // === ĐỊNH DẠNG NGÀY ĐẶT ===
    // Option 1 (Khuyến nghị): Định dạng theo giờ địa phương của thiết bị
    // DateTime object đã parse (nếu là UTC) sẽ tự động chuyển sang local time khi định dạng.
    final String formattedBookingDateTime = DateFormat(
      'dd/MM/yyyy | HH:mm',
    ).format(bookingDate.toLocal());
    // Option 2: Định dạng theo UTC (Nếu bạn muốn ngày giờ khớp chính xác với DB)
    // final String formattedBookingDateTime = DateFormat('dd/MM/yyyy | HH:mm').format(bookingDate.toUtc());

    // debugPrint để kiểm tra giá trị thực
    debugPrint('Booking ID: ${booking['booking_id']}');
    debugPrint(
      '  Raw booking_date (from API): $rawBookingDate (Type: ${rawBookingDate.runtimeType})',
    );
    debugPrint('  Parsed bookingDate (DateTime object): $bookingDate');
    debugPrint(
      '  Formatted booking date/time (Local): $formattedBookingDateTime',
    );
    // debugPrint('  Formatted booking date/time (UTC): ${DateFormat('dd/MM/yyyy | HH:mm').format(bookingDate.toUtc())}');

    // Ép kiểu total_amount thành double một cách an toàn
    final double totalAmount;
    final dynamic rawTotalAmount = booking['total_amount'];
    if (rawTotalAmount is num) {
      totalAmount = rawTotalAmount.toDouble();
    } else if (rawTotalAmount is String) {
      totalAmount = double.tryParse(rawTotalAmount) ?? 0.0;
    } else {
      totalAmount = 0.0;
    }

    // Ép kiểu loyalty_points thành int một cách an toàn
    final int loyaltyPoints;
    final dynamic rawLoyaltyPoints = booking['loyalty_points'];
    if (rawLoyaltyPoints is num) {
      loyaltyPoints = rawLoyaltyPoints.toInt();
    } else if (rawLoyaltyPoints is String) {
      loyaltyPoints = int.tryParse(rawLoyaltyPoints) ?? 0;
    } else {
      loyaltyPoints = 0;
    }

    // Không cần Loyalty Expiry nữa (không hiển thị), nhưng vẫn giữ biến nếu backend gửi về
    final String loyaltyExpiry =
        booking['loyalty_points_expiry'] as String? ?? 'N/A';

    // Lấy thông tin thanh toán từ transaction (để hiển thị trạng thái)
    final String paymentMethod = booking['payment_method'] as String? ?? 'N/A';
    final String transactionStatus =
        booking['transaction_status'] as String? ?? 'N/A';
    return GestureDetector(
      // Bọc Card bằng GestureDetector
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => TransactionDetailsScreen(
              bookingId: booking['booking_id'] as int, // Truyền booking_id
            ),
          ),
        );
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 16.0),
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      booking['movie_title'] ?? 'Tên phim không xác định',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.blueAccent,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    currencyFormatter.format(totalAmount),
                    // SỬ DỤNG totalAmount ĐÃ ÉP KIỂU
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${booking['cinema_name'] ?? 'Rạp không xác định'} ${booking['hall_name'] ?? 'Phòng không xác định'}',
                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
              ),
              Text(
                '$formattedShowDate | $formattedShowTime',
                // Hiển thị ngày giờ chiếu
                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
              ),
              const SizedBox(height: 12),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Thời gian đặt:',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                      Text(
                        formattedBookingDateTime,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),

                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Trạng thái:',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                      Text(
                        _mapTransactionStatusToVietnamese(transactionStatus),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: transactionStatus == 'completed'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Hàng "Điểm tích lũy" và "Thời hạn của điểm" đã được bỏ đi.
            ],
          ),
        ),
      ),
    );
  }

  // Hàm chuyển đổi payment_status sang tiếng Việt
  String _mapTransactionStatusToVietnamese(String status) {
    switch (status) {
      case 'pending':
        return 'Đang chờ';
      case 'completed':
        return 'Thành công';
      case 'failed':
        return 'Thất bại';
      case 'refunded':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  }
}
