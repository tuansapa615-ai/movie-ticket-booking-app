// lib/main.dart

import 'package:flutter/material.dart';
import 'package:movie_ticket_app/screens/home_screen.dart';
import 'package:intl/date_symbol_data_local.dart'; // Import để khởi tạo dữ liệu locale

void main() async {
  // THÊM ASYNC VÀO ĐÂY
  WidgetsFlutterBinding.ensureInitialized();

  await initializeDateFormatting('vi_VN', null);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aptech Cinemas App',
      theme: ThemeData(
        primarySwatch: Colors.red,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const MovieHomePage(), // Đây là điểm vào chính của ứng dụng
      debugShowCheckedModeBanner: false, // Ẩn banner debug
    );
  }
}
