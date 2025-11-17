// lib/auth/screens/forgot_password_page.dart

import 'package:flutter/material.dart';
import 'package:movie_ticket_app/api/api_service.dart'; // Import ApiService
import 'package:flutter/foundation.dart'; // Import for debugPrint

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final TextEditingController _emailController = TextEditingController();
  bool _isLoading = false;

  // late final AuthApiService _authApiService; // Khai báo AuthApiService

  @override
  void initState() {
    super.initState();
    // _authApiService = AuthApiService(
    //   baseUrl: AppConstants.baseUrl,
    // ); // Khởi tạo ApiService
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendPasswordResetEmail() async {
    setState(() {
      _isLoading = true;
    });

    final String email = _emailController.text.trim();

    if (email.isEmpty) {
      _showSnackBar('Vui lòng nhập Email của bạn.');
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      final responseData = await apiService.requestPasswordReset(email);

      if (!mounted) return;

      if (responseData['message'] != null) {
        // Backend trả về message 200 cho cả trường hợp email không tồn tại
        _showSnackBar(responseData['message']);
        if (responseData['message'].contains('đã được gửi')) {
          // Chỉ pop nếu email thực sự được gửi
          Navigator.pop(context); // Go back to the login page after success
        }
      } else {
        _showSnackBar('Đã xảy ra lỗi không xác định.');
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(
        'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc email không tồn tại.',
      );
      debugPrint('Lỗi kết nối hoặc API: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 3)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'Quên mật khẩu',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFE0F7FA), // Light blue similar to your login page
              Colors.white,
            ],
            stops: [0.0, 0.5],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 50.0),
              const Text(
                'Mật khẩu mới sẽ được gửi về Email tài khoản của bạn!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16.0, color: Colors.black87),
              ),
              const SizedBox(height: 30.0),
              _buildInputField(
                controller: _emailController,
                hintText: 'Email',
                icon: Icons.mail_outline,
              ),
              const SizedBox(height: 30.0),
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildSendButton(
                      text: 'GỬI',
                      onPressed: _sendPasswordResetEmail,
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8.0),
        boxShadow: [
          BoxShadow(
            color: const Color.fromRGBO(128, 128, 128, 0.2),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: TextInputType.emailAddress, // Suggest email keyboard
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: Icon(icon, color: Colors.grey.shade600),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            vertical: 15.0,
            horizontal: 10.0,
          ),
        ),
      ),
    );
  }

  Widget _buildSendButton({
    required String text,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blue,
        // Using blue as in your image for the button
        padding: const EdgeInsets.symmetric(vertical: 15.0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
        elevation: 3,
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16.0,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
