import { Event, HorizontalAlign, VerticalAlign } from "@kurot/core";
import type { Resource, Stage } from "@kurot/core";
import { Button, Group, Label } from "@kurot/ui";

import type { NativeScene } from "@kurot/skia";
import { installNativeUI } from "../ui/native-ui";

function label(text: string, size: number): Label {
    const result = new Label(text);
    result.size = size;
    result.fontFamily = "sans-serif";
    result.textColor = 0xd6e2f5;
    result.textAlign = HorizontalAlign.CENTER;
    result.verticalAlign = VerticalAlign.MIDDLE;
    return result;
}

function button(text: string, top: number): Button {
    const result = new Button();
    result.hostComponentKey = "Button";
    result.label = text;
    result.left = result.right = 0;
    result.top = top;
    result.height = 56;
    return result;
}

export class UIShowcase implements NativeScene {
    private readonly root = new Group();
    private readonly counter = label("点击 0 次", 18);
    private readonly primary = button("点击 +1", 0);
    private readonly disabled = button("禁用状态", 76);
    private readonly toggle = button("启用中间的按钮", 152);
    private readonly spine = button("Spine × 20", 0);
    private readonly game = button("返回星轨疾跑", 0);
    private readonly restoreUI: () => void;
    private taps = 0;

    public constructor(
        stage: Stage,
        resources: Resource,
        private readonly onSpine: () => void,
        private readonly onGame: () => void,
    ) {
        this.restoreUI = installNativeUI(resources);
        this.root.width = stage.stageWidth;
        this.root.height = stage.stageHeight;
        const title = label("Kurot UI × Skia", 28);
        title.bold = true;
        title.textColor = 0x67e3bb;
        title.left = title.right = 24;
        title.top = 64;
        title.height = 42;
        const description = label(
            "Label · Button\n原来的 KUI 皮肤，直接编译复用",
            16,
        );
        description.left = description.right = 24;
        description.top = 116;
        description.height = 60;
        description.multiline = true;
        description.lineSpacing = 6;
        description.textColor = 0x94a5c4;
        const controls = new Group();
        controls.left = controls.right = 24;
        controls.verticalCenter = 16;
        controls.height = 208;
        this.disabled.enabled = false;
        controls.addChild(this.primary);
        controls.addChild(this.disabled);
        controls.addChild(this.toggle);
        this.counter.left = this.counter.right = 24;
        this.counter.bottom = 120;
        this.counter.height = 32;
        this.primary.addEventListener(Event.CHANGE, this.onClick);
        this.disabled.addEventListener(Event.CHANGE, this.onClick);
        this.toggle.addEventListener(Event.CHANGE, this.onToggle);
        this.root.addChild(title);
        this.root.addChild(description);
        this.root.addChild(controls);
        this.root.addChild(this.counter);
        this.spine.top = NaN;
        this.spine.left = this.spine.right = 24;
        this.spine.bottom = 68;
        this.spine.height = 44;
        this.spine.addEventListener(Event.CHANGE, this.onSpine);
        this.root.addChild(this.spine);
        this.game.top = NaN;
        this.game.left = this.game.right = 24;
        this.game.bottom = 12;
        this.game.height = 44;
        this.game.addEventListener(Event.CHANGE, this.onGame);
        this.root.addChild(this.game);
        stage.addChild(this.root);
    }

    public update(_deltaSeconds: number): void {}

    public dispose(): void {
        this.primary.removeEventListener(Event.CHANGE, this.onClick);
        this.disabled.removeEventListener(Event.CHANGE, this.onClick);
        this.toggle.removeEventListener(Event.CHANGE, this.onToggle);
        this.spine.removeEventListener(Event.CHANGE, this.onSpine);
        this.game.removeEventListener(Event.CHANGE, this.onGame);
        this.root.parent?.removeChild(this.root);
        this.restoreUI();
    }

    private onClick = (): void => {
        this.counter.text = `点击 ${++this.taps} 次`;
    };

    private onToggle = (): void => {
        this.disabled.enabled = !this.disabled.enabled;
        this.disabled.label = this.disabled.enabled
            ? "已启用 · 点击 +1"
            : "禁用状态";
        this.toggle.label = this.disabled.enabled
            ? "禁用中间的按钮"
            : "启用中间的按钮";
    };
}
