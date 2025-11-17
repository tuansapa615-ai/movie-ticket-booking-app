import 'package:flutter/material.dart';
import 'package:movie_ticket_app/models/movie.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/screens/movie/movie_detail_screen.dart';
import 'package:intl/intl.dart'; // Thêm để format ngày

class MovieCard extends StatelessWidget {
  final Movie movie;

  const MovieCard({super.key, required this.movie});

  @override
  Widget build(BuildContext context) {
    debugPrint('Loading image for ${movie.title}: ${movie.posterUrl}');

    final ImageProvider posterImage = movie.posterUrl.isNotEmpty
        ? NetworkImage(movie.posterUrl)
        : const AssetImage('assets/images/placeholder_movie.jpg');

    final releaseDateFormatted = DateFormat(
      'dd/MM/yyyy',
    ).format(movie.releaseDate); // Format ngày

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => MovieDetailPage(movieId: movie.movieId),
          ),
        );
      },
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(8.0),
                  ),
                  child: Hero(
                    tag: 'poster_${movie.movieId}', // Hero animation
                    child: Image(
                      image: posterImage,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        debugPrint(
                          'Error loading image for ${movie.title}: $error',
                        );
                        return Image.asset(
                          'assets/images/placeholder_movie.jpg',
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        );
                      },
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color.fromARGB(255, 255, 193, 7),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      movie.rating != null
                          ? movie.rating!.toStringAsFixed(1)
                          : 'N/A',
                      style: const TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    movie.title,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(
                      text: 'Thể loại: ',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      children: [
                        TextSpan(
                          text: movie.genre,
                          style: const TextStyle(fontWeight: FontWeight.normal),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text.rich(
                    TextSpan(
                      text: 'Thời lượng: ',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      children: [
                        TextSpan(
                          text: '${movie.durationMinutes} phút',
                          style: const TextStyle(fontWeight: FontWeight.normal),
                        ),
                      ],
                    ),
                  ),
                  Text.rich(
                    TextSpan(
                      text: 'Ngày phát hành: ',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      children: [
                        TextSpan(
                          text: releaseDateFormatted, // Dùng ngày đã format
                          style: const TextStyle(fontWeight: FontWeight.normal),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
