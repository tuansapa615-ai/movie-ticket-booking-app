import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:movie_ticket_app/models/showtime.dart'; // Ensure these model imports are correct based on your project structure
import 'package:movie_ticket_app/models/seat.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/models/food_item.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart'; // Correct package name
import 'dart:async'; // For StreamSubscription

class PaymentScreen extends StatefulWidget {
  final Showtime showtime;
  final List<Seat> selectedSeats;
  final List<Map<String, dynamic>>
  initialSelectedFoodItems; // This now comes populated with name, price, image_url
  final double totalPrice; // This now comes from backend
  final String? bookingId;

  const PaymentScreen({
    super.key,
    required this.showtime,
    required this.selectedSeats,
    required this.initialSelectedFoodItems,
    required this.totalPrice,
    this.bookingId,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String? _selectedPaymentMethod;
  double _currentTotalPrice = 0;
  bool _paymentCompleted = false; // Tracks if payment was officially confirmed
  bool _isProcessingPayment = false; // To show loading during _processPayment

  final _appLinks = AppLinks(); // Correct instance creation for AppLinks
  StreamSubscription?
  _appLinksSubscription; // For app_links stream subscription

  final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _currentTotalPrice = widget.totalPrice;
    _selectedPaymentMethod = 'paypal';

    _initAppLinks(); // Call the new app_links initialization
  }

  @override
  void dispose() {
    if (widget.bookingId != null && !_paymentCompleted) {
      _cancelBookingOnExit();
    }
    _appLinksSubscription?.cancel(); // Cancel the app_links subscription
    super.dispose();
  }

  // AppLinks initialization
  Future<void> _initAppLinks() async {
    // Get initial link if app was launched by a link
    try {
      // This is the correct method call for app_links package version 4.0.0+
      final uri = await _appLinks.getInitialLink();
      if (uri != null) {
        _handleIncomingLink(uri.toString());
      }
    } on FormatException {
      debugPrint('Initial app link was invalid.');
    } catch (e) {
      debugPrint('Error getting initial app link: $e');
    }

    // Attach a listener to incoming links when app is already running
    // This is also the correct stream access for app_links package version 4.0.0+
    _appLinksSubscription = _appLinks.uriLinkStream.listen(
      (Uri? uri) {
        if (!mounted) return;
        if (uri != null) {
          _handleIncomingLink(uri.toString());
        }
      },
      onError: (err) {
        debugPrint('Error handling app link stream: $err');
      },
    );
  }

  // Handle the incoming deep link
  void _handleIncomingLink(String link) {
    debugPrint('Received deep link: $link');
    final Uri uri = Uri.parse(link);

    // Check if it's your payment success/failure deep link
    // Example: movieticketapp://payment?status=success&bookingId=XXX&message=YYY
    if (uri.scheme == 'movieticketapp' && uri.host == 'payment') {
      final String? status = uri.queryParameters['status'];
      final String? receivedBookingId = uri.queryParameters['bookingId'];
      final String? message = uri.queryParameters['message'];

      // Only process if the received booking ID matches the current one AND payment not completed
      if (receivedBookingId == widget.bookingId && !_paymentCompleted) {
        if (status == 'success') {
          _paymentCompleted = true; // Mark payment as completed
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Thanh toán PayPal thành công!')),
          );
          _showPaymentSuccessDialog(); // Show success dialog
        } else if (status == 'cancelled' || status == 'failed') {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Thanh toán PayPal thất bại hoặc bị hủy: ${message ?? ''}',
              ),
            ),
          );
        }
      }
      // Regardless of success/failure, ensure processing state is reset
      if (mounted) {
        setState(() {
          _isProcessingPayment = false;
        });
      }
    }
  }

  Future<void> _cancelBookingOnExit() async {
    try {
      await apiService.cancelPendingBooking(widget.bookingId!);
      debugPrint('Booking ${widget.bookingId} cancelled due to exit.');
    } catch (e) {
      debugPrint('Error cancelling booking ${widget.bookingId} on exit: $e');
    }
  }

  double _calculateTotalPrice() {
    return widget.totalPrice;
  }

  Future<void> _processPayment() async {
    if (_selectedPaymentMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn một phương thức thanh toán.'),
        ),
      );
      return;
    }

    if (widget.bookingId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lỗi: Không tìm thấy ID đơn hàng. Vui lòng thử lại.'),
        ),
      );
      return;
    }

    setState(() {
      _isProcessingPayment = true; // Show loading indicator
    });

    try {
      final List<Map<String, dynamic>> finalFoodItems =
          widget.initialSelectedFoodItems;

      if (_selectedPaymentMethod == 'paypal') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đang tạo thanh toán PayPal...')),
        );

        final response = await apiService.createPaypalPayment(
          widget.bookingId!,
          finalFoodItems,
        );

        if (!mounted) return;

        if (response['approval_url'] != null) {
          final String approvalUrl = response['approval_url'];
          debugPrint('PayPal Approval URL: $approvalUrl');

          final Uri url = Uri.parse(approvalUrl);
          if (await canLaunchUrl(url)) {
            // await launchUrl(url, mode: LaunchMode.inAppWebView);
            await launchUrl(url, mode: LaunchMode.externalApplication);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Chuyển hướng đến PayPal trong ứng dụng. Vui lòng hoàn tất thanh toán.',
                ),
              ),
            );
          } else {
            throw Exception('Không thể mở URL PayPal: $approvalUrl');
          }
        } else {
          throw Exception('Không nhận được URL xác nhận từ PayPal.');
        }
      }
    } catch (e) {
      debugPrint('Payment failed: ${e.toString()}');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Thanh toán thất bại: ${e.toString()}')),
      );
      if (mounted) {
        setState(() {
          _isProcessingPayment = false;
        });
      }
    }
  }

  void _showPaymentSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Thanh toán thành công!'),
          content: const Text('Đơn hàng của bạn đã được xác nhận.'),
          actions: <Widget>[
            TextButton(
              child: const Text('OK'),
              onPressed: () {
                Navigator.of(context).pop(); // Pops the dialog
                Navigator.of(context).pop(
                  'refresh',
                ); // Pops PaymentScreen and notifies SeatSelectionScreen to refresh
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Determine if the payment button should be enabled
    final bool isPaymentButtonEnabled =
        widget.selectedSeats.isNotEmpty ||
        widget.initialSelectedFoodItems.isNotEmpty;

    return PopScope(
      canPop: true,
      onPopInvoked: (didPop) async {
        if (didPop) {
          if (!_paymentCompleted && widget.bookingId != null) {
            _cancelBookingOnExit();
          }
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.blue.shade700,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
            onPressed: () {
              _paymentCompleted = false;
              Navigator.pop(context);
            },
          ),
          title: const Text(
            'Thanh toán',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
        ),
        body: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle('Thông tin đơn hàng'),
                  _buildOrderSummary(),

                  if (widget.initialSelectedFoodItems.isNotEmpty) ...[
                    _buildSectionTitle('COMBO ĐÃ CHỌN'),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: widget.initialSelectedFoodItems.length,
                      itemBuilder: (context, index) {
                        final foodItemMap =
                            widget.initialSelectedFoodItems[index];
                        return _buildFoodItemRowDisplayOnly(
                          foodItemMap['name'] as String,
                          foodItemMap['image_url'] as String,
                          foodItemMap['description'] as String,
                          (foodItemMap['price'] as num).toDouble(),
                          foodItemMap['quantity'] as int,
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                  ],

                  _buildSectionTitle('Chọn hình thức thanh toán'),
                  _buildPaymentMethodOption(
                    icon: Icons.paypal,
                    title: 'PayPal',
                    methodValue: 'paypal',
                    isSelected: _selectedPaymentMethod == 'paypal',
                  ),

                  const SizedBox(height: 170),
                ],
              ),
            ),
            if (_isProcessingPayment)
              const Opacity(
                opacity: 0.6,
                child: ModalBarrier(dismissible: false, color: Colors.black),
              ),
            if (_isProcessingPayment)
              const Center(child: CircularProgressIndicator()),
            _buildBottomPayButton(isPaymentButtonEnabled),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: Colors.blue.shade700,
        ),
      ),
    );
  }

  Widget _buildOrderSummary() {
    double totalFoodPriceSummary = widget.initialSelectedFoodItems.fold(0.0, (
      sum,
      item,
    ) {
      final double itemPrice = (item['price'] as num?)?.toDouble() ?? 0.0;
      final int itemQuantity = item['quantity'] as int? ?? 0;
      return sum + itemPrice * itemQuantity;
    });

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.showtime.movieTitle,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              '${widget.showtime.cinemaName} - ${widget.showtime.hallName}',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            Text(
              '${DateFormat('HH:mm dd/MM/yyyy').format(widget.showtime.startTime)}',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const Divider(),
            _buildSummaryRow(
              'Ghế:',
              widget.selectedSeats
                  .map((s) => '${s.seatRow}${s.seatNumber}')
                  .join(', '),
            ),
            _buildSummaryRow(
              'Tổng tiền ghế:',
              _currencyFormatter.format(
                widget.selectedSeats.fold(
                  0.0,
                  (sum, seat) => sum + (seat.price ?? 0.0),
                ),
              ),
            ),
            _buildSummaryRow(
              'Tổng tiền đồ ăn:',
              _currencyFormatter.format(totalFoodPriceSummary),
            ),
            const Divider(),
            _buildSummaryRow(
              'Tổng cộng:',
              _currencyFormatter.format(widget.totalPrice),
              isTotal: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isTotal ? 18 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.red : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodOption({
    required IconData icon,
    required String title,
    required String methodValue,
    required bool isSelected,
  }) {
    return Card(
      elevation: isSelected ? 2 : 0.5,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: isSelected
            ? const BorderSide(color: Colors.blueAccent, width: 2)
            : BorderSide.none,
      ),
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedPaymentMethod = methodValue;
          });
        },
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Icon(icon, size: 30, color: Colors.blue.shade700),
              const SizedBox(width: 16),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              if (isSelected)
                Icon(Icons.check_circle, size: 24, color: Colors.blueAccent),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFoodItemRowDisplayOnly(
    String name,
    String imageUrl,
    String description,
    double price,
    int quantity,
  ) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6.0),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                imageUrl,
                width: 60,
                height: 60,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 60,
                  height: 60,
                  color: Colors.grey[200],
                  child: const Icon(
                    Icons.fastfood,
                    size: 30,
                    color: Colors.grey,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    description,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _currencyFormatter.format(price),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.red,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              'x$quantity',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            Text(
              _currencyFormatter.format(price * quantity),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscountMethodRow(String title, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios, size: 18, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalPriceSection() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Tổng tiền:',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Text(
            _currencyFormatter.format(_currentTotalPrice),
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPayButton(bool isEnabled) {
    // Added isEnabled parameter
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(16.0),
        child: ElevatedButton(
          onPressed: isEnabled ? _processPayment : null, // Use isEnabled here
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue.shade700,
            padding: const EdgeInsets.symmetric(vertical: 15.0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            // Add disabled color if needed
            // primary: isEnabled ? Colors.blue.shade700 : Colors.grey,
          ),
          child: const Text(
            'THANH TOÁN',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
