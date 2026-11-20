package com.jazekmon89.rrsnapshot

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import java.util.concurrent.Executors

// Keeps running in the foreground (with a status notification, which Android requires) and
// scrapes Royal Road at the interval chosen in the app. An alarm wakes the phone for each
// run, since timers inside the app stop while the phone sleeps.
class SnapshotService : Service() {

    companion object {
        private const val ACTION_RUN = "com.jazekmon89.rrsnapshot.RUN"
        private const val CHANNEL = "status"
        private const val NOTIFICATION_ID = 1

        fun start(context: Context, runNow: Boolean = false) {
            val intent = Intent(context, SnapshotService::class.java)
            if (runNow) intent.action = ACTION_RUN
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.getSystemService(AlarmManager::class.java).cancel(alarmIntent(context))
            context.stopService(Intent(context, SnapshotService::class.java))
        }

        private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getForegroundService(
            context, 0,
            Intent(context, SnapshotService::class.java).setAction(ACTION_RUN),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()
    private var wakeLock: PowerManager.WakeLock? = null
    private var running = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "Snapshot status", NotificationManager.IMPORTANCE_LOW)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        showStatus(Store.status(this))
        // Started without a run request (app opened, phone rebooted, interval changed): only
        // run if one is due
        val nextRun = Store.nextRun(this)
        if (intent?.action == ACTION_RUN || System.currentTimeMillis() >= nextRun) run() else scheduleAt(nextRun)
        return START_STICKY
    }

    // Exact when allowed: an inexact alarm can fire up to 75% of the interval late. While the
    // phone is idle, Android still spaces these out to about one per 9 minutes.
    private fun scheduleAt(time: Long) {
        val alarms = getSystemService(AlarmManager::class.java)
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, alarmIntent(this))
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, alarmIntent(this))
        }
    }

    private fun run() {
        if (running) return
        Store.setLastRun(this, System.currentTimeMillis())
        scheduleAt(Store.nextRun(this))

        val token = Store.token(this)
        if (token.isNullOrBlank()) return report("Skipped: no GitHub token saved")
        if (!onWifi()) return report("Skipped: not on Wi-Fi")

        running = true
        wakeLock = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "rrsnapshot:run")
            .apply { acquire(5 * 60 * 1000L) }
        showStatus("Scraping Royal Road…")

        Scraper(this, Store.pageDelaySeconds(this) * 1000L) { files, errors ->
            executor.execute {
                val uploadError = if (files.isEmpty()) null else runCatching { GitHub.publish(token, files) }.exceptionOrNull()
                handler.post {
                    val total = Scraper.PAGES.size
                    val summary = when {
                        files.isEmpty() -> "0/$total pages loaded, nothing uploaded"
                        uploadError != null -> "${files.size}/$total pages loaded, upload failed: ${uploadError.message}"
                        else -> "${files.size}/$total pages uploaded"
                    }
                    report(if (errors.isEmpty()) summary else "$summary; ${errors.joinToString("; ")}")
                    running = false
                    releaseWakeLock()
                }
            }
        }.start()
    }

    private fun onWifi(): Boolean {
        val connectivity = getSystemService(ConnectivityManager::class.java)
        val capabilities = connectivity.getNetworkCapabilities(connectivity.activeNetwork)
        return capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }

    private fun report(line: String) {
        Store.addLog(this, line)
        showStatus(Store.status(this))
    }

    private fun showStatus(text: String) {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val notification = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("RR Snapshot")
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        executor.shutdownNow()
        releaseWakeLock()
        super.onDestroy()
    }
}
