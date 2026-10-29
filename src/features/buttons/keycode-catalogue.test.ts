import assert from 'node:assert/strict';
import test from 'node:test';
import { t } from '../../i18n/index.ts';
import { KEYCODE_CATALOGUE, searchKeycodes, type KeycodeChoice } from './keycode-catalogue.ts';
import { formatKeycode, KEYCODE_NAMES, parseKeycode } from './logitech-keycodes.ts';

const label = (choice: KeycodeChoice): string => choice.label ? t('en', choice.label) : choice.glyph ?? choice.code;
test('catalogue covers every supported named code once per binding, without offering firmware functions', () => {
  const canonical = KEYCODE_CATALOGUE.map((choice) => {
    const result = parseKeycode(choice.code);
    assert.ok(result.binding, choice.code);
    return formatKeycode(result.binding);
  });
  assert.equal(new Set(canonical).size, canonical.length);
  for (const name of KEYCODE_NAMES) {
    assert.ok(KEYCODE_CATALOGUE.some((choice) => choice.aliases.includes(name)), name);
  }
  for (const query of ['QK_BOOT', 'QK_DEBUG', 'MO(1)', 'TG(1)', 'KC_TRNS', 'AU_ON']) {
    assert.deepEqual(searchKeycodes(query, 'all', label), []);
  }
});

test('search finds human names, short VIA aliases, expressions and localized labels', () => {
  assert.equal(searchKeycodes('mission control', 'mac', label).length, 2);
  assert.equal(searchKeycodes('kc_mctl', 'all', label)[0].code, 'KC_MISSION_CONTROL');
  assert.equal(searchKeycodes('volume', 'media', label).length, 2);
  assert.equal(searchKeycodes('KC_VOLU', 'all', label)[0].label, 'prof.volUp');
  assert.equal(searchKeycodes('LCTL(KC_LEFT)', 'all', label)[0].label, 'catalog.spaceLeft');
  assert.equal(searchKeycodes('F24', 'keyboard', label)[0].code, 'KC_F24');
  assert.deepEqual(searchKeycodes('volume', 'mouse', label), []);
  const localized = (choice: KeycodeChoice): string => choice.label === 'catalog.appExpose' ? 'Exposé' : label(choice);
  assert.equal(searchKeycodes('expose', 'mac', localized)[0].code, 'LCTL(KC_DOWN)');
});

test('Mac presets encode the requested consumer usages and physical keyboard shortcuts', () => {
  const expected = [
    ['catalog.missionControl', { kind: 'consumer', usage: 0x029f }],
    ['catalog.launchpad', { kind: 'consumer', usage: 0x02a0 }],
    ['catalog.spaceLeft', { kind: 'keyboard', key: 0x50, modifiers: 1 }],
    ['catalog.spaceRight', { kind: 'keyboard', key: 0x4f, modifiers: 1 }],
    ['catalog.windowNext', { kind: 'keyboard', key: 0x35, modifiers: 8 }],
    ['catalog.windowPrevious', { kind: 'keyboard', key: 0x35, modifiers: 10 }],
    ['catalog.appNext', { kind: 'keyboard', key: 0x2b, modifiers: 8 }],
  ] as const;
  for (const [name, binding] of expected) {
    const choice = KEYCODE_CATALOGUE.find((item) => item.label === name);
    assert.ok(choice, name);
    assert.deepEqual(parseKeycode(choice.code).binding, binding);
  }
  const shifted = KEYCODE_CATALOGUE.find((choice) => choice.glyph === '!')!;
  assert.deepEqual(parseKeycode(shifted.code).binding, { kind: 'keyboard', key: 0x1e, modifiers: 2 });
});
