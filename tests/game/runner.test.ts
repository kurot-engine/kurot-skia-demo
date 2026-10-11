import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RunnerModel, RUNNER_X } from '../../src/game/runner/RunnerModel';
import type { RunnerEntity } from '../../src/game/runner/RunnerModel';

function advance(model: RunnerModel, seconds: number, fps = 60): void {
    for (let i = 0; i < Math.round(seconds * fps); i++) {
        model.advance(1 / fps);
    }
}

function entity(id: number, kind: RunnerEntity['kind'], x = RUNNER_X - 8, y = 0): RunnerEntity {
    return { id, kind, x, y, width: 26, height: 30, spent: false };
}

test('ready, paused and game over reject input and freeze simulation', () => {
    const game = new RunnerModel(360);
    assert.equal(game.jump(), false);
    assert.equal(game.advance(1), 0);
    game.start();
    game.jump();
    advance(game, 0.2);
    game.pause();
    const snapshot = JSON.stringify(game);
    advance(game, 10);
    assert.equal(game.jump(), false);
    assert.equal(JSON.stringify(game), snapshot);
    game.resume();
    advance(game, 0.1);
    assert.ok(game.distance > 0 && game.height > 0);
    advance(game, 20);
    assert.equal(game.phase, 'over');
    const final = JSON.stringify(game);
    advance(game, 2);
    assert.equal(game.jump(), false);
    assert.equal(JSON.stringify(game), final);
});

test('two jumps only, then landing restores both jumps', () => {
    const game = new RunnerModel(360);
    game.start();
    assert.equal(game.jump(), true);
    advance(game, 0.2);
    assert.equal(game.jump(), true);
    assert.equal(game.jump(), false);
    advance(game, 1);
    assert.equal(game.height, 0);
    assert.equal(game.jumps, 0);
    assert.equal(game.jump(), true);
});

test('collision consumes a barrier once; invulnerability protects overlapping barriers', () => {
    const game = new RunnerModel(360);
    game.start();
    const first = entity(100, 'barrier');
    const second = entity(101, 'barrier');
    game.entities.push(first, second);
    game.advance(1 / 60);
    assert.equal(game.lives, 2);
    assert.equal(first.spent, true);
    assert.equal(second.spent, true);
    advance(game, 0.5);
    assert.equal(game.lives, 2);
    advance(game, 0.9);
    game.entities.push(entity(102, 'barrier'));
    game.advance(1 / 60);
    assert.equal(game.lives, 1);
});

test('jumping above a barrier avoids damage and crystals count once', () => {
    const game = new RunnerModel(360);
    game.start();
    game.jump();
    advance(game, 0.25);
    game.entities.push(entity(100, 'barrier'));
    game.entities.push(entity(101, 'crystal', RUNNER_X - 8, game.height + 12));
    game.advance(1 / 60);
    const score = game.score;
    assert.equal(game.lives, 3);
    assert.equal(game.crystals, 1);
    assert.ok(score >= 25);
    game.advance(1 / 60);
    assert.equal(game.crystals, 1);
});

test('fixed steps yield the same world at 30, 60 and 120 Hz', () => {
    const results = [30, 60, 120].map(fps => {
        const game = new RunnerModel(360);
        game.start(123);
        game.jump();
        advance(game, 2, fps);
        return { height: game.height, distance: game.distance, elapsed: game.elapsed,
            lives: game.lives, entities: game.entities };
    });
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[1], results[2]);
});

test('long or invalid frames cannot advance the player through a whole wave', () => {
    const game = new RunnerModel(360);
    game.start();
    assert.ok(game.advance(30) <= 0.100001);
    assert.ok(game.distance < 18);
    const distance = game.distance;
    for (const delta of [NaN, Infinity, -1, 0]) {
        assert.equal(game.advance(delta), 0);
    }
    assert.equal(game.distance, distance);
});

test('restart resets collision, clocks, objects and score; seeded waves repeat', () => {
    const game = new RunnerModel(360);
    game.start(8);
    advance(game, 2);
    const initial = JSON.stringify(game.entities);
    advance(game, 15);
    assert.equal(game.phase, 'over');
    game.start(8);
    assert.equal(game.score, 0);
    assert.equal(game.lives, 3);
    assert.equal(game.invulnerable, 0);
    assert.equal(game.entities.length, 0);
    advance(game, 2);
    assert.equal(JSON.stringify(game.entities), initial);
});

test('generated waves are playable at increasing speeds and old entities are removed', () => {
    const game = new RunnerModel(360);
    game.start(73);
    let largestCount = 0;
    for (let i = 0; i < 60 * 90; i++) {
        const barrier = game.entities.find(item => item.kind === 'barrier' && !item.spent
            && item.x > RUNNER_X - 14 && item.x < RUNNER_X + game.speed * 0.3);
        if (barrier && game.jumps === 0) {
            game.jump();
        }
        game.advance(1 / 60);
        largestCount = Math.max(largestCount, game.entities.length);
    }
    assert.equal(game.phase, 'running');
    assert.equal(game.lives, 3);
    assert.ok(game.crystals > 30);
    assert.ok(game.score > 1000);
    assert.ok(largestCount <= 12);
    assert.ok(game.entities.every(item => item.x + item.width >= -24));
});
