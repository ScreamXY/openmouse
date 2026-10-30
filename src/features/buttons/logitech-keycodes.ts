import type { LogitechButtonAction, LogitechButtonBinding } from '@openmouse/protocol/drivers/logitech/onboard-profiles';
import { BASIC_KEY_NAMES, KEY_ALIASES } from './qmk-key-names.ts';

// This is a translator for direct onboard assignments, not a QMK interpreter.
// Consumer usages follow QMK's tmk_core/protocol/report.h (KEYCODE2CONSUMER).
const CONSUMER_KEYS = [
  ['AUDIO_MUTE', 0x00e2], ['AUDIO_VOL_UP', 0x00e9], ['AUDIO_VOL_DOWN', 0x00ea],
  ['MEDIA_NEXT_TRACK', 0x00b5], ['MEDIA_PREV_TRACK', 0x00b6], ['MEDIA_STOP', 0x00b7],
  ['MEDIA_PLAY_PAUSE', 0x00cd], ['MEDIA_SELECT', 0x0183], ['MEDIA_EJECT', 0x00cc],
  ['MAIL', 0x018a], ['CALCULATOR', 0x0192], ['MY_COMPUTER', 0x0194],
  ['WWW_SEARCH', 0x0221], ['WWW_HOME', 0x0223], ['WWW_BACK', 0x0224],
  ['WWW_FORWARD', 0x0225], ['WWW_STOP', 0x0226], ['WWW_REFRESH', 0x0227],
  ['WWW_FAVORITES', 0x022a], ['MEDIA_FAST_FORWARD', 0x00b3], ['MEDIA_REWIND', 0x00b4],
  ['BRIGHTNESS_UP', 0x006f], ['BRIGHTNESS_DOWN', 0x0070], ['CONTROL_PANEL', 0x019f],
  ['ASSISTANT', 0x01cb], ['MISSION_CONTROL', 0x029f], ['LAUNCHPAD', 0x02a0],
] as const;

export const KEYCODE_MAX_LENGTH = 256;

// Both lists follow the HID modifier bit order.
const MODIFIER_NAMES = ['LEFT_CTRL', 'LEFT_SHIFT', 'LEFT_ALT', 'LEFT_GUI', 'RIGHT_CTRL', 'RIGHT_SHIFT', 'RIGHT_ALT', 'RIGHT_GUI'];
const MODIFIER_WRAPPERS = ['LCTL', 'LSFT', 'LALT', 'LGUI', 'RCTL', 'RSFT', 'RALT', 'RGUI'];
const WRAPPERS: Readonly<Record<string, number>> = {
  LCTL: 1, C: 1, LSFT: 2, S: 2, LALT: 4, LOPT: 4, A: 4,
  LGUI: 8, LCMD: 8, LWIN: 8, G: 8,
  RCTL: 0x10, RSFT: 0x20, RALT: 0x40, ROPT: 0x40, ALGR: 0x40,
  RGUI: 0x80, RCMD: 0x80, RWIN: 0x80,
  LCS: 3, LCA: 5, LCG: 9, LSA: 6, LSG: 10, LAG: 12,
  LCSG: 11, LCAG: 13, LSAG: 14, MEH: 7, HYPR: 15,
  RCS: 0x30, RCA: 0x50, RCG: 0x90, RSA: 0x60, RSG: 0xa0, RAG: 0xc0,
  RCSG: 0xb0, RCAG: 0xd0, RSAG: 0xe0,
};
const ACTION_KEYS: Readonly<Record<string, LogitechButtonAction>> = {
  KC_NO: 'Disabled', KC_BTN1: 'Left click', KC_BTN2: 'Right click', KC_BTN3: 'Middle click',
  KC_BTN4: 'Back', KC_BTN5: 'Forward',
  // Logitech-specific names, deliberately distinct from QMK layer operations.
  G_SHIFT: 'G-Shift', DPI_NEXT: 'Next DPI', DPI_PREV: 'Previous DPI', DPI_CYCLE: 'Cycle DPI',
  DPI_DEFAULT: 'Default DPI', DPI_SHIFT: 'DPI Shift', PROFILE_NEXT: 'Next profile',
  PROFILE_PREV: 'Previous profile', PROFILE_CYCLE: 'Cycle profiles', BATTERY: 'Battery indicator',
  TILT_LEFT: 'Tilt left', TILT_RIGHT: 'Tilt right',
};

const named = new Map<string, LogitechButtonBinding>();
const numeric = new Map<number, LogitechButtonBinding>();
const canonical = new Map<string, string>();
const identity = (binding: LogitechButtonBinding): string => JSON.stringify(binding);
function add(name: string, binding: LogitechButtonBinding, code?: number): void {
  named.set(name, binding);
  if (!canonical.has(identity(binding))) {
    canonical.set(identity(binding), name);
  }
  if (code !== undefined) {
    numeric.set(code, binding);
  }
}
for (const [offset, name] of BASIC_KEY_NAMES.entries()) {
  add(`KC_${name}`, { kind: 'keyboard', key: offset + 4, modifiers: 0 }, offset + 4);
}
for (const [offset, [name, usage]] of CONSUMER_KEYS.entries()) {
  add(`KC_${name}`, { kind: 'consumer', usage }, offset + 0xa8);
}
for (const [bit, name] of MODIFIER_NAMES.entries()) {
  add(`KC_${name}`, { kind: 'keyboard', key: 0, modifiers: 1 << bit }, 0xe0 + bit);
}
for (const [alias, name] of Object.entries(KEY_ALIASES)) {
  const binding = named.get(`KC_${name}`);
  if (binding) {
    named.set(`KC_${alias}`, binding);
  }
}
for (const [name, action] of Object.entries(ACTION_KEYS)) {
  add(name, { kind: 'action', action });
}
numeric.set(0, named.get('KC_NO')!);
for (let button = 1; button <= 5; button += 1) {
  const binding = named.get(`KC_BTN${button}`)!;
  named.set(`MS_BTN${button}`, binding);
  named.set(`QK_MOUSE_BUTTON_${button}`, binding);
  numeric.set(0xd0 + button, binding);
}
add('KC_HYPR', { kind: 'keyboard', key: 0, modifiers: 15 });
add('KC_MEH', { kind: 'keyboard', key: 0, modifiers: 7 });

