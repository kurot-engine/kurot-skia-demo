# Kurot-Skia-Demo

这是完整的 Expo 示例项目，原目录 `Kurot-Skia` 已改名为 `Kurot-Skia-Demo`。
相邻的 `../Kurot-Skia` 是新的私有库项目，目前只提供构建时入口生成器。
Demo 通过开发依赖 `@kurot/skia: file:../Kurot-Skia` 使用它提供的 `kurot-project` 命令。
RN 适配代码继续保留在本 Demo。

这是 Kurot 的原生渲染适配原型。使用已发布的 `@kurot/core@2.5.3` 场景树和 `@kurot/ui@3.5.0`，
通过 `react-native-skia@3.3.0` 的 `SkiaGraphiteView` 提交绘图。
游戏逻辑在 JS 线程运行，Skia 原生视图通过 Graphite/Dawn 绘制；Android 使用 Vulkan。
本项目未修改 Kurot SDK，也没有使用 WebView 或 DOM 模拟。

## 运行

```sh
pnpm --dir ../Kurot-Skia install
pnpm --dir ../Kurot-Skia build
pnpm install
pnpm android
```

已有 development build 时，只需启动 Metro：

```sh
pnpm start --dev-client --android
```

Skia 3 使用 development build，不能用 Expo Go。Android 最低 API 26，设备需要
支持 Vulkan。当前项目是 Expo 57 / RN 0.86.3 / React 19.2.3。
iOS 代码路径共用，但这一轮只实测了 Android 模拟器。

## 代码分层

| 文件 | 责任 |
| --- | --- |
| `App.tsx` | Resource 加载与全屏画布，隐藏系统状态栏，无外部 RN 文字/按钮 |
| `src/game/UIShowcase.ts` | 当前 Label/Button 测试场景、按钮启用/禁用和计数 |
| `src/game/Playground.ts` | 保留的 Sprite/Shape/Bitmap/文字演示场景 |
| `src/skia/KurotView.tsx` | 原生视图、Core ticker、逻辑视口、前后台与清理 |
| `src/skia/SkiaRenderer.ts` | 遍历 Core 显示树，应用变换、透明度、裁剪并绘制 |
| `src/skia/graphics.ts` | Graphics 命令编译为可复用的 SkPath/SkPaint，含命中路径 |
| `src/skia/textures.ts` | SkImage → Core BitmapData/Texture，支持独立资源密度 |
| `src/skia/NativeImageLoader.ts` | Core ImageLoader 合约 → 原生异步图片解码 |
| `src/skia/NativeHttpRequest.ts` | 打包文本/JSON 读取；URI 请求沿用 Core HTTP 传输 |
| `src/skia/NativeTextMeasurer.ts` | SkParagraph 字形进宽/墨迹 → Core 文字测量 |
| `src/skia/NativeTextRenderer.ts` | 绘制 Core 排好的文字行，缓存与释放原生 Paragraph |
| `src/skia/NativeTextSegmentation.ts` | Hermes 的字素/词分段端口，使用 FormatJS 实现 |
| `src/resources/bundled.ts` | 将自动生成的静态资源表注册到 native 资源端口 |
| `src/generated/kurot/` | 资源表、全部 KUI 工厂和主题入口；通过生成命令更新 |
| `src/skia/NativeTouch.ts` | RN 多指触摸 → Core 命中、冒泡、tap/cancel/releaseOutside |
| `src/skia/nine-slice.ts` | 与 Core Canvas 相同的逻辑九宫格、密度和 trim 几何 |
| `src/skia/NativeTheme.ts` | Theme 映射、延迟应用与 Metro 静态皮肤模块注册 |
| `src/ui/native-ui.ts` | UI Image 共用 Core Resource，安装/恢复主题和资源适配器 |
| `tests/native/adapter.test.ts` | 原生路径、变换和输入集成测试 |
| `tests/native/resources.test.ts` | 清单、图集、缓存和销毁集成测试 |
| `tests/native/text.test.ts` | 原生文字测量、回退和实际像素验证 |
| `tests/native/ui.test.ts` | 原皮肤、布局、Label shrink、按钮状态和九宫格像素 |
| `tests/native/App.tsx` | 独立原生测试入口与结果显示 |

场景仍然使用 Kurot 的 API：

```ts
import { Shape, TouchEvent } from '@kurot/core';

const shape = new Shape();
shape.graphics.beginFill(0x67e3bb);
shape.graphics.drawCircle(0, 0, 32);
shape.graphics.endFill();
shape.x = 180;
shape.y = 205;
shape.touchEnabled = true;
stage.addChild(shape);
shape.addEventListener(TouchEvent.TOUCH_TAP, () => {
    shape.rotation += 15;
});
```

