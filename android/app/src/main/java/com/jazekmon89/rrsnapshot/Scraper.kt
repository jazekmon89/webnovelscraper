package com.jazekmon89.rrsnapshot

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import org.json.JSONTokener
import java.time.Instant

// Loads the Royal Road list pages one at a time in an off-screen WebView (a real browser
// engine, which Cloudflare lets through from the phone) and parses each one into the same
// JSON that scripts/snapshot-royalroad.js writes. Must be used on the main thread.
@SuppressLint("SetJavaScriptEnabled")
class Scraper(context: Context, private val onDone: (files: Map<String, String>, errors: List<String>) -> Unit) {

    class Page(val name: String, val file: String, val path: String, val withChapters: Boolean = false)

    companion object {
        private const val BASE_URL = "https://www.royalroad.com"
        private const val PAGE_TIMEOUT_MS = 60_000L
        private const val PAGE_DELAY_MS = 15_000L

        // Keep in sync with SNAPSHOT_LISTS in src/novels/scrapper/royalroadScrapper.js
        val PAGES = listOf(
            Page("latest 1", "latest-1.json", "/fictions/latest-updates?page=1", withChapters = true),
            Page("latest 2", "latest-2.json", "/fictions/latest-updates?page=2", withChapters = true),
            Page("latest 3", "latest-3.json", "/fictions/latest-updates?page=3", withChapters = true),
            Page("popular 1", "popular-1.json", "/fictions/best-rated?page=1"),
            Page("trending 1", "trending-1.json", "/fictions/trending?page=1"),
            Page("weekly 1", "weekly-1.json", "/fictions/weekly-popular?page=1")
        )

        // Same fields as parseNovelList in royalroadScrapper.js. Returns the novels as null
        // until the list has loaded (e.g. while Cloudflare's "Just a moment..." page shows).
        private const val PARSE_SCRIPT = """
            (function (withChapters) {
              var items = document.querySelectorAll('.fiction-list-item');
              if (document.readyState === 'loading' || items.length === 0) {
                return JSON.stringify({ title: document.title, novels: null });
              }
              var base = 'https://www.royalroad.com';
              var text = function (el) { return el ? el.textContent.trim() : ''; };
              var novels = [];
              items.forEach(function (el) {
                var link = el.querySelector('.fiction-title a');
                var title = text(link);
                var href = link && link.getAttribute('href');
                if (!title || !href) return;
                var idPart = href.split('/fiction/')[1];
                var img = el.querySelector('img');
                var novel = {
                  id: idPart ? idPart.split('/')[0] : undefined,
                  title: title,
                  url: base + href,
                  cover: (img && img.getAttribute('src')) || '',
                  tags: Array.prototype.map.call(el.querySelectorAll('.tags a'), text)
                };
                if (withChapters) {
                  novel.latestChapters = [];
                  el.querySelectorAll('ul.list-unstyled li.list-item a').forEach(function (chap) {
                    var chapterTitle = text(chap.querySelector('span.col-xs-8'));
                    if (chapterTitle) {
                      novel.latestChapters.push({
                        title: chapterTitle,
                        url: base + chap.getAttribute('href'),
                        timeAgo: text(chap.querySelector('time')) + ' ago'
                      });
                    }
                  });
                }
                novels.push(novel);
              });
              return JSON.stringify({ title: document.title, novels: novels });
            })
        """
    }

    private val handler = Handler(Looper.getMainLooper())
    private val webView = WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        // Covers are saved as URLs, so skipping the images only saves data
        settings.blockNetworkImage = true
        webViewClient = WebViewClient()
        layout(0, 0, 1080, 1920)
    }
    private var queue = PAGES
    private val files = linkedMapOf<String, String>()
    private val errors = mutableListOf<String>()
    private var startedAt = 0L

    fun start() = next()

    private fun next() {
        val page = queue.firstOrNull() ?: return done()
        queue = queue.drop(1)
        startedAt = SystemClock.elapsedRealtime()
        webView.loadUrl(BASE_URL + page.path)
        handler.postDelayed({ check(page) }, 2000)
    }

    private fun check(page: Page) {
        webView.evaluateJavascript("$PARSE_SCRIPT(${page.withChapters})") { result ->
            val json = runCatching { JSONObject(JSONTokener(result).nextValue() as String) }.getOrNull()
            val novels = json?.optJSONArray("novels")
            when {
                novels != null && novels.length() > 0 -> {
                    files[page.file] = JSONObject()
                        .put("updatedAt", Instant.now().toString())
                        .put("data", novels)
                        .toString()
                    afterPage()
                }
                SystemClock.elapsedRealtime() - startedAt >= PAGE_TIMEOUT_MS -> {
                    errors += "${page.name} blocked (\"${json?.optString("title") ?: "?"}\")"
                    afterPage()
                }
                else -> handler.postDelayed({ check(page) }, 2000)
            }
        }
    }

    private fun afterPage() {
        if (queue.isEmpty()) return done()
        handler.postDelayed({ next() }, PAGE_DELAY_MS)
    }

    private fun done() {
        webView.destroy()
        onDone(files, errors)
    }
}
