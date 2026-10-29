import assert from 'node:assert/strict';
import test from 'node:test';
import { logitechProfileControl } from './logitech-controls.ts';

test('G502 X physical labels follow storage slots, not sequential G-numbers', () => {
  for (const model of ['G502 X LIGHTSPEED', 'G502 X PLUS', 'G502 X']) {
    assert.equal(logitechProfileControl(model, 4).badge, 'G6');
    assert.equal(logitechProfileControl(model, 5).badge, 'G5');
    assert.equal(logitechProfileControl(model, 6).label, 'controls.wheelLeft');
    assert.equal(logitechProfileControl(model, 7).label, 'controls.wheelRight');
    assert.equal(logitechProfileControl(model, 8).badge, 'G9');
    assert.equal(logitechProfileControl(model, 9).badge, 'G8');
    assert.equal(logitechProfileControl(model, 10).badge, 'G7');
  }
});

test('unknown models and extra slots use neutral slot numbers', () => {
  for (const model of ['G703', 'USB Receiver', 'G502 HERO', '']) {
    assert.deepEqual(logitechProfileControl(model, 6), { badge: '7', label: 'controls.button' });
  }
  assert.deepEqual(logitechProfileControl('G502 X', 11), { badge: '12', label: 'controls.button' });
});
