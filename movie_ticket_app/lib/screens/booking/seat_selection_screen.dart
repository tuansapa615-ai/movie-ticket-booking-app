// lib/screens/booking/seat_selection_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:movie_ticket_app/models/showtime.dart';
import 'package:movie_ticket_app/models/seat.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/models/food_item.dart';
import 'package:movie_ticket_app/models/seat_type_price.dart';
import 'package:movie_ticket_app/screens/booking/payment_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

// Extension for List to provide firstWhereOrNull, if not globally available
extension ListExtension<T> on List<T> {
  T? firstWhereOrNull(bool Function(T element) test) {
    for (var element in this) {
      if (test(element)) {
        return element;
      }
    }
    return null;
  }
}

class SeatSelectionScreen extends StatefulWidget {
  final Showtime showtime;

  const SeatSelectionScreen({super.key, required this.showtime});

  @override
  State<SeatSelectionScreen> createState() => _SeatSelectionScreenState();
}

class _SeatSelectionScreenState extends State<SeatSelectionScreen> {
  List<Seat> _selectedSeats = [];
  late Future<List<Seat>> _seatsFuture;
  Map<String, double> _seatPrices = {};

  // New state variables for food items
  late Future<List<FoodItem>> _foodItemsFuture;
  List<FoodItem> _allFoodItems = [];
  Map<int, int> _selectedFoodQuantities = {}; // Stores {foodItemId: quantity}

  // NEW STATES FOR FOOD PAGINATION
  int _currentPageFood = 0; // Current page for food items, 0-indexed
  final int _foodItemsPerPage = 3; // Max 3 food items per page

