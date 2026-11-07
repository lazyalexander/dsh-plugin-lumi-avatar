# Lumi 日常动作试用来源

于 2026-11-05 下载并实际重定向了七个现成动画。它们不是本项目录制的动捕；原始制作方式未单独核实。

原始动作库：Digital Life Project 2 / DLP3D，S-Lab, Nanyang Technological University。
- https://github.com/dlp3d-ai/dlp3d.ai
- https://dlp3d.readthedocs.io/en/latest/_subrepos/web_backend/data_preparation.html

下载的 VRMA 转换版：Codemarchant / Rexclaw。
- https://github.com/Codemarchant/rexclaw/tree/ea143024229f3c119b4819121e7532ec3fa6715b/assets/motion/dlp3d-ani
- 转换程序：https://github.com/Codemarchant/rexclaw/blob/ea143024229f3c119b4819121e7532ec3fa6715b/tools/motion/dlp3d_npz2vrma.py

| 本地文件 | 原文件 | 动作 | SHA256 |
| --- | --- | --- | --- |
| idle.vrma | 550.vrma | neutral idle | e0b2fd0f322a3a08dd195558a5646fd58d6c475a6b4d866fb049aeaa2ac5742c |
| wave.vrma | 661.vrma | waves hello | 24acb9366c632949976b6e275143af0032372cd8af7e2cf8a2a0fcf5648022d2 |
| laugh.vrma | 734.vrma | surprised laugh, flicks hand | c61d8b1c1ce1ce28bf8d4ba730e6eb39403e27f29a07f21f85ae1a89cbc416b9 |
| listen.vrma | 611.vrma | attentive listening | 6c9672c76931ac3078ef4dea9bc57287fc1dced7d2d4a65bd0520a63dd8f2953 |
| happy.vrma | 631.vrma | happy cheer, fist pump | 6c25012776be2056aeec94cb32328df7a419eed24e4b18fcdb1ced9824a177ed |
| sad.vrma | 748.vrma | deep breath, hands fall, disappointed | fe3081405558c57b055f5f5382d0f826caed2b83f1eea4da72efe15fd2be9141 |
| guilty.vrma | 578.vrma | hands together, bow of thanks/apology | 15a24b0f8ba04469a16f85a08dd57c9f32ef80f09469a37d7008745e1f1b8b7c |

原文件字节不改，每段读取 49 条身体/手指旋转轨道。旧版固定骨盆位置却保留腿部旋转，造成偏脚和悬空，已停用该组合。当前仅采用上半身/手指源动作，双脚和骨盆由站立支撑层控制：固定脚踝、保持鞋底水平、正向屈膝。待机在固定参考姿态周围混合 12% 原素材变化，上臂向内约 15.5 度，循环重叠 0.7 秒。各反应限制幅度与速度，愧疚合手针对 Lumi 前臂长度做接触适配。眉眼、口型及小幅头胸动作是运行时叠加。点头为局部叠加，说话身体使用待机。这些结果是经过改编的站立互动动作，不是原始整身动捕回放。

两个项目的 LICENSE 原文随本目录保存。DLP3D 的 README 同时明确第三方模型和社区资产可能另有条件；仓库 MIT 不能单独证明每一段原始动画的完整授权链。因此本包用于现有私有项目内的适配评审，不将这些来源概括为可任意公开再分发或商用。未下载或使用 DLP3D 的人物模型、配乐或声音。


## 2026-11-06 生气与卖萌候选

本轮从同一固定版本的 155 段索引筛选并实际试演九段。选择 694 和 697 替换六情绪播放器中的 anger / cute 身体映射。

| 本地文件 | 原文件 | 原标签 | SHA256 |
| --- | --- | --- | --- |
| anger.vrma | 694.vrma | fists and stomp, angry / 双手挥拳，生气地跺脚 | 6c9bd6b68bdadfeae141719bed48f6348bdac81592d5fb43c01cccca6a4c13e3 |
| cute.vrma | 697.vrma | fists under chin, little bounces / 双手握拳托在下巴下，轻轻蹦跳 | a38290a3be4d2b44c6574611d5072517a38fa3df839d18e087b143045bc7cd96 |

原始 VRMA 字节完整保留。播放 anger 的 0–4.2 秒窗口，在 4.6 秒反应周期内淡入淡出。cute 使用原片完整约 4.33 秒，反应周期 4.4 秒。两段采用上半身与手指轨道，脚掌支撑由现有本地控制器处理。生气幅度 0.95、卖萌幅度 1.10，乘以指令强度并限制在 0–1。手指单独使用 1.35 系数，使握拳在中等身体强度下更完整。小幅头胸偏置减少，避免与源动画重复叠加。

[九段候选索引与来源](../../../reports/dlp-emotion-adaptation/candidates.json)、[下载哈希](../../../reports/dlp-emotion-adaptation/downloads.json)及[实际观察记录](../../../reports/dlp-emotion-adaptation/README.md)保留了选择与淘汰依据。本轮沿用上面的来源与私有评审条件。


## 2026-11-06 吃惊样本

新增 `surprise.vrma`，来自同一固定版本的 `664.vrma`，标签为 shrug back, surprised nod。SHA256 为 `1a689e25a5f1c2bd0ae7d65240ca8ccdac36d7a27df8aec2e9c769f95cd5b477`。源文件字节保留，播放器读取上半身轨道并与本地表情、站立支撑及姿态衔接组合。[原始地址与哈希](../../../reports/conversation-samples/source.json)记录下载，沿用本文件的来源说明与私有评审条件。
