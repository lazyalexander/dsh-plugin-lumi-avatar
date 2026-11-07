[中文](motion-sources.zh-CN.md) | **English**

# Motion sources and adaptation

Original library: [DLP3D / S-Lab NTU](https://github.com/dlp3d-ai/dlp3d.ai). [Data preparation](https://dlp3d.readthedocs.io/en/latest/_subrepos/web_backend/data_preparation.html). VRMA conversion: [Codemarchant / Rexclaw pinned source](https://github.com/Codemarchant/rexclaw/tree/ea143024229f3c119b4819121e7532ec3fa6715b/assets/motion/dlp3d-ani). Local files, upstream IDs and original-file SHA256 hashes follow.

| File | Upstream ID | Label | SHA256 |
| --- | --- | --- | --- |
| [idle.vrma](../renderer/runtime/interaction/motions/idle.vrma) | 550 | Idle | `e0b2fd0f322a3a08dd195558a5646fd58d6c475a6b4d866fb049aeaa2ac5742c` |
| [wave.vrma](../renderer/runtime/interaction/motions/wave.vrma) | 661 | Wave | `24acb9366c632949976b6e275143af0032372cd8af7e2cf8a2a0fcf5648022d2` |
| [laugh.vrma](../renderer/runtime/interaction/motions/laugh.vrma) | 734 | Laugh | `c61d8b1c1ce1ce28bf8d4ba730e6eb39403e27f29a07f21f85ae1a89cbc416b9` |
| [listen.vrma](../renderer/runtime/interaction/motions/listen.vrma) | 611 | Listen | `6c9672c76931ac3078ef4dea9bc57287fc1dced7d2d4a65bd0520a63dd8f2953` |
| [happy.vrma](../renderer/runtime/interaction/motions/happy.vrma) | 631 | Happy | `6c25012776be2056aeec94cb32328df7a419eed24e4b18fcdb1ced9824a177ed` |
| [sad.vrma](../renderer/runtime/interaction/motions/sad.vrma) | 748 | Sad | `fe3081405558c57b055f5f5382d0f826caed2b83f1eea4da72efe15fd2be9141` |
| [guilty.vrma](../renderer/runtime/interaction/motions/guilty.vrma) | 578 | Apology | `15a24b0f8ba04469a16f85a08dd57c9f32ef80f09469a37d7008745e1f1b8b7c` |
| [anger.vrma](../renderer/runtime/interaction/motions/anger.vrma) | 694 | Anger | `6c9bd6b68bdadfeae141719bed48f6348bdac81592d5fb43c01cccca6a4c13e3` |
| [cute.vrma](../renderer/runtime/interaction/motions/cute.vrma) | 697 | Cuteness | `a38290a3be4d2b44c6574611d5072517a38fa3df839d18e087b143045bc7cd96` |
| [surprise.vrma](../renderer/runtime/interaction/motions/surprise.vrma) | 664 | Surprise | `1a689e25a5f1c2bd0ae7d65240ca8ccdac36d7a27df8aec2e9c769f95cd5b477` |

Original VRMA bytes are retained. The player uses upper-body and finger tracks while local standing support controls the feet and pelvis. Idle blends a small amount of source variation; amplitude and speed are constrained. Local brows, mouth, head and chest changes are layered on top, and hand contact is fitted to Lumi. These are adapted standing interactions, not original full-body capture playback.

Anger uses a 0–4.2 second window within a 4.6 second reaction; cuteness uses approximately 4.33 seconds within a 4.4 second reaction. The player handles fades, transitions and interruption. Current source code is authoritative for settings.

These ten clips were not recorded by this project; their original production method was not independently verified. Both repository MIT notices are retained, but do not independently establish the complete rights chain for every original motion asset. The provider authorized noncommercial preview publication; per-asset permissions remain under review. No Gokuraku Jodo VMD, music, upstream characters or voices are included.

[DLP3D license](../renderer/licenses/dlp3d-code.txt) · [Rexclaw license](../renderer/licenses/motion-source.txt) · [Character licensing](character-attribution.md) · [README](../README.md)