`KurotView` 接收逻辑 `width`、可选 `height` 和 `createScene(stage)` 工厂；工厂返回
`update(deltaSeconds)` 与 `dispose()`。省略 height 时，高度随原生视图比例计算，铺满画布。
显式给 height 时保留等比居中视口。触摸使用同一个逆变换。
Skia 自己管理设备像素密度，适配层不用重复乘 `PixelRatio`。

## 资源加载

保留已发布 Core 的 `Resource`、`ResourceConfig`、分组队列、缓存和原始
ImageAnalyzer/SheetAnalyzer。仅在 native 平台把它们内部的 HttpRequest/ImageLoader
导入接到适配层；不复制清单解析逻辑，不改 `node_modules`。

```ts
import './src/resources/bundled'; // 项目启动时注册一次打包资源
import { resourceConfigURL, resourceRoot } from './src/generated/kurot/assets';
import { Bitmap, Resource } from '@kurot/core';
import type { Texture } from '@kurot/core';

const resources = new Resource();
await resources.loadConfig(resourceConfigURL, resourceRoot);
await resources.loadGroup('preload', 0, (loaded, total) => {
    console.log(loaded, total);
});

const mascot = new Bitmap(resources.get<Texture>('mascot_png'));
const checkbox = new Bitmap(resources.get<Texture>('kui.checkbox_selected'));
// 原有裸 subkey 也有效：resources.get<Texture>('checkbox_selected')。

// 在使用这些纹理的场景退出后释放；子纹理共享图集源图，不单独拥有它。
resources.destroyGroup('preload');
```

`resource/resource.json` 来自 SDK 游戏示例的 `default.res.json`，保留原来的
`kui` sheet 项及 object subkeys，只增加 `mascot_png` image 项和 preload 分组键。
`assets/ui/kui/kui.json` / `kui.png` 是原文件，含 39 帧、`resolution: 2`。
SheetAnalyzer 按 JSON 的相对 `file` 加载源图；物理采样坐标和逻辑帧尺寸仍由 Core 处理。
当前 UI 场景使用其中的按钮帧；保留的 Playground 使用独立角色图片和图集图标。

Metro 无法根据清单中的动态字符串执行 `require(url)`。入口生成器自动生成
`src/generated/kurot/assets.ts`，`src/resources/bundled.ts` 只负责注册这张表。
逻辑 URL 与 folder 前缀、sheet 相对路径一致；新增本地资源后重新生成即可。
PNG 会被打进应用，JSON 内嵌到生成入口并作为文本副本供原始解析器读取，
开发加载不依赖 SDK 源目录或额外 HTTP 服务。远程 URI 路径使用 RN HTTP 和 Skia URI 解码；
这一轮实测的是打包资源。清单格式没有转换。

Resource 的 destroy/destroyGroup/destroyAll 会释放对应 SkImage；sheet 只释放一次共享源图。
ImageLoader.close 会忽略并释放晚到的解码结果。Core 当前没有组加载取消接口，App 卸载时
等待未完成的加载结束再 destroyAll。

## TextField

使用真实 Core TextField，保留原有行布局、Unicode 17 换行规则、UTF-16 源偏移、
共享基线、名义测量和 top/middle/bottom 对齐。Canvas TextMeasurer 替换为 SkParagraph
测量；绘制阶段按 Core 行/富文本 run 使用相同字体配置进行原生字形塑形和系统字体回退。
Hermes 缺少 `Intl.Segmenter`，native 分段端口直接使用
`@formatjs/intl-segmenter@12.2.15`，不修改全局 Intl。字素/词分段随该实现，
不承诺与浏览器的词典分段或字体像素完全相同。

```ts
import { HorizontalAlign, TextField, VerticalAlign } from '@kurot/core';

const text = new TextField();
text.text = '你好，Kurot！\nSkia 原生文字';
text.fontFamily = 'sans-serif';
text.size = 20;
text.width = 280;
text.height = 80;
text.multiline = true;
text.wordWrap = true;
text.lineSpacing = 6;
text.textAlign = HorizontalAlign.CENTER;
text.verticalAlign = VerticalAlign.MIDDLE;
stage.addChild(text);
```

支持动态纯文本/textFlow、系统字体与中文/Emoji 回退、字体大小/粗斜体/颜色、
描边、行间距、左右/居中对齐、上中下对齐、scrollV、固定高度裁剪、背景和边框，
以及场景矩阵、tint 和透明度。描边和字体 overhang 只扩展渲染边界，外部裁剪仍保持精确。
Paragraph 随行缓存或颜色/描边/tint 改变而重建；离开绘制树或 renderer.dispose 时释放。
文字清空、替换或 `invalidateTextMetrics()` 使用 Core 原本的失效流程。

