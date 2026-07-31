package com.example.sparkling.go

import android.app.Activity

// SplashActivity termina apenas navega a la actividad interna de Sparkling
// que realmente hostea el LynxView (ver SplashActivity.kt: gotoSparklingPage
// llama finish()). Para pedir permisos runtime (notificaciones) desde un
// LynxModule necesitamos la Activity en foreground real, no la que ya murió.
object CurrentActivityHolder {
    var current: Activity? = null
}
