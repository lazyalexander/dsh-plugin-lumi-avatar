[中文](motion-sources.zh-CN.md) | **English**

# Motion design and adaptation

The ten clips in [motions/](../renderer/runtime/interaction/motions) — idle, wave, laugh, listen, happy, sad, guilty, anger, cute and surprise — are part of this project's own motion set.

The player reads upper-body and finger tracks; feet and pelvis are driven by the local standing-support layer, so playback is a standing interaction rather than a full-body recording. Head, chest, brows and mouth are layered on top at runtime, and hand contact is fitted to Lumi's proportions. Idle keeps a small amount of variation with constrained amplitude and speed.

Anger uses a 0–4.2 second window within a 4.6 second reaction; cuteness uses about 4.33 seconds within a 4.4 second reaction. The player handles fades, transitions and interruption; the current source code is authoritative for settings.

No third-party motion captures, Gokuraku Jodo VMD, music, upstream characters or voices are included.

[Character licensing](character-attribution.md) · [README](../README.md)
