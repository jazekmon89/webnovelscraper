package com.jazekmon89.rrsnapshot

import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

// Uploads snapshot files to the repo's "data" branch, which the API reads. Blocking: call
// it off the main thread.
object GitHub {
    private const val REPO_API = "https://api.github.com/repos/jazekmon89/webnovelscraper"

    // Replaces the branch with one parentless commit, as the GitHub workflow does, so its
    // history doesn't grow. Files that aren't uploaded keep their current content.
    fun publish(token: String, files: Map<String, String>) {
        val head = request(token, "GET", "/git/ref/heads/data").getJSONObject("object").getString("sha")
        val baseTree = request(token, "GET", "/git/commits/$head").getJSONObject("tree").getString("sha")

        val entries = JSONArray()
        for ((name, content) in files) {
            entries.put(
                JSONObject()
                    .put("path", "royalroad/$name")
                    .put("mode", "100644")
                    .put("type", "blob")
                    .put("content", content)
            )
        }
        val tree = request(token, "POST", "/git/trees", JSONObject().put("base_tree", baseTree).put("tree", entries))
        val commit = request(
            token, "POST", "/git/commits",
            JSONObject()
                .put("message", "Royal Road snapshot ${Instant.now()} (phone)")
                .put("tree", tree.getString("sha"))
                .put("parents", JSONArray())
        )
        request(token, "PATCH", "/git/refs/heads/data", JSONObject().put("sha", commit.getString("sha")).put("force", true))
    }

    private fun request(token: String, method: String, path: String, body: JSONObject? = null): JSONObject {
        val connection = URL(REPO_API + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 20_000
            connection.readTimeout = 30_000
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("Accept", "application/vnd.github+json")
            connection.setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toString().toByteArray()) }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            if (status == 401) throw IOException("GitHub rejected the token (expired or mistyped?)")
            if (status !in 200..299) {
                val message = runCatching { JSONObject(text).optString("message") }.getOrDefault("")
                throw IOException("GitHub $method $path: HTTP $status $message")
            }
            return JSONObject(text)
        } finally {
            connection.disconnect()
        }
    }
}
