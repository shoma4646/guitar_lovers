/// コミュニティ投稿モデル
class Post {
  final String id;
  final String username;
  final String content;
  final String timestamp;
  final int likes;
  final int comments;
  final String? image;
  final bool? video;

  Post({
    required this.id,
    required this.username,
    required this.content,
    required this.timestamp,
    required this.likes,
    required this.comments,
    this.image,
    this.video,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'] as String,
      username: json['username'] as String,
      content: json['content'] as String,
      timestamp: json['timestamp'] as String,
      likes: json['likes'] as int,
      comments: json['comments'] as int,
      image: json['image'] as String?,
      video: json['video'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'content': content,
      'timestamp': timestamp,
      'likes': likes,
      'comments': comments,
      if (image != null) 'image': image,
      if (video != null) 'video': video,
    };
  }
}
