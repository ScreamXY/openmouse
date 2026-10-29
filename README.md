# OpenMouse keycodes fork

An independent fork of [OpenMouse](https://github.com/OpenMouse-Project/openmouse)
with a VIA-style editor for Logitech onboard button assignments. OpenMouse is a
browser-based control panel for supported gaming mice, including DPI, polling rate
and profile settings.

## What this fork adds

- Direct keycode input such as `KC_F13`, `LCTL(KC_C)` and `HYPR(KC_NO)` for both
  Normal and G-Shift assignments.
- A searchable catalogue of Mac shortcuts, media controls, keyboard keys and mouse
  actions, including Mission Control, Launchpad, Spaces and window switching.
- Physical G502 X button labels instead of treating storage slots as G-numbers.

See the [usage and implementation notes](docs/keycode-editor.md) for supported codes
and test coverage. The G502 X owner confirmed that the physical button labels now match
the mouse. Profile copying, arbitrary QMK layers, tap-hold behavior and firmware
commands are not included.

Keep LinearMouse for macOS pointer acceleration, scrolling and universal Back/Forward.
This fork does not change those settings. Use a Chromium-based browser with WebHID.
The [official hosted panel](https://control.openmouse.app/) and
[OpenMouse website](https://openmouse.app/) belong to upstream and do not include this
fork's changes.

## Development

Use Node.js 24 and npm. Only this repository is needed: the app installs the
published `@openmouse/protocol` library at the exact version in `package.json` and
`package-lock.json`. No protocol fork or sibling checkout is required.

```sh
git clone https://github.com/ScreamXY/openmouse.git
cd openmouse
npm ci
npm run dev
```

The fork's changes are on `main`. Run all checks before pushing:

```sh
npm run check
npm run size
npm audit --audit-level=high
```

### GitHub CI

CI installs the pinned npm dependencies and runs the build, tests, bundle checks
and audit. No companion repository or custom
Actions variable is needed. The upstream scheduled dependency updaters remain
disabled on forks so dependency changes can be reviewed manually.

### Self-hosting

The fork publishes `ghcr.io/screamxy/openmouse` with `make publish` from a clean
checkout. The Docker build runs the frontend build, tests and bundle-size check,
then packages the static output with Caddy for amd64 and arm64. Images are tagged
with `latest` and the source commit. See [container publishing](docker/README.md)
for authentication, runtime settings and updates.

For a standalone static build, run `npm run build` and serve `dist/` at the root
of an HTTPS origin. WebHID needs a secure context and a supported Chromium browser
on the computer connected to the mouse.

The container disables optional analytics and does not include the Cloudflare
Functions in `functions/`; `/api/*` returns an unavailable response. Publishing
an image does not deploy it automatically. The private
[ScreamXY/internal-apps](https://github.com/ScreamXY/internal-apps) repository owns
the deployed app index and Compose configuration.

### Bundle budget

Production assets are limited to 3,200,000 JavaScript bytes and 165,000 CSS
bytes. Run `npm run size` after a fresh build for current totals.

### Linux WebHID permissions

If a device appears in Chromium's picker but OpenMouse reports `Failed to open
the device`, check the permissions on its `/dev/hidraw*` nodes. Linux does not
grant user access to every HID device by default.

First inspect the connected device IDs:

```bash
lsusb
```

VXE R1 SE+ hardware ships with more than one receiver implementation. If the
mouse and 1K receiver appear as `3554:f58f` and `3554:f58e`, respectively,
install these narrowly scoped rules:

```udev
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f58f", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f58e", TAG+="uaccess"
```

Save it as `/etc/udev/rules.d/70-openmouse-vxe.rules`, reload the rules, then
unplug and reconnect both devices:

```bash
sudo udevadm control --reload-rules
```

Grant access to every `hidraw` node for each product. Chromium opens the HID
device before OpenMouse selects its vendor configuration collection, so access
to only the `0xff02:0x0002` collection's node is insufficient.

## Local game and app profiles

Games & apps separates OpenMouse presets from Your apps. With the updated
OpenMouse Bridge running, Add game or app lists the apps that are running to
pick from, or takes the full path to an executable. Personal entries are saved in Bridge's
local config, not sent to OpenMouse for approval. They survive catalog refreshes
and Bridge restarts. Adding/editing/removing an entry does not require a mouse.

Each entry is a Game or an App, and its profile is active While running (kept
after alt-tabbing) or While focused (foreground-only switching). The path
matches that installation only. Foreground matching on Linux requires X11. Local profiles retain the
existing native/full-settings limits: Bridge can apply supported DPI/polling
settings with the browser closed; the control panel must remain open to apply
and restore full device-settings snapshots.

Local targets use stable IDs, not display names, so a target can be renamed or
share a name with an OpenMouse preset without losing or confusing its settings.
Removing a local target also removes its linked mouse profiles; clearing its
mouse settings leaves the target available. Older Bridges show update guidance
rather than falling back to a public game request.

## Upstream community

Questions, device requests, bug reports, or just want to follow along? Come
hang out on Discord.

<a href="https://discord.gg/yxC9jzMdw6"><img src="https://control.openmouse.app/api/discord-card" width="520" alt="Join OpenMouse on Discord"/></a>

## Upstream sponsors

OpenMouse is supported by [Macroscope](https://macroscope.com/), [Hypertune](https://hypertune.gg/), and [Hone](https://hone.gg/).

## Contributing

OpenMouse is one repository in a family — with the **Desktop** app,
**mouse-protocol**, and **OpenMouse-Bridge**.

Before you start, read the [contribution guide](https://docs.openmouse.app).
It explains how the repositories fit together, per-repo setup and
conventions, and safe reverse-engineering practices.

## Bridge updates

The Settings page compares the connected OpenMouse Bridge against its latest
stable GitHub release. It only retrieves the version, changelog, and download
link; it never downloads or installs an update in the background. Users can
also run the check manually.

When Bridge is reachable, the control panel prefers its loopback native HID
transport over browser WebHID. The same `@openmouse/protocol` drivers continue
to handle device discovery and settings; Bridge only carries HID reports. This
keeps Razer control interfaces protected by Chrome 153+ usable without relying
on the browser's former protected-collection bypass.

Bridge connection attempts, disconnects, request failures, scan durations, and
device inventory changes are written to the browser console with the
`[OpenMouse Bridge]` prefix. The same lifecycle events are included in the
downloadable diagnostics from a connected device's **Advanced** panel; HID
report payloads are not written to the console.

The control panel is organized by feature. Tests sit next to the code they cover.

| Folder | What lives there |
| --- | --- |
| `src/main.tsx` | Entry point: guards, service worker, mounts the app |
| `src/app/` | The shell: `App`, sidebar, pending-changes bar, toasts, AI overlay |
| `src/features/devices/` | Device home, device page, hero, stats, and the setting `cards/` |
| `src/features/buttons/` | Button mapping, setup codes, Logitech button commands |
| `src/features/profiles/` | Onboard profiles and profile sharing |
| `src/features/superstrike/` | Superstrike hit test and presets |
| `src/features/bridge/` | OpenMouse Bridge client, status line, update checks |
| `src/features/games/` | Games page and per-game profiles (Bridge only) |
| `src/features/hardware-test/` | Hardware test page, report builder, supported-devices cross-check |
| `src/features/capture/` | Report capture dialog and export formats |
| `src/features/news/` | News banner and "What's new" |
| `src/features/settings/` | Interface settings and stored preferences |
| `src/device/` | Device controller, per-vendor glue, pending changes, preview fixtures |
| `src/shared/` | UI primitives, icons, colour picker, formatting helpers |
| `src/i18n/` | Strings: `index.ts` is English and the API, `locales/` has one file per language |
| `src/platform/` | Service worker, offline banner, Trusted Types, browser support, sounds |
| `src/styles/` | Design tokens, base styles, and one stylesheet per area |
| `src/types/` | Global type declarations (Vite, WebHID) |
| `test/` | Tests for the Cloudflare functions, security headers and the PWA build |

Packet codecs and WebHID drivers live in the standalone
[`@openmouse/protocol`](https://github.com/OpenMouse-Project/mouse-protocol)
library. Its codec entry points remain transport-independent, while its
`drivers` entry points own discovery filters, device clients, retries, and
application-facing status conversion. OpenMouse consumes the same public
exports that external consumers use.

## Adding a vendor

Codec and driver contributions belong in the `mouse-protocol` repository.

1. Add transport-independent packet definitions and codecs under the vendor's
   `mouse-protocol/src/<vendor>/` folder.
2. Add the WebHID implementation under `mouse-protocol/src/drivers/<vendor>/`.
3. Register the driver and browser filters in the shared driver layer.
4. Add or extend codec and driver tests, state which product IDs were verified
   on hardware, and run the checks in both repositories.

OpenMouse should only need changes when a driver introduces a genuinely new UI
capability. The control UI otherwise discovers supported clients through the
library registry automatically.

Hardware-specific validation checklists live in the protocol repository's
`docs/` directory.

## Star history

<a href="https://star-history.com/#OpenMouse-Project/openmouse&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=OpenMouse-Project/openmouse&type=Date&theme=dark"/>
    <img src="https://api.star-history.com/svg?repos=OpenMouse-Project/openmouse&type=Date" alt="Star history chart"/>
  </picture>
</a>

## License

[GNU AGPL-3.0](LICENSE). Contributions are accepted under the same license.
