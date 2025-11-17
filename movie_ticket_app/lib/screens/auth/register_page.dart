// lib/screens/auth/register_page.dart

import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart'; // Cần thiết cho TapGestureRecognizer
import 'package:http/http.dart' as http; // Có thể bỏ nếu không dùng trực tiếp
import 'dart:convert';
import 'package:movie_ticket_app/screens/auth/login_page.dart';
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:movie_ticket_app/utils/app_constants.dart'; // Import AppConstants
import 'package:movie_ticket_app/screens/auth/terms_of_service_page.dart'; // <-- IMPORT TRANG MỚI

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _phoneNumberController = TextEditingController();

  bool _acceptTerms = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneNumberController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    setState(() {
      _isLoading = true;
    });

    final String fullName = _fullNameController.text.trim();
    final String email = _emailController.text.trim();
    final String password = _passwordController.text.trim();
    final String confirmPassword = _confirmPasswordController.text.trim();
    final String phoneNumber = _phoneNumberController.text.trim();

    if (fullName.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      if (!mounted) return;
      _showSnackBar('Vui lòng điền đầy đủ các trường bắt buộc.');
      setState(() {
        _isLoading = false;
      });
      return;
    }

    if (password != confirmPassword) {
      if (!mounted) return;
      _showSnackBar('Mật khẩu xác nhận không khớp.');
      setState(() {
        _isLoading = false;
      });
      return;
    }

    if (!_acceptTerms) {
      if (!mounted) return;
      _showSnackBar('Bạn phải đồng ý với các điều khoản dịch vụ.');
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      final responseData = await apiService.register({
        'fullName': fullName,
        'username': email.split('@')[0],
        'email': email,
        'password': password,
        'phoneNumber': phoneNumber,
      });

      if (!mounted) return;

      if (responseData['userId'] != null) {
        _showSnackBar(
          responseData['message'] ??
              'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.',
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      } else {
        _showSnackBar(responseData['message'] ?? 'Đăng ký thất bại.');
        debugPrint('Failed register response: $responseData');
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(e.toString().replaceFirst('Exception: ', ''));
      debugPrint('Lỗi đăng ký: $e');
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
          'Đăng ký',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFE0F7FA), Colors.white],
            stops: [0.0, 0.5],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 50.0),
              _buildInputField(
                controller: _fullNameController,
                hintText: 'Họ và tên',
                icon: Icons.person_outline,
                keyboardType: TextInputType.text,
              ),
              const SizedBox(height: 20.0),
              _buildInputField(
                controller: _emailController,
                hintText: 'Email',
                icon: Icons.mail_outline,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 20.0),
              _buildInputField(
                controller: _passwordController,
                hintText: 'Mật khẩu',
                icon: Icons.lock_outline,
                obscureText: true,
                keyboardType: TextInputType.text,
              ),
              const SizedBox(height: 20.0),
              _buildInputField(
                controller: _confirmPasswordController,
                hintText: 'Xác nhận mật khẩu',
                icon: Icons.lock_outline,
                obscureText: true,
                keyboardType: TextInputType.text,
              ),
              const SizedBox(height: 20.0),
              _buildInputField(
                controller: _phoneNumberController,
                hintText: 'Số điện thoại',
                icon: Icons.phone_android,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 20.0),
              Row(
                children: [
                  Checkbox(
                    value: _acceptTerms,
                    onChanged: (bool? newValue) {
                      setState(() {
                        _acceptTerms = newValue!;
                      });
                    },
                    activeColor: Colors.blue,
                  ),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        text: 'Tôi đồng ý với các ',
                        style: TextStyle(color: Colors.black87),
                        children: [
                          TextSpan(
                            text: 'Điều khoản dịch vụ',
                            style: const TextStyle(
                              color: Colors.blue,
                              fontWeight: FontWeight.bold,
                            ),
                            recognizer: TapGestureRecognizer()
                              ..onTap = () {
                                // TODO: Mở trang điều khoản dịch vụ
                                debugPrint('Mở trang điều khoản dịch vụ');
                                Navigator.push(
                                  // <--- THÊM DÒNG NÀY ĐỂ ĐIỀU HƯỚNG
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        const TermsOfServicePage(),
                                  ),
                                );
                              },
                          ),
                          const TextSpan(text: ' của ứng dụng.'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30.0),
              _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _buildRegisterButton(
                      text: 'Đăng ký',
                      onPressed: _acceptTerms ? _register : null,
                    ),
              const SizedBox(height: 20.0),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: const Text(
                  'Bạn đã có tài khoản? Đăng nhập ngay!',
                  style: TextStyle(color: Colors.blue),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Hàm tiện ích để tạo trường nhập liệu
  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
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
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.black87),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(color: Colors.grey.shade500),
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

  // Hàm tiện ích để tạo nút Đăng ký
  Widget _buildRegisterButton({
    required String text,
    required VoidCallback? onPressed,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: onPressed != null ? Colors.blue.shade700 : Colors.grey,
        padding: const EdgeInsets.symmetric(vertical: 15.0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
        elevation: 3,
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 18.0,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
