# Logitech keycode editor

This fork adds a VIA-style keycode editor to **Profiles → Onboard assignments**.
It turns supported QMK keycodes into the direct assignments that the OpenMouse
Logitech driver already writes. It does not install QMK or replace the mouse firmware.

## Use

Set up and start the app as described in the [README](../README.md#development).
Open the local URL in Chrome or another Chromium browser with WebHID.

1. Connect the mouse and open an editable onboard profile.
2. Select **Keycodes**.
3. Click a button's assignment, type a keycode and choose **Stage assignment**
   (or press Enter).
4. Check the pending changes and choose **Apply changes** to write them.
   **Revert** discards them. Escape or **Cancel** closes the editor without a change.

If instant apply is on, a staged assignment is written right away, like any other
setting.

The editor has a searchable catalogue with **Mac**, **Media**, **Keyboard**,
**Mouse** and **Special** categories. Search by action name, full keycode or short
alias, such as `KC_MCTL`. Choosing an entry fills the keycode field. The catalogue
includes Mission Control, Launchpad, Spaces, window and app switching, volume,
playback, F1–F24 and modifier-only Hyper and Meh. QMK firmware functions are not
offered. Mac shortcuts depend on your shortcut settings and keyboard layout.

Normal and G-Shift assignments use the same editor. Left and right click stay
locked in the Normal layer. **Commands and recorder** shows the original controls.
Unknown mappings and macros stay as they are until you replace them.

### G502 X button labels

For the G502 X family, the labels name the physical controls. They follow the
[Logitech button diagram](https://www.logitech.com/assets/66193/g502-x-artanis-web-qsg.pdf)
and [Piper's storage-slot mapping](https://github.com/libratbag/piper/blob/master/data/svgs/logitech-g502-x.svg).
G6 is the separate thumb button, G4 and G5 are the rear and front side buttons,
G7 and G8 are DPI down and up, and the wheel tilts have their own labels. Storage
slots are not in G-number order. The labels do not move or change any stored
assignment. Other models show plain slot numbers until their layout is mapped.

## Using LinearMouse with OpenMouse

On macOS, [LinearMouse](https://linearmouse.app/en/) can keep handling pointer
acceleration, scroll direction, scroll distance and universal Back/Forward.
OpenMouse handles the onboard DPI, assignments and profiles of the mouse. This fork
changes no macOS or LinearMouse settings.

For universal Back/Forward in LinearMouse, keep the side buttons on `KC_BTN4`
(Back) and `KC_BTN5` (Forward). LinearMouse then turns these button events into
swipe gestures. `LGUI(KC_LBRC)` and `LGUI(KC_RBRC)` send keyboard shortcuts
instead. What they do depends on the app and keyboard layout, and they do not give
universal swipe navigation.

## Examples

| Input | Direct assignment |
| --- | --- |
| `KC_F13` | F13 |
| `LCTL(KC_C)` | Left Ctrl + C |
| `LGUI(KC_C)` or `LCMD(KC_C)` | Left GUI/Command + C |
| `LCTL(LSFT(KC_TAB))` | Left Ctrl + Left Shift + Tab |
| `HYPR(KC_NO)` or `KC_HYPR` | Left Ctrl + Shift + Alt + GUI, with no other key |
| `KC_RALT` | Right Alt, with no other key |
| `KC_MCTL` | Mission Control consumer usage `0x029F` |
| `KC_LPAD` | Launchpad consumer usage `0x02A0` |
| `LCTL(KC_LEFT)`, `LCTL(KC_RIGHT)` | Previous/next Space with the usual Mac shortcuts |
| `LGUI(KC_GRAVE)` | Next window in the current app with the usual Mac shortcut |
| `KC_MPLY` | Play/pause consumer usage `0x00CD` |
| `KC_BTN4` | Mouse Back |
| `G_SHIFT` | Logitech's own G-Shift action |
| `DPI_NEXT`, `PROFILE_CYCLE` | Logitech's own DPI and profile actions |
| `KC_NO` | Disable this assignment |
| `0x0068`, `0x0106` | QMK numeric values for F13 and Left Ctrl + C |

Names are not case-sensitive. Common aliases, F1–F24, navigation, keypad and
international keys are included. Hex input uses QMK values, **not raw keyboard HID
usages**. For example, `0x00C1` means Mission Control, not keyboard usage `0xC1`.
Use `HID_KEY(0xNN)` and `HID_CONSUMER(0xNNNN)` for raw usages. The editor also uses
them to show unknown direct bindings without changing them. The device and the
operating system may not support those usages.

Named modifier wrappers set explicit left or right HID modifier bits, so the editor
can also reopen a stored binding with modifiers from both sides. Numeric QMK
modifier keycodes keep QMK's 5-bit encoding, where all modifiers are on one side.

## Scope

Supported: direct keys, shortcuts, modifier-only assignments, consumer controls
and the existing Logitech actions. Rejected: QMK layers (`MO`, `TG`, `LT`),
mod-tap, one-shot keys, transparent keys and firmware commands. G-Shift is the
mouse's own second assignment table, not a general QMK layer.

Keyboard keycodes name physical keys. The OS keyboard layout decides which
character you get. System actions such as Mission Control also need support from
the OS and the firmware.

Profile copying is not included. Existing macros stay under the control of the
published driver.

## Validation record (2026-10-29)

Software checks: a clean install against the published protocol package, the
production build, the bundle budgets and 528 app tests passed. The tests round-trip
all 65,536 keyboard-byte and modifier combinations, reject invalid input, check
consumer translations, and check the exact profile bytes while neighboring
assignments stay untouched. Controller tests check that switching profiles discards
button edits, and keeps them when the switch is cancelled.

Browser checks covered editing, focus, validation, Normal and G-Shift assignments,
instant apply, reverting pending bindings, the catalogue, the Emerald, Light and
NieR themes, and Arabic (RTL). The catalogue was also checked at 900 × 600.

The G502 X owner confirmed that the physical button labels match the mouse. All
automated checks use simulated devices. Press and release behavior, persistence and
system actions still need testing on the real mouse and OS.

## References

- [OpenMouse](https://github.com/OpenMouse-Project/openmouse)
- [`encodeButtonAssignment`](https://github.com/OpenMouse-Project/mouse-protocol/blob/main/src/drivers/logitech/onboard-profiles.ts)
- [QMK keycode values](https://github.com/qmk/qmk_firmware/blob/master/quantum/keycodes.h)
- [QMK consumer usages](https://github.com/qmk/qmk_firmware/blob/master/tmk_core/protocol/report.h)
