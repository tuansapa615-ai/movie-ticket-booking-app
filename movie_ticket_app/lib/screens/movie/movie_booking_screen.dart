import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:movie_ticket_app/models/movie.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:movie_ticket_app/models/showtime.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/screens/booking/seat_selection_screen.dart';
import 'package:movie_ticket_app/screens/auth/login_page.dart'; // Keep this import
import 'package:shared_preferences/shared_preferences.dart'; // Keep this import

class MovieBookingScreen extends StatefulWidget {
  final Movie movie;

  const MovieBookingScreen({super.key, required this.movie});

  @override
  State<MovieBookingScreen> createState() => _MovieBookingScreenState();
}

class _MovieBookingScreenState extends State<MovieBookingScreen> {
  DateTime _selectedDate = DateTime.now();
  List<Map<String, String>> _dates = [];

  late Future<List<Showtime>> _futureShowtimes;

  List<Showtime> _showtimes = [];

  @override
  void initState() {
    super.initState();
    // 1. Generate dates immediately
    _generateDates();

    // 2. Assign initial future for showtimes
    _futureShowtimes = _fetchShowtimesForSelectedDateInitial();

    // 3. Initialize date formatting asynchronously
    _initializeDateFormattingAsync();
  }

  Future<List<Showtime>> _fetchShowtimesForSelectedDateInitial() async {
    final fetchedShowtimes = await apiService.getShowtimes(
      movieId: widget.movie.movieId.toString(),
      date: DateFormat('yyyy-MM-dd').format(_selectedDate),
    );
    _showtimes = fetchedShowtimes;
    return fetchedShowtimes;
  }

  Future<void> _initializeDateFormattingAsync() async {
    await initializeDateFormatting('vi_VN', null);
  }

  Future<void> _fetchShowtimesForSelectedDate() async {
    setState(() {
      _futureShowtimes = apiService.getShowtimes(
        movieId: widget.movie.movieId.toString(),
        date: DateFormat('yyyy-MM-dd').format(_selectedDate),
      );
    });

    try {
      final fetchedShowtimes = await _futureShowtimes;
      setState(() {
        _showtimes = fetchedShowtimes;
      });
    } catch (e) {
      debugPrint('Error fetching showtimes: $e');
    }
  }

  void _generateDates() {
    _dates = [];
    DateTime now = DateTime.now();

    for (int i = 0; i < 6; i++) {
      DateTime date = now.add(Duration(days: i));
      String dateString = DateFormat('dd').format(date);

      String dayString;
      if (i == 0) {
        dayString = 'Hôm nay';
      } else if (i == 1) {
        dayString = 'Ngày mai';
      } else {
        String dayOfWeek = DateFormat('EEEE', 'vi_VN').format(date);
        if (dayOfWeek.startsWith('Thứ')) {
          dayString = dayOfWeek.substring(4);
          if (dayString == 'Hai')
            dayString = 'T2';
          else if (dayString == 'Ba')
            dayString = 'T3';
          else if (dayString == 'Tư')
            dayString = 'T4';
          else if (dayString == 'Năm')
            dayString = 'T5';
          else if (dayString == 'Sáu')
            dayString = 'T6';
          else if (dayString == 'Bảy')
            dayString = 'T7';
        } else if (dayOfWeek == 'Chủ Nhật') {
          dayString = 'CN';
        } else {
          dayString = DateFormat('EE', 'vi_VN').format(date);
        }
      }

      String fullDateString = DateFormat('yyyy-MM-dd').format(date);
      String monthString = DateFormat('MM').format(date);

      _dates.add({
        'date': dateString,
        'day': '$monthString-$dayString',
        'fullDate': fullDateString,
        'month': monthString,
      });
    }
  }

  Future<void> _refreshData() async {
    await _fetchShowtimesForSelectedDate();
  }

  List<Showtime> _getShowtimesBySelectedDate() {
    debugPrint('--- Bắt đầu lọc suất chiếu ---');
    debugPrint(
      'Ngày được chọn trên UI (_selectedDate): $_selectedDate (Local)',
    );

    final selectedDay = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
    );
    debugPrint('Ngày được chọn (đặt về nửa đêm): $selectedDay (Local)');

    final now = DateTime.now();
    debugPrint('Thời gian hiện tại của thiết bị (now): $now (Local)');

