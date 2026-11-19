/** 動画一覧のカードに出す YouTube サムネ（mqdefault, 320×180）の URL を返す */
export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
