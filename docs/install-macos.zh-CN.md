# 安装 Lumi Companion for DeepSeek（Mac）

这是自带 DeepSeek Harness、Lumi 模型和运行环境的应用安装包。插件代码版本为 0.3.7。当前作为预览版提供。

## 下载和安装

1. 从 [Mac 简洁预览版 Release](https://github.com/lazyalexander/dsh-plugin-lumi-avatar/releases/tag/companion-macos-0.3.7-preview) 下载 `Lumi-Companion-for-DeepSeek-Mac.zip`（约 350 MB）。
2. 双击解压，将 `Lumi Companion for DeepSeek.app` 拖到“应用程序”。
3. 双击应用，浏览器会打开本机启动页面。
4. 输入自己的 DeepSeek API 密钥，点击“启动 Lumi”，等待 DSH 和模型加载。
5. 新建对话，在右侧 Lumi 面板中与她互动。回复会根据上下文切换表情和动作，并显示文字节奏口型。

适用于 Apple Silicon Mac（M 系列芯片）；Intel Mac、Windows 和 Linux 尚未验证。无需另装 Node、Python、Homebrew 或 DSH。需要联网访问 DeepSeek，API 使用费用由自己的账户承担。当前不包含语音合成或麦克风对话。

## 首次打开被系统阻止

应用采用本机签名，尚未经过 Apple 公证。如果 macOS 阻止打开：先尝试打开一次，再进入“系统设置 → 隐私与安全性”，查看该应用的提示并选择“仍要打开”。仅在确认从本仓库下载后操作。不需要关闭 Gatekeeper 或系统完整性保护。

## 使用和退出

- 首次模型加载可能需要等待；如面板未就绪，可刷新 DSH 页面，或退出应用后重新启动。
- 如果右侧没有人物，点击对话页面的“Lumi”按钮。
- 密钥仅用于当前运行，不写入 Lumi 配置。自己的对话会发送给 DeepSeek；聊天记录和本地运行日志可能保存在本机。
- 本机数据目录：`~/Library/Application Support/Lumi Companion for DeepSeek`。应用使用独立配置，不覆盖已有 DSH 配置。
- 关闭浏览器标签不等于退出服务；从 Dock 退出 Lumi 应用可停止本次服务。
- 卸载时删除应用即可；若也要删除聊天记录和配置，请在退出应用后自行删除上述数据目录。

## 校验下载

同一 Release 下载 `SHA256SUMS`，在下载目录运行：

```sh
shasum -a 256 -c SHA256SUMS
```

ZIP 的 SHA256：`f7dd45b929cd414720acb44150d54e581bc057e7816230d1662d8f95c246f7dd`。

## 署名与许可

这是独立社区项目，不是 DeepSeek 官方产品。插件代码 MIT 不代表整个人物和动作均为 MIT。

- 角色原型：上善无形「溟月」；女仆装鲸鱼娘二创：ZipZipPipe。立绘来源：[角色图集](https://iphsiibl.github.io/deepseek-whale-girl-gallery/)，立绘衍生部分遵循 CC BY-NC-SA 4.0；保留署名、非商用、衍生同协议。
- 原版头部素材：Sour暄／幻象黑兔。提供者声明原分享协议为 MIT，但对应许可文件尚未取得；包内原 ReadMe 的额外条款完整保留，未将其删除或改标 MIT。
- 动作：DLP3D／S-Lab NTU；VRMA 转换：Codemarchant／Rexclaw。仓库 MIT 通知已保留，动作数据库的逐素材再分发授权尚未独立核清。
- Lumi 修改：比例、五官、发型服饰、绑定、表情及动作适配。

本次是提供者要求发布的非商用预览包，不代表素材许可核查已经完成。进一步转载、商用或纳入其他作品前，请核对包内各项许可及权利人授权。完整声明可在启动页“署名与许可”和应用资源中的 `licenses` 目录查看。

## 验证范围

已在当前 Apple Silicon Mac 上启动内置 DSH，实际调用 DeepSeek 回复，确认人物连接、说话时张嘴以及回复结束后闭嘴。曾有一次加载超时，重新启动后通过。尚未在另一台全新 Mac 上验证，也未完成 Apple 公证。
