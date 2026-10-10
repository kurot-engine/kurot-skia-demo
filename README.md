# Kurot × React Native Skia

这是 Kurot 的原生渲染适配原型。使用已发布的 `@kurot/core@2.5.3` 场景树，
通过 `react-native-skia@3.3.0` 的 `SkiaGraphiteView` 提交绘图。
游戏逻辑在 JS 线程运行，Skia 原生视图通过 Graphite/Dawn 绘制；Android 使用 Vulkan。
本项目未修改 Kurot SDK，也没有使用 WebView 或 DOM 模拟。

## 运行

```sh
pnpm install
pnpm exec expo run:android
```

已有 development build 时，只需启动 Metro：

```sh
pnpm exec expo start --dev-client --android
```

Skia 3 使用 development build，不能用 Expo Go。Android 最低 API 26，设备需要
支持 Vulkan。当前项目是 Expo 57 / RN 0.86.3 / React 19.2.3。
iOS 代码路径共用，但这一轮只实测了 Android 模拟器。

## 代码分层

| 文件 | 责任 |
| --- | --- |
| `App.tsx` | RN 外壳、原生图片加载、每秒一次的诊断信息 |
| `src/game/Playground.ts` | 真正的 Kurot Sprite/Shape/Bitmap 游戏场景、动画和事件 |
| `src/skia/KurotView.tsx` | 原生视图、Core ticker、逻辑视口、前后台与清理 |
| `src/skia/SkiaRenderer.ts` | 遍历 Core 显示树，应用变换、透明度、裁剪并绘制 |
| `src/skia/graphics.ts` | Graphics 命令编译为可复用的 SkPath/SkPaint，含命中路径 |
| `src/skia/textures.ts` | SkImage → Core BitmapData/Texture，支持独立资源密度 |
| `src/skia/NativeTouch.ts` | RN 多指触摸 → Core 命中、冒泡、tap/cancel/releaseOutside |
| `src/skia/adapter-checks.ts` | development build 中使用真实 SkPath 的运行检查 |

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

`KurotView` 接收逻辑 `width/height` 和 `createScene(stage)` 工厂；工厂返回
`update(deltaSeconds)` 与 `dispose()`。视口等比居中，触摸使用同一个逆变换。
Skia 自己管理设备像素密度，适配层不用重复乘 `PixelRatio`。

## 当前支持范围

- Core 的 Stage、容器、Sprite、Shape、Bitmap、场景事件与 ticker。
- 层级矩阵、旋转、缩放、锚点、居中 flipX/flipY、透明度与子对象排序。
- Graphics 的纯色填充、描边、矩形、圆角矩形、圆、椭圆、弧和二次/三次曲线。
- Graphics 继承 tint，使用实际填充/描边路径命中。
- scrollRect 与矩形 mask；普通非旋转 Bitmap 缩放、裁切区域、trim、资源密度。
- 多指 ID、maxTouches、事件冒泡、取消与 releaseOutside；前后台暂停/恢复。

未实现 TextField/BitmapText、UI/KUI、渐变、虚线、Mesh、粒子系统、滤镜、显示对象 mask、
blendMode、cacheAsTexture/RenderTexture、Bitmap tint/九宫格/repeat/旋转图集/pixelHitTest。
这些渲染能力会明确报错；DOM 资源加载、音频、视频、输入框等也尚未接入。
示例的粒子只是普通 Shape，界面文字由 RN Text 绘制。
目前逐帧遍历场景树，尚未移植 WebGL 的 InstructionSet 增量管线或 Skia Atlas 批处理。

## 临时平台入口

Core 的公开根入口包含浏览器渲染器，会加载 Hermes 当前不提供的
`FinalizationRegistry`。`metro.config.js` 在 Android/iOS 上把 `@kurot/core`
指向 `core-native.ts`，只重导出安装包里的真实场景模块；场景树内部的浏览器
DisplayList 工厂则替换为明确拒绝缓存操作的 `NativeDisplayList`。
TypeScript 使用相同入口，不会把未支持的根导出误当成可用。

此处依赖 Core 的内部文件布局与擦除后的 const enum 数值，因此固定 Core 2.5.3。
升级前需要重新验证入口和命令映射。后续做正式 `@kurot/skia` 时，应先让 Core 提供
公开的平台无关入口和可注入的缓存/文本/资源接口，再把 `src/skia` 抽到库中。

## 验证

```sh
pnpm exec tsc --noEmit
pnpm exec expo lint App.tsx index.ts src metro.config.js
git diff --check
```

development build 启动时检查真实原生命中路径、嵌套旋转/缩放/锚点、scrollRect、
flip、Graphics 更新、触摸坐标/冒泡/maxTouches/取消/tap/releaseOutside；通过后输出
`Kurot Skia: native adapter checks passed`。
页面 FPS 是 JS 帧提交频率，draws 是绘图命令数，不等于 GPU 批次数，也不是性能基准。

Kurot 标识来自 SDK 的 `examples/game/template/web/logo.png`。