  final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _seatsFuture = apiService.getSeatsByHallAndShowtime(
      hallId: widget.showtime.hallId,
      showtimeId: widget.showtime.showtimeId,
    );
    _fetchSeatPrices();
    _foodItemsFuture = _fetchFoodItems(); // Fetch food items here
  }

  Future<void> _fetchSeatPrices() async {
    if (!mounted) return;
    try {
      final List<SeatTypePrice> fetchedPrices = await apiService
          .getSeatTypePrices();
      if (!mounted) return;
      setState(() {
        for (var item in fetchedPrices) {
          _seatPrices[item.seatType.toString().split('.').last.toLowerCase()] =
              item.price;
        }
      });
    } catch (e) {
      debugPrint('Error fetching seat prices: ${e.toString()}');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Không thể tải giá ghế: ${e.toString()}')),
      );
    }
  }

  Future<List<FoodItem>> _fetchFoodItems() async {
    if (!mounted) return [];
    try {
      final List<FoodItem> fetchedFoodItems = await apiService.getFoodItems();
      if (!mounted) return fetchedFoodItems;
      setState(() {
        _allFoodItems = fetchedFoodItems;
        // Initialize quantities to 0 for all fetched food items
        for (var item in _allFoodItems) {
          _selectedFoodQuantities[item.itemId] = 0;
        }
      });
      return fetchedFoodItems;
    } catch (e) {
      debugPrint('Error fetching food items: ${e.toString()}');
      if (!mounted) return [];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không thể tải danh sách đồ ăn: ${e.toString()}'),
        ),
      );
      return [];
    }
  }

  void _onSeatTap(Seat seat) {
    if (!mounted) return;
    setState(() {
      if (seat.status == SeatStatus.booked ||
          seat.status == SeatStatus.reserved ||
          seat.status == SeatStatus.onHold) {
        return;
      }

      final isAlreadySelected = _selectedSeats.any(
        (s) => s.seatId == seat.seatId,
      );

      if (isAlreadySelected) {
        _selectedSeats.removeWhere((s) => s.seatId == seat.seatId);
      } else {
        double seatPrice =
            _seatPrices[seat.seatType
                .toString()
                .split('.')
                .last
                .toLowerCase()] ??
            0.0;
        _selectedSeats.add(seat.copyWith(price: seatPrice));
      }
    });
  }

  void _updateFoodItemQuantity(FoodItem item, int change) {
    if (!mounted) return;
    setState(() {
      final currentQuantity = _selectedFoodQuantities[item.itemId] ?? 0;
      final newQuantity = currentQuantity + change;
      if (newQuantity < 0) return; // Quantity cannot be negative

      _selectedFoodQuantities[item.itemId] = newQuantity;
    });
  }

  double _calculateTotalSeatsPrice() {
    return _selectedSeats.fold(0.0, (sum, seat) => sum + (seat.price ?? 0.0));
  }

  double _calculateTotalFoodPrice() {
    double total = 0.0;
    for (var item in _allFoodItems) {
      final quantity = _selectedFoodQuantities[item.itemId] ?? 0;
      total += item.price * quantity;
    }
    return total;
  }

  double _getGrandTotalPrice() {
    return _calculateTotalSeatsPrice() + _calculateTotalFoodPrice();
  }

  Future<void> _proceedToPayment() async {
    if (_selectedSeats.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn ít nhất một ghế.')),
      );
      return;
    }

    // Prepare food items for the API call AND for PaymentScreen display
    final List<Map<String, dynamic>> foodItemsForBooking = [];
    _selectedFoodQuantities.forEach((itemId, quantity) {
      if (quantity > 0) {
        // Find the FoodItem corresponding to the itemId
        final FoodItem? selectedFoodItem = _allFoodItems.firstWhereOrNull(
          (item) => item.itemId == itemId,
        );

        if (selectedFoodItem != null) {
          foodItemsForBooking.add({
            'item_id': itemId,
            'quantity': quantity,
            'name': selectedFoodItem.name ?? 'Combo Name N/A',
            // Provide default if name is null
            'price': selectedFoodItem.price ?? 0.0,
            // Provide default if price is null
            'image_url': selectedFoodItem.imageUrl ?? '',
            // Provide default if image_url is null
            'description': selectedFoodItem.description ?? '',
            // Provide default if description is null
          });
        } else {
          // Fallback if food item details are somehow missing (shouldn't happen if _allFoodItems is reliable)
          debugPrint(
            'Warning: Food item with ID $itemId not found in _allFoodItems. Using fallback data.',
          );
          foodItemsForBooking.add({
            'item_id': itemId,
            'quantity': quantity,
            'name': 'Combo N/A (ID:$itemId)',
            'price': 0.0,
            'image_url': '',
            'description': '',
          });
        }
      }
    });

    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final String? userJson = prefs.getString('user_data');

      String? currentUserId;
      if (userJson != null) {
        try {
          final userMap = jsonDecode(userJson) as Map<String, dynamic>;
          currentUserId = userMap['userId']?.toString();
        } catch (e) {
          debugPrint('Error decoding user data: $e');
        }
      }

      if (currentUserId == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Lỗi: Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.',
            ),
          ),
        );
        return;
      }

      // Create the booking with both seats and food items
      final response = await apiService.createPendingBooking(
        userId: int.parse(currentUserId),
        showtimeId: widget.showtime.showtimeId,
        seatIds: _selectedSeats.map((s) => s.seatId).toList(),
        foodItems: foodItemsForBooking, // Pass the populated list
      );

      final String bookingId = response['booking_id'].toString();
      final double totalAmountFromBackend = response['total_amount'] != null
          ? double.parse(response['total_amount'].toString())
          : _getGrandTotalPrice(); // Fallback to client-side calc if backend doesn't return

      if (!mounted) return;

      final paymentResult = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentScreen(
            showtime: widget.showtime,
            selectedSeats: _selectedSeats,
            initialSelectedFoodItems: foodItemsForBooking,
            // Pass the populated list
            totalPrice: totalAmountFromBackend,
            // Pass the total from backend
            bookingId: bookingId,
          ),
        ),
      );

      if (paymentResult == 'refresh') {
        if (!mounted) return;
        setState(() {
          _selectedSeats.clear();
          // Reset food quantities
          for (var item in _allFoodItems) {
            _selectedFoodQuantities[item.itemId] = 0;
          }
          _seatsFuture = apiService.getSeatsByHallAndShowtime(
            hallId: widget.showtime.hallId,
            showtimeId: widget.showtime.showtimeId,
          );
        });
      }
    } catch (e) {
      debugPrint('Error proceeding to payment: ${e.toString()}');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi khi tiếp tục thanh toán: ${e.toString()}')),
      );
    }
  }

  Widget _buildSeat(Seat seat) {
    Color seatColor;

    Color borderColor = Colors.grey.shade500;
    double borderWidth = 1.0;

    bool isCurrentlySelected = _selectedSeats.any(
      (s) => s.seatId == seat.seatId,
    );

    if (isCurrentlySelected) {
      seatColor = Colors.blue;
      borderColor = Colors.blue.shade800;
      borderWidth = 2.0;
    } else {
      switch (seat.status) {
        case SeatStatus.booked:
          seatColor = Colors.red;
          break;
        case SeatStatus.reserved:
          seatColor = Colors.yellow[700]!;
          break;
        case SeatStatus.onHold:
          seatColor = Colors.blue.shade200;
          break;
        case SeatStatus.available:
        default:
          if (seat.seatType == SeatType.vip) {
            seatColor = Colors.orange.shade200;
          } else if (seat.seatType == SeatType.couple) {
            seatColor = Colors.purple.shade200;
          } else {
            seatColor = Colors.grey[300]!;
          }
          break;
      }
    }

    double seatWidth = (seat.seatType == SeatType.couple) ? 60 : 30;
    double seatHeight = 30;

    return GestureDetector(
      onTap: () => _onSeatTap(seat),
      child: Container(
        margin: const EdgeInsets.all(2.0),
        width: seatWidth,
        height: seatHeight,
        decoration: BoxDecoration(
          color: seatColor,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(color: borderColor, width: borderWidth),
        ),
        child: Center(
          child: Text(
            seat.seatNumber.toString(),
            style: TextStyle(
              color: isCurrentlySelected || seat.status == SeatStatus.booked
                  ? Colors.white
                  : Colors.black87,
              fontSize: 10,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusLegendItem(Color color, String text) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 13, color: Colors.black87)),
      ],
    );
  }

  Widget _buildTypePriceLegendItem(Color color, String label, String priceKey) {
    final double? price = _seatPrices[priceKey];

    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 13, color: Colors.black87),
            ),
            Text(
              price != null ? _currencyFormatter.format(price) : 'N/A',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ],
    );
  }

  // --- NEW: Food Selection Section with Pagination ---
  Widget _buildFoodSelectionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          child: Text(
            'COMBO ƯU ĐÃI LỚN',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade700,
            ),
          ),
        ),
        FutureBuilder<List<FoodItem>>(
          future: _foodItemsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError) {
              return Center(child: Text('Lỗi tải combo: ${snapshot.error}'));
            } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return const Center(child: Text('Không có combo nào.'));
            } else {
              // Sort food items by a relevant "newest" criteria.
              // Assuming 'itemId' roughly correlates to creation order.
              // For better accuracy, use a 'createdAt' field from your API if available.
              final List<FoodItem> sortedFoodItems = List.from(snapshot.data!)
                ..sort(
                  (a, b) => b.itemId.compareTo(a.itemId),
                ); // Sort descending by itemId

              final int totalFoodPages =
                  (sortedFoodItems.length / _foodItemsPerPage).ceil();

              // Calculate start and end index for current page
              final int startIndex = _currentPageFood * _foodItemsPerPage;
              final int endIndex = (startIndex + _foodItemsPerPage).clamp(
                0,
                sortedFoodItems.length,
              );

              // Get food items for the current page
              final List<FoodItem> foodItemsOnCurrentPage = sortedFoodItems
                  .sublist(startIndex, endIndex);

              return Column(
                children: [
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: foodItemsOnCurrentPage.length,
                    itemBuilder: (context, index) {
                      final foodItem = foodItemsOnCurrentPage[index];
                      final quantity =
                          _selectedFoodQuantities[foodItem.itemId] ?? 0;
                      return _buildFoodItemRow(foodItem, quantity);
                    },
                  ),
                  // Pagination controls
                  if (totalFoodPages >
                      1) // Only show pagination if more than 1 page
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_ios),
                            onPressed: _currentPageFood > 0
                                ? () {
                                    setState(() {
                                      _currentPageFood--;
                                    });
                                  }
                                : null,
                          ),
                          Text(
                            'Trang ${_currentPageFood + 1} / $totalFoodPages',
                            style: const TextStyle(fontSize: 16),
                          ),
                          IconButton(
                            icon: const Icon(Icons.arrow_forward_ios),
                            onPressed: _currentPageFood < totalFoodPages - 1
                                ? () {
                                    setState(() {
                                      _currentPageFood++;
                                    });
                                  }
                                : null,
                          ),
                        ],
                      ),
                    ),
                ],
              );
            }
          },
        ),
      ],
    );
  }

  Widget _buildFoodItemRow(FoodItem item, int quantity) {
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
                item.imageUrl,
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
                    item.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    item.description,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _currencyFormatter.format(item.price),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.red,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove, size: 20),
                    onPressed: () => _updateFoodItemQuantity(item, -1),
                    splashRadius: 20,
                  ),
                  Text(
                    quantity.toString(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add, size: 20),
                    onPressed: () => _updateFoodItemQuantity(item, 1),
                    splashRadius: 20,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- END NEW: Food Selection Section ---

  @override
  Widget build(BuildContext context) {
    final String showtimeDate = DateFormat(
      'dd/MM/yyyy',
    ).format(widget.showtime.startTime);
    final String showtimeTime = DateFormat(
      'HH:mm',
    ).format(widget.showtime.startTime);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'Đặt vé',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Top section: Movie details
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Colors.white,
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.showtime.movieTitle,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.showtime.screenType} | $showtimeTime $showtimeDate | ${widget.showtime.durationMinutes} Phút',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.showtime.cinemaName} - ${widget.showtime.hallName}',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Expanded SingleChildScrollView for seat map and food selection
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Phần chú thích ghế và giá
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatusLegendItem(
                              Colors.grey[300]!,
                              'Ghế trống',
                            ),
                            _buildStatusLegendItem(
                              Colors.blue.shade200,
                              'Ghế đang được giữ',
                            ),
                            _buildStatusLegendItem(
                              Colors.blue,
                              'Ghế đang chọn',
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatusLegendItem(
                              Colors.yellow[700]!,
                              'Ghế đã đặt trước',
                            ),
                            _buildStatusLegendItem(Colors.red, 'Ghế đã bán'),
                            _buildTypePriceLegendItem(
                              Colors.orange.shade200,
                              'Ghế VIP',
                              'vip',
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildTypePriceLegendItem(
                              Colors.purple.shade200,
                              'Ghế đôi',
                              'couple',
                            ),
                            _buildTypePriceLegendItem(
                              Colors.grey[300]!,
                              'Ghế thường',
                              'standard',
                            ),
                            const SizedBox(width: 20),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Màn hình chiếu
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[800],
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'MÀN HÌNH CHIẾU',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Sơ đồ ghế (cuộn được) - keep its internal SingleChildScrollView if needed for horizontal scrolling
                  FutureBuilder<List<Seat>>(
                    future: _seatsFuture,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      } else if (snapshot.hasError) {
                        debugPrint('Error loading seats: ${snapshot.error}');
                        return Center(
                          child: Text('Lỗi tải sơ đồ ghế: ${snapshot.error}'),
                        );
                      } else if (snapshot.hasData &&
                          snapshot.data!.isNotEmpty) {
                        final List<Seat> allSeats = snapshot.data!;

                        Map<String, List<Seat>> seatsByRow = {};
                        for (var seat in allSeats) {
                          if (!seatsByRow.containsKey(seat.seatRow)) {
                            seatsByRow[seat.seatRow] = [];
                          }
                          seatsByRow[seat.seatRow]!.add(seat);
                        }

                        final List<String> sortedRows = seatsByRow.keys.toList()
                          ..sort();
                        for (var rowKey in sortedRows) {
                          seatsByRow[rowKey]!.sort(
                            (a, b) => a.seatNumber.compareTo(b.seatNumber),
                          );
                        }

                        return SingleChildScrollView(
                          // Keep this for horizontal seat map scrolling
                          scrollDirection: Axis.horizontal,
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              children: sortedRows.map((rowKey) {
                                final List<Seat> rowSeats = seatsByRow[rowKey]!;
                                return Row(
                                  children: [
                                    SizedBox(
                                      width: 25,
                                      child: Text(
                                        rowKey,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    ...rowSeats.map((seat) {
                                      final bool isSeatSelected = _selectedSeats
                                          .any((s) => s.seatId == seat.seatId);
                                      return _buildSeat(
                                        seat.copyWith(
                                          status: isSeatSelected
                                              ? SeatStatus.selected
                                              : seat.status,
                                        ),
                                      );
                                    }).toList(),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        );
                      } else {
                        return const Center(
                          child: Text('Không có sơ đồ ghế cho phòng này.'),
                        );
                      }
                    },
                  ),
                  const SizedBox(height: 20),
                  // Add some spacing

                  // Now the food selection section is inside the main SingleChildScrollView
                  _buildFoodSelectionSection(),

                  const SizedBox(height: 20),
                  // Add spacing before the bottom bar
                ],
              ),
            ),
          ),

          // Thanh bottom navigation - This remains outside the scrollable area, fixed at the bottom
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_selectedSeats.length} ghế',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                    Text(
                      _currencyFormatter.format(_getGrandTotalPrice()),
                      // Update to grand total
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: _selectedSeats.isEmpty ? null : _proceedToPayment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 30,
                      vertical: 15,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Tiếp tục',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
