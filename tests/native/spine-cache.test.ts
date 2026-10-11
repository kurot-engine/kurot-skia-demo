import { Stage } from '@kurot/core';
import { NativeSpineAnimationCache, SkiaRenderer } from '@kurot/skia';
import { SkeletonAnimation } from '@kurot/spine-4.2';
import { AlphaType, ColorType, Skia } from 'react-native-skia';

import { loadSpineAssets } from '../../src/resources/spine';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`Demo Spine cache check failed: ${message}`);
}

function pixels(stage: Stage, renderer: SkiaRenderer): Uint8Array {
    const surface = Skia.Surface.MakeOffscreen(128, 128, { colorSpace: 'srgb' });
    assert(surface, 'GPU surface allocation');
    try {
        const canvas = surface.getCanvas();
        canvas.clear(Skia.Color('transparent'));
        renderer.render(stage, canvas);
        surface.flush(true);
        const image = surface.makeImageSnapshot();
        try {
            const result = image.readPixels(0, 0, { width: 128, height: 128,
                colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
            assert(result instanceof Uint8Array, 'GPU pixels');
            return result;
        } finally { image.dispose(); }
    } finally { surface.dispose(); }
}

/**
 * Registry integration oracle: cached poses match a fresh SDK player at the
 * selected sample time. Twenty different phases retain independent clocks.
 */
export async function runSpineCacheChecks(): Promise<void> {
    const assets = await loadSpineAssets();
    let cache: NativeSpineAnimationCache | undefined;
    const renderer = new SkiaRenderer();
    const reference = new SkiaRenderer(1, false, false);
    const stage = new Stage();
    const expectedStage = new Stage();
    try {
        cache = new NativeSpineAnimationCache({
            createSource: () => new SkeletonAnimation(assets.data), animation: 'walk', sampleRate: 60,
        });
        const actors = Array.from({ length: 20 }, (_, index) => {
            const actor = cache!.createPlayer({ autoUpdate: false });
            actor.seek(index * 61);
            return actor;
        });
        assert(new Set(actors.map(actor => actor.sampleTimeMs)).size === 20, '20 independent sampled phases');
        const actor = actors[0];
        actor.x = 64; actor.y = 112; actor.scaleX = actor.scaleY = 0.16;
        stage.addChild(actor);
        for (const time of [0, 183, 617, 983]) {
            actor.seek(time);
            const fresh = new SkeletonAnimation(assets.data);
            fresh.x = actor.x; fresh.y = actor.y; fresh.scaleX = fresh.scaleY = actor.scaleX;
            fresh.play('walk', 0);
            fresh.renderer.update(actor.sampleTimeMs);
            expectedStage.addChild(fresh);
            try {
                const actual = pixels(stage, renderer);
                const expected = pixels(expectedStage, reference);
                assert(actual.some((value, index) => index % 4 === 3 && value > 0), 'visible cached output');
                const mismatch = actual.findIndex((value, index) => Math.abs(value - expected[index]) > 2);
                assert(mismatch < 0, `cached pose matches independent painter at ${actor.sampleTimeMs} ms, byte ${mismatch}`);
            } finally { fresh.stopAll(); expectedStage.removeChildren(); }
        }
        const previous = actors[1].currentTimeMs;
        actor.paused = true;
        const paused = actor.currentTimeMs;
        actor.advanceTime(100);
        actors[1].advanceTime(100);
        assert(actor.currentTimeMs === paused && actors[1].currentTimeMs !== previous, 'independent pause/clocks');
        cache.dispose();
        assert(stage.numChildren === 0, 'cache disposal removes staged players');
        const fresh = new SkeletonAnimation(assets.data);
        assert(fresh.renderer.slotRenderers.length > 0, 'caller-owned atlas survives cache disposal');
        fresh.stopAll();
    } finally {
        stage.removeChildren(); expectedStage.removeChildren();
        renderer.dispose(); reference.dispose(); cache?.dispose(); assets.dispose();
    }
    console.info('Kurot Skia: registry Spine cache checks passed (20 phases, GPU poses, clocks, disposal).');
}
