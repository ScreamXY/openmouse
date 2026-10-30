import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeButtonAssignment, LOGITECH_BUTTON_ACTIONS, type LogitechButtonBinding } from '@openmouse/protocol/drivers/logitech/onboard-profiles';
import { formatKeycode, KEYCODE_NAMES, parseKeycode } from './logitech-keycodes.ts';

function binding(text: string): LogitechButtonBinding {
  const result = parseKeycode(text);
  assert.equal(result.error, null, text);
  assert.ok(result.binding, text);
  return result.binding;
}

test('keys, international keys, keypad and F1–F24 use keyboard HID usages', () => {
  for (const [name, key] of [['KC_A', 4], ['kc_z', 0x1d], ['KC_0', 0x27], ['KC_ENTER', 0x28],
    ['KC_F1', 0x3a], ['KC_F12', 0x45], ['KC_F13', 0x68], ['KC_F24', 0x73], ['KC_NUBS', 0x64],
    ['KC_INT1', 0x87], ['KC_PENT', 0x58]] as const) {
    assert.deepEqual(binding(name), { kind: 'keyboard', key, modifiers: 0 });
  }
});

test('shortcuts support nested modifiers and preserve modifier-only holds', () => {
  assert.deepEqual(binding(' LCTL( LSFT(KC_C) ) '), { kind: 'keyboard', key: 6, modifiers: 3 });
  assert.deepEqual(binding('LCMD(KC_C)'), { kind: 'keyboard', key: 6, modifiers: 8 });
  assert.deepEqual(binding('HYPR(KC_NO)'), { kind: 'keyboard', key: 0, modifiers: 15 });
  assert.deepEqual(binding('KC_HYPR'), binding('HYPR(KC_NO)'));
  assert.deepEqual(binding('MEH(KC_NO)'), { kind: 'keyboard', key: 0, modifiers: 7 });
  assert.deepEqual(binding('KC_LCTL'), { kind: 'keyboard', key: 0, modifiers: 1 });
  assert.deepEqual(binding('RALT(KC_F13)'), { kind: 'keyboard', key: 0x68, modifiers: 0x40 });
  assert.deepEqual(binding('KC_RGUI'), { kind: 'keyboard', key: 0, modifiers: 0x80 });
});

test('consumer keycodes translate QMK values instead of writing them as keyboard keys', () => {
  assert.deepEqual(binding('KC_MCTL'), { kind: 'consumer', usage: 0x029f });
  assert.deepEqual(binding('KC_LPAD'), { kind: 'consumer', usage: 0x02a0 });
  assert.deepEqual(binding('KC_MPLY'), { kind: 'consumer', usage: 0xcd });
  assert.deepEqual(binding('KC_VOLU'), { kind: 'consumer', usage: 0xe9 });
  assert.deepEqual(binding('KC_BRIU'), { kind: 'consumer', usage: 0x6f });
  assert.deepEqual(binding('0xC1'), binding('KC_MCTL'));
  assert.deepEqual(binding('0xA8'), binding('KC_MUTE'));
  assert.deepEqual(binding('HID_KEY(0xC1)'), { kind: 'keyboard', key: 0xc1, modifiers: 0 });
});

test('QMK hex supports modifier encodings without truncating high bytes', () => {
  assert.deepEqual(binding('0x0106'), binding('LCTL(KC_C)'));
  assert.deepEqual(binding('0x0F00'), binding('HYPR(KC_NO)'));
  assert.deepEqual(binding('0x1468'), binding('RALT(KC_F13)'));
  assert.deepEqual(binding('0x00E5'), binding('KC_RSFT'));
  for (const text of ['0x10068', '0x2004', '0x5221', '0xA5', '0x01C1', '0x01D1', '0xFFFF']) {
    assert.equal(parseKeycode(text).binding, null, text);
  }
});

test('malformed, unsupported and executable inputs never produce a binding', () => {
  for (const text of ['', 'KC_F25', 'KC_TRNS', 'MO(1)', 'LT(1,KC_A)', 'MT(MOD_LCTL,KC_A)', 'TG(1)',
    'KC_MCTL()', 'LCTL(KC_C))', 'LCTL(KC_C,KC_V)', 'HYPR(KC_BTN1)', 'LSFT(KC_MPLY)',
    '0xGG', '-1', '256', 'HID_KEY(0x100)', 'HID_CONSUMER(0x0000)', 'HID_CONSUMER(0x10000)',
    'constructor(KC_C)', 'toString(KC_C)', 'globalThis.alert(1)', 'KC_C;alert(1)',
    'LCTL('.repeat(10) + 'KC_C' + ')'.repeat(10), 'A'.repeat(257)]) {
    assert.equal(parseKeycode(text).binding, null, text);
  }
  assert.equal(parseKeycode('LCTL(KC_MCTL)').error, 'keycode.modifierTarget');
});

test('all named keys and Logitech actions survive formatting and parsing', () => {
  for (const name of KEYCODE_NAMES) {
    const value = binding(name);
    assert.deepEqual(binding(formatKeycode(value)), value, name);
  }
  for (const action of LOGITECH_BUTTON_ACTIONS) {
    const value = { kind: 'action', action } as const;
    assert.deepEqual(binding(formatKeycode(value)), value);
  }
});

test('every direct keyboard byte and modifier mask can be reopened without changing it', () => {
  for (let key = 0; key <= 0xff; key += 1) {
    for (let modifiers = 0; modifiers <= 0xff; modifiers += 1) {
      const value = { kind: 'keyboard', key, modifiers } as const;
      assert.deepEqual(binding(formatKeycode(value)), value);
    }
  }
  for (const usage of [1, 0xff, 0x100, 0x29f, 0xabcd, 0xffff]) {
    const value = { kind: 'consumer', usage } as const;
    assert.deepEqual(binding(formatKeycode(value)), value);
  }
});

test('the profile codec stores direct keys, Hyper and Mission Control in exactly one slot', () => {
  for (const format of [2, 6, 7]) {
    for (const layer of ['primary', 'g-shift'] as const) {
      const table = format < 6 ? (layer === 'primary' ? 0x20 : 0x60) : (layer === 'primary' ? 0x30 : 0x70);
      for (const [code, bytes] of [
        ['KC_F13', [0x80, 0x02, 0, 0x68]],
        ['LCTL(KC_C)', [0x80, 0x02, 1, 6]],
        ['HYPR(KC_NO)', [0x80, 0x02, 15, 0]],
        ['KC_MCTL', [0x80, 0x03, 0x02, 0x9f]],
        ['G_SHIFT', [0x90, 0x0b, 0, 0]],
      ] as const) {
        const original = Uint8Array.from({ length: 256 }, (_, i) => i);
        const copy = original.slice();
        const offset = table + 3 * 4;
        const encoded = encodeButtonAssignment(original, format, layer, 3, binding(code));
        assert.deepEqual([...encoded.slice(offset, offset + 4)], [...bytes]);
        assert.deepEqual(encoded.slice(0, offset), original.slice(0, offset));
        assert.deepEqual(encoded.slice(offset + 4, -2), original.slice(offset + 4, -2));
        assert.deepEqual(original, copy);
      }
    }
  }
});
