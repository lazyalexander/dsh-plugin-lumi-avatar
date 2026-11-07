[中文](renderer-protocol.zh-CN.md) | **English**

# Renderer protocol v1

The DSH client embeds `config.avatarUrl` in an iframe. The URL gains `embed=1` and `host_origin=<exact parent origin>`. A renderer must validate the configured parent origin and `event.source`. The parent validates the renderer's origin and window before transferring a channel.

## Handshake

After its player is ready, the child posts `{type: 'lumi.available', version: 1}` to the exact parent origin. The parent replies with `{type: 'lumi.connect', version: 1}` and one transferred MessagePort. The child sends `{type: 'ready', version: 1, states: [...]}` on that port. Each frame accepts one parent connection.

Commands use `{id, type, payload}`. Replies use `{id, result}` or `{id, error}`. Request IDs are strings of at most 100 characters. These are local playback messages. Provider keys and DSH authentication tokens are excluded.

## Player adapter

`connectAvatarEmbed(player)` accepts an object with these methods.

| Method | Required behavior |
| --- | --- |
| `beginTurn(turnId, waitSeconds)` | Invalidate previous playback, begin bounded waiting and return a receipt |
| `respond(command)` | Validate and submit a reaction, return a receipt |
| `cancel()` | Stop speech and smoothly return to rest |
| `snapshot()` | Return the latest actual rendered state |

A `react` payload is a player command.

```json
{
  "turn_id": "example-turn",
  "command_id": "example-reply",
  "text": "I can explain that.",
  "gesture": {"name": "explain", "intensity": 0.5},
  "emotion": {"name": "explain", "intensity": 0.5},
  "speak": true
}
```

Supported gesture names are `explain`, `cute`, `joy`, `laugh`, `serious`, `surprise`, `idle`. Emotion names additionally accept `neutral` for resting. The receiving player must enforce finite numeric intensity, valid turn/command IDs, stale-turn rejection, deduplication and text limits. The adapter limits state names before submission, while the player owns command validation and pose execution.

`respond` returns `{type: 'started', ...}` on acceptance. Duplicate and rejected receipts must not restart playback. `snapshot()` must include `state`, `gesture`, `emotion`, `command_id` and `speech: {active: boolean}`. `state: 'acting'` means a body reaction is active. After both body and speech finish, the state becomes `idle`. The adapter exposes this as `speechActive` to the parent. Snapshots are observations from the rendered player, so a newly accepted command can appear on a subsequent frame.

`begin` carries `{turn_id}`. `cancel` has no payload. `snapshot` returns the limited observation above. The adapter rejects unknown message types and reports exceptions as request-scoped errors. The parent times commands out after five seconds and initialization after two minutes.

The renderer owns animation blending, facial expression transitions, mouth timing, feet support and any collision treatment. The protocol carries bounded intent rather than bone transforms.

[Back to README](../README.md)
