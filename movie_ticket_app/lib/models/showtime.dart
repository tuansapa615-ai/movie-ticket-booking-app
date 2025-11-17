// lib/models/showtime.dart

class Showtime {
  final int showtimeId;
  final int movieId;
  final int hallId;
  final DateTime startTime;
  final DateTime endTime;

  // Thay đổi từ basePrice sang minSeatPrice
  final double?
  minSeatPrice; // Changed to nullable double, as it might not always be present or could be null from DB
  final int availableSeats;
  final bool isFull;
  final String movieTitle;
  final String posterUrl;
  final int durationMinutes;
  final String hallName;
  final int hallCapacity;
  final String screenType;
  final String cinemaName;
  final String cinemaAddress;
  final String cinemaCity;

  Showtime({
    required this.showtimeId,
    required this.movieId,
    required this.hallId,
    required this.startTime,
    required this.endTime,
    this.minSeatPrice, // Changed to not required
    required this.availableSeats,
    required this.isFull,
    required this.movieTitle,
    required this.posterUrl,
    required this.durationMinutes,
    required this.hallName,
    required this.hallCapacity,
    required this.screenType,
    required this.cinemaName,
    required this.cinemaAddress,
    required this.cinemaCity,
  });

  factory Showtime.fromJson(Map<String, dynamic> json) {
    return Showtime(
      showtimeId: json['showtime_id'] as int,
      movieId: json['movie_id'] as int,
      hallId: json['hall_id'] as int,
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: DateTime.parse(json['end_time'] as String),
      // Thay đổi từ base_price sang min_seat_price
      minSeatPrice: json['min_seat_price'] != null
          ? double.parse(json['min_seat_price'].toString())
          : null,
      // Handle nullability
      availableSeats: json['available_seats'] as int,
      isFull: (json['is_full'] as int) == 1,
      movieTitle: json['movie_title'] as String,
      posterUrl: json['poster_url'] as String,
      durationMinutes: json['duration_minutes'] as int,
      hallName: json['hall_name'] as String,
      hallCapacity: json['hall_capacity'] as int,
      screenType: json['screen_type'] as String,
      cinemaName: json['cinema_name'] as String,
      cinemaAddress: json['cinema_address'] as String,
      cinemaCity: json['cinema_city'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'showtime_id': showtimeId,
      'movie_id': movieId,
      'hall_id': hallId,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime.toIso8601String(),
      'min_seat_price': minSeatPrice, // Changed to min_seat_price
      'available_seats': availableSeats,
      'is_full': isFull ? 1 : 0,
      'movie_title': movieTitle,
      'poster_url': posterUrl,
      'duration_minutes': durationMinutes,
      'hall_name': hallName,
      'hall_capacity': hallCapacity,
      'screen_type': screenType,
      'cinema_name': cinemaName,
      'cinema_address': cinemaAddress,
      'cinema_city': cinemaCity,
    };
  }
}