当前只接系统字体；打包字体注册、BitmapText、INPUT/键盘/选区/IME、外部 href
打开尚未接入。设置 INPUT 会明确报错，不会进入浏览器 DOM 路径。
`TextField.resolution` 是 WebGL 栅格缓存设置，native 直接在当前画布尺度绘字。
UI Label 的内部 TextField 使用同一条测量/渲染路径。

## UI 与原来的 KUI 皮肤

Label、Button、Group、Image、Skin、BasicLayout 和 State/SetProperty 都使用安装包的
原始实现。按钮事件来自 NativeTouch，UI Validator 通过 Core ticker 的 callLater
在绘制前完成属性、尺寸和布局校验。Label 的换行、对齐和 shrink 仍由 UI/Core 计算。

`resource/ui/skins/ButtonSkin.kui.xml` 和 `resource/config/style.json` 原样复制自
SDK 的 `examples/game`；图集与 resource.json 的原有 subkeys 也保持原格式。
通过本地依赖 `@kurot/skia` 提供的命令调用 CLI 3.6.0 编译器，颜色引用和默认九宫格由原编译器解析：

```sh
pnpm generate:project

# 也可直接调用安装包提供的命令
pnpm exec kurot-project --project .
```

自动读取 `resource/resource.json`、追踪图集图片并递归编译 resource 下的所有 KUI，
生成 `src/generated/kurot/` 中的静态资源表、皮肤工厂、主题和统一入口。
添加资源或皮肤后不需要修改手工表或注册代码。`build:skins` 保留为该命令的别名。
`pnpm start/android/ios/web/test:native` 会先生成并持续监听，再启动 Expo。
保存 resource.json、图片、图集 JSON、文本、KUI 或 style.json 后会自动重新生成。
新增/删除/重命名皮肤也会同步静态工厂和主题；生成失败保留上次结果，修复后继续。
Ctrl+C 或 Expo 退出时会一起关闭 watcher。

```sh
# 生成器 + Expo 开发服务器，日常开发用这个即可
pnpm start --dev-client --android

# 只启动 watcher，适合另一个终端单独运行 expo
pnpm watch:project
```

直接执行 `pnpm exec expo ...` 不会启动 watcher，需要另行运行 `pnpm watch:project`。
生成脚本为 `kurot-project --project .`，命令由本地依赖的 `bin` 注册。
修改库源码后先在库项目执行 `pnpm build`；新增编译文件或修改包元数据后，在 Demo
执行 `pnpm install` 同步本地依赖。库的编译步骤独立于 Demo 的资源生成步骤。
生成器使用 AST 增加工厂返回类型和动态字段类型，保留原编译器的字段赋值、布局与状态。
详见 [库项目说明](../Kurot-Skia/README.md)。

浏览器 Theme 的动态 `import(moduleUrl)` 不能通过 Metro，因此 native 解析到
`NativeTheme`。它保留主题映射、延迟应用和 COMPLETE/IO_ERROR 生命周期，
通过 IThemeAdapter 获取配置、通过静态注册表加载 skinsJs。`installNativeUI`
消费自动生成的工厂注册函数和主题配置，退出场景时恢复先前注册。
其他本地 KUI 的静态编译与注册由生成器处理，手机运行时不解析 XML。

```ts
import { Button, Label } from '@kurot/ui';

const caption = new Label('原生中文 Label');
caption.size = 20;
stage.addChild(caption);

const button = new Button();
button.hostComponentKey = 'Button'; // 稳定主题 key，避免发布压缩改变构造器名称
button.label = '开始游戏';
button.width = 280;
button.height = 56;
stage.addChild(button); // 已安装 native UI 主题和 Resource 适配器
```

Image 的资源适配器读取同一个 Resource 缓存，也能加载尚未缓存的清单资源；
资源仍由 Resource 拥有。原皮肤的 up/down/disabled 图集帧、标签下移、禁用文字颜色、
百分比/边距布局、标签缩小和逻辑九宫格可以复用。系统字体回退会与浏览器字体不同。
本轮只验证 Label/Button 及它们的依赖；其他 UI 控件、输入框和完整 DefaultUISkin
画廊仍需分别接入和验证。

## 当前支持范围

