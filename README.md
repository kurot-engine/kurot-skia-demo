# Kurot-Skia-Demo

完整的 Expo / React Native 示例，使用 npm **`@kurot/skia@0.1.5`** 的渲染与 Spine
共享缓存。package.json、lockfile 和安装版本均固定为 0.1.5。
渲染、Metro 适配和 `kurot-project` 生成器来自安装包。项目不依赖相邻的库目录，
也不直接导入其 `dist`。
宿主保持 Core 2.5.3、UI 3.5.0、RN Skia 3.3.0；Spine 示例使用已发布的 Spine 4.2 SDK 0.2.1。
Core/UI/Spine SDK 源码与 Web 工作流保持不变。
0.1.5 增加可选 Picture 缓存、内部目录整理和导出分组，应用继续使用公开包入口。
Picture 缓存需显式创建 `NativePictureCache`，失效/释放及测量限制见安装包内
`docs/native-runtime.md`。延续 0.1.4 的通知回调行为，更新 `onStats` / `onError` 时保留场景实例；
`createScene` 或视口变化仍会重新创建场景。

## 开发文档与截图

[docs](docs/README.md) 收录这次原生接入和示例开发的经验：

- [开发经验](docs/development-notes.md)：KUI 皮肤、资源生成、高清九宫格、Spine 时钟、缓存和生命周期。
- [验证记录](docs/verification.md)：游戏逻辑、生产 JS、iOS 交互与历史原生 GPU 回归的验证范围。
- [示例截图](docs/screenshots.md)：UI、Spine ×20 和「星轨疾跑」，包含开始、游玩、暂停、结算与返回。

## 运行

```sh
pnpm install --frozen-lockfile

# 第一次安装原生开发客户端
pnpm ios --device "iPhone 17 Pro"
# 或
pnpm android

# 已有 development build：生成器监听 + Expo，一条命令
pnpm dev --clear --ios
pnpm dev --clear --android
```

Expo Go 不包含此项目的 Skia 原生模块。现有包含 Skia 3.3.0 的 development build 可以复用；
内嵌 JS 的 Release 应用需要重新构建。当前宿主是 Expo 57 / RN 0.86.3 / React 19.2.3，
需要 Node.js >=22.13。iOS 使用 Metal；Android 最低 API 26，需要 Vulkan。

## 示例游戏：星轨疾跑

启动进入竖屏跑酷小游戏。Spineboy 自动前进，场景由 Core Graphics 绘制；HUD、按钮和
开始/暂停/结算面板全部来自 `resource/ui/skins/RunnerSkin.kui.xml`，复用现有 2× KUI 图集。
游戏使用 360×780 逻辑舞台等比适配，平板或较短屏幕保留空白边，避免跳跃空间挤进 HUD。

- 点击「开始奔跑」，点按画面或底部「跳跃」按钮起跳；空中可以再跳一次，落地恢复。
- 避开粉色路障，收集绿色晶体。晶体加 25 分，距离也计分，速度逐渐增加。
- 碰撞损失一条生命，短暂无敌时角色闪烁；三条生命用完后显示结算，可立即重开。
- 「暂停」冻结游戏和 Spine；应用进入后台也暂停，回来后点击「继续奔跑」。
- 最佳分数只保留在本次应用运行中，切换实验室后仍保留；没有持久存档。
- 菜单中的「Spine / UI 实验室」保留原 20 角色展示，再从 UI 页面返回游戏。

游戏用原 SDK 的实时 `SkeletonRenderer` 播放 `idle/run/jump/death`，场景显式推进骨骼时钟，
不注册额外 ENTER_FRAME 回调。素材的 jump 自带垂直位移，因此跳跃期间抵消其脚底偏移，
统一使用游戏物理高度。碰撞框采用固定的逻辑身体尺寸，不把武器和动画摆动当作伤害范围。
物理使用 120 Hz 固定步长，单帧最多追赶 100 ms；障碍/晶体离屏后移除，重开时清空。
退出场景先移除 UI 事件和骨骼，再释放借用图集；未完成的资源加载也会在结束后释放。

