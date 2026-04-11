# Web-to-Android Game Porting Guide & Wrapper

この記事は、HTML5/JavaScriptで作成されたWebゲームを、Androidのネイティブアプリとして動作させるための軽量なWebViewラッパー（コンテナ）です。

「ブラウザで動くものを、そのままスマホアプリ化する」ための最小構成と設定を提供します。

## コンセプト：なぜWebViewで移植するのか？
- **ワンソース・マルチプラットフォーム:** すでにWeb版があるゲームのロジックを一切書き換える必要がありません。
- **オフライン動作:** `assets` フォルダ内にファイルを同梱することで、ネット環境なしでプレイ可能です。
- **ネイティブ機能の拡張:** 必要に応じて、JavaScriptインターフェースを介してAndroid独自の機能（振動、通知、ローカル保存など）を呼び出せます。

## 実装のポイント（方針）

### 1. プロジェクト構造
Webゲームの全資産（HTML, JS, CSS, 音源, 画像）を以下のディレクトリに配置します。
`app/src/main/assets/`

### 2. WebViewの最適化
ゲームを快適に動かすため、`MainActivity.kt` で以下の設定を行っています。
- **JavaScriptの有効化:** `settings.javaScriptEnabled = true`
- **ローカルファイルアクセスの許可:** `allowFileAccess = true`
- **DOM Storageの有効化:** `domStorageEnabled = true` (ゲームのセーブデータ保持用)
- **ハードウェア加速:** ネイティブに近い描画速度を確保。

### 3. パス指定の注意
Android上では、assetsフォルダへのアクセスは以下の特殊なURLを使用します。
`file:///android_asset/index.html`

## 具体例-ShadowRogueDungeonの場合
本プロジェクトでは、サンプルとして **"ShadowRogueDungeon"** という以前紹介したローカルローグライクゲームを同梱しています。

- **コア技術:** HTML5 + Tone.js (オーディオ)
- **移植作業:** 1. Web版のファイルを `assets` フォルダへコピー。
    2. Androidの `WebView` で `index.html` をロード。
    3. フルスクリーン設定と、画面回転の固定を `AndroidManifest.xml` で定義。

## 自分のゲームを移植する方法
1. 本リポジトリをクローンします。
2. `app/src/main/assets/` 内のファイルを、自分のWebゲームのファイルと入れ替えます。
3. Android Studio でビルドし、実機で確認します。

## ライセンス
MIT License