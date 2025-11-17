// D:\project-4\movie_ticket_app\lib\screens\auth\profile_info_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart'; // Để định dạng ngày tháng
import 'package:movie_ticket_app/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert'; // Để encode/decode JSON

class ProfileInfoScreen extends StatefulWidget {
  final Map<String, dynamic> currentUser; // User data passed from ProfileScreen

  const ProfileInfoScreen({super.key, required this.currentUser});

  @override
  State<ProfileInfoScreen> createState() => _ProfileInfoScreenState();
}

class _ProfileInfoScreenState extends State<ProfileInfoScreen> {
  // Controllers cho các trường chỉnh sửa được
  late TextEditingController
  _fullNameController; // Giữ lại để chỉnh sửa FullName
  late TextEditingController _phoneNumberController;
  late TextEditingController _identityCardNumberController;
  late TextEditingController _cityController;
  late TextEditingController _districtController;
  late TextEditingController _addressLineController;

  // Biến cho các Dropdown/DatePicker
  String? _selectedGender;
  DateTime? _selectedDateOfBirth;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _fullNameController = TextEditingController(
      text: widget.currentUser['fullName'] ?? '',
    ); // Khởi tạo lại
    _phoneNumberController = TextEditingController(
      text: widget.currentUser['phoneNumber'] ?? '',
    );
    _identityCardNumberController = TextEditingController(
      text: widget.currentUser['identityCardNumber']?.toString() ?? '',
    );
    _cityController = TextEditingController(
      text: widget.currentUser['city'] ?? '',
    );
    _districtController = TextEditingController(
      text: widget.currentUser['district'] ?? '',
    );
    _addressLineController = TextEditingController(
      text: widget.currentUser['addressLine'] ?? '',
    );

    // Giới tính từ DB, đảm bảo là giá trị hợp lệ cho Dropdown
    _selectedGender =
        ['Nam', 'Nữ', 'Khác'].contains(widget.currentUser['gender'])
        ? widget.currentUser['gender']
              as String? // Ép kiểu an toàn
        : null;

    // Parse ngày sinh từ chuỗi nếu có
    final dynamic rawDateOfBirth = widget.currentUser['dateOfBirth'];
    if (rawDateOfBirth != null) {
      if (rawDateOfBirth is String) {
        try {
          _selectedDateOfBirth = DateFormat('yyyy-MM-dd').parse(rawDateOfBirth);
        } catch (e) {
          debugPrint('Error parsing dateOfBirth (String): $e');
          _selectedDateOfBirth = null;
        }
      } else if (rawDateOfBirth is DateTime) {
        _selectedDateOfBirth = rawDateOfBirth;
      } else {
        debugPrint(
          'Unexpected type for dateOfBirth: ${rawDateOfBirth.runtimeType}',
        );
        _selectedDateOfBirth = null;
      }
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose(); // Phải dispose nếu có khởi tạo
    _phoneNumberController.dispose();
    _identityCardNumberController.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _addressLineController.dispose();
    super.dispose();
  }

