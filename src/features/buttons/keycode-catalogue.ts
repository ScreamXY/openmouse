import type { I18nKey } from '../../i18n/index.ts';
import { formatKeycode, KEYCODE_NAMES, parseKeycode } from './logitech-keycodes.ts';

export type KeycodeCategory = 'mac' | 'media' | 'keyboard' | 'mouse' | 'special';
export interface KeycodeChoice {
  code: string;
  category: KeycodeCategory;
  label: I18nKey | null;
  glyph: string | null;
  aliases: string[];
}

const presets: Array<[string, KeycodeCategory, I18nKey]> = [
  ['KC_MISSION_CONTROL', 'mac', 'catalog.missionControl'],
  ['KC_LAUNCHPAD', 'mac', 'catalog.launchpad'],
  ['LCTL(KC_LEFT)', 'mac', 'catalog.spaceLeft'],
  ['LCTL(KC_RIGHT)', 'mac', 'catalog.spaceRight'],
  ['LGUI(KC_GRAVE)', 'mac', 'catalog.windowNext'],
  ['LGUI(LSFT(KC_GRAVE))', 'mac', 'catalog.windowPrevious'],
  ['LGUI(KC_TAB)', 'mac', 'catalog.appNext'],
  ['LGUI(LSFT(KC_TAB))', 'mac', 'catalog.appPrevious'],
  ['LCTL(KC_UP)', 'mac', 'catalog.missionShortcut'],
  ['LCTL(KC_DOWN)', 'mac', 'catalog.appExpose'],
  ['LGUI(KC_SPACE)', 'mac', 'catalog.spotlight'],
  ['LGUI(KC_C)', 'mac', 'catalog.copy'], ['LGUI(KC_V)', 'mac', 'catalog.paste'],
  ['LGUI(KC_X)', 'mac', 'catalog.cut'], ['LGUI(KC_Z)', 'mac', 'catalog.undo'],
  ['LGUI(LSFT(KC_Z))', 'mac', 'catalog.redo'], ['LGUI(KC_A)', 'mac', 'catalog.selectAll'],
  ['KC_AUDIO_VOL_DOWN', 'media', 'prof.volDown'], ['KC_AUDIO_VOL_UP', 'media', 'prof.volUp'],
  ['KC_AUDIO_MUTE', 'media', 'prof.mute'], ['KC_MEDIA_PLAY_PAUSE', 'media', 'prof.playPause'],
  ['KC_MEDIA_STOP', 'media', 'catalog.mediaStop'],
  ['KC_MEDIA_PREV_TRACK', 'media', 'prof.prevTrack'], ['KC_MEDIA_NEXT_TRACK', 'media', 'prof.nextTrack'],
  ['KC_MEDIA_REWIND', 'media', 'catalog.rewind'], ['KC_MEDIA_FAST_FORWARD', 'media', 'catalog.fastForward'],
  ['KC_MEDIA_SELECT', 'media', 'catalog.mediaSelect'], ['KC_MEDIA_EJECT', 'media', 'catalog.eject'],
  ['KC_BRIGHTNESS_DOWN', 'media', 'catalog.brightnessDown'], ['KC_BRIGHTNESS_UP', 'media', 'catalog.brightnessUp'],
  ['KC_BTN1', 'mouse', 'tmr.leftClick'], ['KC_BTN2', 'mouse', 'tmr.rightClick'],
  ['KC_BTN3', 'mouse', 'catalog.middleClick'], ['KC_BTN4', 'mouse', 'common.back'],
  ['KC_BTN5', 'mouse', 'conn.forward'], ['G_SHIFT', 'mouse', 'catalog.gShift'],
  ['DPI_NEXT', 'mouse', 'catalog.dpiNext'], ['DPI_PREV', 'mouse', 'catalog.dpiPrevious'],
  ['DPI_CYCLE', 'mouse', 'catalog.dpiCycle'], ['DPI_DEFAULT', 'mouse', 'catalog.dpiDefault'],
  ['DPI_SHIFT', 'mouse', 'catalog.dpiShift'], ['PROFILE_NEXT', 'mouse', 'catalog.profileNext'],
  ['PROFILE_PREV', 'mouse', 'catalog.profilePrevious'], ['PROFILE_CYCLE', 'mouse', 'catalog.profileCycle'],
  ['BATTERY', 'mouse', 'adv.batteryIndicator'], ['TILT_LEFT', 'mouse', 'catalog.tiltLeft'],
  ['TILT_RIGHT', 'mouse', 'catalog.tiltRight'], ['KC_NO', 'mouse', 'tmr.disabled'],
  ['HYPR(KC_NO)', 'special', 'catalog.hyper'], ['MEH(KC_NO)', 'special', 'catalog.meh'],
  ['LCTL(KC_C)', 'special', 'catalog.copy'], ['LCTL(KC_V)', 'special', 'catalog.paste'],
  ['LCTL(KC_X)', 'special', 'catalog.cut'], ['LCTL(KC_Z)', 'special', 'catalog.undo'],
];

