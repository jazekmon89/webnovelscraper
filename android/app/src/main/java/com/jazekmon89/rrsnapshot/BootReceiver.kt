package com.jazekmon89.rrsnapshot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Restarts background runs after the phone reboots or the app is updated
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val restart = intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
        if (restart && Store.enabled(context)) SnapshotService.start(context)
    }
}
