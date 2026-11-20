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
        versionCode = 1
        versionName = "0.1-test"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
