import { Event, HorizontalAlign, Sprite, VerticalAlign } from "@kurot/core";
import type { Resource, Stage } from "@kurot/core";
import {
    NativeSpineAnimationCache,
    NativeSpineCachedAnimation,
} from "@kurot/skia";
import type { NativeScene } from "@kurot/skia";
import { SkeletonAnimation } from "@kurot/spine-4.2";
import { Button, Group, Label } from "@kurot/ui";

import { loadSpineAssets } from "../resources/spine";
import type { SpineAssets } from "../resources/spine";
import { installNativeUI } from "../ui/native-ui";

interface PoseBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

function label(text: string, size: number, top: number): Label {
    const result = new Label(text);
    result.size = size;
    result.fontFamily = "sans-serif";
    result.textColor = 0xd6e2f5;
    result.textAlign = HorizontalAlign.CENTER;
    result.verticalAlign = VerticalAlign.MIDDLE;
    result.left = result.right = 16;
    result.top = top;
    result.height = 32;
    return result;
}

function button(text: string, x: number, top: number, width: number): Button {
    const result = new Button();
    result.hostComponentKey = "Button";
    result.label = text;
    result.x = x;
    result.top = top;
    result.width = width;
    result.height = 44;
    return result;
}

/**
 * Twenty independently phased actors using the registry cache API or SDK player.
 * The visual comparison does not measure presented FPS or replace benchmarks.
 */
export class SpineShowcase implements NativeScene {
    private readonly root = new Group();
    private readonly crowd = new Sprite();
    private readonly status = label("加载原始 Spineboy 骨骼与图集…", 13, 195);
    private readonly mode: Button;
    private readonly phase: Button;
    private readonly pause: Button;
    private readonly back: Button;
    private readonly restoreUI: () => void;
    private assets?: SpineAssets;
    private cache?: NativeSpineAnimationCache;
    private bounds?: PoseBounds;
    private actors: (SkeletonAnimation | NativeSpineCachedAnimation)[] = [];
    private cached = true;
    private staggered = true;
    private paused = false;
    private disposed = false;

