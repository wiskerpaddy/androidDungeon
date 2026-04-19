package com.example.androiddungeon

import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import android.webkit.WebSettings
import androidx.annotation.RequiresApi
import androidx.privacysandbox.tools.core.model.Type
import android.view.WindowInsets
import android.view.WindowInsetsController

class MainActivity : AppCompatActivity() {
    @RequiresApi(Build.VERSION_CODES.R)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // WebViewの作成
        val webView = WebView(this)
        setContentView(webView)
        webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.clearCache(true)
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

        window.setDecorFitsSystemWindows(false)
        val controller = window.insetsController
        if (controller != null) {
            // ステータスバーとナビゲーションバーを隠す（没入モード）
            controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
            controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        // assets内のindex.htmlを読み込む
        webView.loadUrl("file:///android_asset/www/index.html")
    }
}