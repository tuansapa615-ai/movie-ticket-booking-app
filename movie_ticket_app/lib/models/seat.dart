// lib/models/seat.dart

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

enum SeatStatus { available, booked, reserved, onHold, selected }

enum SeatType { standard, vip, couple }

class Seat {
  final int seatId;
  final int hallId;
  final String seatRow;
  final int seatNumber;
  final SeatType seatType;
  SeatStatus status;
  double? price;

  Seat({
    required this.seatId,
    required this.hallId,
    required this.seatRow,
    required this.seatNumber,
    required this.seatType,
    this.status = SeatStatus.available,
    this.price,
  });

  factory Seat.fromJson(Map<String, dynamic> json) {
    // SỬA ĐỔI CUỐI CÙNG CHO Seat.fromJson:
    // Sử dụng null-aware operator (??) và tryParse/toString() một cách an toàn nhất
    return Seat(
      // Chuyển đổi an toàn:
      // json['key'] có thể là int, double, hoặc String.
      // toString() để đảm bảo là String, sau đó int.tryParse để chuyển sang int.
      // ?? 0 để cung cấp giá trị mặc định nếu parse thất bại hoặc giá trị là null.
      seatId: int.tryParse(json['seat_id']?.toString() ?? '0') ?? 0,
      hallId: int.tryParse(json['hall_id']?.toString() ?? '0') ?? 0,
      seatRow: json['seat_row']?.toString() ?? '',
      // Nếu có thể null, dùng ?? ''
      seatNumber: int.tryParse(json['seat_number']?.toString() ?? '0') ?? 0,

      // Chắc chắn các giá trị truyền vào _getSeatTypeFromString và _getSeatStatusFromString không phải là null.
      seatType: _getSeatTypeFromString(json['seat_type']?.toString() ?? ''),
      status: _getSeatStatusFromString(json['seat_status']?.toString() ?? ''),

      price: json['price'] != null
          ? double.tryParse(json['price'].toString())
          : null,
    );
  }

  static SeatType _getSeatTypeFromString(String type) {
    switch (type.toLowerCase()) {
      case 'vip':
        return SeatType.vip;
      case 'couple':
        return SeatType.couple;
      case 'standard':
        return SeatType.standard;
      default:
        debugPrint('Unknown SeatType string: "$type". Defaulting to standard.');
        return SeatType.standard;
    }
  }

  static SeatStatus _getSeatStatusFromString(String status) {
    switch (status.toLowerCase()) {
      case 'booked':
        return SeatStatus.booked;
      case 'reserved':
        return SeatStatus.reserved;
      case 'onhold':
        return SeatStatus.onHold;
      case 'selected':
        return SeatStatus.selected;
      case 'available':
        return SeatStatus.available;
      default:
        debugPrint(
          'Unknown SeatStatus string: "$status". Defaulting to available.',
        );
        return SeatStatus.available;
    }
  }

  Seat copyWith({
    int? seatId,
    int? hallId,
    String? seatRow,
    int? seatNumber,
    SeatType? seatType,
    SeatStatus? status,
    double? price,
  }) {
    return Seat(
      seatId: seatId ?? this.seatId,
      hallId: hallId ?? this.hallId,
      seatRow: seatRow ?? this.seatRow,
      seatNumber: seatNumber ?? this.seatNumber,
      seatType: seatType ?? this.seatType,
      status: status ?? this.status,
      price: price ?? this.price,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'seat_id': seatId,
      'hall_id': hallId,
      'seat_row': seatRow,
      'seat_number': seatNumber,
      'seat_type': seatType.toString().split('.').last,
      'status': status.toString().split('.').last,
      'price': price,
    };
  }
}