这是一个无音频、无存档的完整玩法示例。新游戏不需要新的 SDK、
原生模块或额外素材，原始 Spine 许可保持不变。

## Spine 实验室

实验室显示 **20 个 Spineboy**，使用原始 `walk` 动作与骨骼/图集，默认错开 61 ms 相位并开启
60 Hz 共享缓存。所有文字和按钮都由 Kurot UI/KUI 绘制，画布保持全屏。

- 「缓存 60 Hz / 实时骨骼」切换共享预采样和原 SDK 实时计算。
- 「错开相位 / 同步相位」切换角色的初始动画相位。
- 「暂停 / 继续」控制播放。
- 「原来的 UI」进入原 Label/Button 页面，可点击计数和切换禁用状态；页面底部可返回 Spine 或游戏。

缓存由 `NativeSpineAnimationCache` 在资源加载后创建，复用已有 SDK 的 `SkeletonAnimation` 和
`skeletonData`。20 个播放器共享 60 个几何姿态，数字数组约 1 MB；各自保留独立时钟和显示变换。
此示例用 `autoUpdate: false`，在场景 `update(deltaSeconds)` 中手动推进缓存时钟。
实时模式保留原 SDK ticker。退出场景时先释放播放器和缓存，再释放借用的图集。

缓存针对固定循环动作/皮肤，不提供实时骨骼修改、混合、队列或时间轴事件；这些功能使用原 SDK。
60 Hz 是姿态采样率，页面没有将绘制提交次数当作实际 FPS。
库的 Release 模拟器性能记录和剩余真机验收见安装包内 `docs/native-spine-shared-cache.md`。

## 文件与资源

| 文件 | 作用 |
| --- | --- |
| `App.tsx` | 加载 Core Resource、切换场景与全屏 KurotView |
| `src/game/runner/RunnerScene.ts` | 游戏场景、输入、前后台暂停与资源生命周期 |
| `src/game/runner/RunnerModel.ts` | 固定步长物理、二段跳、生成、碰撞与计分 |
| `src/game/runner/RunnerHero.ts` | 实时 Spine 动作与物理高度对齐 |
| `src/game/runner/RunnerWorld.ts` | Graphics 城市、地面与游戏对象 |
| `src/game/runner/RunnerUI.ts` | XML 皮肤部件与游戏状态/操作绑定 |
| `resource/ui/skins/RunnerSkin.kui.xml` | 游戏 HUD、控制与菜单皮肤 |
| `src/game/SpineShowcase.ts` | 20 角色、缓存/实时/相位/暂停控制与资源清理 |
| `src/resources/spine.ts` | 原 SDK 加载 binary skeleton 和 atlas |
| `src/game/UIShowcase.ts` | 原始 Label/Button/KUI 皮肤与点击交互 |
| `src/game/Playground.ts` | 保留的基础显示对象演示 |
| `src/resources/bundled.ts` | 注册生成的资源表 |
| `src/ui/native-ui.ts` | 项目 Resource 与主题初始化/恢复 |
| `src/generated/kurot/` | 生成的资源、KUI 工厂、主题入口 |
| `resource/spine/4.2/` | 原始 Spineboy `.skel`、`.atlas` 和 PNG |
| `tests/native/` | npm 运行时的真实 JSI/GPU 集成测试 |
| `tests/game/` | 独立于渲染器的游戏物理和状态测试 |

`resource/resource.json` 保留原 sheet、object subkeys、2× 图集和 KUI。
Spine skeleton 与 atlas 使用 `text` 声明，生成器识别 `.skel` 并无损嵌入二进制，自动收集
`.atlas` 的 PNG 页。SDK 通过逻辑 `resource/spine/4.2/` URL 加载，不需要动态 require 或 HTTP 服务。
Spine 示例资源随附 `resource/spine/LICENSE`，保留上游版权与授权信息。

```sh
pnpm generate:project
pnpm watch:project
```

`pnpm dev/start/ios/android/test:native` 会先生成并持续监听 `resource.json`、图片、atlas、
骨骼、KUI 和样式。新增/删除皮肤自动更新注册；无效输入保留上次生成结果，修复后恢复。
生成器不会原位替换运行中的 Resource 缓存和 Skin 实例，修改资源后需要重新加载应用。

