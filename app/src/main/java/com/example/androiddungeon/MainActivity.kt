package com.example.androiddungeon

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import android.webkit.WebSettings

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // WebViewの作成
        val webView = WebView(this)
        setContentView(webView)

        // WebViewの設定
        webView.settings.apply {
            javaScriptEnabled = true      // JavaScriptを有効にする
            allowFileAccess = true        // ローカルファイルへのアクセスを許可
            domStorageEnabled = true      // ローカルストレージ（保存機能など）を有効化
            // --- ここから追加 ---
            // ローカルファイルからの fetch を許可する設定
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            // --- ここまで追加 ---
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // リンクをタップした時にブラウザに飛ばないようにする
        webView.webViewClient = WebViewClient()

        // assets内のindex.htmlを読み込む
        webView.loadUrl("file:///android_asset/www/index.html")    }
}