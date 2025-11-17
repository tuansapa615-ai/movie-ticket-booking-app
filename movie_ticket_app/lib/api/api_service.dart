import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/models/movie.dart';
import 'package:movie_ticket_app/models/banner.dart';
import 'package:movie_ticket_app/models/showtime.dart';
import 'package:movie_ticket_app/utils/app_constants.dart';
import 'package:movie_ticket_app/models/seat.dart';
import 'package:movie_ticket_app/models/seat_type_price.dart';
import 'package:movie_ticket_app/models/food_item.dart';

class ApiService {
  final String baseUrl;
  String? token; // This is now a member of the class

  ApiService({required this.baseUrl, this.token});

  // Method to get the token (already exists, but worth noting it's a class method)
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(
      'jwt_token',
    ); // Assuming your token key is 'jwt_token'
  }

  // Method to refresh the internal token
  Future<void> _refreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('jwt_token');
  }

  Map<String, String> _buildHeaders({
    String? contentType,
    bool isMultipart = false,
  }) {
    final Map<String, String> headers = {};
    if (!isMultipart) {
      headers['Content-Type'] =
          contentType ?? 'application/json; charset=UTF-8';
    }
    // Use the class's `token` property, which should be updated
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Changed return type to dynamic to handle both Map and List JSON responses
  dynamic _processResponse(http.Response response) {
    debugPrint(
      'API Response Status: ${response.statusCode} for ${response.request?.url}',
    );
    debugPrint('API Response Body: ${response.body}');

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isNotEmpty) {
        // json.decode can return Map<String, dynamic> or List<dynamic>
        return json.decode(response.body);
      }
      // Return null or empty object/list based on expected empty success
      return null; // For successful responses with no body
    } else if (response.statusCode == 401 || response.statusCode == 403) {
      _clearTokenAndLogout();
      throw Exception('Authentication failed or expired. Please log in again.');
    } else {
      String errorMessage = 'An unknown error occurred.';
      try {
        final errorData = json.decode(response.body);
        errorMessage = errorData['message'] ?? errorMessage;
      } catch (e) {
        debugPrint('Failed to parse error response: $e');
        errorMessage = response.body.isNotEmpty
            ? response.body
            : 'Server responded with status ${response.statusCode}.';
      }
      throw Exception(errorMessage);
    }
  }

  // Private method to clear token on authentication failure
  Future<void> _clearTokenAndLogout() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token'); // Use your actual token key
    await prefs.remove('user_data');
    token = null; // Clear internal token
    // You might want to navigate to login screen here,
    // but typically this is handled by a higher-level AuthProvider.
  }

  // Changed return type to Future<dynamic> for all HTTP methods
  Future<dynamic> get(String path) async {
    await _refreshToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$path'),
        headers: _buildHeaders(),
      );
      return _processResponse(response);
    } catch (e) {
      debugPrint('GET request failed for $path: $e');
      rethrow;
    }
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    await _refreshToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$path'),
        headers: _buildHeaders(contentType: 'application/json; charset=UTF-8'),
        body: json.encode(body),
      );
      return _processResponse(response);
    } catch (e) {
      debugPrint('POST request failed for $path: $e');
      rethrow;
    }
  }

  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    await _refreshToken();
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$path'),
        headers: _buildHeaders(contentType: 'application/json; charset=UTF-8'),
        body: json.encode(body),
      );
      return _processResponse(response);
    } catch (e) {
      debugPrint('PUT request failed for $path: $e');
      rethrow;
    }
  }

  Future<dynamic> delete(String path) async {
    await _refreshToken();
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$path'),
        headers: _buildHeaders(),
      );
      return _processResponse(response);
    } catch (e) {
      debugPrint('DELETE request failed for $path: $e');
      rethrow;
    }
  }

  Future<dynamic> postMultipart(
    String path,
    String fieldName,
    String filePath,
  ) async {
    await _refreshToken();
    try {
      final uri = Uri.parse('$baseUrl$path');
      var request = http.MultipartRequest('POST', uri)
        ..headers.addAll(_buildHeaders(isMultipart: true))
        ..files.add(await http.MultipartFile.fromPath(fieldName, filePath));

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      return _processResponse(
        http.Response(
          responseBody,
          response.statusCode,
          headers: response.headers,
        ),
      );
    } catch (e) {
      debugPrint('Multipart POST request failed for $path: $e');
      rethrow;
    }
  }
}

final apiService = ApiService(baseUrl: AppConstants.baseUrl);