const glyphs: Readonly<Record<string, string>> = {
  ENTER: '↵', ESCAPE: 'Esc', TAB: '⇥', SPACE: '␣', BACKSPACE: '⌫', DELETE: '⌦',
  UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', HOME: '↖', END: '↘', PAGE_UP: '⇞', PAGE_DOWN: '⇟',
  MINUS: '-', EQUAL: '=', LEFT_BRACKET: '[', RIGHT_BRACKET: ']', BACKSLASH: '\\',
  SEMICOLON: ';', QUOTE: "'", GRAVE: '`', COMMA: ',', DOT: '.', SLASH: '/',
};

const choices = new Map<string, KeycodeChoice>();
for (const [code, category, label] of presets) {
  const binding = parseKeycode(code).binding;
  if (!binding) {
    throw new Error(`Invalid catalogue preset: ${code}`);
  }
  choices.set(formatKeycode(binding), { code, category, label, glyph: null, aliases: [code] });
}
for (const code of KEYCODE_NAMES) {
  const binding = parseKeycode(code).binding;
  if (!binding) {
    continue;
  }
  const canonical = formatKeycode(binding);
  const existing = choices.get(canonical);
  if (existing) {
    existing.aliases.push(code);
    continue;
  }
  const key = code.replace(/^KC_/, '');
  choices.set(canonical, {
    code: canonical, category: binding.kind === 'keyboard' ? 'keyboard' : 'special', aliases: [code], label: null,
    glyph: glyphs[key] ?? (/^(?:[A-Z0-9]|F\d+)$/.test(key) ? key : null),
  });
}

// Shifted US-ANSI symbols use ordinary keyboard chords, not firmware functions.
for (const [symbol, key] of Object.entries({ '~': 'GRAVE', '!': '1', '@': '2', '#': '3', '$': '4',
  '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': 'MINUS', '+': 'EQUAL',
  '{': 'LEFT_BRACKET', '}': 'RIGHT_BRACKET', '|': 'BACKSLASH', ':': 'SEMICOLON', '"': 'QUOTE',
  '<': 'COMMA', '>': 'DOT', '?': 'SLASH' })) {
  const code = `LSFT(KC_${key})`;
  choices.set(code, { code, category: 'keyboard', label: null, glyph: symbol, aliases: [code] });
}

export const KEYCODE_CATALOGUE: readonly KeycodeChoice[] = [...choices.values()];

/** Search localized labels, complete code expressions, and short VIA/QMK aliases. */
export function searchKeycodes(query: string, category: KeycodeCategory | 'all',
  label: (choice: KeycodeChoice) => string): KeycodeChoice[] {
  const normalize = (value: string): string => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[_-]/g, ' ');
  const term = normalize(query.trim());
  const scoped = KEYCODE_CATALOGUE.filter((choice) => category === 'all' || choice.category === category);
  const exact = term ? scoped.filter((choice) => [choice.code, ...choice.aliases].some((code) => normalize(code) === term)) : [];
  if (exact.length) {
    return exact;
  }
  const words = term.split(/\s+/).filter(Boolean);
  return scoped.filter((choice) =>
    words.every((word) => normalize([label(choice), choice.code, ...choice.aliases].join(' ')).includes(word)));
}
