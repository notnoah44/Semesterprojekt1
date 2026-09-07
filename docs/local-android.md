# Run PawStay on Windows with VS Code and an Android emulator

This project uses Expo SDK 54. Keep its existing dependency versions for local setup.

1. Install Node.js LTS (includes npm), then restart VS Code so its terminal picks up Node.
2. In Android Studio, open Device Manager, create a Pixel virtual device, download an Android system image, and start the device.
3. Open this project folder in VS Code.
4. Copy `.env.example` to `.env` and enter the existing Supabase project's URL and public anon key. Obtain these from the project owner or Supabase project settings. Do not use a service-role key. `.env` is ignored by Git. Running the frontend locally still connects to the configured Supabase backend.
5. In a VS Code PowerShell terminal, run:

```powershell
npm.cmd ci
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
npx.cmd expo start --go --android
```

The Android paths above apply to the standard SDK installation location. If Android Studio shows a different SDK location, use that instead.

`--go` explicitly selects Expo Go because this project also includes `expo-dev-client`. Allow Expo CLI to install the Expo Go version compatible with SDK 54 on the emulator if prompted. Leave the terminal running; saved source changes reload in the app. Press Ctrl+C to stop Metro.

For subsequent sessions, start the emulator and repeat the two environment-variable commands and the Expo command; reinstall dependencies only when needed. Restart Expo after changing `.env`.

Expo Go supports initial development here, but Android remote push notifications and future custom native integrations require a development build. Real membership payments are not implemented in this project.

Official emulator setup: https://docs.expo.dev/workflow/android-studio-emulator/
