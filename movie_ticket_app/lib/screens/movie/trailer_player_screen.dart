// lib/screens/movie/trailer_player_screen.dart
import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart'; // Import YouTube player
import 'package:flutter/services.dart'; // Để quản lý chế độ màn hình

class TrailerPlayerScreen extends StatefulWidget {
  final String videoUrl;

  const TrailerPlayerScreen({super.key, required this.videoUrl});

  @override
  State<TrailerPlayerScreen> createState() => _TrailerPlayerScreenState();
}

class _TrailerPlayerScreenState extends State<TrailerPlayerScreen> {
  YoutubePlayerController? _youtubeController;
  String? _youtubeVideoId;
  bool _isValidYoutubeLink = false;

  @override
  void initState() {
    super.initState();
    _youtubeVideoId = YoutubePlayer.convertUrlToId(
      widget.videoUrl,
    ); // Sửa lỗi đánh máy 'convertUrlUrlToId'

    if (_youtubeVideoId != null) {
      _isValidYoutubeLink = true;
      _youtubeController = YoutubePlayerController(
        initialVideoId: _youtubeVideoId!,
        flags: const YoutubePlayerFlags(
          autoPlay: true,
          mute: true,
          disableDragSeek: false,
          loop: false,
          isLive: false,
          enableCaption: true,

          showLiveFullscreenButton: true,
        ),
      );

      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      _isValidYoutubeLink = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'URL trailer không phải là link YouTube hợp lệ: ${widget.videoUrl}',
              ),
            ),
          );
          Navigator.pop(
            context,
          ); // Quay lại màn hình trước nếu URL không hợp lệ
        }
      });
    }
  }

  @override
  void dispose() {
    _youtubeController?.dispose();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Center(
            child: _isValidYoutubeLink && _youtubeController != null
                ? YoutubePlayer(
                    controller: _youtubeController!,
                    showVideoProgressIndicator: true,
                    progressIndicatorColor: Colors.red,
                    topActions: [],
                    bottomActions: [],
                  )
                : const CircularProgressIndicator(
                    color: Colors.white,
                  ), // Hiển thị vòng tròn chờ
          ),

          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 10,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 30.0),
              onPressed: () {
                Navigator.pop(context);
              },
            ),
          ),
        ],
      ),
    );
  }
}
