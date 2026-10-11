# 开发经验

整理日期：2026-10-11。示例画面见[截图页](screenshots.md)，测试范围见[验证记录](verification.md)。

## 1. 把应用、引擎和原生适配的职责分清

React Native 管理 `KurotView` 的挂载和场景选择；Kurot 管理显示树、布局、事件和游戏逻辑；
Skia 适配层把图片、文字、Graphics、Mesh 和缓存绘制接到原生后端。
UI 与 Spine 都在同一套 Kurot Stage 中，游戏没有 WebView。

当前应用通过公开的 `@kurot/skia`、`@kurot/skia/metro` 和安装包的 `kurot-project`
命令接入。平台适配应放在 Skia 库中，游戏玩法和场景组织留在应用中。
这次加入跑酷、XML HUD 和实时 Spine，没有修改 Core/UI/Spine SDK。

[metro.config.js](../metro.config.js) 用 `createKurotResolver` 选择原生端口，
并让应用、UI、Spine 和生成的皮肤共用一份宿主 Core。
重复的 Core 会破坏对象身份，例如 `instanceof`、纹理与 UI 部件的判断。
排查异常时，要同时检查声明、锁文件和实际安装树。

Demo 固定使用已验证的 npm 版本。联合开发库源码时，显式切换到本地 `file:` 依赖，
并使用库的开发流程；不要把相邻库的 `dist` 覆盖进 npm 安装目录。
否则本地运行结果与锁文件描述的环境会分离。

## 2. 资源和 XML 皮肤先生成，再运行

资源入口为 [resource/resource.json](../resource/resource.json)。
[src/resources/bundled.ts](../src/resources/bundled.ts) 注册生成的静态资源映射，
Core Resource 与 Spine 加载器仍使用逻辑资源名或 URL。

```text
resource.json / PNG / atlas / skel / KUI / style.json
                     ↓ kurot-project
             src/generated/kurot/
                     ↓ Metro
          Resource + Theme + 原生绘制
```

```sh
pnpm generate:project
pnpm watch:project
pnpm dev --clear --ios
```

`dev/start/ios/android/test:native` 已串接生成器和监听，不需要分别启动两套开发命令。
生成目录中的资源表、皮肤工厂与主题入口随源码提交，由生成器维护。
新增/删除皮肤后也要同步生成结果；手改工厂会在下次生成时丢失。

原始 Spine `.skel` 和 `.atlas` 在 manifest 中以 `text` 声明；生成器识别二进制骨骼，
无损嵌入并收集 atlas 的 PNG 页。项目的
[loadSpineAssets](../src/resources/spine.ts) 继续使用原 SDK 加载器，
不需要临时 HTTP 服务、动态 require 或转换骨骼格式。保留资源目录中的 Spine 许可。

资源监听会更新生成文件，但不会原位替换运行中的 Resource 缓存或 Skin 实例。
修改图片、骨骼、XML 或样式后重新加载应用，才能确认新资源已生效。

## 3. KUI 的视觉和行为分别维护

「星轨疾跑」的 HUD、按钮、遮罩和开始/暂停/结算面板都写在
[RunnerSkin.kui.xml](../resource/ui/skins/RunnerSkin.kui.xml)。
[RunnerUI](../src/game/runner/RunnerUI.ts) 只查找命名部件、绑定事件和更新数据。
这样同一套皮肤仍可继续通过 KUI 工具编辑，也能复用原有 2× 图集。

创建组件前先调用 [installNativeUI](../src/ui/native-ui.ts)：

1. 保存原 AssetAdapter 和 Theme。
2. 注册 Metro 静态编译的 Skin 模块与工厂。
3. 让 Image 的资源查询使用场景现有的 Core Resource。
4. 创建 Theme，再创建使用皮肤的组件。

它返回恢复函数，场景退出时调用。主题和资源适配器是共享状态，
来回切换实验室时要恢复，避免留下上一场景的注册。

组件加入 Stage 并执行 `validateNow()` 后，再访问 `component.skinParts`。
Skin 的部件会加入宿主组件；不能把 Skin 当作一个独立的显示容器。
通过名称读取部件时用 `instanceof Label/Button/Group` 检查类型，
XML 改名或遗漏时可以立刻得到明确错误。

### 生产构建中的皮肤查找

开发构建保留的构造函数名不能作为生产环境的稳定标识。
本项目 XML 按钮显式写 `skinName="skins.ButtonSkin"`；
实验室中程序创建的按钮显式写 `hostComponentKey = "Button"`。
生产 JS 导出和真实 Release 画面都要检查，避免开发模式正常、压缩后找不到默认皮肤。