  Future<void> _selectDateOfBirth(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      // Không cho chọn ngày trong tương lai
      builder: (BuildContext context, Widget? child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: Colors.blue.shade700,
            // Màu chủ đạo của DatePicker
            colorScheme: ColorScheme.light(primary: Colors.blue.shade700),
            // Màu scheme
            buttonTheme: const ButtonThemeData(
              textTheme: ButtonTextTheme.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDateOfBirth) {
      setState(() {
        _selectedDateOfBirth = picked;
      });
    }
  }

  Future<void> _updateProfile() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final Map<String, dynamic> updatedData =
          {}; // Khởi tạo Map rỗng để chỉ thêm các trường có giá trị

      // FullName giờ có thể chỉnh sửa
      if (_fullNameController.text.trim().isNotEmpty) {
        updatedData['fullName'] = _fullNameController.text.trim();
      } else {
        updatedData['fullName'] = null; // Gửi null nếu trường rỗng
      }

      if (_phoneNumberController.text.trim().isNotEmpty) {
        updatedData['phoneNumber'] = _phoneNumberController.text.trim();
      } else {
        updatedData['phoneNumber'] = null;
      }
      if (_identityCardNumberController.text.trim().isNotEmpty) {
        updatedData['identityCardNumber'] = _identityCardNumberController.text
            .trim();
      } else {
        updatedData['identityCardNumber'] = null;
      }
      if (_cityController.text.trim().isNotEmpty) {
        updatedData['city'] = _cityController.text.trim();
      } else {
        updatedData['city'] = null;
      }
      if (_districtController.text.trim().isNotEmpty) {
        updatedData['district'] = _districtController.text.trim();
      } else {
        updatedData['district'] = null;
      }
      if (_addressLineController.text.trim().isNotEmpty) {
        updatedData['addressLine'] = _addressLineController.text.trim();
      } else {
        updatedData['addressLine'] = null;
      }

      updatedData['gender'] = _selectedGender; // Gửi null nếu không chọn gì
      // Định dạng ngày sinh thành 'YYYY-MM-DD' hoặc null
      updatedData['dateOfBirth'] = _selectedDateOfBirth != null
          ? DateFormat('yyyy-MM-dd').format(_selectedDateOfBirth!)
          : null;

      final response = await apiService.updateProfile(updatedData);

      if (!mounted) return;

      if (response['message'] != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(response['message'])));
      }

      // Cập nhật SharedPreferences với dữ liệu user mới nhất từ response
      if (response['user'] != null &&
          response['user'] is Map<String, dynamic>) {
        final SharedPreferences prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_data', jsonEncode(response['user']));

        Navigator.pop(
          context,
          response['user'],
        ); // Trả về user đã cập nhật cho ProfileScreen
      } else {
        // Nếu không có user object được trả về, pop với currentUser cũ
        Navigator.pop(context, widget.currentUser);
      }
    } catch (e) {
      debugPrint('Error updating profile: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi cập nhật thông tin: ${e.toString()}')),
      );
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
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () {
            Navigator.pop(
              context,
              widget.currentUser,
            ); // Trả về user hiện tại nếu không update
          },
        ),
        title: const Text(
          'Thông tin tài khoản',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle('THÔNG TIN CƠ BẢN'),
                  // EMAIL: HIỂN THỊ DƯỚI DẠNG TEXT (KHÔNG CHỈNH SỬA, KHÔNG BORDER)
                  _buildNonEditableText(
                    label: 'EMAIL',
                    value: widget.currentUser['email'] ?? 'N/A',
                    icon: Icons.email,
                  ),
                  // Tên: SỬ DỤNG _buildEditableTextField ĐỂ CÓ THỂ CHỈNH SỬA (như trước khi bạn yêu cầu readOnly)
                  _buildEditableTextField(
                    controller: _fullNameController,
                    label: 'Tên',
                    icon: Icons.person,
                  ),
                  _buildGenderDropdown(),
                  _buildDatePickerField(context),
                  const SizedBox(height: 20),
                  _buildSectionTitle('THÔNG TIN LIÊN HỆ'),
                  _buildEditableTextField(
                    controller: _identityCardNumberController,
                    label: 'CMND/Hộ chiếu',
                    icon: Icons.credit_card,
                    keyboardType: TextInputType.number,
                  ),
                  _buildEditableTextField(
                    controller: _phoneNumberController,
                    label: 'Điện thoại',
                    icon: Icons.phone,
                    keyboardType: TextInputType.phone,
                  ),
                  _buildEditableTextField(
                    controller: _cityController,
                    label: 'Tỉnh/Thành phố',
                    icon: Icons.location_city,
                  ),
                  _buildEditableTextField(
                    controller: _districtController,
                    label: 'Quận/Huyện',
                    icon: Icons.location_on,
                  ),
                  _buildEditableTextField(
                    controller: _addressLineController,
                    label: 'Địa chỉ liên hệ',
                    icon: Icons.home,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _updateProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'CẬP NHẬT',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: Colors.blue.shade700,
        ),
      ),
    );
  }

  // HÀM MỚI: Chỉ hiển thị thông tin cố định (như Email, Tên) - KHÔNG CÓ BORDER
  Widget _buildNonEditableText({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Container(
        // Không dùng TextField, dùng Row với Text
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey[100], // Nền xám
          borderRadius: BorderRadius.circular(8),
          // Không có border ở đây
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.grey[600]),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                  ),
                  Text(
                    value,
                    style: const TextStyle(fontSize: 16, color: Colors.black),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEditableTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool readOnly = false, // Mặc định là false cho TextField chỉnh sửa được
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: TextField(
        controller: controller,
        readOnly: readOnly,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: Colors.grey[600]),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.shade400),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.shade400),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.blue.shade700, width: 2),
          ),
          filled: readOnly,
          // Nền xám nếu readOnly
          fillColor: readOnly ? Colors.grey[100] : Colors.white,
        ),
      ),
    );
  }

  Widget _buildGenderDropdown() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: DropdownButtonFormField<String>(
        value: _selectedGender,
        decoration: InputDecoration(
          labelText: 'Giới tính',
          prefixIcon: Icon(Icons.person_outline, color: Colors.grey[600]),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.shade400),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.shade400),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.blue.shade700, width: 2),
          ),
        ),
        hint: const Text('Chọn giới tính'),
        items: ['Nam', 'Nữ', 'Khác'].map((String gender) {
          return DropdownMenuItem<String>(value: gender, child: Text(gender));
        }).toList(),
        onChanged: (String? newValue) {
          setState(() {
            _selectedGender = newValue;
          });
        },
      ),
    );
  }

  Widget _buildDatePickerField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: GestureDetector(
        onTap: () => _selectDateOfBirth(context),
        child: AbsorbPointer(
          child: TextField(
            controller: TextEditingController(
              text: _selectedDateOfBirth == null
                  ? ''
                  : DateFormat('dd/MM/yyyy').format(_selectedDateOfBirth!),
            ),
            decoration: InputDecoration(
              labelText: 'Ngày/tháng/năm sinh',
              prefixIcon: Icon(Icons.calendar_today, color: Colors.grey[600]),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey.shade400),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey.shade400),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.blue.shade700, width: 2),
              ),
            ),
            readOnly: true, // Chỉ đọc
          ),
        ),
      ),
    );
  }
}
