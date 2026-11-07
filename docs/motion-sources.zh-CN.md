**中文** | [English](motion-sources.md)

# 动作来源与适配

原始动作库：[DLP3D／S-Lab NTU](https://github.com/dlp3d-ai/dlp3d.ai)。[数据准备文档](https://dlp3d.readthedocs.io/en/latest/_subrepos/web_backend/data_preparation.html)。VRMA 转换：[Codemarchant／Rexclaw 固定版本](https://github.com/Codemarchant/rexclaw/tree/ea143024229f3c119b4819121e7532ec3fa6715b/assets/motion/dlp3d-ani)。下表记录本地文件、上游编号和原文件 SHA256。

| 文件 | 上游编号 | 标签 | SHA256 |
| --- | --- | --- | --- |
| [idle.vrma](../renderer/runtime/interaction/motions/idle.vrma) | 550 | 待机 | `e0b2fd0f322a3a08dd195558a5646fd58d6c475a6b4d866fb049aeaa2ac5742c` |
| [wave.vrma](../renderer/runtime/interaction/motions/wave.vrma) | 661 | 挥手 | `24acb9366c632949976b6e275143af0032372cd8af7e2cf8a2a0fcf5648022d2` |
| [laugh.vrma](../renderer/runtime/interaction/motions/laugh.vrma) | 734 | 大笑 | `c61d8b1c1ce1ce28bf8d4ba730e6eb39403e27f29a07f21f85ae1a89cbc416b9` |
| [listen.vrma](../renderer/runtime/interaction/motions/listen.vrma) | 611 | 倾听 | `6c9672c76931ac3078ef4dea9bc57287fc1dced7d2d4a65bd0520a63dd8f2953` |
| [happy.vrma](../renderer/runtime/interaction/motions/happy.vrma) | 631 | 开心 | `6c25012776be2056aeec94cb32328df7a419eed24e4b18fcdb1ced9824a177ed` |
| [sad.vrma](../renderer/runtime/interaction/motions/sad.vrma) | 748 | 伤心 | `fe3081405558c57b055f5f5382d0f826caed2b83f1eea4da72efe15fd2be9141` |
| [guilty.vrma](../renderer/runtime/interaction/motions/guilty.vrma) | 578 | 道歉 | `15a24b0f8ba04469a16f85a08dd57c9f32ef80f09469a37d7008745e1f1b8b7c` |
| [anger.vrma](../renderer/runtime/interaction/motions/anger.vrma) | 694 | 生气 | `6c9bd6b68bdadfeae141719bed48f6348bdac81592d5fb43c01cccca6a4c13e3` |
| [cute.vrma](../renderer/runtime/interaction/motions/cute.vrma) | 697 | 卖萌 | `a38290a3be4d2b44c6574611d5072517a38fa3df839d18e087b143045bc7cd96` |
| [surprise.vrma](../renderer/runtime/interaction/motions/surprise.vrma) | 664 | 吃惊 | `1a689e25a5f1c2bd0ae7d65240ca8ccdac36d7a27df8aec2e9c769f95cd5b477` |

原始 VRMA 字节保留，播放器提取上半身和手指轨道；脚和骨盆由站立支撑层控制。待机混合少量源动作变化，限制幅度和速度，并叠加本地眉眼、口型、头胸动作。合手接触按 Lumi 比例适配。当前结果是改编后的站立互动动作，不是原始整身动捕回放。

生气采用 0–4.2 秒窗口、4.6 秒反应周期；卖萌约 4.33 秒、4.4 秒反应周期。播放器负责淡入淡出、过渡和打断。具体设置以当前源码为准。

这十段动作在开发阶段作为压力测试与适配参考。成品只取上半身与手指轨道，脚和骨盆由站立支撑层控制，不是原始整身动捕回放。两个仓库的 MIT 通知均保留。没有包含《极乐净土》VMD、舞曲、上游人物或声音。

[DLP3D 许可原文](../renderer/licenses/dlp3d-code.txt) · [Rexclaw 许可原文](../renderer/licenses/motion-source.txt) · [角色授权说明](character-attribution.zh-CN.md) · [返回](README.zh-CN.md)