export type KeycodeError = 'keycode.invalid' | 'keycode.unsupported' | 'keycode.modifierTarget';
export type KeycodeResult = { binding: LogitechButtonBinding; error: null } | { binding: null; error: KeycodeError };
const fail = (error: KeycodeError): KeycodeResult => ({ binding: null, error });
const success = (binding: LogitechButtonBinding): KeycodeResult => ({ binding, error: null });

function withModifiers(result: KeycodeResult, modifiers: number): KeycodeResult {
  if (!result.binding) {
    return result;
  }
  const binding = result.binding;
  if (binding.kind === 'action' && binding.action === 'Disabled') {
    return success({ kind: 'keyboard', key: 0, modifiers });
  }
  if (binding.kind !== 'keyboard') {
    return fail('keycode.modifierTarget');
  }
  return success({ kind: 'keyboard', key: binding.key, modifiers: modifiers | binding.modifiers });
}

function parse(text: string, depth: number): KeycodeResult {
  if (depth > 8) {
    return fail('keycode.invalid');
  }
  const known = named.get(text);
  if (known) {
    return success({ ...known });
  }
  if (/^0X[0-9A-F]{1,4}$/.test(text)) {
    const code = Number.parseInt(text.slice(2), 16);
    const direct = numeric.get(code);
    if (direct) {
      return success({ ...direct });
    }
    if (code >= 0x0100 && code <= 0x1fff) {
      const mods = code >> 8;
      const base = numeric.get(code & 0xff);
      return withModifiers(base ? success(base) : fail('keycode.unsupported'), (mods & 15) << (mods & 16 ? 4 : 0));
    }
    return fail('keycode.unsupported');
  }
  const call = /^([A-Z][A-Z0-9_]*)\s*\((.*)\)$/.exec(text);
  if (call) {
    const [, name, argument] = call;
    if (name === 'HID_KEY' || name === 'HID_CONSUMER') {
      if (!/^0X[0-9A-F]{1,4}$/.test(argument.trim())) {
        return fail('keycode.invalid');
      }
      const value = Number.parseInt(argument.trim().slice(2), 16);
      if (name === 'HID_KEY' && value <= 0xff) {
        return success({ kind: 'keyboard', key: value, modifiers: 0 });
      }
      if (name === 'HID_CONSUMER' && value > 0 && value <= 0xffff) {
        return success({ kind: 'consumer', usage: value });
      }
      return fail('keycode.invalid');
    }
    const mods = Object.hasOwn(WRAPPERS, name) ? WRAPPERS[name] : null;
    if (mods !== null) {
      return withModifiers(parse(argument.trim(), depth + 1), mods);
    }
    return fail('keycode.unsupported');
  }
  return fail(/^[A-Z][A-Z0-9_]*$/.test(text) ? 'keycode.unsupported' : 'keycode.invalid');
}

/** Names and hex use QMK values; raw HID values require an explicit HID_* wrapper. */
export function parseKeycode(input: string): KeycodeResult {
  if (input.length > KEYCODE_MAX_LENGTH || !input.trim()) {
    return fail('keycode.invalid');
  }
  return parse(input.trim().toUpperCase(), 0);
}

const hex = (value: number, width: number): string => `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;

/** Preserve every direct binding, including unfamiliar HID codes. Macros are handled by the caller. */
export function formatKeycode(binding: LogitechButtonBinding): string {
  // Avoid relying on object property order when reading a binding from the controller.
  const normalized: LogitechButtonBinding = binding.kind === 'keyboard'
    ? { kind: 'keyboard', key: binding.key, modifiers: binding.modifiers }
    : binding.kind === 'consumer' ? { kind: 'consumer', usage: binding.usage } : { kind: 'action', action: binding.action };
  const exact = canonical.get(identity(normalized));
  if (exact) {
    return exact;
  }
  if (binding.kind === 'consumer') {
    return `HID_CONSUMER(${hex(binding.usage, 4)})`;
  }
  if (binding.kind === 'action') {
    return binding.action;
  }
  let name = canonical.get(identity({ kind: 'keyboard', key: binding.key, modifiers: 0 })) ?? `HID_KEY(${hex(binding.key, 2)})`;
  for (const [bit, wrapper] of MODIFIER_WRAPPERS.entries()) {
    if (binding.modifiers & (1 << bit)) {
      name = `${wrapper}(${name})`;
    }
  }
  return name;
}

export const KEYCODE_NAMES = [...named.keys()];
