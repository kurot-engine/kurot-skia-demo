# 验证记录与测试经验

记录日期：2026-10-11。截图见[示例截图](screenshots.md)。

## 当前游戏的验证结果

环境：npm Skia `0.1.5`、Core `2.5.3`、UI `3.5.0`、Spine 4.2 SDK `0.2.1`、
RN Skia `3.3.0`、Expo `57.0.27` / RN `0.86.3`。

| 验证 | 结果与范围 |
| --- | --- |
| 冻结锁文件安装 | 通过，应用与适配层共用一份 Core |
| 资源与 KUI 生成 | 通过，生成 7 个资源条目、2 个皮肤 |
| TypeScript / lint | 通过 |
| Node 游戏模型测试 | 8/8 通过 |
| iOS 生产 JS 导出 | 通过 |
| Android 生产 JS 导出 | 通过；尚未进行游戏的 Android 设备运行验收 |
| iOS Release 游戏交互 | iPhone 17 Pro / iOS 26.5 模拟器，XCTest 实际点按通过 |

iOS 游戏验收复用了已有的 Skia 3.3.0 Release 原生宿主，嵌入当前生产 JS 和资源。
这次没有重新编译原生 SDK，也没有测量物理设备的持续 FPS、内存或温升。
JS 导出确认打包与资源路径，设备运行还需要对应平台的原生验收。

### 8 项游戏逻辑测试

[tests/game/runner.test.ts](../tests/game/runner.test.ts) 覆盖：

1. 准备、暂停、结束时冻结模型，并拒绝无效跳跃。
2. 二段跳上限与落地恢复。
3. 路障只触发一次，受伤无敌时间生效。
4. 跳过路障、晶体只计一次分。
5. 30/60/120 Hz 更新得到一致的模型结果。
6. 长帧、负数和非有限 delta 的处理。
7. 重开清理状态，种子可复现波次。
8. 90 秒速度递增的自动游玩、收集与离屏清理。

```sh
pnpm generate:project
pnpm exec tsc --noEmit
pnpm lint
pnpm test:game
git diff --check
```

模型测试产物放在已忽略的 `dist/game-tests`。测试模型不需要加载 RN 或 Skia JSI。

### iOS 实际交互与截图

本次临时 XCTest `RunnerControls/testOpenAndPlay()`：1/1 通过，0 个失败，导出 9 张截图。
它检查开始、二段跳、暂停/继续、结算、重开、进入 Spine/UI 实验室和返回游戏。
暂停后间隔约 3 秒的 PNG 完全一致；实验室返回后的菜单保留本次运行最佳分数 338。

截图原始尺寸为 1206×2622，原样保存到 [screenshots](screenshots/)，未裁切或缩放。
[capture.json](screenshots/capture.json) 记录捕获环境、测试来源、时间和文件 SHA-256。
XCTest 工程是本次验收的临时工具，没有加入仓库，`test:native` 不包含这套游戏坐标脚本。

## 保留原有 GPU 回归

历史 npm Skia 0.1.3 验收在 iPhone 17 Pro / iOS 26.5 的 Release 模拟器通过：

| 测试文件 | 检查内容 |
| --- | --- |
| [adapter.test.ts](../tests/native/adapter.test.ts) | 显示树、原生适配和触摸 |
| [resources.test.ts](../tests/native/resources.test.ts) | 资源加载、销毁与重载 |
| [text.test.ts](../tests/native/text.test.ts) | TextField 与原生 INPUT 初始化 |
| [ui.test.ts](../tests/native/ui.test.ts) | KUI 编译皮肤和控件状态 |
| [gpu-nine-slice.test.ts](../tests/native/gpu-nine-slice.test.ts) | 48 项真实 GPU 九宫格用例 |
| [nine-slice-cache.test.ts](../tests/native/nine-slice-cache.test.ts) | atlas 子图缓存生命周期 |
| [spine-cache.test.ts](../tests/native/spine-cache.test.ts) | 20 个独立相位、4 个 GPU 姿态对照、时钟、释放和图集所有权 |

普通 Release Demo 的 UI 点击、禁用/启用、Spine 缓存/实时、相位、暂停和往返切换也通过历史验收。
九宫格像素容差保持 2。新增玩法测试不替代这些原生回归；本次游戏开发没有重跑全部 GPU 用例。

```sh
# 先停止普通 Metro，再启动测试入口
pnpm test:native --ios --clear
# 或在 Android 原生客户端中执行
pnpm test:native --android --clear
```

测试页和控制台显示 PASS/FAIL。结束后停止测试 Metro，再用 `pnpm dev --ios --clear`
回到普通入口。`KUROT_NATIVE_TESTS=1` 只选择测试 App，普通应用不加载原生测试代码。

## 这次自动化的经验

### 先确认起点，再执行触摸

模拟器可能停留在上一次的实验室页面。直接复用坐标会点击错误控件，甚至产生看起来正常的截图。
本次先遇到起始页面不对的问题，改为终止应用、重新启动，再检查开始菜单后执行操作。
每个关键状态都保存截图，并断言暂停画面稳定，而不是只看测试进程退出成功。

开发 URL scheme 也可能被不同测试 App 共用。自动化应指定应用的 bundle identifier，
确认安装包和当前入口，避免启动到 GPU 测试 App 或系统确认页。

### 把绘制验收放在真实原生环境

Node 测试适合状态与物理；Skia JSI、GPU 像素、文字、九宫格和触摸由原生测试验证。
压缩后的生产 JS 还要检查皮肤注册与资源加载，开发模式的成功不能覆盖生产模式。
有 `simctl` 和 XCTest 时，即使 Simulator GUI 不可用，也能完成原生点按和截图验收。

### 性能记录说明测量口径

Spine 的 60 Hz 是采样频率，适配层的 draws 是绘制操作数。
Picture 命中或一次 `drawPicture` 都不能直接推导 GPU draw call 或实际呈现 FPS。
对照普通绘制、图像缓存与 Picture 时，保持相同内容和变换，并分别记录录制、提交和 GPU 等待成本。
库已有对照记录位于安装包的 `docs/native-runtime.md` 和 `docs/native-spine-shared-cache.md`。
本次游戏截图不提供新的性能结论。

下一步原生验收重点是 Android 游戏触摸/绘制，以及两端物理设备的持续运行表现；
完整键盘/IME 也需要对应设备交互记录。
