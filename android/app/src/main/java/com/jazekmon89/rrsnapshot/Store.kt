package com.jazekmon89.rrsnapshot

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// The app's saved settings and run log
object Store {
    private const val MAX_LOG_LINES = 50

    fun prefs(context: Context): SharedPreferences = context.getSharedPreferences("rr", Context.MODE_PRIVATE)

    fun token(context: Context): String? = prefs(context).getString("token", null)
    fun setToken(context: Context, token: String) = prefs(context).edit().putString("token", token).apply()

    // Whether background runs are on (so they restart after a reboot or app update)
    fun enabled(context: Context) = prefs(context).getBoolean("enabled", false)
    fun setEnabled(context: Context, enabled: Boolean) = prefs(context).edit().putBoolean("enabled", enabled).apply()

    fun lastRun(context: Context) = prefs(context).getLong("lastRun", 0)
    fun setLastRun(context: Context, time: Long) = prefs(context).edit().putLong("lastRun", time).apply()

    // Newest line first
    fun log(context: Context): String = prefs(context).getString("log", "") ?: ""

    fun addLog(context: Context, line: String) {
        val stamp = SimpleDateFormat("MMM d HH:mm", Locale.US).format(Date())
        val lines = listOf("$stamp  $line") + log(context).lines().filter { it.isNotEmpty() }
        prefs(context).edit().putString("log", lines.take(MAX_LOG_LINES).joinToString("\n")).apply()
    }

    fun status(context: Context) = log(context).lineSequence().firstOrNull { it.isNotEmpty() } ?: "Waiting for the first run"
}
