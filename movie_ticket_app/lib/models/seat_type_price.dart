// lib/models/seat_type_price.dart
class SeatTypePrice {
  final int seatTypePriceId;
  final String seatType; // 'standard', 'vip', 'couple'
  final double price;

  SeatTypePrice({
    required this.seatTypePriceId,
    required this.seatType,
    required this.price,
  });

  factory SeatTypePrice.fromJson(Map<String, dynamic> json) {
    return SeatTypePrice(
      seatTypePriceId: json['seat_type_price_id'] as int,
      seatType: json['seat_type'] as String,
      price: double.parse(json['price'].toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'seat_type_price_id': seatTypePriceId,
      'seat_type': seatType,
      'price': price,
    };
  }
}
