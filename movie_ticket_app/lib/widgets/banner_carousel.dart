// lib/widgets/banner_carousel.dart
import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:movie_ticket_app/models/banner.dart'; // Import AppBanner model
import 'package:flutter/foundation.dart'; // For debugPrint

class FeaturedBannerCarousel extends StatefulWidget {
  final Future<List<AppBanner>> bannersFuture; // Nhận Future<List<AppBanner>>

  const FeaturedBannerCarousel({super.key, required this.bannersFuture});

  @override
  State<FeaturedBannerCarousel> createState() => _FeaturedBannerCarouselState();
}

class _FeaturedBannerCarouselState extends State<FeaturedBannerCarousel> {
  Future<void> _launchUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url)) {
      if (!mounted) return;
      debugPrint('Could not launch $url');
    }
  }

  Widget _buildFeaturedMovieBanner({
    required String imageUrl,
    String? launchUrl,
    Key? key,
  }) {
    Widget bannerContent = Container(
      key: key,
      margin: EdgeInsets.zero,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8.0),
        // DecorationImage is for background, Image.network for actual content with builders
        // The DecorationImage's onError is primarily for asset/file errors or very early network issues,
        // it doesn't provide granular control for network loading/error states like Image.network.
        // So, let's simplify and rely on Image.network within the container for better error/loading feedback.
      ),
      // Changed to directly use Image.network as the primary content
      child: ClipRRect(
        // Add ClipRRect to apply borderRadius to the image
        borderRadius: BorderRadius.circular(8.0),
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          width: double.infinity,
          // Ensure it fills the container width
          height: double.infinity,
          // Ensure it fills the container height
          loadingBuilder:
              (
                BuildContext context,
                Widget child,
                ImageChunkEvent? loadingProgress,
              ) {
                if (loadingProgress == null) {
                  return child; // Image finished loading
                }
                return Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!
                        : null, // Value will be null for indeterminate progress
                  ),
                );
              },
          errorBuilder:
              (BuildContext context, Object error, StackTrace? stackTrace) {
                debugPrint(
                  'Error loading banner image widget: $imageUrl, error: $error',
                );
                return Container(
                  color: Colors.grey[300],
                  child: const Center(
                    child: Icon(
                      Icons.broken_image,
                      size: 50,
                      color: Colors.grey,
                    ),
                  ),
                );
              },
        ),
      ),
    );

    if (launchUrl != null && launchUrl.isNotEmpty) {
      return GestureDetector(
        onTap: () {
          _launchUrl(launchUrl);
        },
        child: bannerContent,
      );
    } else {
      return bannerContent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AppBanner>>(
      future: widget.bannersFuture, // Sử dụng future từ widget
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator()),
          );
        } else if (snapshot.hasError) {
          debugPrint('Error loading banners: ${snapshot.error}');
          return const SizedBox(
            height: 200,
            child: Center(
              child: Text('Không thể tải banners. Vui lòng thử lại.'),
            ),
          );
        } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox(
            height: 200,
            child: Center(child: Text('Không có banners để hiển thị.')),
          );
        } else {
          // Dữ liệu banners đã sẵn sàng
          final List<AppBanner> banners = snapshot.data!;
          return CarouselSlider(
            options: CarouselOptions(
              height: 200.0,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 3),
              autoPlayAnimationDuration: const Duration(milliseconds: 800),
              autoPlayCurve: Curves.fastOutSlowIn,
              enlargeCenterPage: false,
              aspectRatio: 16 / 9,
              viewportFraction: 1.0,
            ),
            items: banners.map((banner) {
              return Builder(
                builder: (BuildContext context) {
                  return _buildFeaturedMovieBanner(
                    imageUrl: banner.imageUrl,
                    launchUrl: banner.launchUrl,
                  );
                },
              );
            }).toList(),
          );
        }
      },
    );
  }
}
