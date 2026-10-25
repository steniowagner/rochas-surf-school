---
name: wipe-android-emulator
description: Wipe the data of an Android emulator (AVD) by stopping it and relaunching it with -wipe-data, then confirm it booted clean. Use when the user asks to wipe, reset, factory-reset or clean an Android emulator or simulator such as Pixel_Test.
---

# Wipe an Android emulator

Wiping erases every app, login and file on the AVD and can't be undone. If the user only asked whether you can do it, or didn't name the AVD, confirm the AVD name first. Once they ask for the wipe, go ahead.

`SDK` below is `${ANDROID_HOME:-$HOME/Library/Android/sdk}`. The AVD defaults to `Pixel_Test`.

## Steps

1. Look at what exists and what is running:
   ```bash
   $SDK/emulator/emulator -list-avds
   $SDK/platform-tools/adb devices
   ```
   Stop if the AVD isn't listed. Use the AVD name the user gave.

2. If the AVD is running, shut it down and wait until `adb devices` no longer lists it. `-wipe-data` only works on a stopped AVD, and `adb devices` can still show it for a few seconds.
   ```bash
   $SDK/platform-tools/adb -s emulator-5554 emu kill
   ```
   Use `pgrep -fl "qemu-system.*<avd>"` to check the process is gone.

3. Relaunch with the wipe, in the background (`run_in_background: true`). Write the log to the scratchpad directory, not `/tmp`:
   ```bash
   nohup $SDK/emulator/emulator -avd <avd> -wipe-data > <scratchpad>/emulator-wipe.log 2>&1 &
   ```
   "Failed to load snapshot 'default_boot'" in the log is expected after a wipe.

4. Wait for the boot with a polling loop (a bare `sleep` is blocked), then confirm it is clean:
   ```bash
   for i in $(seq 1 60); do [ "$($SDK/platform-tools/adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break; sleep 3; done
   $SDK/platform-tools/adb shell pm list packages -3
   ```
   An empty `pm list packages -3` means no user-installed apps remain.

5. Report that the AVD booted and has no user apps. The emulator is left running.

## Notes

- To wipe without relaunching the app, the user can also use Android Studio: Device Manager, then Wipe Data.