    final isTodaySelected = selectedDay.isAtSameMomentAs(
      DateTime(now.year, now.month, now.day),
    );
    debugPrint(
      'Có phải đang chọn ngày hôm nay không (isTodaySelected)? $isTodaySelected',
    );

    List<Showtime> filteredList = [];
    if (_showtimes.isEmpty) {
      debugPrint('Danh sách _showtimes rỗng. Không có gì để lọc.');
    }

    for (var showtime in _showtimes) {
      final showtimeLocalStartTime = showtime.startTime.toLocal();
      final showtimeDay = DateTime(
        showtimeLocalStartTime.year,
        showtimeLocalStartTime.month,
        showtimeLocalStartTime.day,
      );

      bool sameDay = showtimeDay.isAtSameMomentAs(selectedDay);

      if (sameDay) {
        if (isTodaySelected) {
          bool isAfterNow = showtimeLocalStartTime.isAfter(now);
          if (isAfterNow) {
            filteredList.add(showtime);
          }
        } else {
          filteredList.add(showtime);
        }
      }
    }
    debugPrint(
      '--- Kết thúc lọc. Tổng số suất chiếu đã lọc: ${filteredList.length} ---',
    );
    return filteredList;
  }

  Map<String, Map<String, List<Showtime>>> _groupShowtimes(
    List<Showtime> showtimes,
  ) {
    Map<String, Map<String, List<Showtime>>> grouped = {};
    for (var showtime in showtimes) {
      if (!grouped.containsKey(showtime.cinemaName)) {
        grouped[showtime.cinemaName] = {};
      }
      if (!grouped[showtime.cinemaName]!.containsKey(showtime.hallName)) {
        grouped[showtime.cinemaName]![showtime.hallName] = [];
      }
      grouped[showtime.cinemaName]![showtime.hallName]!.add(showtime);
    }
    grouped.forEach((cinema, halls) {
      halls.forEach((hall, showtimes) {
        showtimes.sort((a, b) => a.startTime.compareTo(b.startTime));
      });
    });
    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () {
            Navigator.pop(context, 'refresh_movie_details');
          },
        ),
        title: const Text(
          'Đặt vé theo phim',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildMovieInfoSection(),
              _buildDateSelectionSection(),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 10.0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn khu vực',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        // Xử lý khi nhấn "Tất cả" - có thể mở một màn hình chọn khu vực
                      },
                      child: const Row(
                        children: [
                          Text(
                            'Tất cả',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.blue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Icon(
                            Icons.arrow_forward_ios,
                            size: 14,
                            color: Colors.blue,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              _buildCinemaShowtimeList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMovieInfoSection() {
    final Movie movie = widget.movie;

    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        image: DecorationImage(
          image: NetworkImage(movie.posterUrl),
          fit: BoxFit.cover,
          onError: (exception, stackTrace) {
            debugPrint('Error loading movie poster: $exception');
          },
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withOpacity(0.0),
              Colors.black.withOpacity(0.6),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                movie.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                '${movie.genre} | ${movie.durationMinutes} Phút',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(context, 'refresh_movie_details');
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.white, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                ),
                child: const Text(
                  'Chi tiết phim',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateSelectionSection() {
    if (_dates.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final int selectedDateIndex = _dates.indexWhere((element) {
      final fullDate = element['fullDate'];
      if (fullDate == null) return false;
      final date = DateTime.parse(fullDate);
      return date.year == _selectedDate.year &&
          date.month == _selectedDate.month &&
          date.day == _selectedDate.day;
    });

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      margin: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(_dates.length, (index) {
          final dateData = _dates[index];
          final bool isSelected = selectedDateIndex == index;

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedDate = DateTime.parse(dateData['fullDate']!);
                _fetchShowtimesForSelectedDate();
              });
            },
            child: Column(
              children: [
                Text(
                  dateData['date']!,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.red : Colors.black,
                  ),
                ),
                Text(
                  dateData['day']!,
                  style: TextStyle(
                    fontSize: 13,
                    color: isSelected ? Colors.red : Colors.grey[700],
                  ),
                ),
                if (isSelected)
                  Container(
                    margin: const EdgeInsets.only(top: 5),
                    height: 3,
                    width: 30,
                    color: Colors.red,
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildCinemaShowtimeList() {
    return FutureBuilder<List<Showtime>>(
      future: _futureShowtimes,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          debugPrint('Error in _buildCinemaShowtimeList: ${snapshot.error}');
          return Center(child: Text('Lỗi tải suất chiếu: ${snapshot.error}'));
        } else if (snapshot.hasData && snapshot.data!.isNotEmpty) {
          _showtimes = snapshot.data!;
          final filteredAndGroupedShowtimes = _groupShowtimes(
            _getShowtimesBySelectedDate(),
          );

          final List<String> cinemaNames = filteredAndGroupedShowtimes.keys
              .toList();

          if (cinemaNames.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text(
                  'Không có suất chiếu nào cho phim này vào ngày đã chọn.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ),
            );
          }

          return ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cinemaNames.length,
            itemBuilder: (context, index) {
              final String cinemaName = cinemaNames[index];
              final Map<String, List<Showtime>> hallsInCinema =
                  filteredAndGroupedShowtimes[cinemaName]!;
              final List<String> hallNames = hallsInCinema.keys.toList();

              hallNames.sort();

              return Card(
                margin: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 6.0,
                ),
                elevation: 0.5,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.symmetric(
                    horizontal: 16.0,
                    vertical: 8.0,
                  ),
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cinemaName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: Colors.black87,
                        ),
                      ),
                      if (hallsInCinema.values.isNotEmpty &&
                          hallsInCinema.values.first.isNotEmpty)
                        Text(
                          hallsInCinema.values.first.first.cinemaAddress,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                    ],
                  ),
                  childrenPadding: const EdgeInsets.only(
                    left: 16.0,
                    right: 16.0,
                    bottom: 12.0,
                  ),
                  children: hallNames.map((hallName) {
                    final List<Showtime> showtimesInHall =
                        hallsInCinema[hallName]!;
                    if (showtimesInHall.isEmpty) {
                      return const SizedBox.shrink();
                    }

                    final Showtime firstShowtimeInHall = showtimesInHall.first;
                    final String formatType = firstShowtimeInHall.screenType;
                    final NumberFormat currencyFormatter =
                        NumberFormat.currency(
                          locale: 'vi_VN',
                          symbol: 'VNĐ',
                          decimalDigits: 0,
                        );

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 8.0, bottom: 4.0),
                          child: Text(
                            '$hallName - $formatType',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                            ),
                          ),
                        ),
                        if (firstShowtimeInHall.minSeatPrice != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: Text(
                              'Giá từ: ${currencyFormatter.format(firstShowtimeInHall.minSeatPrice)}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.green,
                              ),
                            ),
                          ),
                        Wrap(
                          spacing: 8.0,
                          runSpacing: 8.0,
                          children: showtimesInHall.map((showtime) {
                            final String time = DateFormat(
                              'HH:mm',
                            ).format(showtime.startTime.toLocal());
                            return GestureDetector(
                              onTap: () async {
                                _checkLoginAndNavigate(
                                  showtime,
                                  time,
                                ); // <-- Gọi hàm kiểm tra đăng nhập
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(5),
                                  border: Border.all(color: Colors.blueAccent),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      time,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blueAccent,
                                      ),
                                    ),
                                    Text(
                                      '${showtime.availableSeats} trống',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: Colors.blueGrey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              );
            },
          );
        } else {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'Không có suất chiếu nào cho phim này vào ngày đã chọn.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }
      },
    );
  }

  Future<void> _checkLoginAndNavigate(Showtime showtime, String time) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? userToken = prefs.getString('user_token');

    debugPrint('*** DEBUG - userToken: $userToken ***');
    debugPrint(
      '*** DEBUG - userToken is null or empty: ${userToken == null || userToken.isEmpty} ***',
    );

    if (userToken == null || userToken.isEmpty) {
      final bool? loggedIn = await Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );

      if (loggedIn == true) {
        debugPrint('Đăng nhập thành công từ LoginPage. Tiếp tục đặt vé.');
        _navigateToSeatSelection(showtime, time);
      } else {
        debugPrint('Người dùng không đăng nhập thành công. Không thể đặt vé.');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bạn cần đăng nhập để đặt vé.'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else {
      debugPrint('Đã có token. Tiếp tục đặt vé.');
      _navigateToSeatSelection(showtime, time);
    }
  }

  Future<void> _navigateToSeatSelection(Showtime showtime, String time) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SeatSelectionScreen(showtime: showtime),
      ),
    );
    if (result == 'refresh') {
      _fetchShowtimesForSelectedDate();
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Bạn đã chọn suất chiếu lúc $time tại ${showtime.hallName} (${showtime.availableSeats} ghế trống)',
        ),
      ),
    );
  }
}
