import { Shape, Sprite } from '@kurot/core';
import type { RunnerEntity, RunnerModel } from './RunnerModel';
import { RUNNER_X } from './RunnerModel';

function crystal(): Shape {
    const shape = new Shape();
    const g = shape.graphics;
    g.lineStyle(1.5, 0xb5ffef);
    g.beginFill(0x63edc9);
    g.moveTo(9, 0); g.lineTo(18, 10); g.lineTo(9, 24); g.lineTo(0, 10); g.lineTo(9, 0);
    g.endFill();
    g.lineStyle(1, 0xffffff, 0.7);
    g.moveTo(9, 3); g.lineTo(9, 19); g.moveTo(3, 10); g.lineTo(15, 10);
    return shape;
}

function barrier(entity: RunnerEntity): Shape {
    const shape = new Shape();
    const g = shape.graphics;
    g.beginFill(0xa85372);
    g.drawRoundRect(0, 0, entity.width, entity.height, 8);
    g.endFill();
    g.beginFill(0xffaaaf);
    g.drawRoundRect(0, 0, entity.width, 6, 6);
    g.endFill();
    g.lineStyle(2, 0xffd8bd, 0.7);
    g.moveTo(6, 16); g.lineTo(entity.width - 6, entity.height - 8);
    g.moveTo(entity.width - 6, 16); g.lineTo(6, entity.height - 8);
    return shape;
}

/**
 * Retained Graphics scenery; scrolling changes transforms, not path commands.
 */
export class RunnerWorld {
    public readonly display = new Sprite();
    public readonly actors = new Sprite();
    public readonly floor: number;
    private readonly _far = new Sprite();
    private readonly _near = new Sprite();
    private readonly _track = new Sprite();
    private readonly _items = new Sprite();
    private readonly _shadow = new Shape();
    private readonly _visuals = new Map<number, Shape>();

    public constructor(width: number, height: number) {
        this.floor = height - 162;
        const backdrop = new Shape();
        const g = backdrop.graphics;
        g.beginFill(0x101a32); g.drawRect(0, 0, width, height); g.endFill();
        g.beginFill(0x19243f); g.drawCircle(width - 60, this.floor - 252, 61); g.endFill();
        g.beginFill(0x233251); g.drawCircle(width - 60, this.floor - 252, 47); g.endFill();
        g.beginFill(0x7fb4ca);
        for (let i = 0; i < 38; i++) {
            g.drawCircle((i * 97 + 13) % width, 152 + (i * 43) % Math.max(80, this.floor - 180), i % 3 === 0 ? 1.4 : 0.7);
        }
        g.endFill();
        this.display.addChild(backdrop);
        this.makeCity(this._far, width, 0x202e4a, 110, 36);
        this.makeCity(this._near, width, 0x2a3c58, 70, 48);
        this.display.addChild(this._far);
        this.display.addChild(this._near);
        const ground = new Shape();
        ground.graphics.beginFill(0x17283f);
        ground.graphics.drawRect(0, this.floor, width, height - this.floor);
        ground.graphics.endFill();
        ground.graphics.beginFill(0x63edc9);
        ground.graphics.drawRect(0, this.floor, width, 3);
        ground.graphics.endFill();
        this.display.addChild(ground);
        this._track.y = this.floor + 20;
        for (let i = 0; i < 2; i++) {
            const strip = new Shape();
            strip.x = i * width;
            const track = strip.graphics;
            track.lineStyle(1, 0x36516a);
            track.moveTo(0, 0); track.lineTo(width, 0);
            track.moveTo(0, 22); track.lineTo(width, 22);
            for (let x = 0; x < width; x += 36) {
                track.moveTo(x, 0); track.lineTo(x - 18, 22);
            }
            this._track.addChild(strip);
        }
        this.display.addChild(this._track);
        this._shadow.graphics.beginFill(0x050e20, 0.45);
        this._shadow.graphics.drawEllipse(-22, -3, 48, 8);
        this._shadow.x = RUNNER_X;
        this._shadow.y = this.floor - 1;
        this.display.addChild(this._shadow);
        this.display.addChild(this._items);
        this.display.addChild(this.actors);
        this.display.touchChildren = false;
        this.display.touchEnabled = true;
    }

    public render(model: RunnerModel): void {
        this._far.x = -(model.distance * 0.13 % model.width);
        this._near.x = -(model.distance * 0.32 % model.width);
        this._track.x = -(model.distance % model.width);
        this._shadow.scaleX = Math.max(0.45, 1 - model.height / 300);
        this._shadow.alpha = Math.max(0.2, 1 - model.height / 240);
        for (const entity of model.entities) {
            let visual = this._visuals.get(entity.id);
            if (!visual) {
                visual = entity.kind === 'crystal' ? crystal() : barrier(entity);
                this._visuals.set(entity.id, visual);
                this._items.addChild(visual);
            }
            visual.x = entity.x;
            visual.y = this.floor - entity.y - entity.height;
            visual.visible = entity.kind === 'crystal' ? !entity.spent : true;
            visual.alpha = entity.kind === 'barrier' && entity.spent ? 0.35 : 1;
        }
        const live = new Set(model.entities.map(entity => entity.id));
        for (const [id, visual] of this._visuals) {
            if (!live.has(id)) {
                this._items.removeChild(visual);
                this._visuals.delete(id);
            }
        }
    }

    public reset(): void {
        this._items.removeChildren();
        this._visuals.clear();
    }

    public dispose(): void {
        this.reset();
        this.display.parent?.removeChild(this.display);
        this.display.removeChildren();
    }

    private makeCity(layer: Sprite, width: number, color: number, maximum: number, spacing: number): void {
        for (let copy = 0; copy < 2; copy++) {
            const tile = new Shape();
            tile.x = copy * width;
            const g = tile.graphics;
            for (let x = 0, i = 0; x < width; x += spacing, i++) {
                const h = 24 + (i * 37 + 16) % maximum;
                g.beginFill(color); g.drawRoundRect(x, this.floor - h, spacing - 8, h, 4); g.endFill();
                g.beginFill(0x78aabe, 0.35);
                for (let y = this.floor - h + 10; y < this.floor - 8; y += 14) {
                    g.drawRect(x + 8, y, 4, 4);
                    g.drawRect(x + 18, y, 4, 4);
                }
                g.endFill();
            }
            layer.addChild(tile);
        }
    }
}
