// D:\project-4\movie_ticket_app\lib\screens\home_screen.dart
import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:movie_ticket_app/models/movie.dart';
import 'package:movie_ticket_app/models/banner.dart';
import 'package:movie_ticket_app/widgets/movie_card.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:movie_ticket_app/widgets/home_header.dart';
import 'package:movie_ticket_app/screens/auth/profile_screen.dart';
import 'package:movie_ticket_app/screens/auth/login_page.dart'; // Đảm bảo import LoginPage

class MovieHomePage extends StatefulWidget {
  // Loại bỏ các tham số user và token ở đây nếu MovieHomePage tự quản lý
  // final Map<String, dynamic>? user;
  // final String? token;
  // final Function(Map<String, dynamic>?, String?)? onUserUpdate;

  const MovieHomePage({super.key}); // Constructor đơn giản hơn

  @override
  State<MovieHomePage> createState() => _MovieHomePageState();
}

class _MovieHomePageState extends State<MovieHomePage>
    with WidgetsBindingObserver {
  int _selectedBottomIndex = 0;
  int _selectedTopTabIndex = 1;

  Map<String, dynamic>? _loggedInUser; // GIỮ LẠI TRẠNG THÁI NÀY
  String? _userToken; // GIỮ LẠI TRẠNG THÁI NÀY

  late Future<List<Movie>> _moviesFuture;
  late Future<List<AppBanner>> _bannersFuture;

  final List<String> _movieDisplayStatuses = [
    'coming_soon',
    'showing',
    'early_showing',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchAndLoadAllData(); // Load user và các dữ liệu khác khi khởi tạo
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      debugPrint('App resumed: Reloading all data.');
      _fetchAndLoadAllData(); // Tải lại user và dữ liệu khi ứng dụng resume
    }
  }

  Future<void> _fetchAndLoadAllData() async {
    // Gọi API để lấy thông tin user mới nhất
    await _loadUserAndTokenFromPrefs(); // Tải user và token từ SharedPreferences
    _fetchData(); // Fetch movies và banners
  }

  // Hàm mới để tải user và token từ SharedPreferences và cập nhật trạng thái
  Future<void> _loadUserAndTokenFromPrefs() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? token = prefs.getString(
      'jwt_token',
    ); // Lấy token từ 'jwt_token'
    final String? userJson = prefs.getString('user_data');

    debugPrint('*** _loadUserAndTokenFromPrefs called in MovieHomePage ***');
    debugPrint('Token from prefs: $token');
    debugPrint('User data from prefs: $userJson');

    Map<String, dynamic>? newUserMap;
    String? newToken = token;

    if (token != null &&
        token.isNotEmpty &&
        userJson != null &&
        userJson.isNotEmpty) {
      try {
        newUserMap = jsonDecode(userJson) as Map<String, dynamic>;
        // Nếu user object trong prefs không có userId, hoặc token không khớp, coi như cần cập nhật
        if (newUserMap['userId'] == null) {
          newUserMap = null;
          newToken = null;
          await prefs.remove('jwt_token');
          await prefs.remove('user_data');
          debugPrint('Invalid user data in prefs, cleared.');
        }
      } catch (e) {
        debugPrint('Error decoding user data from prefs: $e');
        await prefs.remove('jwt_token');
        await prefs.remove('user_data');
        newUserMap = null;
        newToken = null;
      }
    } else {
      newUserMap = null;
      newToken = null;
    }

    // Chỉ cập nhật setState nếu có thay đổi thực sự để tránh rebuild không cần thiết
    if (!mapEquals(_loggedInUser, newUserMap) || _userToken != newToken) {
      // So sánh Map an toàn
      setState(() {
        _loggedInUser = newUserMap;
        _userToken = newToken;
      });
      apiService.token = _userToken; // Cập nhật token cho ApiService
      debugPrint('User state updated in MovieHomePage.');
    } else {
      apiService.token = _userToken; // Vẫn đảm bảo ApiService có token mới nhất
      debugPrint('User state unchanged in MovieHomePage.');
    }
  }

  bool mapEquals(Map<String, dynamic>? a, Map<String, dynamic>? b) {
    if (identical(a, b)) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (final key in a.keys) {
      if (!b.containsKey(key) || a[key] != b[key]) {
        return false;
      }
    }
    return true;
  }

  void _fetchData() {
    setState(() {
      _moviesFuture = apiService.getMovies(
        displayStatus: _movieDisplayStatuses[_selectedTopTabIndex],
      );
      _bannersFuture = apiService.getBanners();
    });
  }

  void _onTopTabTapped(int index) {
    setState(() {
      _selectedTopTabIndex = index;
      _fetchData();
    });
  }

  void _onBottomNavTapped(int index) {
    setState(() {
      _selectedBottomIndex = index;
    });
  }

  // Hàm này sẽ được gọi từ HomeHeader khi nhấn vào profile
  void _onProfileTapFromHeader() async {
    // Luôn đảm bảo _loggedInUser được truyền vào là mới nhất từ state của MovieHomePage
    if (_loggedInUser != null) {
      // Đẩy ProfileScreen lên và chờ kết quả trả về
      final updatedUserData = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ProfileScreen(
            user: _loggedInUser!, // Truyền user hiện tại
            token: _userToken!, // Truyền token hiện tại
          ),
        ),
      );

      // SAU KHI QUAY LẠI TỪ PROFILE SCREEN (đã cập nhật thông tin)
      // MovieHomePage TỰ ĐỘNG FETCH LẠI USER TỪ SHAREDPREFERENCES
      // Đảm bảo dữ liệu mới nhất được load vào _loggedInUser
      if (updatedUserData != null && updatedUserData is Map<String, dynamic>) {
        debugPrint('MovieHomePage: ProfileScreen returned updated user data.');
        // User data đã được lưu vào SharedPreferences bởi ProfileInfoScreen.
        // Chỉ cần gọi _loadUserAndTokenFromPrefs để cập nhật state của MovieHomePage.
        await _loadUserAndTokenFromPrefs();
        _fetchData(); // Có thể cần fetch lại dữ liệu chính nếu có liên quan đến user role/preferences
      } else {
        debugPrint(
          'MovieHomePage: ProfileScreen returned no data or old data.',
        );
        // Nếu không có gì trả về, vẫn refresh để đảm bảo sync với prefs
        await _loadUserAndTokenFromPrefs();
        _fetchData();
      }
    } else {
      // Nếu chưa đăng nhập, chuyển hướng đến trang login
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginPage()),
      );
      await _loadUserAndTokenFromPrefs(); // Tải lại user nếu vừa đăng nhập
      _fetchData();
    }
  }

  Future<void> _launchUrl(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      debugPrint('Không thể mở URL: $url');
    }
  }

  Widget _buildTopTabs() {
    final tabs = ['COMING SOON', 'NOW SHOWING', 'EARLY SHOWING'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: List.generate(tabs.length, (index) {
        return GestureDetector(
          onTap: () => _onTopTabTapped(index),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: _selectedTopTabIndex == index
                      ? Colors.red
                      : Colors.transparent,
                  width: 2,
                ),
              ),
            ),
            child: Text(
              tabs[index],
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: _selectedTopTabIndex == index
                    ? Colors.red
                    : Colors.black,
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildBannerSlider() {
    return FutureBuilder<List<AppBanner>>(
      future: _bannersFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator()),
          );
        } else if (snapshot.hasError) {
          return const SizedBox(
            height: 200,
            child: Center(child: Text('Lỗi tải banner. Vui lòng thử lại.')),
          );
        } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox(
            height: 200,
            child: Center(child: Text('Không có banner để hiển thị.')),
          );
        }

        return CarouselSlider(
          options: CarouselOptions(
            height: 200,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 3),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
            enlargeCenterPage: false,
            viewportFraction: 1.0,
          ),
          items: snapshot.data!.map((banner) {
            return GestureDetector(
              onTap: () {
                if (banner.launchUrl != null && banner.launchUrl!.isNotEmpty) {
                  _launchUrl(banner.launchUrl!);
                }
              },
              child: Container(
                margin: EdgeInsets.zero,
                decoration: BoxDecoration(
                  image: DecorationImage(
                    image: NetworkImage(banner.imageUrl),
                    fit: BoxFit.cover,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildMovieGrid() {
    return FutureBuilder<List<Movie>>(
      future: _moviesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          return Center(child: Text('Lỗi: ${snapshot.error}'));
        } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Không có phim nào.'));
        }

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(8),
          itemCount: snapshot.data!.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.6,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (context, index) {
            final movie = snapshot.data![index];
            debugPrint('Loading image for ${movie.title} : ${movie.posterUrl}');
            return MovieCard(movie: movie);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await _fetchAndLoadAllData();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                HomeHeader(
                  loggedInUser: _loggedInUser,
                  // TRUYỀN DỮ LIỆU MỚI NHẤT VÀO HEADER
                  userToken: _userToken,
                  onRefreshData: _fetchAndLoadAllData,
                  onProfileTap: _onProfileTapFromHeader,
                ),
                const Divider(height: 1),
                _buildTopTabs(),
                _buildBannerSlider(),
                const SizedBox(height: 16),
                _buildMovieGrid(),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),

      // bottomNavigationBar: MainBottomNavBar(
      //   currentIndex: _selectedBottomIndex,
      //   onTap: _onBottomNavTapped,
      // ),
    );
  }
}
