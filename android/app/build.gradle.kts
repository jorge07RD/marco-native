import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

// Firma de release. El keystore y sus contraseñas viven FUERA del repo, en un
// keystore.properties con storeFile, storePassword, keyAlias y keyPassword.
// Se busca en MARCO_KEYSTORE_PROPERTIES o, si no, en
// ~/.config/marco-native/keystore.properties. Sin ese archivo el APK de
// release sale sin firmar (el debug no cambia).
val keystoreProps: Properties? =
    (System.getenv("MARCO_KEYSTORE_PROPERTIES")
        ?: "${System.getProperty("user.home")}/.config/marco-native/keystore.properties")
        .let { file(it) }
        .takeIf { it.isFile }
        ?.let { f -> Properties().apply { f.inputStream().use { load(it) } } }

configurations.all {
    resolutionStrategy {
        // com.tiktok.sparkling:sparkling:2.0.1 trae Lynx 3.6.0, que no soporta <svg>
        // (introducido en 3.7.0). Forzamos el core y sus módulos a 3.7.0.
        force(
            "org.lynxsdk.lynx:lynx:3.7.0",
            "org.lynxsdk.lynx:lynx-base:3.7.0",
            "org.lynxsdk.lynx:service-api:3.7.0",
            "org.lynxsdk.lynx:primjs:3.7.0",
            "org.lynxsdk.lynx:lynx-jssdk:3.7.0",
            "org.lynxsdk.lynx:lynx-trace:3.7.0",
            "org.lynxsdk.lynx:lynx-devtool:3.7.0",
            "org.lynxsdk.lynx:lynx-service-image:3.7.0",
            "org.lynxsdk.lynx:lynx-service-log:3.7.0",
            "org.lynxsdk.lynx:lynx-service-http:3.7.0",
            "org.lynxsdk.lynx:lynx-service-devtool:3.7.0",
        )
    }
}

android {
    namespace = "com.example.sparkling.go"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.sparkling.go"
        minSdk = 24
        targetSdk = 34
        versionCode = 17
        versionName = "1.16"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk {
            abiFilters.addAll(listOf("armeabi-v7a", "arm64-v8a"))
        }
        if (keystoreProps != null) {
            signingConfigs.create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
        buildTypes {
            release {
                if (keystoreProps != null) signingConfig = signingConfigs.getByName("release")
                isMinifyEnabled = false
                proguardFiles(
                    getDefaultProguardFile("proguard-android-optimize.txt"),
                    "proguard-rules.pro",
                )
            }
        }

        compileOptions {
            sourceCompatibility = JavaVersion.VERSION_11
            targetCompatibility = JavaVersion.VERSION_11
        }
        kotlinOptions {
            jvmTarget = "11"
        }

        // Default integrate assets from dist; switch to native assets when env is set
        val useNativeAssets =
            System.getenv("SPARKLING_USE_NATIVE_ASSETS")?.equals("true", ignoreCase = true) ?: false
        sourceSets {
            getByName("main").apply {
                if (useNativeAssets) {
                    // Use native assets directory (used in --copy mode)
                    assets.setSrcDirs(listOf("src/main/assets"))
                } else {
                    // Default: use dist directly; no copy required
                    assets.setSrcDirs(listOf("../../dist"))
                }
            }
        }
    }

    dependencies {
        implementation(libs.androidx.core.ktx)
        implementation(libs.androidx.appcompat)
        testImplementation(libs.junit)
        androidTestImplementation(libs.androidx.junit)
        androidTestImplementation(libs.androidx.espresso.core)

        implementation("com.tiktok.sparkling:sparkling:2.0.1")
        implementation("com.tiktok.sparkling:sparkling-method:2.0.1")
        implementation("com.squareup.okhttp3:okhttp:4.9.0")

        implementation(libs.fresco)
        implementation(libs.fresco.animated.gif)
        implementation(libs.fresco.animated.webp)
        implementation(libs.fresco.webp.support)
        implementation(libs.fresco.animated.base)

        // Soporte para <svg>: no viene incluido en el core de Lynx ni en Sparkling,
        // es un X-Element separado que hay que registrar a mano (ver SparklingApplication.kt).
        implementation("org.lynxsdk.lynx:xelement-svg:3.7.0")

//    kapt(libs.lynx.processor)

        // BEGIN SPARKLING AUTOLINK
        listOf(
            project(":sparkling-navigation")
        ).forEach { dep -> add("implementation", dep) }
        // END SPARKLING AUTOLINK
    }
}
