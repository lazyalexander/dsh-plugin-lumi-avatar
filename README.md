# Lumi Companion for DeepSeek

MIT-licensed plugin code for context-aware avatar responses in DeepSeek Harness (DSH). The model selects a bounded presentation inside its existing conversation turn. The client combines that selection with the completed reply and drives an avatar renderer through a private browser message channel.

[中文](docs/README.zh-CN.md) · [Renderer protocol](docs/renderer-protocol.md)

## Mac app preview

For a bundled app with the retained Lumi character, download the [Mac preview release](https://github.com/lazyalexander/dsh-plugin-lumi-avatar/releases/tag/companion-macos-0.3.7-preview) and follow the [中文安装说明](docs/install-macos.zh-CN.md). Apple Silicon only; no separate Node.js or DSH installation required. The app includes separately licensed character/motion assets; it is not entirely MIT and asset-rights review remains incomplete.

## Presentations

| State | Intended expression and gesture |
| --- | --- |
| `explain` | Calm explanation with a relaxed face and small hand movements |
| `cute` | Playful expression and a compact, friendly gesture |
| `joy` | Happiness, congratulations and a smile |
| `laugh` | Brief amused laughter with a smiling face |
| `serious` | Attentive brows and restrained explanatory movement |
| `surprise` | Widened eyes and a short surprised reaction |
| `idle` | Resting expression and quiet standing |

The renderer owns facial shapes, motions, interpolation, mouth movement, and recovery. The plugin owns contextual selection, reply correlation, cancellation, and session lifecycle.

## Requirements

- Node.js 24.9 or later.
- DeepSeek Harness 0.2.2-rc.1. Its client APIs are pre-stable. Other versions need verification.
- A running HTTP(S) avatar renderer implementing the [protocol](docs/renderer-protocol.md), with a character and animations you are authorized to use.

This repository distributes plugin code under MIT. Character models, textures, motion recordings and private conversation data are supplied separately by the renderer operator. Dependency licenses remain with their respective authors.

## Install a prebuilt release

Download `dsh-plugin-lumi-avatar-0.3.7.tgz`, `lumi.overlay.yml`, and `SHA256SUMS` from [v0.3.7](https://github.com/lazyalexander/dsh-plugin-lumi-avatar/releases/tag/v0.3.7). Verify the downloaded files with `shasum -a 256 -c SHA256SUMS` on macOS. No build tools are needed for this path; DSH and its Node.js runtime are still required.

Set `avatarUrl` in the overlay to your running renderer, then run these commands from the download directory:

```sh
dsh --profile lumi --from-default-profile web --help
dsh plugin --profile lumi add "$PWD/dsh-plugin-lumi-avatar-0.3.7.tgz"
dsh --profile lumi --patch "$PWD/lumi.overlay.yml"
```

This installs the plugin, not a bundled character renderer or model. Each operator supplies their own provider credentials through DSH and an authorized renderer. No shared API key is distributed.

## Build and install

```sh
git clone https://github.com/lazyalexander/dsh-plugin-lumi-avatar.git
cd dsh-plugin-lumi-avatar
npm ci
npm test
npm run build
npm pack
```

Create a dedicated DSH profile and install the local package using its absolute path.

```sh
dsh --profile lumi --from-default-profile web --help
dsh plugin --profile lumi add /absolute/path/to/dsh-plugin-lumi-avatar-0.3.7.tgz
```

Copy `lumi.overlay.yml` and set `config.avatarUrl` to your renderer's actual URL. Start the renderer, then run the profile with that overlay.

```sh
dsh --profile lumi --patch /absolute/path/to/lumi.overlay.yml --no-open
```

The overlay explicitly enables the plugin. It also works with DSH installations that install a local package as a plain dependency. Avoid enabling the same entry twice if your profile already loads this package's bundle patch.

On each normal final reply, DSH can call `lumi_react` with a state and intensity from 0 to 0.85. The same-turn successful tool result and completed text drive the avatar. Missing or failed selections use `idle`. Model compliance with the instruction to select a presentation can vary.

Ordinary conversation defaults to `explain`. Cuteness requires a current explicit invitation and does not carry across topic changes. Jokes can select `laugh`, ambiguous unexpected events `surprise`, and careful corrections or important explanations `serious`.

## Connect your renderer

The renderer can import the provided adapter into its browser entry point.

```js
import { connectAvatarEmbed } from 'dsh-plugin-lumi-avatar/renderer-bridge';

// Call after the model and player are ready.
const dispose = connectAvatarEmbed(player);
```

The `player` interface and message fields are documented in [renderer-protocol.md](docs/renderer-protocol.md). The player must implement the listed states. Use `dispose()` when unloading the renderer. Renderers and plugins must run with compatible HTTP(S) origins. DSH Desktop custom protocol origins still need validation.

## Behavior and privacy

The plugin adds static spoken-language persona and presentation prompt sections and the `lumi_react` tool schema to DSH's existing model context. Selecting a presentation usually adds a tool step before the final reply. The client sends at most the first 2,000 characters of the completed reply to the configured renderer for text-paced mouth animation. That renderer URL is a data destination chosen by the operator. The plugin performs no separate classification request and includes no provider credentials.

Only successfully completed same-turn tool selections are consumed. Streaming fragments and interrupted replies are ignored. Opening historical conversations does not replay their old responses. New tasks, session switches and unloads invalidate previous playback ownership. The UI returns to idle after the renderer reports that both gesture and mouth activity have finished.

## Verification and limits

`npm test` covers reply correlation (including omitted tool-only assistant rows), failed or malformed selections, context changes, stale acknowledgements, and return to idle. The DSH Web integration was exercised in a private development environment across the initial six states, including facial weights and completed playback. Models and conversations from that environment are excluded from this repository. Desktop, remote renderer deployments and automatic renderer process management remain outside the verified scope.

This public repository starts with a clean root commit containing an allowlisted code export. It has no ancestry from the earlier private character-production repository. No private session records, recordings, model archives or local launch configuration are imported.

## License

[MIT](LICENSE). This community plugin is independently maintained and has no official affiliation with DeepSeek or Ubisoft.

Lumi appears in the native right sidebar. The Lumi toolbar button reopens it after closing; wide windows open it automatically once per session, while narrow windows leave it collapsed.

The persona uses warm, inclusive conversational paragraphs suitable for future speech playback. It avoids Markdown, emoji, stage directions and emotional pressure in chat replies. Prompt guidance does not replace host permissions or provider safeguards.

Reply mouth movement is independent of the body pose: an idle gesture no longer silences nonempty reply text. Playback waits for mouth completion as well as gesture completion, with a 30-second wall-clock failsafe for a stalled renderer.

Character attribution and the separate complete-app release status are documented in [character-attribution.md](docs/character-attribution.md).
