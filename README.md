[中文](docs/README.zh-CN.md) | **English**

# Lumi Companion for DeepSeek

A native DSH companion plugin with the retained Lumi character, expressions, motions and a bundled renderer. Reacts to conversation context with text-paced mouth animation. Code MIT; character art CC BY-NC-SA 4.0.

## Install

With DeepSeek Harness installed, run:

```sh
dsh plugin --profile web add github:lazyalexander/dsh-plugin-lumi-avatar
```

Then restart DSH with the same profile:

```sh
dsh --profile web
```

Click **Lumi** in the conversation page to open the avatar sidebar. Uses the DeepSeek configuration already in DSH. No npm account, standalone Mac app or separate renderer process required. First installation downloads character assets.

If the avatar button does not appear, save this repository's `lumi.overlay.yml` locally and run:

```sh
dsh --profile web --patch ./lumi.overlay.yml
```

Replace `web` with your existing profile name if different. The plugin automatically serves the character on a loopback address and stops on DSH disposal.

### From the plugin market

Add this index under **Plugins → Discover → Add index source** (enable **Custom plugin index** under Experimental plugins first if the Discover tab is missing):

```
https://lazyalexander.github.io/dsh-plugin-lumi-avatar/index.json
```

Then install **Lumi Avatar** from the list. This is the same bundle as the Git install below, pinned to a released commit.

## Requirements and usage

- DeepSeek Harness 0.2.2-rc.1; other versions unverified.
- Node.js 24.9+, pnpm as required by DSH, and a WebGL-capable browser.
- Working DeepSeek configuration; API usage is billed to your account.

Supports explanation, joy, laughter, seriousness, surprise, cuteness and idle, with transitions, interruption and mouth reset. No TTS or camera tracking.

The original model is stored losslessly compressed and decoded while serving. GitHub installation uses the prebuilt client without an extra prepare build script.

## Credits and licensing

**Code is MIT; the character illustration is CC BY-NC-SA 4.0.**

- Character: 上善无形 / 溟月; maid derivative: ZipZipPipe, from a public open character gallery. Illustration-derived work: CC BY-NC-SA 4.0 (attribution, noncommercial, ShareAlike).
- Head: a substantial rebuild on an open-source base model; the original credit and bundled ReadMe are retained.
- Motions: the project's own ten standing-interaction clips, played as upper-body and finger tracks over local standing support. No third-party motion captures are included.

Check each original license before redistribution, commercial use or incorporation into another work. Independent community project, not an official DeepSeek product.

[Credits and licensing](docs/character-attribution.md) · [Renderer protocol](docs/renderer-protocol.md) · [Motion design](docs/motion-sources.md)

## Validation

Verified installation from GitHub into a fresh isolated web profile, automatic sidebar activation without an extra overlay, and a real DeepSeek reply with mouth movement returning to zero. All 12 local tests passed, including lossless model serving, path isolation, interruption and playback completion. Tested on Apple Silicon Mac; other platforms remain unverified.

[Documentation index](docs/index.md) · [Standalone Mac app (alternative installation)](docs/install-macos.md)