## 4. 高清图集的尺寸有两套单位

XML 尺寸、布局、九宫格和玩法坐标使用逻辑像素；PNG、atlas 裁切和原生采样使用物理像素。
图集密度为 2 时，物理尺寸是对应逻辑尺寸的两倍。

当前适配用原生 `drawImageNine` 和 atlas 子图缓存。源帧和九宫格分割线需要落在整数物理像素，
所以 2× 图集上的 `0.5` 逻辑坐标是有效的。不要因为看到小数就把逻辑网格全部取整，
也不要只改 `resolution` 而不提供匹配密度的实际图片。

判断九宫格问题时，依次检查资源密度、源帧裁切、逻辑网格和最终原生截图。
本项目的 [GPU 九宫格测试](../tests/native/gpu-nine-slice.test.ts) 保留 48 项用例及原容差，
还有独立的[子图缓存生命周期测试](../tests/native/nine-slice-cache.test.ts)。

文字继续使用 Core/UI 的度量和布局契约，原生端负责提供字体度量与绘制。
字体准备完成后，已有文字需要重新度量时调用 `invalidateTextMetrics()`。
静态文字截图和 INPUT 初始化只能覆盖相应路径，完整键盘/IME 交互要单独验收。

## 5. 逻辑视口和场景生命周期一起考虑

[App.tsx](../App.tsx) 为游戏固定 `width={360}`、`height={780}`，按比例适配。
这样较短屏幕或平板仍保留完整跳跃空间；比例不匹配时允许留边。
UI 与 Spine 实验室只固定宽度，高度随视图比例展开。
游戏模型始终使用逻辑坐标，触摸坐标转换由原生视口处理。

`createScene` 使用 `useCallback` 保持稳定。Skia 0.1.5 延续 0.1.4 的行为：
通知回调 `onError/onStats` 更新不会重建场景，场景工厂或视口变化会重新创建场景。
因此把每局状态放在场景中，把需要跨场景保留的状态放在更长寿命的宿主中。

本例用 React ref 保存本次应用运行中的最佳分数和局数种子，切到实验室再返回也能保留。
它没有持久化；关闭并重新启动应用后重新开始记录。

## 6. Spine 只能有一个推进时钟

| 使用场景 | 对象 | 时钟 |
| --- | --- | --- |
| 星轨疾跑主角 | 原 SDK `SkeletonRenderer` | 场景显式调用 `update(deltaSeconds * 1000)` |
| Spine 实验室实时模式 | 原 SDK `SkeletonAnimation` | SDK 自带 ticker |
| Spine 实验室缓存模式 | `NativeSpineCachedAnimation` | `autoUpdate: false`，场景显式 `advanceTime` |

场景的 delta 单位是秒，相关 Spine 更新接口使用毫秒。不要给自动播放对象再推进一次，
也不要一边推进物理，一边让主角使用另一个不受暂停控制的 ENTER_FRAME 时钟。
游戏暂停时物理和主角一起冻结；`DEACTIVATE` 将游戏切到暂停，回来后由玩家显式继续。

### 素材自带位移与游戏物理的关系

Spineboy 的 `jump` 动作自带明显的垂直运动。直接播放再叠加物理高度，会让视觉跳跃变成两份位移。
只检查 root bone 的 x/y 也无法覆盖这个素材的实际移动。

[RunnerHero](../src/game/runner/RunnerHero.ts) 在跳跃时按当前骨骼边界抵消脚底位移，
让游戏物理决定离地高度，骨骼保留动作姿势；跑步时保留素材自然的上下摆动。
这是当前 Spineboy 素材的处理方式。换角色时优先约定稳定的脚底锚点或 in-place 动作，
重新检查姿态边界是否会被武器、特效或换装影响。

角色缩放也要保留原 SDK 的 Spine Y 轴转换。当前实时 Renderer 使用
`scaleX = 0.18`、`scaleY = -0.18`，不能只统一改成两个正数。
碰撞使用固定的逻辑身体框，避免武器和动画摆动改变玩法的伤害范围。

## 7. 不同缓存解决不同成本

| 方式 | 复用的内容 | 本项目中的选择 |
| --- | --- | --- |
| 普通绘制 | 保留显示对象和 Graphics 路径，每帧绘制当前内容 | 游戏城市、障碍、晶体和动态主角 |
| 图像缓存 | 子树已经绘制好的像素 | 可用于稳定、适合栅格化的子树，需要评估清晰度与图像占用 |
| Picture 缓存 | 子树的 Skia 绘制命令 | 0.1.5 提供的可选功能，当前游戏未启用 |
| Spine 姿态缓存 | 指定循环动作的预采样几何姿态 | Spine ×20 的固定 `walk` 展示 |

