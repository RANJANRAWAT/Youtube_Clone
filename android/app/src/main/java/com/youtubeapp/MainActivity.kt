package com.youtubeapp

import android.os.Bundle
import android.webkit.WebView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewMediaIntegrityApiStatusConfig
import androidx.webkit.WebSettingsCompat

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Configure the Android WebView Media Integrity API when available.
    // Default to enabling the API without exposing app identity, but explicitly
    // allow full API (including app identity) for YouTube origins so embedded
    // YouTube player can receive app identification when required by the host.
    try {
      if (WebViewFeature.isFeatureSupported(WebViewFeature.WEBVIEW_MEDIA_INTEGRITY_API_STATUS)) {
        val config = WebViewMediaIntegrityApiStatusConfig.Builder(
          WebViewMediaIntegrityApiStatusConfig.WEBVIEW_MEDIA_INTEGRITY_API_ENABLED_WITHOUT_APP_IDENTITY
        )
          .addOverrideRule("https://www.youtube.com", WebViewMediaIntegrityApiStatusConfig.WEBVIEW_MEDIA_INTEGRITY_API_ENABLED)
          .addOverrideRule("https://*.youtube.com", WebViewMediaIntegrityApiStatusConfig.WEBVIEW_MEDIA_INTEGRITY_API_ENABLED)
          .addOverrideRule("https://youtube.com", WebViewMediaIntegrityApiStatusConfig.WEBVIEW_MEDIA_INTEGRITY_API_ENABLED)
          .addOverrideRule("https://www.youtube-nocookie.com", WebViewMediaIntegrityApiStatusConfig.WEBVIEW_MEDIA_INTEGRITY_API_ENABLED)
          .build()

        // Apply the setting to a WebView settings instance. Creating a short-lived
        // WebView to reach WebSettings is acceptable here during app startup.
        val webView = WebView(this)
        WebSettingsCompat.setWebViewMediaIntegrityApiStatus(webView.settings, config)
      }
    } catch (e: Exception) {
      // Don't crash the app if WebView or the API isn't available on this device.
      android.util.Log.w("MainActivity", "Failed to configure WebView Media Integrity API", e)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "youtubeApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
