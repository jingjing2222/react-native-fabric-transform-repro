package com.reprocrash

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.views.view.setEdgeToEdgeFeatureFlagOn
import com.facebook.soloader.SoLoader
import java.io.IOException

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNativeWithSynchronousMountPropsOverride()
  }

  private fun loadReactNativeWithSynchronousMountPropsOverride() {
    try {
      SoLoader.init(this, OpenSourceMergedSoMapping)
    } catch (error: IOException) {
      throw RuntimeException(error)
    }

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      val featureFlags =
          object : ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android() {
            override fun overrideBySynchronousMountPropsAtMountingAndroid(): Boolean = true
          }
      val loadWithFeatureFlags =
          DefaultNewArchitectureEntryPoint::class.java.declaredMethods.first {
            it.name.startsWith("loadWithFeatureFlags")
          }
      loadWithFeatureFlags.isAccessible = true
      loadWithFeatureFlags.invoke(DefaultNewArchitectureEntryPoint, featureFlags)
    }

    if (BuildConfig.IS_EDGE_TO_EDGE_ENABLED) {
      setEdgeToEdgeFeatureFlagOn()
    }
  }
}
