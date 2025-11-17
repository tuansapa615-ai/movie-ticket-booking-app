// TODO Implement this library.
// lib/models/banner.dart
class AppBanner {
  final int bannerId;
  final String imageUrl;
  final String launchUrl;

  AppBanner({
    required this.bannerId,
    required this.imageUrl,
    required this.launchUrl,
  });

  factory AppBanner.fromJson(Map<String, dynamic> json) {
    return AppBanner(
      bannerId: json['banner_id'] as int,
      imageUrl: json['imageUrl'] as String,
      launchUrl: json['launchUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'banner_id': bannerId,
      'imageUrl': imageUrl,
      'launchUrl': launchUrl,
    };
  }
}
