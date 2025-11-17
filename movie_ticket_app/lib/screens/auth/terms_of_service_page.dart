// lib/screens/auth/terms_of_service_page.dart

import 'package:flutter/material.dart';

class TermsOfServicePage extends StatelessWidget {
  const TermsOfServicePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.blue.shade700,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'Điều khoản dịch vụ',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Chào mừng bạn đến với Aptech Cinemas!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text(
              'Vui lòng đọc kỹ các Điều khoản dịch vụ dưới đây trước khi sử dụng ứng dụng và các dịch vụ của chúng tôi.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 24),
            Text(
              '1. Chấp nhận Điều khoản',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Bằng cách truy cập hoặc sử dụng ứng dụng Aptech Cinemas, bạn đồng ý bị ràng buộc bởi các điều khoản và điều kiện này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng ứng dụng.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              '2. Thay đổi Điều khoản',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Aptech Cinemas có quyền sửa đổi hoặc thay đổi các điều khoản này bất cứ lúc nào. Mọi thay đổi sẽ có hiệu lực ngay khi được đăng tải. Việc bạn tiếp tục sử dụng ứng dụng sau khi có bất kỳ thay đổi nào đồng nghĩa với việc bạn chấp nhận các điều khoản đã sửa đổi.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              '3. Quyền riêng tư',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Chính sách quyền riêng tư của chúng tôi mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn. Bằng cách sử dụng ứng dụng, bạn đồng ý với việc thu thập và sử dụng thông tin của mình theo Chính sách quyền riêng tư của chúng tôi.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              '4. Đặt vé và Thanh toán',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Tất cả các giao dịch đặt vé và thanh toán thông qua ứng dụng đều là cuối cùng. Chúng tôi không chấp nhận hoàn tiền hoặc đổi vé đã thanh toán thành công, trừ trường hợp đặc biệt được quy định bởi chính sách của rạp.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 16),
            Text(
              '5. Giới hạn trách nhiệm',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Aptech Cinemas sẽ không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên, đặc biệt hoặc do hậu quả nào phát sinh từ việc sử dụng hoặc không thể sử dụng ứng dụng của chúng tôi.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 24),
            Text(
              'Cảm ơn bạn đã sử dụng Aptech Cinemas!',
              style: TextStyle(fontSize: 16, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ),
    );
  }
}
