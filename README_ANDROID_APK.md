# MoveLab Android APK

MoveLab Android paketi Capacitor ile hazirlandi. Mevcut React/Vite frontend native Android WebView icinde calisir.

## Gerekenler

- Android Studio
- Android SDK Platform 35 veya ustu
- Android SDK Build-Tools
- Android SDK Platform-Tools
- JDK 17 veya Android Studio ile gelen JetBrains Runtime

Android Studio kurmak istemezsen proje icindeki otomatik command-line SDK kurulumunu deneyebilirsin:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_install_jdk21.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\windows_install_android_sdk.ps1
```

## Backend adresi

Telefon uzerindeki APK `127.0.0.1` ile bilgisayarindaki backend'e ulasamaz. APK icin backend URL'ini global veya ayni agdaki bir adrese alman gerekir.

Bilgisayarinin mevcut Wi-Fi IP adresini gormek icin:

```powershell
ipconfig
```

Yerel Wi-Fi test ornegi:

```text
VITE_API_BASE=http://192.168.0.104:8000
```

Global yayin ornegi:

```text
VITE_API_BASE=https://api.movelab.app
```

Bu degeri frontend build oncesi `.env` veya `.env.production` icinde ayarla.

## APK uretme

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_build_apk.ps1 -ApiBase "http://192.168.0.104:8000"
```

Beklenen debug APK yolu:

```text
C:\MoveLabFresh\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

Telefonu ayni Wi-Fi aginda test edeceksen backend'i LAN modunda baslat:

```powershell
cd C:\MoveLabFresh
powershell -ExecutionPolicy Bypass -File .\scripts\windows_run_backend_lan.ps1
```

Windows Firewall port `8000` icin izin isterse izin ver. Telefon ve bilgisayar ayni Wi-Fi aginda degilse APK backend'e ulasamaz.

Yerel test icin Android manifest cleartext HTTP'ye izin verir. Gercek yayin icin backend'i HTTPS domain'e tasimak ve APK'yi HTTPS API ile yeniden build etmek gerekir.

## Android Studio ile acma

```powershell
cd C:\MoveLabFresh\frontend
npm run android:open
```

## Not

Debug APK test icindir. Play Store veya profesyonel dagitim icin release signing, versionCode/versionName, app icon, privacy policy ve backend HTTPS ayarlari ayrica tamamlanmalidir.
