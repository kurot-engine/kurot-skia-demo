import { Event, TouchEvent } from '@kurot/core';
import type { Stage } from '@kurot/core';
import { Button, Component, Group, Label } from '@kurot/ui';
import type { RunnerModel } from './RunnerModel';

export type RunnerLoadState = 'loading' | 'ready' | 'failed';

interface RunnerActions {
    jump(): void;
    pause(): void;
    main(): void;
    laboratory(): void;
}

function part<T>(component: Component, name: string, constructor: new (...args: never[]) => T): T {
    const value = component.skinParts[name];
    if (!(value instanceof constructor)) {
        throw new Error(`Runner KUI part is missing: ${name}`);
    }
    return value;
}

/**
 * The XML owns layout and visuals; this controller updates parts and binds input.
 */
export class RunnerUI {
    public readonly display = new Component();
    private readonly _score: Label;
    private readonly _crystals: Label;
    private readonly _lives: Label;
    private readonly _hint: Label;
    private readonly _title: Label;
    private readonly _tag: Label;
    private readonly _description: Label;
    private readonly _best: Label;
    private readonly _overlay: Group;
    private readonly _jump: Button;
    private readonly _pause: Button;
    private readonly _main: Button;
    private readonly _lab: Button;
    private _menuKey = '';

    public constructor(stage: Stage, private readonly actions: RunnerActions) {
        this.display.width = stage.stageWidth;
        this.display.height = stage.stageHeight;
        this.display.touchEnabled = false;
        this.display.skinName = 'skins.RunnerSkin';
        stage.addChild(this.display);
        this.display.validateNow();
        this._score = part(this.display, 'scoreDisplay', Label);
        this._crystals = part(this.display, 'crystalDisplay', Label);
        this._lives = part(this.display, 'lifeDisplay', Label);
        this._hint = part(this.display, 'hintDisplay', Label);
        this._title = part(this.display, 'menuTitle', Label);
        this._tag = part(this.display, 'menuTag', Label);
        this._description = part(this.display, 'menuDescription', Label);
        this._best = part(this.display, 'bestDisplay', Label);
        this._overlay = part(this.display, 'overlay', Group);
        this._jump = part(this.display, 'jumpButton', Button);
        this._pause = part(this.display, 'pauseButton', Button);
        this._main = part(this.display, 'mainButton', Button);
        this._lab = part(this.display, 'labButton', Button);
        this._jump.addEventListener(TouchEvent.TOUCH_BEGIN, this.onJump);
        this._pause.addEventListener(TouchEvent.TOUCH_BEGIN, this.stopTouch);
        this._overlay.addEventListener(TouchEvent.TOUCH_BEGIN, this.stopTouch);
        this._pause.addEventListener(Event.CHANGE, actions.pause);
        this._main.addEventListener(Event.CHANGE, actions.main);
        this._lab.addEventListener(Event.CHANGE, actions.laboratory);
    }

    public render(model: RunnerModel, best: number, load: RunnerLoadState): void {
        this._score.text = String(model.score).padStart(4, '0');
        this._crystals.text = `晶体 ${model.crystals}`;
        this._lives.text = `生命 ${Array.from({ length: 3 }, (_, index) => index < model.lives ? '●' : '○').join(' ')}`;
        this._hint.text = model.jumps >= 2 ? '二段跳已用 · 落地后恢复' : '点按画面跳跃 · 空中可再跳一次';
        this._overlay.visible = model.phase !== 'running';
        this._jump.enabled = this._pause.enabled = model.phase === 'running';
        this._best.text = `本次运行最佳 ${best}`;
        const key = `${model.phase}:${load}`;
        if (key === this._menuKey) return;
        this._menuKey = key;
        this._main.enabled = load !== 'loading';
        if (load === 'failed') {
            this._title.text = 'Spine 加载失败';
            this._description.text = '骨骼或图集未能准备好。\n可以重试，或进入实验室查看其他示例。';
            this._main.label = '重新加载';
        } else if (model.phase === 'paused') {
            this._tag.text = 'TAKE A BREATH';
            this._title.text = '歇一口气，再出发';
            this._description.text = `当前得分 ${model.score} · 晶体 ${model.crystals}\n游戏和骨骼动画已暂停。\n准备好后，从这里继续。`;
            this._main.label = '继续奔跑';
        } else if (model.phase === 'over') {
            this._tag.text = 'NICE RUN';
            this._title.text = `本次得分 ${model.score}`;
            this._description.text = `跑过 ${Math.floor(model.distance / 10)} 米 · 收集 ${model.crystals} 颗晶体\n试着在路障靠近时起跳。\n空中再点一次，可以跳得更高。`;
            this._main.label = '再跑一次';
        } else {
            this._tag.text = 'SPINE × KUROT UI × SKIA';
            this._title.text = '穿过星光，向前跑';
            this._description.text = '点按跳跃，空中还能再跳一次。\n越过路障，收集绿色晶体。\n你有三次机会，跑得越远分数越高。';
            this._main.label = load === 'ready' ? '开始奔跑' : '准备 Spine…';
        }
    }

    public dispose(): void {
        this._jump.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onJump);
        this._pause.removeEventListener(TouchEvent.TOUCH_BEGIN, this.stopTouch);
        this._overlay.removeEventListener(TouchEvent.TOUCH_BEGIN, this.stopTouch);
        this._pause.removeEventListener(Event.CHANGE, this.actions.pause);
        this._main.removeEventListener(Event.CHANGE, this.actions.main);
        this._lab.removeEventListener(Event.CHANGE, this.actions.laboratory);
        this.display.parent?.removeChild(this.display);
        this.display.skinName = undefined;
    }

    private onJump = (event: TouchEvent): void => {
        event.stopPropagation();
        this.actions.jump();
    };

    private stopTouch = (event: TouchEvent): void => {
        event.stopPropagation();
    };
}