    public constructor(
        private readonly stage: Stage,
        resources: Resource,
        private readonly onUI: () => void,
        onError: (message: string) => void,
    ) {
        this.restoreUI = installNativeUI(resources);
        this.root.width = stage.stageWidth;
        this.root.height = stage.stageHeight;
        this.crowd.y = 238;
        this.root.addChild(this.crowd);
        this.root.addChild(label("Spineboy × 20 · 共享姿态缓存", 22, 56));
        const width = (stage.stageWidth - 44) / 2;
        this.mode = button("缓存 60 Hz", 16, 94, width);
        this.phase = button("错开相位", 28 + width, 94, width);
        this.pause = button("暂停", 16, 146, width);
        this.back = button("原来的 UI", 28 + width, 146, width);
        this.mode.addEventListener(Event.CHANGE, this.toggleMode);
        this.phase.addEventListener(Event.CHANGE, this.togglePhase);
        this.pause.addEventListener(Event.CHANGE, this.togglePause);
        this.back.addEventListener(Event.CHANGE, this.onUI);
        for (const control of [
            this.mode,
            this.phase,
            this.pause,
            this.back,
            this.status,
        ]) {
            this.root.addChild(control);
        }
        stage.addChild(this.root);
        void loadSpineAssets()
            .then((assets) => {
                if (this.disposed) {
                    assets.dispose();
                    return;
                }
                this.assets = assets;
                const start = performance.now();
                this.cache = new NativeSpineAnimationCache({
                    createSource: () => new SkeletonAnimation(assets.data),
                    animation: "walk",
                    sampleRate: 60,
                });
                console.info(
                    `Spine cache: ${this.cache.frameCount} poses, ${this.cache.geometryBytes} bytes, ${Math.round(performance.now() - start)} ms bake.`,
                );
                this.bounds = this.measureBounds(assets);
                this.rebuild();
                console.info(
                    "Kurot Demo: 20 cached Spineboy, staggered phases ready.",
                );
            })
            .catch((error: unknown) => {
                if (!this.disposed) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    this.status.text = message;
                    onError(message);
                }
            });
    }

    public update(deltaSeconds: number): void {
        for (const actor of this.actors) {
            if (actor instanceof NativeSpineCachedAnimation) {
                actor.advanceTime(deltaSeconds * 1000);
            }
        }
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.clearActors();
        this.cache?.dispose();
        this.assets?.dispose();
        this.mode.removeEventListener(Event.CHANGE, this.toggleMode);
        this.phase.removeEventListener(Event.CHANGE, this.togglePhase);
        this.pause.removeEventListener(Event.CHANGE, this.togglePause);
        this.back.removeEventListener(Event.CHANGE, this.onUI);
        this.root.parent?.removeChild(this.root);
        this.restoreUI();
    }

    private readonly toggleMode = (): void => {
        this.cached = !this.cached;
        this.rebuild();
    };
    private readonly togglePhase = (): void => {
        this.staggered = !this.staggered;
        this.rebuild();
    };
    private readonly togglePause = (): void => {
        this.paused = !this.paused;
        for (const actor of this.actors) {
            if (actor instanceof NativeSpineCachedAnimation) {
                actor.paused = this.paused;
            } else {
                actor.setTimeScale(this.paused ? 0 : 1);
            }
        }
        this.pause.label = this.paused ? "继续" : "暂停";
    };

    private rebuild(): void {
        if (!this.assets || !this.cache || !this.bounds || this.disposed)
            return;
        this.clearActors();
        const cellWidth = this.stage.stageWidth / 5;
        const cellHeight = (this.stage.stageHeight - this.crowd.y - 30) / 4;
        const bounds = this.bounds;
        const scale = Math.min(
            (cellWidth - 12) / bounds.width,
            (cellHeight - 12) / bounds.height,
        );
        for (let index = 0; index < 20; index++) {
            const offset = this.staggered ? index * 61 : 0;
            const actor = this.cached
                ? this.cache.createPlayer({ autoUpdate: false })
                : new SkeletonAnimation(this.assets.data);
            actor.scaleX = actor.scaleY = scale;
            actor.x =
                (index % 5) * cellWidth +
                (cellWidth - bounds.width * scale) / 2 -
                bounds.x * scale;
            actor.y =
                (Math.floor(index / 5) + 1) * cellHeight -
                6 -
                (bounds.y + bounds.height) * scale;
            if (actor instanceof NativeSpineCachedAnimation) {
                actor.seek(offset);
                actor.paused = this.paused;
            } else {
                actor.play("walk", 0);
                actor.renderer.update(offset);
                actor.setTimeScale(this.paused ? 0 : 1);
            }
            this.actors.push(actor);
            this.crowd.addChild(actor);
        }
        this.mode.label = this.cached ? "缓存 60 Hz" : "实时骨骼";
        this.phase.label = this.staggered ? "错开相位" : "同步相位";
        this.status.text = this.cached
            ? "共享 60 个姿态 · 约 1 MB 几何数据"
            : "每个角色独立计算骨骼与顶点";
        console.info(
            `Kurot Demo: 20 Spineboy, ${this.cached ? "cached" : "live"}, ${this.staggered ? "staggered" : "synchronized"} phases.`,
        );
    }

    private clearActors(): void {
        for (const actor of this.actors) {
            if (actor instanceof NativeSpineCachedAnimation) {
                actor.dispose();
            } else {
                actor.stopAll();
            }
        }
        this.crowd.removeChildren();
        this.actors = [];
    }

    private measureBounds(assets: SpineAssets): PoseBounds {
        const source = new SkeletonAnimation(assets.data);
        const duration = source.skeletonData.findAnimation("walk")!.duration;
        source.play("walk", 0);
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        try {
            for (let frame = 0; frame <= 60; frame++) {
                source.renderer.update(
                    frame === 0 ? 0 : (duration * 1000) / 60,
                );
                const pose = source.skeleton.getBoundsRect();
                left = Math.min(left, pose.x);
                top = Math.min(top, -pose.y - pose.height);
                right = Math.max(right, pose.x + pose.width);
                bottom = Math.max(bottom, -pose.y);
            }
        } finally {
            source.stopAll();
        }
        return { x: left, y: top, width: right - left, height: bottom - top };
    }
}
