export type RunnerPhase = 'ready' | 'running' | 'paused' | 'over';

export interface RunnerEntity {
    id: number;
    kind: 'barrier' | 'crystal';
    x: number;
    y: number;
    width: number;
    height: number;
    spent: boolean;
}

export const RUNNER_X = 82;
export const RUNNER_HEIGHT = 90;
const STEP = 1 / 120;
const GRAVITY = 1150;

/**
 * Logical pixels and seconds only; physics and Spine share the returned clock.
 * Long frames are capped so a resumed application cannot skip through hazards.
 */
export class RunnerModel {
    public phase: RunnerPhase = 'ready';
    public readonly entities: RunnerEntity[] = [];
    public height = 0;
    public velocity = 0;
    public jumps = 0;
    public lives = 3;
    public crystals = 0;
    public distance = 0;
    public elapsed = 0;
    public invulnerable = 0;
    private _accumulator = 0;
    private _nextWave = 1;
    private _nextID = 0;
    private _randomState = 1;

    public constructor(public readonly width: number) {}

    public get score(): number {
        return Math.floor(this.distance / 12) + this.crystals * 25;
    }

    public get speed(): number {
        return 170 + Math.min(95, this.elapsed * 1.5);
    }

    public start(seed = 1): void {
        this.phase = 'running';
        this.entities.length = 0;
        this.height = this.velocity = this.jumps = 0;
        this.crystals = this.distance = this.elapsed = this.invulnerable = 0;
        this.lives = 3;
        this._accumulator = 0;
        this._nextWave = 1;
        this._nextID = 0;
        this._randomState = seed >>> 0 || 1;
    }

    public jump(): boolean {
        if (this.phase !== 'running' || this.jumps >= 2) return false;
        this.velocity = this.jumps === 0 ? 480 : 420;
        this.jumps++;
        return true;
    }

    public pause(): void {
        if (this.phase === 'running') {
            this.phase = 'paused';
            this._accumulator = 0;
        }
    }

    public resume(): void {
        if (this.phase === 'paused') {
            this.phase = 'running';
        }
    }

    public advance(deltaSeconds: number): number {
        if (this.phase !== 'running' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
        this._accumulator += Math.min(deltaSeconds, 0.1);
        let advanced = 0;
        while (this._accumulator + 1e-10 >= STEP && this.phase === 'running') {
            this._accumulator -= STEP;
            this.step();
            advanced += STEP;
        }
        return advanced;
    }

    private step(): void {
        this.elapsed += STEP;
        this.distance += this.speed * STEP;
        this.invulnerable = Math.max(0, this.invulnerable - STEP);
        if (this.jumps > 0) {
            this.velocity -= GRAVITY * STEP;
            this.height = Math.max(0, this.height + this.velocity * STEP);
            if (this.height === 0 && this.velocity < 0) {
                this.velocity = this.jumps = 0;
            }
        }
        this._nextWave -= STEP;
        if (this._nextWave <= 0) {
            this.spawnWave();
            this._nextWave = 1.45 + this.random() * 0.5;
        }
        for (const entity of this.entities) {
            entity.x -= this.speed * STEP;
            if (entity.spent || !this.overlaps(entity)) continue;
            entity.spent = true;
            if (entity.kind === 'crystal') {
                this.crystals++;
            } else if (this.invulnerable === 0) {
                this.lives--;
                this.invulnerable = 1.3;
                if (this.lives === 0) {
                    this.phase = 'over';
                }
            }
        }
        for (let i = this.entities.length - 1; i >= 0; i--) {
            if (this.entities[i].x + this.entities[i].width < -24) {
                this.entities.splice(i, 1);
            }
        }
    }

    private overlaps(entity: RunnerEntity): boolean {
        return entity.x < RUNNER_X + 14 && entity.x + entity.width > RUNNER_X - 14
            && entity.y < this.height + RUNNER_HEIGHT && entity.y + entity.height > this.height + 6;
    }

    private spawnWave(): void {
        const x = this.width + 36;
        const tall = this.random() > 0.55;
        this.entities.push({ id: this._nextID++, kind: 'barrier', x, y: 0,
            width: tall ? 26 : 36, height: tall ? 48 : 30, spent: false });
        for (let i = 0; i < 3; i++) {
            this.entities.push({ id: this._nextID++, kind: 'crystal', x: x - 78 + i * 36,
                y: 88 + (i === 1 ? 16 : 0), width: 18, height: 24, spent: false });
        }
    }

    private random(): number {
        this._randomState = (Math.imul(this._randomState, 1664525) + 1013904223) >>> 0;
        return this._randomState / 0x100000000;
    }
}
