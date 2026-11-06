import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const workDir = path.join(rootDir, '.apk_build');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function isUnusedChatAttachment(fileName) {
  return (
    fileName.endsWith('.apk') ||
    fileName.endsWith('.mov') ||
    fileName.startsWith('IMG_') ||
    fileName.startsWith('ScreenRecording_')
  );
}

function cleanUnusedAttachmentsFromDist(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      cleanUnusedAttachmentsFromDist(fullPath);
    } else if (isUnusedChatAttachment(entry)) {
      fs.rmSync(fullPath, { force: true });
    }
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      // Do not recursively copy the .apk or unused chat recordings into APK assets
      if (isUnusedChatAttachment(childItemName) || childItemName === 'downloads') return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    if (isUnusedChatAttachment(path.basename(src))) return;
    fs.copyFileSync(src, dest);
  }
}

async function buildApk() {
  cleanUnusedAttachmentsFromDist(path.join(distDir, 'assets', 'aistudio'));
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '/usr/local/lib/android/sdk';
  if (!fs.existsSync(sdkRoot)) {
    console.log('Android SDK not found in this environment; skipping local APK build.');
    return;
  }

  // Find stable build-tools and platform android.jar
  const buildToolsRoot = path.join(sdkRoot, 'build-tools');
  const allBuildTools = fs.readdirSync(buildToolsRoot).sort();
  const stableBuildTools = allBuildTools.filter((v) => !v.includes('-') && parseInt(v, 10) <= 36);
  const chosenBuildTool = (stableBuildTools.length > 0 ? stableBuildTools : allBuildTools)[
    (stableBuildTools.length > 0 ? stableBuildTools : allBuildTools).length - 1
  ];
  const buildToolsDir = path.join(buildToolsRoot, chosenBuildTool);

  const platformsRoot = path.join(sdkRoot, 'platforms');
  const allPlatforms = fs.readdirSync(platformsRoot).sort();
  const stablePlatforms = allPlatforms.filter((v) => /^android-\d+$/.test(v) && parseInt(v.replace('android-', ''), 10) <= 36);
  const chosenPlatform = (stablePlatforms.length > 0 ? stablePlatforms : allPlatforms)[
    (stablePlatforms.length > 0 ? stablePlatforms : allPlatforms).length - 1
  ];
  const platformDir = path.join(platformsRoot, chosenPlatform);
  const androidJar = path.join(platformDir, 'android.jar');

  const aapt2 = path.join(buildToolsDir, 'aapt2');
  const d8 = path.join(buildToolsDir, 'd8');
  const zipalign = path.join(buildToolsDir, 'zipalign');
  const apksigner = path.join(buildToolsDir, 'apksigner');

  console.log(`Using build-tools: ${buildToolsDir}`);
  console.log(`Using android.jar: ${androidJar}`);

  fs.rmSync(workDir, { recursive: true, force: true });
  const srcJavaDir = path.join(workDir, 'src', 'com', 'jcvcreatives', 'photobooth');
  const resMipmapDir = path.join(workDir, 'res', 'mipmap-hdpi');
  const resValuesDir = path.join(workDir, 'res', 'values');
  const assetsWwwDir = path.join(workDir, 'assets', 'www');
  const classesDir = path.join(workDir, 'classes');

  fs.mkdirSync(srcJavaDir, { recursive: true });
  fs.mkdirSync(resMipmapDir, { recursive: true });
  fs.mkdirSync(resValuesDir, { recursive: true });
  fs.mkdirSync(assetsWwwDir, { recursive: true });
  fs.mkdirSync(classesDir, { recursive: true });

  // 1. Copy compiled web app (dist/) into assets/www/ inside the APK
  copyRecursiveSync(distDir, assetsWwwDir);

  // 2. Copy app icon into res/mipmap-hdpi/ic_launcher.png
  const iconSrc = path.join(rootDir, 'public', 'pwa-192x192.png');
  fs.copyFileSync(iconSrc, path.join(resMipmapDir, 'ic_launcher.png'));

  // 3. Create res/values/strings.xml
  fs.writeFileSync(
    path.join(resValuesDir, 'strings.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">JCVcreatives Photobooth</string>
</resources>
`
  );

  // 4. Create AndroidManifest.xml supporting Android 5.0, 6.0, 7.0/7.1 (Nougat), 8.0 - 14.0 (minSdkVersion 21)
  // Includes USB Host support + Bluetooth + Wi-Fi Network permissions for universal printer compatibility
  fs.writeFileSync(
    path.join(workDir, 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.jcvcreatives.photobooth"
    android:versionCode="206"
    android:versionName="2.6.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="31" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.front" android:required="false" />
    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />
    <uses-feature android:name="android.hardware.usb.host" android:required="false" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|keyboard">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`
  );

  // 5. Create MainActivity.java with Native Android USB OTG Host, Bluetooth Classic SPP, Wi-Fi TCP, and Android PrintManager Bridge
  fs.writeFileSync(
    path.join(srcJavaDir, 'MainActivity.java'),
    `package com.jcvcreatives.photobooth;

import android.app.Activity;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.HashMap;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String ACTION_USB_PERMISSION = "com.jcvcreatives.photobooth.USB_PERMISSION";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private UsbDevice selectedUsbDevice;
    private BluetoothDevice selectedBtDevice;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );

        if (Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission("android.permission.CAMERA") != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    new String[]{
                        "android.permission.CAMERA",
                        "android.permission.BLUETOOTH",
                        "android.permission.BLUETOOTH_ADMIN"
                    },
                    PERMISSION_REQUEST_CODE
                );
            }
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#FAF8F5"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= 16) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        if (Build.VERSION.SDK_INT >= 17) {
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Expose Native Universal Printer Bridge to JavaScript (window.AndroidPrinter)
        webView.addJavascriptInterface(new AndroidPrinterBridge(), "AndroidPrinter");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && (url.startsWith("file://") || url.startsWith("http://") || url.startsWith("https://"))) {
                    return false;
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= 21) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            request.grant(request.getResources());
                        }
                    });
                }
            }
        });

        setContentView(webView);
        hideSystemUI();

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    public class AndroidPrinterBridge {

        @JavascriptInterface
        public boolean hasUsbPrinter() {
            try {
                UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
                if (usbManager == null) return false;
                HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
                return deviceList != null && !deviceList.isEmpty();
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String connectUsb() {
            try {
                UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
                if (usbManager == null) return "ERR:USB Service unavailable";
                HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
                if (deviceList == null || deviceList.isEmpty()) {
                    return "ERR:No USB printer detected on OTG cord";
                }

                UsbDevice found = null;
                for (UsbDevice dev : deviceList.values()) {
                    for (int i = 0; i < dev.getInterfaceCount(); i++) {
                        UsbInterface intf = dev.getInterface(i);
                        if (intf.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                            found = dev;
                            break;
                        }
                    }
                    if (found != null) break;
                }
                if (found == null) {
                    found = deviceList.values().iterator().next();
                }

                selectedUsbDevice = found;
                if (!usbManager.hasPermission(found)) {
                    int flags = Build.VERSION.SDK_INT >= 31 ? 33554432 : 0; // FLAG_MUTABLE on API 31+
                    PendingIntent pi = PendingIntent.getBroadcast(
                        MainActivity.this,
                        0,
                        new Intent(ACTION_USB_PERMISSION),
                        flags
                    );
                    usbManager.requestPermission(found, pi);
                }

                String name = found.getDeviceName();
                if (Build.VERSION.SDK_INT >= 21 && found.getProductName() != null) {
                    name = found.getProductName();
                }
                return "OK:" + name;
            } catch (Exception e) {
                return "ERR:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public String printUsbBase64(String base64Data) {
            try {
                UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
                if (usbManager == null) return "ERR:USB Manager unavailable";

                if (selectedUsbDevice == null) {
                    HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
                    if (deviceList != null && !deviceList.isEmpty()) {
                        selectedUsbDevice = deviceList.values().iterator().next();
                    }
                }
                if (selectedUsbDevice == null) {
                    return "ERR:No USB printer plugged in";
                }

                if (!usbManager.hasPermission(selectedUsbDevice)) {
                    int flags = Build.VERSION.SDK_INT >= 31 ? 33554432 : 0;
                    PendingIntent pi = PendingIntent.getBroadcast(
                        MainActivity.this,
                        0,
                        new Intent(ACTION_USB_PERMISSION),
                        flags
                    );
                    usbManager.requestPermission(selectedUsbDevice, pi);
                    return "ERR:Please tap Allow on the USB permission prompt and print again";
                }

                UsbInterface targetIntf = null;
                UsbEndpoint targetEp = null;

                for (int i = 0; i < selectedUsbDevice.getInterfaceCount(); i++) {
                    UsbInterface intf = selectedUsbDevice.getInterface(i);
                    for (int j = 0; j < intf.getEndpointCount(); j++) {
                        UsbEndpoint ep = intf.getEndpoint(j);
                        if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                            targetIntf = intf;
                            targetEp = ep;
                            if (intf.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                                break;
                            }
                        }
                    }
                    if (targetEp != null && targetIntf.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                        break;
                    }
                }

                if (targetIntf == null || targetEp == null) {
                    return "ERR:No writable USB endpoint found on printer";
                }

                UsbDeviceConnection conn = usbManager.openDevice(selectedUsbDevice);
                if (conn == null) return "ERR:Could not open USB connection";

                conn.claimInterface(targetIntf, true);
                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);

                int chunkSize = 4096;
                int offset = 0;
                while (offset < rawBytes.length) {
                    int len = Math.min(chunkSize, rawBytes.length - offset);
                    byte[] slice = new byte[len];
                    System.arraycopy(rawBytes, offset, slice, 0, len);
                    int written = conn.bulkTransfer(targetEp, slice, len, 4000);
                    if (written < 0) {
                        break;
                    }
                    offset += len;
                }

                conn.releaseInterface(targetIntf);
                conn.close();
                return "OK";
            } catch (Exception e) {
                return "ERR:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public String connectBluetooth() {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    return "ERR:Bluetooth is turned off on tablet";
                }
                Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                if (bonded == null || bonded.isEmpty()) {
                    return "FALLBACK:No paired Bluetooth Classic devices";
                }
                BluetoothDevice chosen = null;
                for (BluetoothDevice dev : bonded) {
                    String n = dev.getName() != null ? dev.getName().toLowerCase() : "";
                    if (n.contains("print") || n.contains("pos") || n.contains("mtp") || n.contains("mpt") || n.contains("rpp") || n.contains("bt") || n.contains("xp") || n.contains("58") || n.contains("80")) {
                        chosen = dev;
                        break;
                    }
                }
                if (chosen == null) {
                    chosen = bonded.iterator().next();
                }
                selectedBtDevice = chosen;
                return "OK:" + (chosen.getName() != null ? chosen.getName() : chosen.getAddress());
            } catch (Exception e) {
                return "FALLBACK:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public String printBluetoothBase64(String base64Data) {
            BluetoothSocket socket = null;
            try {
                if (selectedBtDevice == null) {
                    String connRes = connectBluetooth();
                    if (!connRes.startsWith("OK:")) {
                        return connRes;
                    }
                }
                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
                socket = selectedBtDevice.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                OutputStream os = socket.getOutputStream();
                int chunkSize = 1024;
                for (int i = 0; i < rawBytes.length; i += chunkSize) {
                    int len = Math.min(chunkSize, rawBytes.length - i);
                    os.write(rawBytes, i, len);
                    os.flush();
                    Thread.sleep(15);
                }
                os.close();
                socket.close();
                return "OK";
            } catch (Exception e) {
                try {
                    if (socket != null) socket.close();
                } catch (Exception ignored) {}
                return "ERR:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public String printTcpBase64(String ip, int port, String base64Data) {
            Socket socket = null;
            try {
                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
                socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), 4000);
                OutputStream os = socket.getOutputStream();
                os.write(rawBytes);
                os.flush();
                os.close();
                socket.close();
                return "OK";
            } catch (Exception e) {
                try {
                    if (socket != null) socket.close();
                } catch (Exception ignored) {}
                return "ERR:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public String printSystemImage(final String dataUrl, final String jobName) {
            try {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            final WebView printWebView = new WebView(MainActivity.this);
                            printWebView.setWebViewClient(new WebViewClient() {
                                @Override
                                public void onPageFinished(WebView view, String url) {
                                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                    if (printManager != null) {
                                        PrintDocumentAdapter adapter;
                                        if (Build.VERSION.SDK_INT >= 21) {
                                            adapter = printWebView.createPrintDocumentAdapter(jobName);
                                        } else {
                                            adapter = printWebView.createPrintDocumentAdapter();
                                        }
                                        printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
                                    }
                                }
                            });
                            String html = "<html><head><style>@page{margin:0;}body{margin:0;padding:0;text-align:center;}img{width:100%;max-width:100%;height:auto;}</style></head><body><img src=\\"" + dataUrl + "\\" /></body></html>";
                            printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
                        } catch (Exception ignored) {}
                    }
                });
                return "OK";
            } catch (Exception e) {
                return "ERR:" + e.getMessage();
            }
        }
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        }
    }
}
`
  );

  // 6. Compile resources with aapt2
  const compiledResZip = path.join(workDir, 'compiled_res.zip');
  run(`"${aapt2}" compile --dir "${path.join(workDir, 'res')}" -o "${compiledResZip}"`);

  // 7. Link APK with aapt2 (including -A assets so assets/www/* is bundled inside the APK)
  const unalignedApk = path.join(workDir, 'unaligned.apk');
  run(
    `"${aapt2}" link -o "${unalignedApk}" -I "${androidJar}" --manifest "${path.join(
      workDir,
      'AndroidManifest.xml'
    )}" --java "${path.join(workDir, 'src')}" -A "${path.join(workDir, 'assets')}" --auto-add-overlay "${compiledResZip}"`
  );

  // 8. Compile Java sources targeting Java 8 bytecode for Android 7 compatibility
  const rJavaPath = path.join(srcJavaDir, 'R.java');
  const mainJavaPath = path.join(srcJavaDir, 'MainActivity.java');
  run(`javac -source 1.8 -target 1.8 -bootclasspath "${androidJar}" -classpath "${androidJar}" -d "${classesDir}" "${rJavaPath}" "${mainJavaPath}"`);

  // 9. Package .class files into classes.jar (avoids shell $1 expansion on inner classes) and convert to classes.dex using d8
  const classesJar = path.join(workDir, 'classes.jar');
  run(`jar cf "${classesJar}" -C "${classesDir}" .`);
  run(`"${d8}" --min-api 21 --lib "${androidJar}" --output "${workDir}" "${classesJar}"`);

  // 10. Add classes.dex to the root of unaligned.apk
  run(`cd "${workDir}" && zip -uj "${unalignedApk}" "${path.join(workDir, 'classes.dex')}"`);

  // 11. Align APK with zipalign
  const alignedApk = path.join(workDir, 'aligned.apk');
  run(`"${zipalign}" -f -p 4 "${unalignedApk}" "${alignedApk}"`);

  // 12. Generate signing keystore and sign with BOTH v1 (required for Android 7.0!) and v2/v3
  const keystorePath = path.join(workDir, 'release.keystore');
  run(
    `keytool -genkeypair -v -keystore "${keystorePath}" -alias jcvkey -keyalg RSA -keysize 2048 -validity 10000 -storepass jcv123456 -keypass jcv123456 -dname "CN=JCVcreatives, OU=Studio, O=JCVcreatives, L=Manila, S=MetroManila, C=PH"`
  );

  const outputApkDist = path.join(distDir, 'JCVcreatives-Photobooth.apk');
  fs.mkdirSync(path.join(distDir, 'downloads'), { recursive: true });
  const outputApkDownloads = path.join(distDir, 'downloads', 'JCVcreatives-Photobooth.apk');

  run(
    `"${apksigner}" sign --ks "${keystorePath}" --ks-key-alias jcvkey --ks-pass pass:jcv123456 --key-pass pass:jcv123456 --v1-signing-enabled true --v2-signing-enabled true --out "${outputApkDist}" "${alignedApk}"`
  );
  fs.copyFileSync(outputApkDist, outputApkDownloads);

  console.log(`Successfully built Android 7+ offline APK: ${outputApkDist}`);
  fs.rmSync(workDir, { recursive: true, force: true });
  process.exit(0);
}

buildApk().catch((err) => {
  console.error('APK build error:', err);
  process.exit(1);
});
