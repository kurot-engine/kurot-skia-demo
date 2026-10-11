# Kurot-Skia-Demo 开发记录

记录原生接入、KUI 皮肤、Spine ×20 和「星轨疾跑」开发中已经验证的做法，
以及对应的真实运行截图。最近整理：**2026-10-11**。

| 文档 | 内容 |
| --- | --- |
| [开发经验](development-notes.md) | 应用与适配层边界、资源生成、XML 皮肤、高清九宫格、时钟、缓存和释放 |
| [验证记录](verification.md) | 逻辑测试、原生 GPU 回归、生产 JS 导出、iOS 游戏交互及当前验证范围 |
| [示例截图](screenshots.md) | Kurot UI、Spine ×20、星轨疾跑开始/游玩/暂停/结算，以及重开和返回记录 |

当前记录基于 Demo 的 npm 安装：`@kurot/skia 0.1.5`、Core `2.5.3`、UI `3.5.0`、
Spine 4.2 SDK `0.2.1` 和 RN Skia `3.3.0`。宿主为 Expo `57.0.27` / RN `0.86.3`。
这些是本次验证版本，后续升级应同步记录新的验证结果。

运行命令见[项目 README](../README.md)，玩法与原生回归分别位于
[tests/game](../tests/game/) 和 [tests/native](../tests/native/)。
截图保存在本目录的 `screenshots/`，随仓库保存，不依赖临时目录或外部图床。
