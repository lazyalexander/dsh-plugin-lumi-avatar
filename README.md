# Lumi Companion for DeepSeek

DSH 原生对话人偶插件，内置原版 Lumi、表情、动作和渲染器。根据对话上下文作出反应，说话时显示口型。非商用预览版。

A native DSH companion plugin with the retained Lumi character, expressions, motions and a bundled renderer. Reacts to conversation context with text-paced mouth animation. Noncommercial preview.

## 安装 / Install

已有 DeepSeek Harness 后，在终端执行 / With DeepSeek Harness installed:

```sh
dsh plugin --profile web add github:lazyalexander/dsh-plugin-lumi-avatar
```

然后重启该配置的 DSH / Then restart DSH with that profile:

```sh
dsh --profile web
```

在对话页点击 **Lumi** 打开人物侧栏。使用现有 DSH 中配置的 DeepSeek，不需要 npm 账号、独立 Mac 应用或另开渲染服务。首次安装会下载人物资源，请等待完成。

Click **Lumi** in the conversation page to open the avatar sidebar. Uses the DeepSeek configuration already in DSH. No npm account, standalone Mac app or separate renderer process required. First installation downloads character assets.

如果人物按钮未出现，将本仓库的 `lumi.overlay.yml` 保存到本机并运行：
If the avatar button does not appear, save this repository's `lumi.overlay.yml` locally and run:

```sh
dsh --profile web --patch ./lumi.overlay.yml
```

已有其他配置名时，将 `web` 换成你使用的名称。插件会在本机回环地址自动启动模型服务；退出 DSH 后停止。
Replace `web` with your existing profile name if different. The plugin automatically serves the character on a loopback address and stops on DSH disposal.

## 要求与使用 / Requirements and usage

- DeepSeek Harness 0.2.2-rc.1；其他版本待验证 / other versions unverified.
- Node.js 24.9+、DSH 所需的 pnpm、支持 WebGL 的浏览器 / pnpm required by DSH and a WebGL-capable browser.
- 可用的 DeepSeek 配置，API 费用由自己的账户承担 / working DeepSeek configuration; API usage is billed to your account.

支持平静说明、开心、大笑、严肃、吃惊、卖萌及待机。按本轮对话选择，支持衔接、打断和口型归零。没有语音合成或摄像头追踪。
Supports explanation, joy, laughter, seriousness, surprise, cuteness and idle, with transitions, interruption and mouth reset. No TTS or camera tracking.

原模型无损压缩保存，播放时自动解压。GitHub 安装使用预编译客户端，无需批准额外构建脚本。
The original model is stored losslessly compressed and decoded while serving. GitHub installation uses the prebuilt client without an extra prepare build script.

## 署名与许可 / Credits and licensing

**代码 MIT，整包不是统一 MIT。** 保留每项素材的原署名和许可。发布者已确认公开当前原版模型和动作，按非商用预览版分发；这不替代原权利人的授权。

**Code is MIT; the complete package is not uniformly MIT.** Original asset credits and licenses are retained. The provider explicitly authorized this noncommercial preview containing the retained model and motions; that authorization does not replace underlying rightsholder grants.

- 角色原型：上善无形「溟月」；女仆装二创：ZipZipPipe。[立绘来源](https://iphsiibl.github.io/deepseek-whale-girl-gallery/)；立绘衍生部分 CC BY-NC-SA 4.0，署名、非商用、衍生同协议。
- Character: 上善无形 / 溟月; maid derivative: ZipZipPipe. Illustration-derived work: CC BY-NC-SA 4.0, attribution, noncommercial and ShareAlike.
- 头部：Sour暄／幻象黑兔。提供者声明原分享协议 MIT，但对应文件尚未取得；随包原 ReadMe 的非商用及额外用途限制完整保留。两份授权记录尚未完全核对。
- Head: Sour暄 / 幻象黑兔. The provider reports MIT sharing terms, but the corresponding file has not been obtained. Original ReadMe with noncommercial and additional use restrictions is retained; these records have not been fully reconciled.
- 动作：DLP3D／S-Lab NTU；VRMA 转换：Codemarchant／Rexclaw。代码仓库 MIT 通知保留；动作数据库逐素材再分发范围尚未独立核清。未包含《极乐净土》VMD 或音乐。
- Motions: DLP3D / S-Lab NTU, VRMA conversion by Codemarchant / Rexclaw. Repository MIT notices retained; per-asset motion redistribution scope has not been independently established. No Gokuraku Jodo VMD or music included.

进一步转载、商用或纳入其他作品前，请核对各自原许可。独立社区项目，非 DeepSeek 官方产品。
Check underlying terms before redistribution, commercial use or incorporation into another work. Independent community project, not an official DeepSeek product.

[完整声明 / Full notices](ASSET-NOTICES.txt) · [通信协议 / Renderer protocol](docs/renderer-protocol.md)
