import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:movie_ticket_app/screens/auth/register_page.dart';
import 'package:movie_ticket_app/screens/home_screen.dart'; // Giữ lại
import 'package:flutter/foundation.dart';
import 'package:movie_ticket_app/screens/auth/forgot_password_page.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isLoading = false;

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
    });

    final String email = _emailController.text.trim();
    final String password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      if (!mounted) return;
      _showSnackBar('Vui lòng nhập Email và Mật khẩu.');
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      final responseData = await apiService.login(email, password);

      if (!mounted) {
        debugPrint(
          'LoginPage is unmounted after login API call. Cannot navigate.',
        );
        return;
      }

      if (responseData['token'] != null && responseData['user'] != null) {
        final SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_token', responseData['token']);
        await prefs.setString('user_data', jsonEncode(responseData['user']));

        _showSnackBar(responseData['message'] ?? 'Đăng nhập thành công!');

        // SỬA ĐỔI QUAN TRỌNG: Điều hướng thẳng đến HomeScreen và xóa stack
        // Điều này sẽ giải quyết vấn đề "không chuyển trang" và "debugLocked"
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const MovieHomePage()),
              (Route<dynamic> route) => false, // Xóa tất cả các route trước đó
            );
          }
        });
      } else {
        _showSnackBar(responseData['message'] ?? 'Đăng nhập thất bại.');
        debugPrint('Failed login response: $responseData');
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(e.toString().replaceFirst('Exception: ', ''));
      debugPrint('Lỗi đăng nhập: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
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
    return PopScope(
      canPop: true, // Cho phép pop mặc định
      onPopInvoked: (didPop) {
        // didPop là true nếu pop đã xảy ra (ví dụ: vuốt về)
        // Chúng ta muốn đảm bảo nếu pop xảy ra mà không qua đăng nhập, thì màn hình gọi
        // cần biết là không thành công.
        if (didPop) {
          // Chỉ pop với kết quả nếu màn hình hiện tại là đầu tiên trong stack được gọi từ bên ngoài
          // và không phải là pop do _login() tự gọi pushAndRemoveUntil.
          // Đây là trường hợp người dùng chủ động nhấn nút back/vuốt về.
          if (Navigator.of(context).canPop() &&
              ModalRoute.of(context)?.isCurrent == true) {
            Navigator.pop(context, false);
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
            onPressed: () {
              if (mounted) {
                // Người dùng nhấn nút back trên AppBar: Pop với giá trị FALSE
                Navigator.pop(context, false);
              }
            },
          ),
        ),
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFE0F7FA), // Light blue
                Colors.white,
              ],
              stops: [0.0, 0.5],
            ),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: 24.0,
              vertical: 20.0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 80.0),
                Image.asset(
                  'assets/logos/aptechcinemas-logo.png',
                  height: 120.0,
                ),
                const SizedBox(height: 50.0),
                _buildInputField(
                  controller: _emailController,
                  hintText: 'Email',
                  icon: Icons.mail_outline,
                ),
                const SizedBox(height: 20.0),
                _buildInputField(
                  controller: _passwordController,
                  hintText: 'Mật khẩu',
                  icon: Icons.lock_outline,
                  obscureText: true,
                ),
                const SizedBox(height: 10.0),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ForgotPasswordPage(),
                        ),
                      );
                    },
                    child: const Text(
                      'Quên mật khẩu?',
                      style: TextStyle(color: Colors.blue),
                    ),
                  ),
                ),
                const SizedBox(height: 20.0),
                _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _buildLoginButton(
                        text: 'Đăng nhập',
                        color: Colors.blue,
                        onPressed: _login,
                      ),
                const SizedBox(height: 20.0),
                Row(
                  children: const [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10.0),
                      child: Text('HOẶC'),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 20.0),
                OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const RegisterPage(),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15.0),
                    side: const BorderSide(color: Colors.blue),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                  ),
                  child: const Text(
                    'Đăng ký tài khoản',
                    style: TextStyle(
                      color: Colors.blue,
                      fontSize: 16.0,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    bool obscureText = false,
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

  Widget _buildLoginButton({
    required String text,
    required Color color,
    Color textColor = Colors.white,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: const EdgeInsets.symmetric(vertical: 15.0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
        elevation: 3,
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 16.0,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
