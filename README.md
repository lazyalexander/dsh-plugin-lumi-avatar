# Lumi Avatar for DeepSeek Harness

MIT-licensed plugin code for context-aware avatar responses in DeepSeek Harness (DSH). The model selects a bounded presentation inside its existing conversation turn. The client combines that selection with the completed reply and drives an avatar renderer through a private browser message channel.

[中文](docs/README.zh-CN.md) · [Renderer protocol](docs/renderer-protocol.md)

## Presentations

| State | Intended expression and gesture |
| --- | --- |
| `explain` | Calm explanation with a relaxed face and small hand movements |
| `cute` | Playful expression and a compact, friendly gesture |
| `joy` | Delighted surprise and a smile |
| `serious` | Attentive brows and restrained explanatory movement |
| `surprise` | Widened eyes and a short surprised reaction |
| `idle` | Resting expression and quiet standing |

The renderer owns facial shapes, motions, interpolation, mouth movement, and recovery. The plugin owns contextual selection, reply correlation, cancellation, and session lifecycle.

## Requirements

- Node.js 24.9 or later.
- DeepSeek Harness 0.2.2-rc.1. Its client APIs are pre-stable. Other versions need verification.
- A running HTTP(S) avatar renderer implementing the [protocol](docs/renderer-protocol.md), with a character and animations you are authorized to use.

This repository distributes plugin code under MIT. Character models, textures, motion recordings and private conversation data are supplied separately by the renderer operator. Dependency licenses remain with their respective authors.

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
dsh plugin --profile lumi add /absolute/path/to/dsh-plugin-lumi-avatar-0.3.0.tgz
```

Copy `lumi.overlay.yml` and set `config.avatarUrl` to your renderer's actual URL. Start the renderer, then run the profile with that overlay.

```sh
dsh --profile lumi --patch /absolute/path/to/lumi.overlay.yml --no-open
```

The overlay explicitly enables the plugin. It also works with DSH installations that install a local package as a plain dependency. Avoid enabling the same entry twice if your profile already loads this package's bundle patch.

On each normal final reply, DSH can call `lumi_react` with a state and intensity from 0 to 0.85. The same-turn successful tool result and completed text drive the avatar. Missing or failed selections use `idle`. Model compliance with the instruction to select a presentation can vary.

## Connect your renderer

The renderer can import the provided adapter into its browser entry point.

```js
import { connectAvatarEmbed } from 'dsh-plugin-lumi-avatar/renderer-bridge';

// Call after the model and player are ready.
const dispose = connectAvatarEmbed(player);
```

The `player` interface and message fields are documented in [renderer-protocol.md](docs/renderer-protocol.md). The player must implement the listed states. Use `dispose()` when unloading the renderer. Renderers and plugins must run with compatible HTTP(S) origins. DSH Desktop custom protocol origins still need validation.

## Behavior and privacy

The plugin adds one static prompt section and the `lumi_react` tool schema to DSH's existing model context. Selecting a presentation usually adds a tool step before the final reply. The client sends at most the first 2,000 characters of the completed reply to the configured renderer for text-paced mouth animation. That renderer URL is a data destination chosen by the operator. The plugin performs no separate classification request and includes no provider credentials.

Only successfully completed same-turn tool selections are consumed. Streaming fragments and interrupted replies are ignored. Opening historical conversations does not replay their old responses. New tasks, session switches and unloads invalidate previous playback ownership. The UI returns to idle after the renderer reports that both gesture and mouth activity have finished.

## Verification and limits

`npm test` covers reply correlation, failed or malformed selections, stale acknowledgements, and return to idle. The DSH Web integration was exercised in a private development environment across all six states, including facial weights and completed playback. Models and conversations from that environment are excluded from this repository. Desktop, remote renderer deployments and automatic renderer process management remain outside the verified scope.

This public repository starts with a clean root commit containing an allowlisted code export. It has no ancestry from the earlier private character-production repository. No private session records, recordings, model archives or local launch configuration are imported.

## License

[MIT](LICENSE). This community plugin is independently maintained and has no official affiliation with DeepSeek or Ubisoft.
