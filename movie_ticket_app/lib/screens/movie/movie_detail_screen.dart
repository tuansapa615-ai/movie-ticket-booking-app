import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:movie_ticket_app/models/movie.dart';
import 'package:movie_ticket_app/screens/movie/trailer_player_screen.dart';
import 'package:movie_ticket_app/screens/movie/movie_booking_screen.dart';

class MovieDetailPage extends StatefulWidget {
  final int movieId;

  const MovieDetailPage({super.key, required this.movieId});

  @override
  State<MovieDetailPage> createState() => _MovieDetailPageState();
}

class _MovieDetailPageState extends State<MovieDetailPage> {
  late Future<Movie> _movieDetailFuture;
  Movie? _loadedMovie;

  @override
  void initState() {
    super.initState();

    _fetchMovieDetail();
  }

  Future<void> _fetchMovieDetail() async {
    setState(() {
      _movieDetailFuture = apiService.getMovieDetail(widget.movieId.toString());
    });
    try {
      _loadedMovie = await _movieDetailFuture;
    } catch (e) {
      debugPrint('Error fetching movie detail: $e');
    }
  }

  Widget _buildDetailRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value?.isNotEmpty == true ? value! : 'Đang cập nhật',
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Đang cập nhật';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  Future<void> _playTrailer(String? trailerUrl) async {
    if (trailerUrl == null || trailerUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có trailer cho phim này.')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TrailerPlayerScreen(videoUrl: trailerUrl),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.blueAccent),
        centerTitle: true,
        title: const Text(
          'Chi tiết phim',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchMovieDetail,
        child: FutureBuilder<Movie>(
          future: _movieDetailFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              debugPrint('Error: ${snapshot.error}');
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Lỗi: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            if (!snapshot.hasData) {
              return const Center(child: Text('Không có dữ liệu phim.'));
            }

            _loadedMovie = snapshot.data!;
            final movie = _loadedMovie!;

            return SafeArea(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Poster + Play Button
                    Stack(
                      children: [
                        ShaderMask(
                          shaderCallback: (rect) => const LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Colors.black],
                            stops: [0.5, 1.0],
                          ).createShader(rect),
                          blendMode: BlendMode.dstIn,
                          child: Image.network(
                            movie.posterUrl,
                            height: 250,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              height: 250,
                              color: Colors.grey[300],
                              child: const Icon(Icons.broken_image, size: 50),
                            ),
                          ),
                        ),
                        if (movie.trailerUrl != null &&
                            movie.trailerUrl!.isNotEmpty)
                          Positioned.fill(
                            child: Center(
                              child: GestureDetector(
                                onTap: () => _playTrailer(movie.trailerUrl),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withOpacity(0.8),
                                  ),
                                  child: const Icon(
                                    Icons.play_arrow,
                                    size: 50,
                                    color: Colors.blueAccent,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),

                    // Movie Info
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              movie.posterUrl,
                              width: 100,
                              height: 150,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 100,
                                height: 150,
                                color: Colors.grey[300],
                                child: const Icon(Icons.movie, size: 40),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  movie.title,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.blueAccent,
                                    ),
                                    borderRadius: BorderRadius.circular(5),
                                    color: Colors.blue[50],
                                  ),
                                  child: Text(
                                    (movie.displayStatus),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Colors.blueAccent,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Details Section
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildDetailRow('ĐẠO DIỄN', movie.director),
                          _buildDetailRow(
                            'DIỄN VIÊN',
                            movie.cast?.where((e) => e.isNotEmpty).join(', '),
                          ),
                          _buildDetailRow('THỂ LOẠI', movie.genre),
                          _buildDetailRow(
                            'THỜI LƯỢNG',
                            movie.durationMinutes != null
                                ? '${movie.durationMinutes} phút'
                                : null,
                          ),
                          _buildDetailRow(
                            'NGÀY KHỞI CHIẾU',
                            _formatDate(movie.releaseDate),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Nội dung phim:',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            movie.description.isNotEmpty
                                ? movie.description
                                : 'Đang cập nhật',
                            textAlign: TextAlign.justify,
                            style: const TextStyle(fontSize: 16, height: 1.5),
                          ),
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: Container(
        height: 80,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: ElevatedButton(
          onPressed: () async {
            // CHỈ GIỮ LOGIC ĐIỀU HƯỚNG TRỰC TIẾP ĐẾN MÀN HÌNH ĐẶT VÉ
            if (_loadedMovie != null) {
              _navigateToBookingScreen();
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Dữ liệu phim chưa sẵn sàng.')),
              );
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.redAccent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text(
            'Đặt vé',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  // Hàm riêng để điều hướng đến MovieBookingScreen
  Future<void> _navigateToBookingScreen() async {
    // result từ MovieBookingScreen có thể là 'refresh_movie_details'
    // hoặc 'refresh' nếu có thay đổi trong showtimes từ SeatSelectionScreen
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MovieBookingScreen(movie: _loadedMovie!),
      ),
    );

    // Kích hoạt làm mới chi tiết phim nếu có tín hiệu 'refresh_movie_details'
    if (result == 'refresh_movie_details') {
      _fetchMovieDetail();
    }
  }
}
