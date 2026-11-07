**中文** | [English](../README.md)

# Lumi Companion for DeepSeek

DSH 原生对话人偶插件，内置原版 Lumi、表情、动作和渲染器。根据对话上下文作出反应，说话时显示口型。非商用预览版。

## 安装

已有 DeepSeek Harness 后，在终端执行：

```sh
dsh plugin --profile web add github:lazyalexander/dsh-plugin-lumi-avatar
```

然后重启该配置的 DSH：

```sh
dsh --profile web
```

在对话页点击 **Lumi** 打开人物侧栏。使用现有 DSH 中配置的 DeepSeek，不需要 npm 账号、独立 Mac 应用或另开渲染服务。首次安装会下载人物资源，请等待完成。

如果人物按钮未出现，将本仓库的 `lumi.overlay.yml` 保存到本机并运行：

```sh
dsh --profile web --patch ./lumi.overlay.yml
```

已有其他配置名时，将 `web` 换成你使用的名称。插件会在本机回环地址自动启动模型服务；退出 DSH 后停止。

## 要求与使用

- DeepSeek Harness 0.2.2-rc.1；其他版本待验证。
- Node.js 24.9+、DSH 所需的 pnpm，以及支持 WebGL 的浏览器。
- 可用的 DeepSeek 配置；API 费用由自己的账户承担。

支持平静说明、开心、大笑、严肃、吃惊、卖萌及待机，支持衔接、打断和口型归零。没有语音合成或摄像头追踪。

原模型无损压缩保存，播放时自动解压。GitHub 安装使用预编译客户端，无需批准额外构建脚本。

## 署名与许可

**代码 MIT，整包不是统一 MIT。** 保留每项素材的原署名和许可。发布者已确认公开当前原版模型和动作，按非商用预览版分发；这不替代原权利人的授权。

- 角色原型：上善无形「溟月」；女仆装二创：ZipZipPipe。[立绘来源](https://iphsiibl.github.io/deepseek-whale-girl-gallery/)；立绘衍生部分 CC BY-NC-SA 4.0，署名、非商用、衍生同协议。
- 头部：Sour暄／幻象黑兔。提供者声明原分享协议 MIT，但对应文件尚未取得；随包原 ReadMe 的非商用及额外用途限制完整保留。两份授权记录尚未完全核对。
- 动作：DLP3D／S-Lab NTU；VRMA 转换：Codemarchant／Rexclaw。代码仓库 MIT 通知保留；动作数据库逐素材再分发范围尚未独立核清。未包含《极乐净土》VMD 或音乐。

进一步转载、商用或纳入其他作品前，请核对各自原许可。独立社区项目，非 DeepSeek 官方产品。

[署名与许可](character-attribution.zh-CN.md) · [通信协议](renderer-protocol.zh-CN.md) · [动作来源](motion-sources.zh-CN.md)

## 验证

已在隔离的全新 web 配置执行上述 GitHub 命令安装并直接启动 DSH；无额外 overlay，侧栏自动出现。真实 DeepSeek 回复、张嘴和回复结束闭嘴通过。12 项本地测试通过，含模型解压一致性、路径隔离、打断和口型结束。当前实测平台为 Apple Silicon Mac；其他平台尚未实测。

[文档索引](index.zh-CN.md) · [独立 Mac 应用（另一种安装方式）](install-macos.zh-CN.md)
