# Logitech keycode editor

This fork adds a VIA-style keycode editor to **Profiles → Onboard assignments**.
It translates supported QMK names into the direct assignments already understood by
OpenMouse's Logitech driver. It does not install QMK or replace the mouse firmware.

## Run and use

The app uses the published protocol library pinned in its manifest and lockfile.
Only the `openmouse` checkout is needed. From that checkout, with Node.js 24:

```sh
npm ci
npm run dev
```

See the [README](../README.md#github-fork-setup) for fork setup and CI.

Open the printed localhost URL in Chrome or another WebHID-capable Chromium browser.
Connect the mouse, open an editable onboard profile, and select **Keycodes**.
Click a button's assignment, type a keycode, and choose **Stage assignment** (or Enter).
Review the pending changes and use OpenMouse's existing **Apply changes** button to
write them. **Revert** discards pending changes. Escape or Cancel closes the editor
without changing the assignment.

The editor includes a searchable catalogue with **Mac**, **Media**, **Keyboard**,
**Mouse** and **Special** categories. Search by action name, full keycode or short alias,
such as `KC_MCTL`. Choosing an entry fills the keycode field; **Stage assignment**
accepts it. With instant apply enabled, assignments follow that existing preference.
The catalogue includes Mission Control, Launchpad, Spaces, window/app switching,
volume, playback, F1–F24 and modifier-only Hyper/Meh bindings. Unsupported QMK firmware
functions are not offered. Mac shortcuts depend on the configured shortcuts and layout.

Normal and G-Shift assignments use the same editor. Primary left/right clicks remain
locked in the Normal layer. **Commands and recorder** retains the original controls.
Unknown mappings and macros stay unchanged unless explicitly replaced with a new binding.

For the G502 X family, labels identify the physical controls using the
[Logitech button diagram](https://www.logitech.com/assets/66193/g502-x-artanis-web-qsg.pdf)
and [Piper's storage-slot mapping](https://github.com/libratbag/piper/blob/master/data/svgs/logitech-g502-x.svg).
G6 is the separate thumb paddle, G4/G5 are the rear/front side buttons, G7/G8 are
DPI down/up, and wheel tilts have their own labels. Storage slots are not sequential
G-numbers. Correcting the labels does not move or replace any stored assignments.
Other models use neutral slot numbers until their physical layout is mapped.

## Using LinearMouse alongside OpenMouse

Keep LinearMouse for the Mac-side settings in your screenshots: disabled pointer
acceleration, scrolling direction and line distance, and universal Back/Forward.
OpenMouse manages the mouse's onboard DPI, assignments and profiles. No macOS preferences
or LinearMouse configuration are changed by this extension.

For LinearMouse's universal navigation, keep those mouse buttons assigned to `KC_BTN4`
(Back) and `KC_BTN5` (Forward). That lets LinearMouse convert the side-button events to
swipe gestures as described in its settings. `LGUI(KC_LBRC)` and `LGUI(KC_RBRC)` instead
send keyboard shortcuts; their behavior depends on the app and keyboard layout and does
not reproduce universal swipe navigation.

LinearMouse's [pointer and scrolling controls](https://linearmouse.app/en/) stay available
while you use OpenMouse for onboard settings.

## Examples

| Input | Direct assignment |
| --- | --- |
| `KC_F13` | F13 |
| `LCTL(KC_C)` | Left Ctrl + C |
| `LGUI(KC_C)` or `LCMD(KC_C)` | Left GUI/Command + C |
| `LCTL(LSFT(KC_TAB))` | Left Ctrl + Left Shift + Tab |
| `HYPR(KC_NO)` or `KC_HYPR` | Left Ctrl + Shift + Alt + GUI, with no ordinary key |
| `KC_RALT` | Right Alt, with no ordinary key |
| `KC_MCTL` | Mission Control consumer usage `0x029F` |
| `KC_LPAD` | Launchpad consumer usage `0x02A0` |
| `LCTL(KC_LEFT)`, `LCTL(KC_RIGHT)` | Previous/next Space with the usual Mac shortcuts |
| `LGUI(KC_GRAVE)` | Next window in the current app with the usual Mac shortcut |
| `KC_MPLY` | Play/pause consumer usage `0x00CD` |
| `KC_BTN4` | Mouse Back |
| `G_SHIFT` | Logitech's native G-Shift action |
| `DPI_NEXT`, `PROFILE_CYCLE` | Native Logitech DPI/profile actions |
| `KC_NO` | Disable this assignment |
| `0x0068`, `0x0106` | QMK numeric values for F13 and Left Ctrl + C |

Names are case-insensitive. Common aliases, F1–F24, navigation, keypad and international
keys are included. Hex input uses QMK values, **not arbitrary keyboard HID usages**:
for example, `0x00C1` translates to Mission Control rather than keyboard usage `0xC1`.
Explicit `HID_KEY(0xNN)` and `HID_CONSUMER(0xNNNN)` preserve unfamiliar direct bindings;
the device and operating system may not implement those usages.

Named modifier wrappers combine explicit left/right HID modifier bits. This also lets
the editor reopen a stored binding containing modifiers from both sides. Numeric
QMK modifier keycodes retain QMK's five-bit, same-side modifier encoding.

## Scope and hardware check

The first version supports direct keys, shortcuts, modifier-only assignments, consumer
controls, and existing Logitech actions. Arbitrary QMK layers (`MO`, `TG`, `LT`),
mod-tap, one-shots, transparent keys and firmware commands are rejected. G-Shift is the
mouse's native second assignment table, not a general QMK layer implementation.

Keyboard keycodes describe physical keys; the OS keyboard layout determines the resulting
characters. System actions such as Mission Control also depend on OS and firmware support.

Software validation on 2026-10-29: standalone installation against the published
protocol package, production build, bundle budgets and 528 app tests passed.
Coverage checks all 65,536 keyboard-byte/modifier combinations for lossless round trips,
invalid input rejection, consumer translations, and exact profile bytes with untouched
neighboring assignments. Controller tests cover discarding button edits when switching
profiles while preserving them if the switch is cancelled.

Browser checks cover editing, focus, validation, Normal/G-Shift assignments, instant apply,
reverting pending bindings, the action catalogue, and Emerald/Light/NieR styling plus
Arabic RTL. The catalogue was also checked at a 900 × 600 viewport.

Profile copying is not included. Existing macros remain managed by the published driver.
The G502 X owner confirmed that the physical button labels match the mouse. Automated
checks use simulated devices; press/release behavior, persistence and system actions
still need verification on the actual mouse and OS.

Reference implementation: [OpenMouse](https://github.com/OpenMouse-Project/openmouse),
[`encodeButtonAssignment`](https://github.com/OpenMouse-Project/mouse-protocol/blob/main/src/drivers/logitech/onboard-profiles.ts),
[QMK keycode values](https://github.com/qmk/qmk_firmware/blob/master/quantum/keycodes.h),
[QMK consumer usages](https://github.com/qmk/qmk_firmware/blob/master/tmk_core/protocol/report.h).
