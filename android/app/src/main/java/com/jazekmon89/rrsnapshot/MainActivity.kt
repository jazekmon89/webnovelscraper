package com.jazekmon89.rrsnapshot

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Settings and run log. The scraping itself happens in SnapshotService.
class MainActivity : Activity() {

    private lateinit var tokenInput: EditText
    private lateinit var tokenState: TextView
    private lateinit var batteryButton: Button
    private lateinit var toggleButton: Button
    private lateinit var nextRun: TextView
    private lateinit var log: TextView
    private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Needed to show the status notification on Android 13+
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0)
        }

        tokenState = TextView(this)
        tokenInput = EditText(this).apply {
            hint = "Paste GitHub token (github_pat_…)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        val saveToken = button("Save token") {
            val token = tokenInput.text.toString().trim()
            if (token.isEmpty()) return@button toast("Paste the token first")
            Store.setToken(this, token)
            tokenInput.text.clear()
            startRuns(runNow = true)
        }
        val runNow = button("Run now") {
            if (Store.token(this).isNullOrBlank()) return@button toast("Save a GitHub token first")
            startRuns(runNow = true)
            toast("Running… results appear below in about 2 minutes")
        }
        toggleButton = button("") {
            if (Store.enabled(this)) {
                Store.setEnabled(this, false)
                SnapshotService.stop(this)
            } else {
                startRuns(runNow = false)
            }
            refresh()
        }
        batteryButton = button("") {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }
        nextRun = TextView(this)
        // 5 minutes is the fastest useful interval: the API reads the files through
        // raw.githubusercontent.com, which caches them for 5 minutes
        val interval = setting("Run every", Store.INTERVAL_CHOICES, "min", Store.intervalMinutes(this)) {
            Store.setIntervalMinutes(this, it)
            if (Store.enabled(this)) SnapshotService.start(this)
        }
        val pageDelay = setting("Wait between pages", Store.PAGE_DELAY_CHOICES, "s", Store.pageDelaySeconds(this)) {
            Store.setPageDelaySeconds(this, it)
        }
        log = TextView(this).apply {
            typeface = Typeface.MONOSPACE
            textSize = 12f
            setTextIsSelectable(true)
        }

        setContentView(ScrollView(this).apply {
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(32, 24, 32, 24)
                addView(tokenState)
                addView(tokenInput)
                addView(saveToken)
                addView(runNow)
                addView(toggleButton)
                addView(batteryButton)
                addView(TextView(context).apply { text = "\nSettings"; setTypeface(null, Typeface.BOLD) })
                addView(interval)
                addView(pageDelay)
                addView(nextRun)
                addView(TextView(context).apply { text = "\nRecent runs (newest first):"; setTypeface(null, Typeface.BOLD) })
                addView(log)
            })
        })

        if (Store.enabled(this)) SnapshotService.start(this)
    }

    override fun onResume() {
        super.onResume()
        Store.prefs(this).registerOnSharedPreferenceChangeListener(prefsListener)
        refresh()
    }

    override fun onPause() {
        Store.prefs(this).unregisterOnSharedPreferenceChangeListener(prefsListener)
        super.onPause()
    }

    private fun startRuns(runNow: Boolean) {
        Store.setEnabled(this, true)
        SnapshotService.start(this, runNow)
    }

    private fun refresh() {
        tokenState.text = if (Store.token(this).isNullOrBlank()) "No GitHub token saved yet." else "GitHub token saved ✓ (paste a new one to replace it)"
        toggleButton.text = if (Store.enabled(this)) "Stop background runs" else "Start background runs"
        nextRun.text = when {
            !Store.enabled(this) -> "Background runs are off."
            Store.nextRun(this) <= System.currentTimeMillis() -> "Next run: now"
            else -> "Next run: around " + SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(Store.nextRun(this)))
        }
        val unrestricted = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
        batteryButton.text = if (unrestricted) "Background running allowed ✓" else "Allow running in background"
        batteryButton.isEnabled = !unrestricted
        log.text = Store.log(this).ifEmpty { "No runs yet." }
    }

    // A labelled dropdown of number choices; onPick runs when the user picks a different one
    private fun setting(label: String, choices: List<Int>, unit: String, current: Int, onPick: (Int) -> Unit): LinearLayout {
        var selected = current
        val spinner = Spinner(this).apply {
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, choices.map { "$it $unit" })
            setSelection(choices.indexOf(current).coerceAtLeast(0))
            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                    if (choices[position] == selected) return
                    selected = choices[position]
                    onPick(selected)
                }

                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
        }
        return LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            addView(TextView(context).apply { text = label }, LinearLayout.LayoutParams(0, -2, 1f))
            addView(spinner)
        }
    }

    private fun button(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        setOnClickListener { onClick() }
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
}
