// lib/models/movie.dart
import 'dart:convert';
import 'package:flutter/foundation.dart'; // Để sử dụng debugPrint (quan trọng!)

class Movie {
  final int movieId;
  final String title;
  final String description;
  final int durationMinutes;
  final DateTime releaseDate;
  final DateTime? endDate;
  final String genre;
  final String? director;
  final List<String>? cast;
  final String posterUrl;
  final String? trailerUrl;
  final double? rating;
  final String displayStatus;

  Movie({
    required this.movieId,
    required this.title,
    required this.description,
    required this.durationMinutes,
    required this.releaseDate,
    this.endDate,
    required this.genre,
    this.director,
    this.cast,
    required this.posterUrl,
    this.trailerUrl,
    this.rating,
    required this.displayStatus,
  });

  factory Movie.fromJson(Map<String, dynamic> data) {
    List<String>? parsedCast;
    if (data['cast'] != null) {
      if (data['cast'] is String) {
        try {
          final dynamic decodedCast = json.decode(data['cast'] as String);
          if (decodedCast is List) {
            parsedCast = List<String>.from(
              decodedCast.map((e) => e.toString()),
            ); // Ensure elements are strings
          } else {
            debugPrint(
              'Warning: Cast string decoded to non-list type: ${data['cast']}',
            );
            parsedCast = null;
          }
        } catch (e) {
          debugPrint('Error parsing cast JSON string: $e');
          parsedCast = null;
        }
      } else if (data['cast'] is List) {
        parsedCast = List<String>.from(
          data['cast'].map((e) => e.toString()),
        ); // Ensure elements are strings
      } else {
        debugPrint(
          'Warning: Unexpected type for cast: ${data['cast'].runtimeType}',
        );
        parsedCast = null;
      }
    }

    return Movie(
      movieId: data['movie_id'] as int,
      title: data['title'] as String,
      description: data['description'] as String,
      durationMinutes: data['duration_minutes'] as int,
      releaseDate: DateTime.parse(data['release_date'] as String),
      endDate: data['end_date'] != null
          ? DateTime.parse(data['end_date'] as String)
          : null,
      genre: data['genre'] as String,
      director: data['director'] as String?,
      cast: parsedCast,
      posterUrl: data['poster_url'] as String,
      trailerUrl: data['trailer_url'] as String?,
      rating: data['rating'] != null
          ? double.tryParse(data['rating'].toString())
          : null,
      displayStatus: data['display_status'] as String,
    );
  }
}
