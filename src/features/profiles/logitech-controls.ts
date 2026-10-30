import type { I18nKey } from '../../i18n/index.ts';

export interface LogitechProfileControl {
  badge: string;
  label: I18nKey;
}

/** Storage slot order is not the G-number printed on the mouse.
 * Slot locations: https://github.com/libratbag/piper/blob/master/data/svgs/logitech-g502-x.svg
 * G-numbers: https://www.logitech.com/assets/66193/g502-x-artanis-web-qsg.pdf (page 7).
 */
const G502_X_CONTROLS: readonly LogitechProfileControl[] = [
  { badge: 'G1', label: 'tmr.leftClick' }, { badge: 'G2', label: 'tmr.rightClick' },
  { badge: 'G3', label: 'controls.wheelClick' }, { badge: 'G4', label: 'controls.sideBack' },
  { badge: 'G6', label: 'controls.dpiThumb' }, { badge: 'G5', label: 'controls.sideForward' },
  { badge: '←', label: 'controls.wheelLeft' }, { badge: '→', label: 'controls.wheelRight' },
  { badge: 'G9', label: 'controls.profile' }, { badge: 'G8', label: 'controls.dpiUp' },
  { badge: 'G7', label: 'controls.dpiDown' },
];

export function logitechProfileControl(modelName: string, slot: number): LogitechProfileControl {
  if (/\bG502\s*X\b/i.test(modelName) && G502_X_CONTROLS[slot]) {
    return G502_X_CONTROLS[slot];
  }
  // Models without a known layout show the storage slot number.
  return { badge: String(slot + 1), label: 'controls.button' };
}

/** "G6 · DPI-shift thumb button" for a known control, plain "Button 7" otherwise. */
export function logitechControlTitle(control: LogitechProfileControl, name: string): string {
  return control.label === 'controls.button' ? name : `${control.badge} · ${name}`;
}
