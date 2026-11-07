[中文](install-macos.zh-CN.md) | **English**

# Install Lumi Companion for DeepSeek on Mac

For the native DSH plugin, use the [plugin installation guide](../README.md#install). This page covers the separate standalone Mac app preview, using plugin code 0.3.7 and bundling DSH, Lumi and its runtime.

## Download and install

1. Download `Lumi-Companion-for-DeepSeek-Mac.zip` (about 350 MB) from the [Mac preview release](https://github.com/lazyalexander/dsh-plugin-lumi-avatar/releases/tag/companion-macos-0.3.7-preview).
2. Extract the ZIP and drag `Lumi Companion for DeepSeek.app` into Applications.
3. Open the app. Your browser opens the local setup page.
4. Enter your own DeepSeek API key, click “启动 Lumi”, and wait for DSH and the model to load.
5. Create a conversation. Lumi appears in the right sidebar and reacts with expressions, gestures and text-paced mouth movement.

Apple Silicon Macs only; Intel Mac, Windows and Linux are unverified. No separate Node, Python, Homebrew or DSH installation is required. Internet access and your own DeepSeek account are required; API costs are yours. No TTS or microphone conversation included.

## macOS blocks the first launch

The app is locally signed and not Apple-notarized. After trying to open it, check System Settings → Privacy & Security and choose Open Anyway if you trust the download from this repository. Do not disable Gatekeeper or System Integrity Protection.

## Use, quit and uninstall

- Model loading may take time. If it does not become ready, refresh DSH or quit and reopen the app.
- If the avatar is hidden, click Lumi in the conversation page.
- The key is used for the current run without being written to Lumi configuration. Conversations are sent to DeepSeek; chat history and logs may remain locally.
- Local data: `~/Library/Application Support/Lumi Companion for DeepSeek`. This separate configuration does not overwrite existing DSH profiles.
- Closing the browser tab does not stop the service. Quit Lumi from the Dock to stop it.
- Delete the app to uninstall. If you also want to delete history and configuration, quit first and remove the above data directory yourself.

## Verify the download

Download SHA256SUMS from the same release and run in your download directory:

```sh
shasum -a 256 -c SHA256SUMS
```

ZIP SHA256: `f7dd45b929cd414720acb44150d54e581bc057e7816230d1662d8f95c246f7dd`.

## Credits and terms

Independent community project, not an official DeepSeek product. Code MIT does not cover all character and motion assets. [Credits and licensing](character-attribution.md) describes illustration authors, CC BY-NC-SA 4.0, head license discrepancies and pending motion provenance. Lumi modifications include proportions, facial features, hair and clothing, rigging, expressions and motion adaptation.

This provider-requested noncommercial preview does not mean asset-rights review is complete. Check underlying terms before redistribution, commercial use or incorporation into other works. Full notices are available under “署名与许可” on the setup page and in the app's licenses directory.

## Verification

Bundled DSH and a real DeepSeek reply were tested on the current Apple Silicon Mac, including connection, mouth movement and final closure. One initial loading timeout occurred; restarting passed. A second clean Mac has not been tested, and the app is not Apple-notarized.
