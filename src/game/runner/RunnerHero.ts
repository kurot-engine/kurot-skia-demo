import { SkeletonRenderer } from '@kurot/spine-4.2';
import type { SkeletonData } from '@kurot/spine-4.2';

import { RUNNER_X } from './RunnerModel';
import type { RunnerModel } from './RunnerModel';

/**
 * A live SDK skeleton with a scene-owned clock, avoiding a second ticker.
 */
export class RunnerHero {
    public readonly display: SkeletonRenderer;
    private _animation = '';
    private readonly _scale = 0.18;

    public constructor(data: SkeletonData, private readonly floor: number) {
        for (const name of ['idle', 'run', 'jump', 'death']) {
            if (!data.findAnimation(name)) {
                throw new Error(`Spineboy animation is missing: ${name}`);
            }
        }
        this.display = new SkeletonRenderer(data);
        this.display.scaleX = this._scale;
        // SkeletonRenderer already flips its local Spine Y axis. Preserve that flip.
        this.display.scaleY = -this._scale;
        this.display.x = RUNNER_X;
        this.display.y = floor;
        this.display.touchEnabled = this.display.touchChildren = false;
        this.display.stateData.defaultMix = 0.12;
        this.setAnimation('idle');
        this.display.update(0);
    }

    public update(model: RunnerModel, deltaSeconds: number): void {
        if (model.phase === 'paused') return;
        this.setAnimation(model.phase === 'over' ? 'death'
            : model.phase === 'ready' ? 'idle' : model.jumps > 0 ? 'jump' : 'run');
        this.display.update(deltaSeconds * 1000);
        // The source jump contains its own vertical travel; game physics owns travel.
        const footOffset = model.jumps > 0 ? this.display.skeleton.getBoundsRect().y * this._scale : 0;
        this.display.y = this.floor - model.height + footOffset;
        this.display.alpha = model.invulnerable > 0 && model.phase === 'running'
            ? (Math.floor(model.elapsed * 12) % 2 === 0 ? 0.35 : 1) : 1;
    }

    public reset(): void {
        this.display.state.clearTracks();
        this.display.skeleton.setToSetupPose();
        this._animation = '';
    }

    public dispose(): void {
        this.display.state.clearTracks();
        this.display.parent?.removeChild(this.display);
    }

    private setAnimation(name: string): void {
        if (this._animation === name) return;
        this._animation = name;
        this.display.state.setAnimation(0, name, name === 'run' || name === 'idle');
    }
}