### Spine ×20 的共享方式

[SpineShowcase](../src/game/SpineShowcase.ts) 为同一份骨骼/动作预采样 60 个姿态，
20 个播放器共享几何数据，各自保留时钟和显示变换。默认相位间隔为 61 ms，
可以切换同步相位、实时骨骼和暂停。示例配置的数字数组约 1 MB，
这个数字不代表全部原生或 GPU 内存。

缓存适合固定动作/皮肤。实时换骨骼、混合、动作队列和时间轴事件继续使用原 SDK。
游戏主角需要 `idle/run/jump/death` 切换，因此选择实时 Renderer。
60 Hz 是姿态采样率，不能把它解释为实际呈现帧率。

### Picture 保持可选

`NativePictureCache` 可以减少静态子树每帧重复的 JS 遍历和 JSI 命令发送。
根节点平移/旋转/缩放通常可以重放已有命令，内容、结构、alpha/tint 或相关资源变化会重录。
外部 mask 的相对位置改变也可能触发重录。

普通 setter 和资源通知参与失效；直接修改可变 Graphics/Mesh 数据而不发 Core 通知时，
调用 `invalidate()`。句柄随场景 `dispose()`，关联缓存释放后再释放调用者拥有的图片。
同一根节点不能同时选择 Picture 与图像缓存。

Picture 重放后 Skia 仍要执行这些命令，一次 `drawPicture` 不等于一次硬件 draw call。
它也不会自动跳过应用自己的动画 update。库中静态 UI、文字和 Graphics 的对照结果随宿主与内容不同，
没有支持全面替换普通绘制或图像缓存的结论。新游戏没有重新进行 Picture 性能对照。
准确 API、所有权、预算口径和既有测量见安装包的 `docs/native-runtime.md`。

## 8. 游戏逻辑先独立，绘制对象尽量保留

| 模块 | 职责 |
| --- | --- |
| [RunnerModel](../src/game/runner/RunnerModel.ts) | 状态、固定步长物理、随机波次、碰撞和计分，无渲染依赖 |
| [RunnerWorld](../src/game/runner/RunnerWorld.ts) | 保留的 Graphics 路径、视差移动与实体显示 |
| [RunnerHero](../src/game/runner/RunnerHero.ts) | 实时 Spine 动作与模型高度的绑定 |
| [RunnerUI](../src/game/runner/RunnerUI.ts) | KUI 部件、文本与操作绑定 |
| [RunnerScene](../src/game/runner/RunnerScene.ts) | 时钟、前后台事件、加载与释放顺序 |

物理使用 120 Hz 固定步长，并限制单帧累计最多 100 ms，防止长帧恢复时直接跳过路障。
场景用 `advance()` 返回的实际推进时间更新奔跑动画，暂停不推进两者。
随机波次使用种子，便于重现同一局；30/60/120 Hz 的输入可验证同一模型轨迹。

城市、地面和实体的 Graphics 路径创建后保留，平时更新变换，不每帧 clear 后重新发整套路径。
离屏实体从模型与显示层移除，重开清空旧实体，避免运行时间越长对象越多。
当前 90 秒自动游玩测试验证了速度递增、收集和实体数量控制，不能据此推算设备帧率。

## 9. 触摸响应和冒泡都要处理

跳跃绑定 `TOUCH_BEGIN`，按下就响应；普通菜单按钮继续使用当前 Button 的 `Event.CHANGE`。
Stage 也接收点按跳跃，因此跳跃按钮要停止冒泡，避免一次触摸执行两次跳跃。
暂停按钮和菜单遮罩也拦住 TOUCH_BEGIN，避免打开菜单时顺带触发场景输入。

输入先经过模型的 `ready/running/paused/over` 状态检查，UI 的禁用状态是交互提示。
场景退出时逐个移除监听，避免返回游戏后同一个操作被旧场景再次处理。

## 10. 释放顺序按所有权执行

场景拥有 UI、显示对象、Spine 播放器与加载结果；骨骼/缓存借用 atlas 纹理。
退出时先停止输入和播放，移除显示使用者与缓存，最后销毁借用的资源并恢复 Theme。

异步加载也有生命周期：等待期间可能已切换场景。
`loadHero()` 在加载完成后检查 disposed；旧场景不再创建角色，直接释放迟到的资源。
应用级 Resource 同样等待尚未结束的加载完成后再清理，因为当前 Core 没有 group abort。

重开一局只重置模型、实体和动作，不重新加载共享骨骼与图集。
切换整个场景时才走完整释放流程。这样「再跑一次」与「去实验室」的成本和所有权都清楚。
