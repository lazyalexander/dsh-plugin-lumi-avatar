**中文** | [English](renderer-protocol.md)

# 渲染器通信协议 v1

DSH 客户端通过 iframe 嵌入 `config.avatarUrl`，并追加 `embed=1` 和 `host_origin=<精确的父页面来源>`。渲染器须校验父页面来源及 `event.source`；父页面也须校验渲染器来源及窗口，再传递通道。

## 握手

播放器就绪后，子页面向精确的父页面来源发送 `{type: 'lumi.available', version: 1}`。父页面回复 `{type: 'lumi.connect', version: 1}`，并移交一个 MessagePort。子页面在通道上发送 `{type: 'ready', version: 1, states: [...]}`。每个 iframe 只接受一个父页面连接。

命令格式为 `{id, type, payload}`，回复为 `{id, result}` 或 `{id, error}`。请求 ID 为不超过 100 字符的字符串。这些是本地播放消息，不包含服务商密钥或 DSH 身份验证令牌。

## 播放器适配器

`connectAvatarEmbed(player)` 接受提供下列方法的对象。

| 方法 | 行为 |
| --- | --- |
| `beginTurn(turnId, waitSeconds)` | 使旧播放失效，开始有时限的等待并返回回执 |
| `respond(command)` | 校验并提交反应，返回回执 |
| `cancel()` | 停止说话，平滑回到待机 |
| `snapshot()` | 返回播放器当前实际渲染状态 |

`react` 的 payload 是播放器命令：

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

动作名称支持 `explain`、`cute`、`joy`、`laugh`、`serious`、`surprise`、`idle`；情绪名称还接受表示平静待机的 `neutral`。播放器须验证强度为有限数值，校验轮次及命令 ID，拒绝旧轮次、去重并限制文本长度。适配器先限制状态名，播放器负责完整校验及姿态执行。

接受命令时 `respond` 返回 `{type: 'started', ...}`。重复或拒绝回执不得重启播放。`snapshot()` 必须包含 `state`、`gesture`、`emotion`、`command_id` 和 `speech: {active: boolean}`。`state: 'acting'` 表示身体动作仍在执行；身体和说话都结束后变为 `idle`。适配器向父页面将说话状态暴露为 `speechActive`。快照来自实际渲染状态，新命令可能到下一帧才显示。

`begin` 携带 `{turn_id}`；`cancel` 不带 payload；`snapshot` 只返回上述有限观察字段。未知消息类型会被拒绝，异常作为当前请求的错误返回。父页面的命令超时为五秒，初始化超时为两分钟。

动画混合、表情过渡、口型时序、脚部支撑和碰撞处理由渲染器负责。协议传递有限范围的表现意图，而非骨骼变换。

[返回中文说明](README.zh-CN.md)
