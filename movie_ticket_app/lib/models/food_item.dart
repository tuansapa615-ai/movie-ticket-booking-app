// lib/models/food_item.dart

class FoodItem {
  final int itemId;
  final String categoryName;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final bool isAvailable;

  FoodItem({
    required this.itemId,
    required this.categoryName,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.isAvailable,
  });

  factory FoodItem.fromJson(Map<String, dynamic> json) {
    return FoodItem(
      itemId: int.tryParse(json['item_id']?.toString() ?? '') ?? 0,
      categoryName: json['category_name']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: double.tryParse(json['price']?.toString() ?? '') ?? 0.0,
      imageUrl: json['image_url']?.toString() ?? '',
      isAvailable: (json['is_available'] == 1 || json['is_available'] == true),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'item_id': itemId,
      'category_name': categoryName,
      'name': name,
      'description': description,
      'price': price,
      'image_url': imageUrl,
      'is_available': isAvailable ? 1 : 0,
    };
  }
}