- Core 的 Stage、容器、Sprite、Shape、Bitmap、场景事件与 ticker。
- 层级矩阵、旋转、缩放、锚点、居中 flipX/flipY、透明度与子对象排序。
- Graphics 的纯色填充、描边、矩形、圆角矩形、圆、椭圆、弧和二次/三次曲线。
- Graphics 继承 tint，使用实际填充/描边路径命中。
- scrollRect 与矩形 mask；非旋转 Bitmap 缩放、九宫格、裁切区域、trim、资源密度。
- 原始 resource.json 的 image/sheet 加载、分组进度、缓存、裸/限定 subkey、销毁与重载。
- 动态 TextField，含系统字体回退、富文本、描边、行布局与渲染边界。
- UI Label/Button 与原始编译 KUI ButtonSkin，含布局、shrink 和 up/down/disabled 状态。
- 多指 ID、maxTouches、事件冒泡、取消与 releaseOutside；前后台暂停/恢复。

未实现 BitmapText、渐变、虚线、Mesh、粒子系统、滤镜、显示对象 mask、
blendMode、cacheAsTexture/RenderTexture、Bitmap tint/repeat/旋转图集/pixelHitTest。
这些渲染能力会明确报错；字体资源、音频、视频、输入框等也尚未接入。
保留 Playground 的粒子只是普通 Shape。当前画面全部由 Kurot 场景树绘制。
目前逐帧遍历场景树，尚未移植 WebGL 的 InstructionSet 增量管线或 Skia Atlas 批处理。

## 临时平台入口

Core 的公开根入口包含浏览器渲染器，会加载 Hermes 当前不提供的
`FinalizationRegistry`。`metro.config.js` 在 Android/iOS 上把 `@kurot/core`
指向 `core-native.ts`，只重导出安装包里的真实场景模块；场景树内部的浏览器
DisplayList 工厂则替换为明确拒绝缓存操作的 `NativeDisplayList`。
资源模块内部的两个浏览器 I/O 入口分别替换为 native 端口。
TextField 的测量/分段入口也使用 native 端口，InputController 则明确拒绝未适配的编辑模式。
UI 的 Theme 模块使用原生端口，其他组件保持发布包代码。
TypeScript 使用相同入口，不会把未支持的根导出误当成可用。

此处依赖 SDK 的内部文件布局与擦除后的 const enum 数值，因此固定 Core 2.5.3 / UI 3.5.0。
升级前需要重新验证入口和命令映射。后续做正式 `@kurot/skia` 时，应先让 Core 提供
公开的平台无关入口和可注入的缓存/文本/资源接口，再把 `src/skia` 抽到库中。

## 验证

```sh
pnpm exec tsc --noEmit
pnpm exec expo lint App.tsx index.ts src tests metro.config.js
git diff --check
```

原生集成测试集中在 `tests/native/`，普通 App 启动和 KurotView 初始化只执行业务逻辑。
已有 development build 时，先停止普通 Metro，再单独启动测试入口：

```sh
pnpm test:native --android
```

测试会自动运行，页面显示 PASS/FAIL，控制台输出具体错误或
`Kurot Skia: all native tests passed`。结束后停止测试 Metro，再运行普通 `pnpm start`。
`KUROT_NATIVE_TESTS=1` 仅让 Metro 将根入口的 App 导入切到 `tests/native/App.tsx`；
普通入口不引用测试模块。测试需要设备/模拟器中的真实 Skia JSI，不使用 Node mock。

测试检查真实原生命中路径、嵌套旋转/缩放/锚点、scrollRect、
flip、Graphics 更新、触摸坐标/冒泡/maxTouches/取消/tap/releaseOutside；通过后输出
`Kurot Skia: native adapter checks passed`。
另有真实原生资源检查，覆盖分组进度/重复加载、图片、2× 图集、两种 subkey、缓存、
共享源销毁、重载、清单不变、缺失资源失败与请求取消；通过后输出
`Kurot Skia: native resource checks passed`。
文字测试在真实原生 raster surface 上读取 RGBA 像素，验证中文回退、实际墨迹对齐、
描边、富文本、颜色缓存更新、换行/Emoji、scrollV、透明度和外部裁剪；通过后输出
`Kurot Skia: native text checks passed`。
UI 测试验证主题延迟绑定、原始皮肤 parts、边距布局、Label shrink、实际触摸按下/松手/
移出/取消/禁用/移除，以及资源缓存和九宫格缩放的固定边角像素。
Android 模拟器已显示完整场景；`expo export --platform android` 已生成 Hermes bundle
及两张打包 PNG。iOS 和远程清单尚未实测。
可选 onStats 中的 FPS 是 JS 帧提交频率，draws 是绘图命令数，不等于 GPU 批次数。

Kurot 标识来自 SDK 的 `examples/game/template/web/logo.png`。
