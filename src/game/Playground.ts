import { Bitmap, DisplayObjectContainer, Rectangle, Shape, Sprite, TouchEvent } from '@kurot/core';
import type { Stage, Texture } from '@kurot/core';
import type { SkImage } from 'react-native-skia';

import type { NativeScene } from '../skia/KurotView';
import { createSkiaTexture } from '../skia/textures';

const colors = [0x67e3bb, 0x72adff, 0xffd58a, 0xf6a4cc];

interface Particle {
    shape: Shape;
    vx: number;
    vy: number;
    age: number;
}

export interface InteractionStats {
    taps: number;
    drags: number;
}

export class Playground implements NativeScene {
    private readonly hero = new Sprite();
    private readonly orbit = new DisplayObjectContainer();
    private readonly particles: Particle[] = [];
    private readonly held = new Set<number>();
    private readonly texture: Texture;
    private taps = 0;
    private drags = 0;
    private time = 0;

    public constructor(private readonly stage: Stage, image: SkImage,
        private readonly onInteraction: (stats: InteractionStats) => void) {
        this.texture = createSkiaTexture(image, 2);
        const background = new Shape();
        for (let y = 24; y < 500; y += 28) {
            for (let x = 26; x < 360; x += 28) {
                background.graphics.beginFill(0x6c82a8, 0.19);
                background.graphics.drawCircle(x, y, 1.2);
                background.graphics.endFill();
            }
        }
        stage.addChild(background);

        const clipped = new Sprite();
        clipped.x = 28;
        clipped.y = 396;
        clipped.scrollRect = new Rectangle(18, 0, 304, 56);
        clipped.graphics.beginFill(0x1a2943);
        clipped.graphics.drawRoundRect(18, 0, 304, 56, 20);
        clipped.graphics.endFill();
        for (let i = 0; i < 11; i++) {
            const tile = new Shape();
            tile.x = i * 36;
            tile.y = 17;
            tile.rotation = 15;
            tile.graphics.beginFill(colors[i % colors.length], 0.8);
            tile.graphics.drawRoundRect(0, 0, 23, 23, 8);
            tile.graphics.endFill();
            clipped.addChild(tile);
        }
        stage.addChild(clipped);

        const ring = new Shape();
        ring.graphics.lineStyle(1, 0x486285, 0.65);
        ring.graphics.drawCircle(180, 205, 110);
        stage.addChild(ring);
        this.orbit.x = 180;
        this.orbit.y = 205;
        for (let i = 0; i < 4; i++) {
            const satellite = new Shape();
            satellite.x = Math.cos(i * Math.PI / 2) * 110;
            satellite.y = Math.sin(i * Math.PI / 2) * 110;
            satellite.graphics.beginFill(colors[i]);
            satellite.graphics.drawRoundRect(-12, -12, 24, 24, 9);
            satellite.graphics.endFill();
            this.orbit.addChild(satellite);
        }
        stage.addChild(this.orbit);

        const hero = this.hero;
        hero.x = 180;
        hero.y = 205;
        hero.touchEnabled = true;
        hero.touchChildren = false;
        hero.graphics.beginFill(0x223555);
        hero.graphics.drawCircle(0, 0, 64);
        hero.graphics.endFill();
        hero.graphics.lineStyle(2, 0x67e3bb, 0.9);
        hero.graphics.drawCircle(0, 0, 64);
        const mascot = new Bitmap(this.texture);
        mascot.width = 88;
        mascot.height = 88;
        mascot.anchorOffsetX = 44;
        mascot.anchorOffsetY = 44;
        hero.addChild(mascot);
        stage.addChild(hero);
        hero.addEventListener(TouchEvent.TOUCH_BEGIN, this.onBegin);
        stage.addEventListener(TouchEvent.TOUCH_MOVE, this.onMove);
        stage.addEventListener(TouchEvent.TOUCH_END, this.onEnd);
        stage.addEventListener(TouchEvent.TOUCH_CANCEL, this.onEnd);
        stage.addEventListener(TouchEvent.TOUCH_TAP, this.onTap);
    }

    public update(deltaSeconds: number): void {
        this.time += deltaSeconds;
        this.orbit.rotation += deltaSeconds * 28;
        for (const satellite of this.orbit.$children) {
            satellite.rotation -= deltaSeconds * 51;
        }
        if (!this.held.size) {
            const scale = 1 + Math.sin(this.time * 2) * 0.035;
            this.hero.scaleX = scale;
            this.hero.scaleY = scale;
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += deltaSeconds;
            particle.vy += deltaSeconds * 160;
            particle.shape.x += particle.vx * deltaSeconds;
            particle.shape.y += particle.vy * deltaSeconds;
            particle.shape.rotation += deltaSeconds * 140;
            particle.shape.alpha = Math.max(0, 1 - particle.age / 1.1);
            if (particle.age >= 1.1) {
                this.stage.removeChild(particle.shape);
                this.particles.splice(i, 1);
            }
        }
    }

    public dispose(): void {
        this.hero.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onBegin);
        this.stage.removeEventListener(TouchEvent.TOUCH_MOVE, this.onMove);
        this.stage.removeEventListener(TouchEvent.TOUCH_END, this.onEnd);
        this.stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this.onEnd);
        this.stage.removeEventListener(TouchEvent.TOUCH_TAP, this.onTap);
        this.texture.dispose();
        this.held.clear();
    }

    private onBegin = (event: TouchEvent): void => {
        this.held.add(event.touchPointID);
        this.hero.scaleX = this.hero.scaleY = 1.08;
    };

    private onMove = (event: TouchEvent): void => {
        if (!this.held.has(event.touchPointID)) {
            return;
        }
        this.hero.x = Math.max(64, Math.min(296, event.stageX));
        this.hero.y = Math.max(70, Math.min(330, event.stageY));
        this.drags++;
        this.onInteraction({ taps: this.taps, drags: this.drags });
    };

    private onEnd = (event: TouchEvent): void => {
        this.held.delete(event.touchPointID);
    };

    private onTap = (event: TouchEvent): void => {
        this.taps++;
        this.onInteraction({ taps: this.taps, drags: this.drags });
        for (let i = 0; i < 12 && this.particles.length < 120; i++) {
            const shape = new Shape();
            shape.x = event.stageX;
            shape.y = event.stageY;
            shape.graphics.beginFill(colors[i % colors.length]);
            shape.graphics.drawRoundRect(-4, -4, 8, 8, 3);
            shape.graphics.endFill();
            this.stage.addChild(shape);
            const angle = i * Math.PI / 6;
            this.particles.push({ shape, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100 - 70, age: 0 });
        }
    };
}
