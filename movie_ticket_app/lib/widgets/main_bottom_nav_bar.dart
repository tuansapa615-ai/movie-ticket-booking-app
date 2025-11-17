// // lib/widgets/main_bottom_nav_bar.dart
// import 'package:flutter/material.dart';
//
// class MainBottomNavBar extends StatelessWidget {
//   final int currentIndex;
//   final Function(int) onTap;
//
//   const MainBottomNavBar({
//     super.key,
//     required this.currentIndex,
//     required this.onTap,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return BottomNavigationBar(
//       currentIndex: currentIndex,
//       onTap: onTap,
//       selectedItemColor: Colors.red,
//       unselectedItemColor: Colors.grey,
//       items: const [
//         BottomNavigationBarItem(icon: Icon(Icons.movie), label: 'Theo phim'),
//         BottomNavigationBarItem(icon: Icon(Icons.theaters), label: 'Theo rạp'),
//         BottomNavigationBarItem(icon: Icon(Icons.grid_on), label: 'Khác'),
//       ],
//     );
//   }
// }