extension AuthApi on ApiService {
  Future<Map<String, dynamic>> login(String email, String password) async {
    final dynamic response = await post('/api/auth/login', {
      'email': email,
      'password': password,
    });
    if (response is Map && response['token'] != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', response['token']); // Store token
      token = response['token']; // Update internal token
    }
    return response as Map<String, dynamic>; // Explicit cast for external use
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    return await post('/api/auth/register', userData) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> uploadAvatar(String filePath) async {
    return await postMultipart('/api/auth/upload-avatar', 'avatar', filePath)
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    return await post('/api/auth/change-password', {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        })
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> logout() async {
    try {
      final dynamic response = await post('/api/auth/logout', {});
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      await prefs.remove('user_data');
      token = null;
      debugPrint('User token after logout: ${prefs.getString('jwt_token')}');
      return response as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Error during logout process: $e');
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      await prefs.remove('user_data');
      token = null;
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    return await post('/api/auth/request-password-reset', {'email': email})
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteUser(String userId) async {
    return await delete('/api/auth/users/$userId') as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteMyAccount() async {
    return await delete('/api/auth/me') as Map<String, dynamic>;
  }
}

extension MovieApi on ApiService {
  Future<List<Movie>> getMovies({String? displayStatus}) async {
    String path = '/api/movies';
    Map<String, String> queryParams = {};
    if (displayStatus != null && displayStatus.isNotEmpty) {
      queryParams['display_status'] = displayStatus;
    }
    final Uri uri = Uri.parse(
      '$baseUrl$path',
    ).replace(queryParameters: queryParams);

    final dynamic responseData = await get(
      uri.toString().replaceFirst(baseUrl, ''),
    );

    if (responseData is Map && responseData['movies'] is List) {
      final List<dynamic> moviesJson = responseData['movies'];
      return moviesJson.map((json) => Movie.fromJson(json)).toList();
    } else {
      throw Exception(
        'Failed to parse movies: unexpected response format. Expected a map with "movies" list but got ${responseData.runtimeType}',
      );
    }
  }

  Future<Movie> getMovieDetail(String movieId) async {
    final dynamic responseData = await get('/api/movies/$movieId');
    if (responseData is Map && responseData.isNotEmpty) {
      return Movie.fromJson(responseData as Map<String, dynamic>);
    } else {
      throw Exception('Empty movie data returned for ID: $movieId');
    }
  }

  Future<Map<String, dynamic>> createMovie(
    Map<String, dynamic> movieData,
  ) async {
    return await post('/api/movies', movieData) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateMovie(
    String movieId,
    Map<String, dynamic> movieData,
  ) async {
    return await put('/api/movies/$movieId', movieData) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteMovie(String movieId) async {
    return await delete('/api/movies/$movieId') as Map<String, dynamic>;
  }
}

extension BannerApi on ApiService {
  Future<List<AppBanner>> getBanners() async {
    final dynamic responseData = await get('/api/banners');
    if (responseData is Map && responseData['banners'] is List) {
      final List<dynamic> bannersJson = responseData['banners'];
      return bannersJson.map((json) => AppBanner.fromJson(json)).toList();
    } else {
      throw Exception(
        'Failed to parse banners: unexpected response format. Expected a map with "banners" list but got ${responseData.runtimeType}',
      );
    }
  }

  Future<Map<String, dynamic>> createBanner(
    Map<String, dynamic> bannerData,
  ) async {
    return await post('/api/banners', bannerData) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateBanner(
    String bannerId,
    Map<String, dynamic> bannerData,
  ) async {
    return await put('/api/banners/$bannerId', bannerData)
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteBanner(String bannerId) async {
    return await delete('/api/banners/$bannerId') as Map<String, dynamic>;
  }
}

extension ShowtimeApi on ApiService {
  Future<List<Showtime>> getShowtimes({
    required String movieId,
    required String date,
    String? cinemaId,
    String? hallId,
    String? minStartTime,
    String? maxStartTime,
  }) async {
    String path = '/api/showtimes';
    Map<String, String> queryParams = {'movieId': movieId, 'date': date};
    if (cinemaId != null) queryParams['cinemaId'] = cinemaId;
    if (hallId != null) queryParams['hallId'] = hallId;
    if (minStartTime != null) queryParams['minStartTime'] = minStartTime;
    if (maxStartTime != null) queryParams['maxStartTime'] = maxStartTime;

    final Uri uri = Uri.parse(
      '$baseUrl$path',
    ).replace(queryParameters: queryParams);

    debugPrint('Fetching showtimes from: $uri');
    final dynamic responseData = await get(
      uri.toString().replaceFirst(baseUrl, ''),
    );
    if (responseData is Map && responseData['showtimes'] is List) {
      final List<dynamic> showtimesJson = responseData['showtimes'];
      return showtimesJson.map((json) => Showtime.fromJson(json)).toList();
    } else {
      throw Exception(
        'Failed to parse showtimes: unexpected response format. Expected a map with "showtimes" list but got ${responseData.runtimeType}',
      );
    }
  }
}

extension SeatApi on ApiService {
  Future<List<Seat>> getSeatsByHallAndShowtime({
    required int hallId,
    required int showtimeId,
  }) async {
    String path = '/api/seats';
    Map<String, String> queryParams = {
      'hallId': hallId.toString(),
      'showtimeId': showtimeId.toString(),
    };

    final Uri uri = Uri.parse(
      '$baseUrl$path',
    ).replace(queryParameters: queryParams);

    debugPrint('Fetching seats from: $uri');
    try {
      final dynamic responseData = await get(
        uri.toString().replaceFirst(baseUrl, ''),
      );
      if (responseData is Map && responseData['seats'] is List) {
        final List<dynamic> seatsJson = responseData['seats'];
        return seatsJson.map((json) => Seat.fromJson(json)).toList();
      } else {
        throw Exception(
          'Failed to parse seats: unexpected response format. Expected a map with "seats" list but got ${responseData.runtimeType}',
        );
      }
    } catch (e) {
      debugPrint('Error fetching seats: $e');
      rethrow;
    }
  }
}

// BookingApi Extension
extension BookingApi on ApiService {
  Future<Map<String, dynamic>> getBookingDetails(String bookingId) async {
    final dynamic responseData = await get('/api/bookings/$bookingId');
    if (responseData is Map && responseData.isNotEmpty) {
      return responseData.cast<String, dynamic>(); // Explicitly cast to Map
    } else {
      throw Exception('Empty booking details data returned for ID: $bookingId');
    }
  }

  Future<List<Map<String, dynamic>>> getUserBookings(
    int userId, {
    String? status,
  }) async {
    String path = '/api/bookings/users/$userId';
    Map<String, String> queryParams = {};
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }
    final Uri uri = Uri.parse(
      '$baseUrl$path',
    ).replace(queryParameters: queryParams);

    debugPrint('Fetching user bookings from: $uri');
    final dynamic responseData = await get(
      uri.toString().replaceFirst(baseUrl, ''),
    );

    // CORRECTED LOGIC FOR ARRAY RESPONSE
    if (responseData is List) {
      return responseData
          .cast<
            Map<String, dynamic>
          >(); // Safely cast to List<Map<String, dynamic>>
    } else if (responseData == null ||
        (responseData is Map && responseData.isEmpty)) {
      return []; // Return empty list for null or empty object responses
    } else {
      throw Exception(
        'Unexpected response format for user bookings: expected a list but got ${responseData.runtimeType}',
      );
    }
  }

  Future<Map<String, dynamic>> createPendingBooking({
    required int userId,
    required int showtimeId,
    required List<int> seatIds,
    List<Map<String, dynamic>> foodItems = const [],
  }) async {
    return await post('/api/bookings', {
          'user_id': userId,
          'showtime_id': showtimeId,
          'seat_ids': seatIds,
          'food_items': foodItems,
        })
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createPaypalPayment(
    String bookingId,
    List<Map<String, dynamic>> foodItems,
  ) async {
    return await post('/api/bookings/$bookingId/pay/paypal', {
          'food_items': foodItems,
        })
        as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> confirmBooking(
    String bookingId,
    String paymentMethod,
    Map<String, dynamic> gatewayResponse,
    List<Map<String, dynamic>> foodItems, // Thêm foodItems vào đây
  ) async {
    return await put('/api/bookings/$bookingId/confirm', {
   
          'gateway_response': gatewayResponse,
          'status': 'confirmed',
          'food_items': foodItems,
        })
        as Map<String, dynamic>;
  }

  Future<void> cancelPendingBooking(String bookingId) async {
    await post('/api/bookings/$bookingId/cancel', {});
  }
}

extension FoodItemApi on ApiService {
  Future<List<FoodItem>> getFoodItems() async {
    String path = '/api/food-items';
    debugPrint('Fetching food items from: $path');
    try {
      final dynamic responseData = await get(path);
      if (responseData is Map && responseData['foodItems'] is List) {
        final List<dynamic> foodItemsJson = responseData['foodItems'];
        return foodItemsJson.map((json) => FoodItem.fromJson(json)).toList();
      } else {
        throw Exception(
          'Failed to parse food items: unexpected response format. Expected a map with "foodItems" list but got ${responseData.runtimeType}',
        );
      }
    } catch (e) {
      debugPrint('Error fetching food items: $e');
      rethrow;
    }
  }
}

extension SeatPricingApi on ApiService {
  Future<List<SeatTypePrice>> getSeatTypePrices() async {
    final dynamic responseData = await get('/api/seat-type-prices');
    if (responseData is Map && responseData['prices'] is List) {
      final List<dynamic> pricesJson = responseData['prices'];
      return pricesJson.map((json) => SeatTypePrice.fromJson(json)).toList();
    } else {
      throw Exception(
        'Failed to parse seat prices: unexpected response format. Expected a map with "prices" list but got ${responseData.runtimeType}',
      );
    }
  }
}

// Thêm extension mới cho Profile/User Profile Management
extension UserProfileApi on ApiService {
  Future<Map<String, dynamic>> updateProfile(
    Map<String, dynamic> userData,
  ) async {
    return await put('/api/auth/profile', userData) as Map<String, dynamic>;
  }

  // Nếu bạn muốn một hàm riêng để lấy thông tin profile của user đang đăng nhập
  Future<Map<String, dynamic>> getMyProfile() async {
    final dynamic responseData = await get('/api/auth/profile');
    if (responseData is Map && responseData['user'] is Map) {
      return responseData['user'] as Map<String, dynamic>;
    } else {
      throw Exception(
        'Failed to fetch user profile: unexpected response format.',
      );
    }
  }
}
