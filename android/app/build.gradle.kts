plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.jazekmon89.rrsnapshot"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jazekmon89.rrsnapshot"
        minSdk = 26
        targetSdk = 35
        // CI passes the run number, so each build installs as an update
        versionCode = (findProperty("versionCode") as String?)?.toInt() ?: 1
        versionName = "1.$versionCode"
    }

    // A fixed key (instead of each machine's own debug key) so new builds install over
    // the old one and keep the saved token. It only signs this personal sideloaded app.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
