// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
package com.example.sparkling.go

import android.app.Activity
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.imagepipeline.core.ImagePipelineConfig
import com.facebook.imagepipeline.memory.PoolConfig
import com.facebook.imagepipeline.memory.PoolFactory
import com.lynx.tasm.behavior.Behavior
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.behavior.ui.LynxUI
import com.lynx.xelement.svg.BehaviorGenerator as SvgBehaviorGenerator
import com.tiktok.sparkling.Sparkling
import com.tiktok.sparkling.SparklingActivity
import com.tiktok.sparkling.SparklingContextTransferStation
import com.tiktok.sparkling.hybridkit.HybridKit
import com.tiktok.sparkling.hybridkit.config.BaseInfoConfig
import com.tiktok.sparkling.hybridkit.config.SparklingHybridConfig
import com.tiktok.sparkling.hybridkit.config.SparklingLynxConfig
import com.tiktok.sparkling.hybridkit.lynx.SparklingLynxModuleWrapper
import com.tiktok.sparkling.method.registry.core.SparklingBridgeManager
import com.tiktok.sparkling.method.router.close.RouterCloseMethod
import com.tiktok.sparkling.method.router.open.RouterOpenMethod
import com.tiktok.sparkling.method.router.utils.RouterProvider
import com.example.sparkling.go.LynxInputComponent
import com.example.sparkling.go.BuiltinTemplateProvider


class SparklingApplication : Application() {

    private companion object {
        const val TAG = "SparklingApplication"
    }

    /** Guarda contra bucles: sólo intentamos rearrancar una vez por proceso. */
    private var sparklingRecoveryDone = false

    override fun onCreate() {
        super.onCreate()
        initFresco()
        initSparkling()
        initReminderChannel()
        initActivityTracking()
    }

    private fun initReminderChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ReminderAlarmReceiver.CHANNEL_ID,
                "Recordatorios de hábitos",
                NotificationManager.IMPORTANCE_DEFAULT,
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun initActivityTracking() {
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                CurrentActivityHolder.current = activity
            }
            override fun onActivityPaused(activity: Activity) {
                if (CurrentActivityHolder.current === activity) CurrentActivityHolder.current = null
            }
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                recoverFromProcessDeath(activity)
            }
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }

    /**
     * Si la app queda un rato en background, Android puede matar el proceso. Al
     * volver, el sistema restaura la tarea recreando SparklingActivity con su
     * Intent original, pero SplashActivity ya no corre (hizo finish()) y el
     * SparklingContext vivía sólo en el mapa estático de
     * SparklingContextTransferStation, que murió con el proceso. SparklingActivity
     * tolera ese null sin avisar: pinta el toolbar por defecto ("Sparkling Page")
     * y no monta el fragment, o sea pantalla en blanco.
     *
     * El SDK nunca llama releaseSparklingContext, así que un contexto ausente
     * significa siempre proceso reiniciado: rearrancamos desde SplashActivity.
     */
    private fun recoverFromProcessDeath(activity: Activity) {
        if (activity !is SparklingActivity || sparklingRecoveryDone) return
        val containerId = activity.intent?.getStringExtra(Sparkling.SPARKLING_CONTEXT_CONTAINER_ID)
        val context = containerId?.let { SparklingContextTransferStation.getSparklingContext(it) }
        if (context != null) return

        sparklingRecoveryDone = true
        Log.w(TAG, "SparklingContext perdido (proceso reiniciado); relanzando SplashActivity")
        activity.startActivity(
            Intent(activity, SplashActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
        activity.finish()
    }

    private fun initFresco() {
        val factory = PoolFactory(PoolConfig.newBuilder().build())
        val builder = ImagePipelineConfig.newBuilder(applicationContext).setPoolFactory(factory)
        Fresco.initialize(applicationContext, builder.build())
    }

    private fun initSparkling() {
        initHybridKit()
        initSparklingMethods()
    }


    private fun initHybridKit() {
        HybridKit.init(this)
        val baseInfoConfig = BaseInfoConfig(isDebug = BuildConfig.DEBUG)
        val lynxConfig = SparklingLynxConfig.build(this) {
            addBehaviors(listOf(
                object : Behavior("input", false) {
                    override fun createUI(context: LynxContext?): LynxUI<*>? {
                        return LynxInputComponent(context)
                    }
                }
            ) + SvgBehaviorGenerator.getBehaviors())
            addLynxModules(mapOf(
                "NativeDatabaseModule" to SparklingLynxModuleWrapper(NativeDatabaseModule::class.java, null),
                "NativeReminderModule" to SparklingLynxModuleWrapper(NativeReminderModule::class.java, null)
            ))
            setTemplateProvider(BuiltinTemplateProvider(this@SparklingApplication))
        }
        val hybridConfig = SparklingHybridConfig.build(baseInfoConfig) {
            setLynxConfig(lynxConfig)
        }
        HybridKit.setHybridConfig(hybridConfig, this)
        HybridKit.initLynxKit()
    }

    private fun initSparklingMethods() {
        SparklingBridgeManager.registerIDLMethod(RouterOpenMethod::class.java)
        SparklingBridgeManager.registerIDLMethod(RouterCloseMethod::class.java)
        RouterProvider.hostRouterDepend = SparklingHostRouterDepend()
    }
}
