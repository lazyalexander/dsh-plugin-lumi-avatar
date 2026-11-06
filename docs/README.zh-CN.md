# Lumi Avatar · DeepSeek Harness 情绪插件

此插件让 DSH 根据当前对话选择平静说明、卖萌、惊喜、严肃说明、吃惊或待机，再把同轮完成回复交给人偶播放器，同时表现身体动作和脸部情绪。

插件代码使用 MIT 许可。模型、贴图和动作由使用者另行提供并确认使用权限。公开仓库以全新根提交导出插件代码，旧私有项目的历史、聊天、录屏和角色素材不会进入这个仓库。

## 安装

需要 Node.js >=24.9、DeepSeek Harness 0.2.2-rc.1 和支持本仓库协议的人偶播放器。

```sh
git clone https://github.com/lazyalexander/dsh-plugin-lumi-avatar.git
cd dsh-plugin-lumi-avatar
npm ci
npm test
npm pack
dsh --profile lumi --from-default-profile web --help
dsh plugin --profile lumi add /absolute/path/to/dsh-plugin-lumi-avatar-0.3.2.tgz
```

将 `lumi.overlay.yml` 中的 `avatarUrl` 改为实际播放器地址，先启动播放器，再启动 DSH。

```sh
dsh --profile lumi --patch /absolute/path/to/lumi.overlay.yml --no-open
```

浏览器加载当前会话后，DSH 模型在原有上下文中调用 `lumi_react` 选择表现。插件确认同轮工具成功执行后，发送完成回复和表现状态。调用失败或缺失时待机兜底。中断回复不播放，切换会话时释放旧连接，动作和文字口型结束后回到待机。

## 播放器

当前仓库交付插件代码和可嵌入的通信适配器。人偶外观、动画和形态键由独立播放器实现。播放器接口、消息格式和来源检查见 [协议](renderer-protocol.md)。通过 `avatarUrl` 可以接入已有本机 Lumi 播放器或自己的兼容实现。

插件会向配置的播放器发送完成回复的前 2,000 字，用于按文字节奏驱动口型。请将此地址配置为你认可的服务。情绪选择与普通回复共用 DSH 现有推理，请求中包含插件提示与工具定义。模型仍可能漏调用表现工具，插件会回到待机。

已验证 DSH Web 的六种状态与播放恢复。桌面自定义协议、远程部署和自动管理播放器进程仍待验证。

## 开发

运行 `npm test` 检查转录与播放生命周期，`npm run build` 生成 DSH 浏览器模块，`npm run check:release` 检查公开文件和打包清单。依赖保留各自许可。

普通聊天默认平静说明；卖萌仅用于当前明确邀请，不延续到后续话题。笑话可选择 `laugh`，意外事件选择 `surprise`，重要说明和纠错选择 `serious`。
