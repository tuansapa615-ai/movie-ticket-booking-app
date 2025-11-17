// lib/models/user_profile_model.dart

class UserProfile {
  final String id;
  final String fullName;
  final String username;
  final String email;
  final String? avatar; // URL ảnh đại diện, có thể null
  final double totalSpending;
  final int loyaltyPoints;
  final String memberCardNumber;
  final String memberTier; // Ví dụ: "Standard", "Silver", "Gold"
  final double nextTierThreshold; // Ngưỡng để đạt cấp độ VIP tiếp theo
  final double nextTierRemaining; // Số tiền còn lại để đạt cấp độ VIP tiếp theo
  final String role; // Vai trò của người dùng (vd: user, admin)

  UserProfile({
    required this.id,
    required this.fullName,
    required this.username,
    required this.email,
    this.avatar,
    required this.totalSpending,
    required this.loyaltyPoints,
    required this.memberCardNumber,
    required this.memberTier,
    required this.nextTierThreshold,
    required this.nextTierRemaining,
    required this.role,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    // Đảm bảo các key trùng khớp với response từ backend của bạn
    return UserProfile(
      id: json['_id'] ?? json['id'] ?? '', // Backend của bạn có thể trả về '_id' hoặc 'id'
      fullName: json['fullName'] ?? 'Người dùng',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      avatar: json['avatar'],
      totalSpending: (json['totalSpending'] as num?)?.toDouble() ?? 0.0,
      loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
      memberCardNumber: json['memberCardNumber'] ?? 'N/A',
      memberTier: json['memberTier'] ?? 'Thành viên',
      // Giả định backend trả về các trường này hoặc đặt giá trị mặc định
      nextTierThreshold: (json['nextTierThreshold'] as num?)?.toDouble() ?? 3000000.0,
      nextTierRemaining: (json['nextTierRemaining'] as num?)?.toDouble() ?? 0.0,
      role: json['role'] ?? 'user',
    );
  }

  // Phương thức copyWith giúp cập nhật một vài trường mà không cần tạo lại toàn bộ đối tượng
  UserProfile copyWith({
    String? id,
    String? fullName,
    String? username,
    String? email,
    String? avatar,
    double? totalSpending,
    int? loyaltyPoints,
    String? memberCardNumber,
    String? memberTier,
    double? nextTierThreshold,
    double? nextTierRemaining,
    String? role,
  }) {
    return UserProfile(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      username: username ?? this.username,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      totalSpending: totalSpending ?? this.totalSpending,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      memberCardNumber: memberCardNumber ?? this.memberCardNumber,
      memberTier: memberTier ?? this.memberTier,
      nextTierThreshold: nextTierThreshold ?? this.nextTierThreshold,
      nextTierRemaining: nextTierRemaining ?? this.nextTierRemaining,
      role: role ?? this.role,
    );
  }
}