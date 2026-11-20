package com.jazekmon89.rrsnapshot

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray

// Test app: checks whether Royal Road's Cloudflare challenge lets this phone through.
// It loads the snapshot pages in a visible WebView and reports, for each page, whether
// the novel list appeared or the page stayed on "Just a moment...".
class MainActivity : Activity() {

    private val pages = listOf(
        "latest 1" to "/fictions/latest-updates?page=1",
        "latest 2" to "/fictions/latest-updates?page=2",
        "latest 3" to "/fictions/latest-updates?page=3",
        "popular 1" to "/fictions/best-rated?page=1",
        "trending 1" to "/fictions/trending?page=1",
        "weekly 1" to "/fictions/weekly-popular?page=1"
    )

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var webView: WebView
    private lateinit var log: TextView
    private lateinit var buttons: List<Button>
    private var queue = listOf<Pair<String, String>>()
    private var startedAt = 0L

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
        }
        log = TextView(this).apply { setPadding(24, 16, 24, 16) }

        val testOne = Button(this).apply {
            text = "Test 1 page"
            setOnClickListener { start(pages.take(1)) }
        }
        val testAll = Button(this).apply {
            text = "Test all 6 pages"
            setOnClickListener { start(pages) }
        }
        buttons = listOf(testOne, testAll)

        val buttonRow = LinearLayout(this).apply {
            addView(testOne, LinearLayout.LayoutParams(0, -2, 1f))
            addView(testAll, LinearLayout.LayoutParams(0, -2, 1f))
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(buttonRow)
            addView(ScrollView(context).apply { addView(log) }, LinearLayout.LayoutParams(-1, 0, 1f))
            addView(webView, LinearLayout.LayoutParams(-1, 0, 1.4f))
        })

        log.text = "Tap a button to test.\n"
    }

    private fun start(selected: List<Pair<String, String>>) {
        buttons.forEach { it.isEnabled = false }
        // Start like a fresh visitor, so a cookie from an earlier test can't skew the result
        CookieManager.getInstance().removeAllCookies(null)
        WebStorage.getInstance().deleteAllData()
        webView.clearCache(true)
        log.text = ""
        queue = selected
        next()
    }

    private fun next() {
        val (name, path) = queue.firstOrNull() ?: return done()
        queue = queue.drop(1)
        append("$name: loading…")
        startedAt = System.currentTimeMillis()
        webView.loadUrl("https://www.royalroad.com$path")
        handler.postDelayed({ check(name) }, 2000)
    }

    private fun check(name: String) {
        val js = "[document.title, document.querySelectorAll('.fiction-list-item').length]"
        webView.evaluateJavascript(js) { result ->
            val values = runCatching { JSONArray(result) }.getOrNull()
            val title = values?.optString(0) ?: "?"
            val count = values?.optInt(1) ?: 0
            val seconds = (System.currentTimeMillis() - startedAt) / 1000
            when {
                count > 0 -> {
                    append("$name: OK, $count novels (${seconds}s)")
                    afterPage()
                }
                seconds >= 60 -> {
                    append("$name: BLOCKED, page title \"$title\"")
                    afterPage()
                }
                else -> handler.postDelayed({ check(name) }, 2000)
            }
        }
    }

    // Wait between pages, like the GitHub scraper, so the test matches real use
    private fun afterPage() {
        if (queue.isEmpty()) return done()
        append("waiting 15s…")
        handler.postDelayed({ next() }, 15000)
    }

    private fun done() {
        append("Done.")
        buttons.forEach { it.isEnabled = true }
    }

    private fun append(line: String) {
        log.append("$line\n")
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        webView.destroy()
        super.onDestroy()
    }
}
