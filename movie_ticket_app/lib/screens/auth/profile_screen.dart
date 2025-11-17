// D:\project-4\movie_ticket_app\lib\screens\auth\profile_screen.dart
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'package:movie_ticket_app/screens/auth/transaction_history_screen.dart';
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:movie_ticket_app/screens/home_screen.dart';
import 'package:movie_ticket_app/screens/auth/profile_info_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.user, this.token});

  final Map<String, dynamic>? user;
  final String? token;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _userName = 'Khách';
  String _email = '';
  String _fullName = '';
  String? _avatarUrl;
  String? _userToken;
  Map<String, dynamic>? _loggedInUser;
  bool _isLoading = false;

  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmNewPasswordController =
      TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUserProfile(); // Tải dữ liệu ban đầu cho màn hình này
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmNewPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final String? token = prefs.getString('jwt_token'); // Sử dụng 'jwt_token'
      final String? userJson = prefs.getString('user_data');

      if (token != null &&
          token.isNotEmpty &&
          userJson != null &&
          userJson.isNotEmpty) {
        final Map<String, dynamic> userMap =
            jsonDecode(userJson) as Map<String, dynamic>;

        setState(() {
          _userToken = token;
          _loggedInUser = userMap;
          _userName = userMap['username'] ?? 'Khách';
          _email = userMap['email'] ?? '';
          _fullName =
              userMap['fullName'] ??
              userMap['username'] ??
              'Khách'; // Lấy fullName
          _avatarUrl = userMap['avatarUrl'];
        });

        apiService.token = token; // Cập nhật token cho apiService
      } else {
        setState(() {
          _userToken = null;
          _loggedInUser = null;
          _userName = 'Khách';
          _email = '';
          _fullName = '';
          _avatarUrl = null;
        });
        apiService.token = null;
        debugPrint(
          'ProfileScreen: No valid user data found in SharedPreferences.',
        );
      }
    } catch (e) {
      debugPrint(
        'ProfileScreen: Lỗi khi tải dữ liệu người dùng từ SharedPreferences: $e',
      );
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token'); // Sử dụng 'jwt_token'
      await prefs.remove('user_data');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Lỗi tải dữ liệu người dùng. Vui lòng đăng nhập lại.',
            ),
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    if (_userToken == null || _userToken!.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không có token xác thực. Vui lòng đăng nhập lại.'),
        ),
      );
      return;
    }

    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);

    if (image == null) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final responseData = await apiService.uploadAvatar(image.path);

      if (!mounted) return;

      // CẬP NHẬT _loggedInUser TRỰC TIẾP TỪ RESPONSE TRẢ VỀ CÁC TRƯỜNG MỚI NHẤT
      if (responseData['user'] != null &&
          responseData['user'] is Map<String, dynamic>) {
        setState(() {
          _loggedInUser = responseData['user'];
          // Cập nhật các biến hiển thị trên màn hình Profile này
          _avatarUrl = responseData['user']['avatarUrl'];
          _fullName =
              responseData['user']['fullName'] ??
              responseData['user']['username'] ??
              'Khách';
          _email = responseData['user']['email'] ?? '';
        });
        // Lưu dữ liệu user đã cập nhật vào prefs
        final SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_data', jsonEncode(responseData['user']));
      } else if (responseData['avatarUrl'] != null) {
        // Fallback nếu API chỉ trả về mỗi avatarUrl (ít khả năng xảy ra nếu backend đã được sửa)
        setState(() {
          _avatarUrl = responseData['avatarUrl'];
          if (_loggedInUser != null) {
            _loggedInUser!['avatarUrl'] = responseData['avatarUrl'];
            _saveUserToPrefs(_loggedInUser!);
          }
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              responseData['message'] ?? 'Tải ảnh đại diện thành công!',
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Lỗi trong quá trình tải ảnh đại diện: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi tải ảnh đại diện: ${e.toString()}')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _saveUserToPrefs(Map<String, dynamic> userData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_data', jsonEncode(userData));
  }

  Future<void> _changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    if (_userToken == null || _userToken!.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không có token xác thực. Vui lòng đăng nhập lại.'),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final responseData = await apiService.changePassword(
        currentPassword,
        newPassword,
      );

      if (!mounted) return;

      if (responseData['message'] != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(responseData['message'])));
      }
    } catch (e) {
      debugPrint('Lỗi trong quá trình đổi mật khẩu: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi đổi mật khẩu: ${e.toString()}')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _performLogout() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final responseData = await apiService.logout();

      if (!mounted) return;

      setState(() {
        _userToken = null;
        _loggedInUser = null;
        _userName = 'Khách';
        _email = '';
        _fullName = '';
        _avatarUrl = null;
      });

      if (responseData['message'] != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(responseData['message'])));
      }

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const MovieHomePage()),
        (Route<dynamic> route) => false,
      );
    } catch (e) {
      debugPrint('Lỗi trong quá trình đăng xuất: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi đăng xuất: ${e.toString()}')),
        );
      }
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const MovieHomePage()),
          (Route<dynamic> route) => false,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteAccount() async {
    if (_loggedInUser == null || _userToken == null || _userToken!.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không có tài khoản để xóa. Vui lòng đăng nhập.'),
        ),
      );
      return;
    }

    final int? userIdToDelete = _loggedInUser!['userId'];

    if (userIdToDelete == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể xác định ID người dùng để xóa.'),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final responseData = await apiService.deleteMyAccount();

      if (!mounted) return;

      if (responseData['message'] != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(responseData['message'])));
      }

      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token'); // Sử dụng 'jwt_token'
      await prefs.remove('user_data');
      apiService.token = null;

      setState(() {
        _userToken = null;
        _loggedInUser = null;
        _userName = 'Khách';
        _email = '';
        _fullName = '';
        _avatarUrl = null;
      });

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const MovieHomePage()),
        (Route<dynamic> route) => false,
      );
    } catch (e) {
      debugPrint('Lỗi trong quá trình xóa tài khoản: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi xóa tài khoản: ${e.toString()}')),
        );
      }
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const MovieHomePage()),
          (Route<dynamic> route) => false,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () {
            Navigator.pop(context, _loggedInUser);
          },
        ),
        title: const Text(
          'Thành viên Aptech',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 0),
              child: Column(
                children: [
                  Container(
                    width: screenWidth,
                    padding: const EdgeInsets.all(20.0),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade700,
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(20),
                        bottomRight: Radius.circular(20),
                      ),
                    ),
                    child: Column(
                      children: [
                        if (_loggedInUser != null)
                          Text(
                            'Chào $_fullName', // HIỂN THỊ TÊN TỪ BIẾN _fullName
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        if (_loggedInUser != null)
                          Text(
                            _email,
                            style: TextStyle(
                              color: Colors.white.withAlpha(
                                (0.8 * 255).round(),
                              ),
                              fontSize: 14,
                            ),
                          ),
                        const SizedBox(height: 10),
                        Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            CircleAvatar(
                              radius: 40,
                              backgroundColor: Colors.grey,
                              // Check for _avatarUrl before using NetworkImage
                              backgroundImage:
                                  (_avatarUrl != null && _avatarUrl!.isNotEmpty)
                                  ? NetworkImage(_avatarUrl!)
                                  : null,
                              // If _avatarUrl is null or empty, backgroundImage is null
                              child: (_avatarUrl == null || _avatarUrl!.isEmpty)
                                  ? const Icon(
                                      Icons.person,
                                      size: 50,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                            Positioned(
                              child: GestureDetector(
                                onTap: _pickAndUploadAvatar,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Color.fromRGBO(0, 0, 0, 0.54),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.camera_alt,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  _buildMenuItem(
                    context,
                    'Lịch sử giao dịch',
                    _loggedInUser != null
                        ? () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    const TransactionHistoryScreen(),
                              ),
                            );
                          }
                        : null,
                  ),
                  _buildMenuItem(
                    context,
                    'Thông tin tài khoản',
                    _loggedInUser != null
                        ? () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ProfileInfoScreen(
                                  currentUser:
                                      _loggedInUser!, // Truyền dữ liệu user hiện tại
                                ),
                              ),
                            );
                            if (result != null &&
                                result is Map<String, dynamic>) {
                              // Nếu ProfileInfoScreen trả về dữ liệu user đã cập nhật
                              setState(() {
                                _loggedInUser =
                                    result; // Cập nhật _loggedInUser
                                _fullName =
                                    result['fullName'] ??
                                    result['username'] ??
                                    'Khách'; // Cập nhật hiển thị fullName
                                _email =
                                    result['email'] ?? ''; // Cập nhật email
                                _avatarUrl =
                                    result['avatarUrl']; // Cập nhật hiển thị avatar
                                // Cập nhật thêm các biến khác nếu có: _phoneNumber, _gender, v.v.
                              });
                            }
                          }
                        : null,
                  ),
                  _buildMenuItem(
                    context,
                    'Thay đổi mật khẩu',
                    _loggedInUser != null
                        ? () {
                            _showChangePasswordDialog(context);
                          }
                        : null,
                  ),
                  _buildMenuItem(
                    context,
                    'Xóa tài khoản',
                    _loggedInUser !=
                            null // Kích hoạt dialog xóa tài khoản
                        ? () {
                            _showDeleteAccountDialog(context);
                          }
                        : null,
                  ),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _loggedInUser != null
                            ? () {
                                _showLogoutDialog(context);
                              }
                            : null,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Đăng xuất',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoColumn(String title, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(
              color: Colors.white.withAlpha((0.8 * 255).round()),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    String title,
    VoidCallback? onTap,
  ) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 20),
          title: Text(
            title,
            style: TextStyle(
              fontSize: 16,
              color: onTap != null ? Colors.black87 : Colors.grey,
            ),
          ),
          trailing: Icon(
            Icons.arrow_forward_ios,
            size: 18,
            color: onTap != null ? Colors.black54 : Colors.grey,
          ),
          onTap: onTap,
        ),
        const Divider(height: 1, indent: 20, endIndent: 20),
      ],
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Đổi mật khẩu'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: _currentPasswordController,
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu hiện tại',
                  ),
                  obscureText: true,
                ),
                TextField(
                  controller: _newPasswordController,
                  decoration: const InputDecoration(labelText: 'Mật khẩu mới'),
                  obscureText: true,
                ),
                TextField(
                  controller: _confirmNewPasswordController,
                  decoration: const InputDecoration(
                    labelText: 'Xác nhận mật khẩu mới',
                  ),
                  obscureText: true,
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
              onPressed: () {
                Navigator.of(context).pop();
                _currentPasswordController.clear();
                _newPasswordController.clear();
                _confirmNewPasswordController.clear();
              },
            ),
            TextButton(
              child: const Text(
                'Đổi mật khẩu',
                style: TextStyle(color: Colors.blue),
              ),
              onPressed: () {
                if (_newPasswordController.text !=
                    _confirmNewPasswordController.text) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Mật khẩu mới không khớp!')),
                  );
                  return;
                }
                if (_newPasswordController.text.length < 6) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Mật khẩu mới phải có ít nhất 6 ký tự.'),
                    ),
                  );
                  return;
                }
                _changePassword(
                  _currentPasswordController.text,
                  _newPasswordController.text,
                );
                Navigator.of(context).pop();
                _currentPasswordController.clear();
                _newPasswordController.clear();
                _confirmNewPasswordController.clear();
              },
            ),
          ],
        );
      },
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Xác nhận xóa tài khoản?'),
          content: const Text(
            'Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác.',
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text('Xóa', style: TextStyle(color: Colors.red)),
              onPressed: () {
                Navigator.of(context).pop(); // Đóng dialog xác nhận
                _deleteAccount(); // Gọi hàm xóa tài khoản
              },
            ),
          ],
        );
      },
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Xác nhận đăng xuất?'),
          content: const Text(
            'Bạn có muốn đăng xuất khỏi tài khoản này không?',
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: const Text(
                'Đăng xuất',
                style: TextStyle(color: Colors.red),
              ),
              onPressed: () {
                Navigator.of(context).pop();
                _performLogout();
              },
            ),
          ],
        );
      },
    );
  }
}
