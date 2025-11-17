// D:\project-4\movie_ticket_app\lib\widgets\home_header.dart
import 'package:flutter/material.dart';
import 'package:movie_ticket_app/screens/auth/login_page.dart';
import 'package:movie_ticket_app/screens/auth/profile_screen.dart';

class HomeHeader extends StatelessWidget {
  final Map<String, dynamic>? loggedInUser;
  final String? userToken;
  final VoidCallback onRefreshData;
  final VoidCallback onProfileTap;

  const HomeHeader({
    super.key,
    required this.loggedInUser,
    required this.userToken,
    required this.onRefreshData,
    required this.onProfileTap,
  });

  // Hàm helper để thêm tham số cache-busting vào URL
  String _getCacheBustedAvatarUrl(String? originalUrl) {
    if (originalUrl == null || originalUrl.isEmpty) {
      return ''; // Trả về chuỗi rỗng nếu không có URL
    }
    // Thêm timestamp hiện tại làm tham số truy vấn để buộc tải lại
    final Uri uri = Uri.parse(originalUrl);
    final Map<String, String> queryParameters = Map.from(uri.queryParameters);
    queryParameters['t'] = DateTime.now().millisecondsSinceEpoch.toString();

    // Xây dựng lại URL
    return uri.replace(queryParameters: queryParameters).toString();
  }

  @override
  Widget build(BuildContext context) {
    // Lấy URL avatar đã có cache-busting
    final String displayAvatarUrl = _getCacheBustedAvatarUrl(
      loggedInUser?['avatarUrl'],
    );

    return Padding(
      padding: const EdgeInsets.all(9),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: loggedInUser != null
                ? GestureDetector(
                    onTap: onProfileTap,
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 25,
                          backgroundImage:
                              // Dùng displayAvatarUrl cho NetworkImage
                              displayAvatarUrl.isNotEmpty
                              ? NetworkImage(displayAvatarUrl)
                                    as ImageProvider<Object>
                              : null,
                          child: displayAvatarUrl.isEmpty
                              ? const Icon(
                                  Icons.person,
                                  color: Colors.white,
                                  size: 30,
                                )
                              : null,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Chào ${loggedInUser!['fullName'] ?? loggedInUser!['username'] ?? 'Khách'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                loggedInUser!['role']?.toUpperCase() ??
                                    'MEMBER',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                : OutlinedButton.icon(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginPage()),
                      );
                      onRefreshData();
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.blue, width: 1.0),
                    ),
                    icon: const Icon(
                      Icons.person,
                      color: Colors.blue,
                      size: 20,
                    ),
                    label: const Text(
                      'Login',
                      style: TextStyle(color: Colors.blue, fontSize: 14),
                    ),
                  ),
          ),
          Image.asset('assets/logos/aptechcinemas-logo.png', height: 95),
        ],
      ),
    );
  }
}