九宫格保留 0.1.2 的原生 `drawImageNine` 与图集子图缓存；分割线必须落在整数物理像素，
2× 密度的 0.5 逻辑坐标有效。现有皮肤无需修改。

## 验证

2026-10-11 已验证 npm 0.1.5 的发布、下载完整性和 130 个编译文件，安装与冻结 lockfile、
资源生成、TypeScript、lint 及 iOS/Android 生产 JS 导出均通过。Skia/UI/Spine 与应用共享一份 Core 2.5.3。
现有依赖树保留 Metro peer 提示：RN community CLI 要求 0.86.3，锁文件中的 Metro config 为 0.87.1。

npm 0.1.3 的历史原生验收记录：
iPhone 17 Pro / iOS 26.5 模拟器的 Release 测试入口显示全部 PASS，包含下面的 GPU 与缓存回归。
普通 Release Demo 也已验证 20 个角色、缓存/实时切换、相位、暂停恢复，以及 UI 点击、
启用状态和往返切换；模拟器留在默认缓存 Spine 页面。本次验证没有测量真机帧率。

```sh
pnpm generate:project
pnpm exec tsc --noEmit
pnpm lint
pnpm test:game

# 真实模拟器/设备 JSI 与 GPU 测试；先停止普通 Metro
pnpm test:native --ios --clear
# 或
pnpm test:native --android --clear
```

测试页显示 PASS/FAIL，控制台记录具体结果。包含显示树/触摸、资源销毁与重载、TextField、
原 KUI 状态、原有 **48 项九宫格 GPU 用例**和子图缓存生命周期。
新增 npm Spine 缓存回归检查 20 个独立相位、四个采样时刻的 GPU 像素与原 SDK 独立绘制对照，
以及暂停/时钟/缓存销毁和图集所有权。像素容差保持 2，不放宽九宫格用例。
TextField 测试更新为验证原生 INPUT 初始化；实际键盘/IME 的完整验收记录在库文档中。

测试结束后停止测试 Metro，再运行 `pnpm dev --ios --clear` 返回普通示例。
`KUROT_NATIVE_TESTS=1` 只切换测试入口，普通入口不加载测试代码。Node 无法替代真实 Skia JSI 测试。

`pnpm test:game` 编译并运行 8 项 Node 测试：暂停/结束冻结、二段跳与落地、碰撞保护、
晶体计分、30/60/120 Hz 一致性、长帧限制、重开和种子复现，以及 90 秒递增速度的可玩性和对象清理。
结果输出到已忽略的 `dist/game-tests`。这套测试不代替原生绘制或触摸验收。

2026-10-11 的游戏验收：生成、类型检查、lint、8 项逻辑测试和 iOS/Android 生产 JS 导出通过。
复用现有 Skia 3.3.0 Release 原生宿主，加载当前生产 JS，在 iPhone 17 Pro / iOS 26.5 模拟器
使用 XCTest 实际点按检查开始、二段跳、暂停/继续、结算、重开和实验室往返；暂停间隔 3 秒
的两张截图完全一致，返回游戏保留本次运行最佳分数。Android 尚未进行设备运行验收。

## 使用与开发库

应用只从 `@kurot/skia`、`@kurot/skia/metro` 的安装包入口导入，生成命令也使用其 `bin`。
Metro 在 iOS/Android 上选择一份宿主 Core，并把浏览器能力接到库的原生端口。
此适配依赖 SDK 内部布局，因此宿主固定 Core 2.5.3 / UI 3.5.0；升级前需重新验证。
游戏逻辑和骨骼实时计算仍在 JS，Skia 原生 Graphite/Dawn 负责绘图，没有 WebView。

库的特性/限制见安装包内 `README.md`、`docs/native-runtime.md`、`docs/native-feature-assessment.md`；
音视频需要项目自己的媒体后端，真机持续帧率/内存/温升和 Android 实际 IME 尚未验收。
联合开发库源码时，先明确切换到本地 `file:` 依赖，再按库的 `docs/development.md` 使用开发 supervisor。
不要将库源码同步到本 Demo 的 npm 安装中。
