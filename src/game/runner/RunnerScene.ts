import { Event, TouchEvent } from '@kurot/core';
import type { Resource, Stage } from '@kurot/core';
import type { NativeScene } from '@kurot/skia';

import { loadSpineAssets } from '../../resources/spine';
import type { SpineAssets } from '../../resources/spine';
import { installNativeUI } from '../../ui/native-ui';
import { RunnerHero } from './RunnerHero';
import { RunnerModel } from './RunnerModel';
import { RunnerUI } from './RunnerUI';
import type { RunnerLoadState } from './RunnerUI';
import { RunnerWorld } from './RunnerWorld';

export interface RunnerSession {
    best: number;
    attempts: number;
}

/**
 * One native scene owns the game, skin listeners, live skeleton and borrowed atlas.
 */
export class RunnerScene implements NativeScene {
    private readonly _model: RunnerModel;
    private readonly _world: RunnerWorld;
    private readonly _ui: RunnerUI;
    private readonly _restoreUI: () => void;
    private _assets?: SpineAssets;
    private _hero?: RunnerHero;
    private _load: RunnerLoadState = 'loading';
    private _disposed = false;

    public constructor(
        private readonly stage: Stage,
        resources: Resource,
        private readonly session: RunnerSession,
        onLaboratory: () => void,
        private readonly onError: (message: string) => void,
    ) {
        this._restoreUI = installNativeUI(resources);
        this._model = new RunnerModel(stage.stageWidth);
        this._world = new RunnerWorld(stage.stageWidth, stage.stageHeight);
        stage.addChild(this._world.display);
        this._ui = new RunnerUI(stage, {
            jump: this.onJump,
            pause: this.onPause,
            main: this.onMain,
            laboratory: onLaboratory,
        });
        stage.addEventListener(TouchEvent.TOUCH_BEGIN, this.onJump);
        stage.addEventListener(Event.DEACTIVATE, this.onPause);
        this._ui.render(this._model, session.best, this._load);
        void this.loadHero();
    }

    public update(deltaSeconds: number): void {
        if (this._disposed) return;
        const advanced = this._model.advance(deltaSeconds);
        this.session.best = Math.max(this.session.best, this._model.score);
        this._world.render(this._model);
        const animationDelta = this._model.phase === 'running' ? advanced
            : this._model.phase === 'paused' ? 0 : Math.min(deltaSeconds, 0.1);
        this._hero?.update(this._model, animationDelta);
        this._ui.render(this._model, this.session.best, this._load);
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this.stage.removeEventListener(TouchEvent.TOUCH_BEGIN, this.onJump);
        this.stage.removeEventListener(Event.DEACTIVATE, this.onPause);
        this._ui.dispose();
        this._hero?.dispose();
        this._world.dispose();
        // Mesh users release their atlas references before the loader destroys it.
        this._assets?.dispose();
        this._assets = undefined;
        this._restoreUI();
    }

    private onJump = (): void => {
        this._model.jump();
    };

    private onPause = (): void => {
        this._model.pause();
        this._ui.render(this._model, this.session.best, this._load);
    };

    private onMain = (): void => {
        if (this._load === 'failed') {
            this._load = 'loading';
            void this.loadHero();
        } else if (this._load === 'ready') {
            if (this._model.phase === 'paused') {
                this._model.resume();
            } else {
                this._world.reset();
                this._hero?.reset();
                this._model.start(++this.session.attempts);
            }
        }
        this._ui.render(this._model, this.session.best, this._load);
    };

    private async loadHero(): Promise<void> {
        let assets: SpineAssets | undefined;
        try {
            assets = await loadSpineAssets();
            if (this._disposed) {
                assets.dispose();
                return;
            }
            this._hero = new RunnerHero(assets.data, this._world.floor);
            this._world.actors.addChild(this._hero.display);
            this._assets = assets;
            this._load = 'ready';
        } catch (error) {
            assets?.dispose();
            if (this._disposed) return;
            this._load = 'failed';
            this.onError(error instanceof Error ? error.message : String(error));
        }
        this._ui.render(this._model, this.session.best, this._load);
    }
}
