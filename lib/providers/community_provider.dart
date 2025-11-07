import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/post.dart';

/// コミュニティ投稿リストのStateNotifierProvider
class CommunityNotifier extends StateNotifier<List<Post>> {
  CommunityNotifier() : super(_mockPosts);

  static final List<Post> _mockPosts = [
    Post(
      id: '1',
      username: 'GuitarMaster',
      content: '新しいギターを購入しました！',
      timestamp: '5分前',
      likes: 12,
      comments: 3,
      image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
    ),
    Post(
      id: '2',
      username: 'BluesPlayer',
      content: 'このリフの弾き方を教えてください！',
      timestamp: '15分前',
      likes: 8,
      comments: 5,
      video: true,
    ),
  ];

  /// 新規投稿を追加
  void addPost(String content) {
    final newPost = Post(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      username: 'CurrentUser',
      content: content,
      timestamp: 'たった今',
      likes: 0,
      comments: 0,
    );
    state = [newPost, ...state];
  }
}

final communityProvider =
    StateNotifierProvider<CommunityNotifier, List<Post>>((ref) {
  return CommunityNotifier();
});
