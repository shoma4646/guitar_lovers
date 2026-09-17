# リリースチェックリスト

Guitar Loversをストア公開するための作業一覧。上から順に進める。

## (a) アカウント・費用

- [ ] Apple Developer Program（99USD/年）に登録済みか確認する
- [ ] Google Play Console（25USD、一回払い）に登録済みか確認する
- [ ] Google Playの開発者アカウントが**個人アカウント**の場合、アカウント作成日を確認する
  - [ ] 2023年11月13日以降に作成されたアカウントは、本番公開前に**12名以上のテスターによる14日間以上のクローズドテスト**が必須（Google Playの新規開発者向けポリシー）。該当する場合は先にクローズドテストのトラックを作成し、テスターを確保する

## (b) 公開URL

- [ ] `docs/privacy-policy.md` をHTML化し、gh-pagesブランチの`privacy.html`として配置する
- [ ] `docs/support.md` をHTML化し、gh-pagesブランチの`support.html`として配置する
- [ ] `src/shared/constants/links.ts` の `PRIVACY_POLICY_URL` / `SUPPORT_URL` が実際に公開されたURLと一致しているか確認する
- [ ] `docs/privacy-policy.md` / `docs/support.md` 内の `REPLACE_WITH_CONTACT_EMAIL` を実際の問い合わせ先メールアドレスへ差し替える（アプリ内の問い合わせ導線はサポートページ経由）

## (c) EAS

- [ ] `eas init` を実行し、EASプロジェクトを紐付ける
- [ ] `eas.json` の `submit.production.ios.ascAppId` を、App Store ConnectのアプリIDへ差し替える（`REPLACE_WITH_APP_STORE_CONNECT_APP_ID`）
- [ ] `eas build --profile preview --platform ios` を実行し、内部配布ビルドで動作確認する
- [ ] 本番ビルド（`eas build --profile production --platform ios` / `--platform android`）を実行する
- [ ] expo-notificationsのconfig pluginが`aps-environment`を追加するため、App IDでPush Notificationsのcapabilityが有効か確認する（EAS Buildは自動同期、ローカルのXcode署名では手動で有効化）
- [ ] Androidの通知用小アイコン（96x96の白い透過PNG）を用意し、`app.json`の`expo-notifications`プラグインの`icon`に設定する

## (d) App Store Connect

- [ ] スクリーンショットを用意する（6.9インチ: 1290x2796 等、必要なサイズをApp Store Connectの要求に合わせて用意）
- [ ] アプリアイコン（1024px、透過なし）を用意する
- [ ] 年齢レーティングを新体系で設定する（本アプリはYouTube動画を埋め込むため「無制限Webアクセス」相当の回答が必要）
- [ ] App Privacy（プライバシー情報）で「データを収集していません」を選択する
- [ ] 輸出コンプライアンス（Export Compliance）が設定済みであることを確認する（`app.json`の`ITSAppUsesNonExemptEncryption: false`と整合させる）
- [ ] アプリ名・サブタイトルに「YouTube」を含めない（YouTubeブランドガイドライン抵触回避）

## (e) App Review Notes（審査担当者への説明・そのまま貼付可）

### 日本語

```
本アプリはYouTube公式のIFrame Player APIのみを使用し、公開された再生制御メソッド
（playVideo / pauseVideo / seekTo による区間再生、setPlaybackRate による再生速度変更、
getCurrentTime / getDuration による再生位置の取得）だけを呼び出しています。動画のダウンロードや
バックグラウンド再生は行わず、プレイヤーの標準コントロール・ブランディングも
改変していません。

フレーズ作成の手順:
1. Practiceタブでサンプル動画を読み込み、再生を試す
2. A/B区間とBPMを設定してABループを確認する
3. 「フレーズとして保存」をタップして練習メニューに登録する
```

### English

```
This app uses only the official YouTube IFrame Player API and calls only its
documented playback methods: playVideo, pauseVideo, seekTo (for A/B loop
playback), setPlaybackRate (for playback speed control), and getCurrentTime /
getDuration (to read the playback position).
It does not download videos or play audio in the background, and it does not
modify the player's standard controls or branding.

Steps to create a practice phrase:
1. On the Practice tab, load a sample video and try playback
2. Set the A/B loop points and target BPM to verify the loop
3. Tap "Save as phrase" to add it to the practice menu
```

## (f) Google Play

- [ ] アイコン（512px）を用意する
- [ ] フィーチャーグラフィック（1024x500）を用意する
- [ ] Data safety（データセーフティ）フォームで「収集なし」を選択する
- [ ] IARC（国際年齢レーティング連合）のコンテンツレーティング調査に回答する
- [ ] `targetSdkVersion`がExpo SDK 54既定値（36）を満たしているか確認する

## (g) 提出前の最終確認

- [ ] 注意: 旧ビルドへ戻すとフレーズの初期BPM・卒業日・回数が失われる（`SCHEMA_VERSION`据え置きのため）
- [ ] `mise exec -- npx tsc --noEmit` が通ることを確認する
- [ ] `mise exec -- npx expo lint` が通ることを確認する
- [ ] テストスイートが通ることを確認する
- [ ] 実機でチューナー機能（マイクによるピッチ検出）を確認する
- [ ] 実機でメトロノーム機能を確認する
- [ ] 機内モードなどネットワーク切断時に、動画読み込み失敗が適切にエラー表示されることを確認する
