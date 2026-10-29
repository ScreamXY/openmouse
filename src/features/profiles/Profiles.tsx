import { displayText } from "../../i18n/index";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { capabilitiesForFormat } from "@openmouse/protocol/drivers/logitech/onboard-profiles";
import { LOGITECH_BUTTON_ACTIONS, type LogitechButtonAction } from "@openmouse/protocol/drivers/logitech/onboard-profiles";
import * as control from "../../device/controller";
import type { ControlSnapshot } from "../../device/types";
import { hidKeyForCode, shortcutLabel } from "./hid-keys";
import { KeycodeDialog } from '../buttons/KeycodeDialog';
import { logitechProfileControl } from './logitech-controls';
import { formatKeycode } from '../buttons/logitech-keycodes';
import { bindingFromAssignment } from '../buttons/setup-code';
import { t, tp } from "../../i18n/index";
import { IconActivate, IconDisabled, IconEnabled, IconRefresh, IconRename, IconRunning, IconShare, IconTrash } from "../../shared/icons";

export function Profiles({
  snapshot,
  onShareProfile,
}: {
  snapshot: ControlSnapshot;
  onShareProfile: () => void;
}): ReactNode {
  const [assignmentLayer, setAssignmentLayer] = useState<"primary" | "g-shift">("primary");
  const [keycodeMode, setKeycodeMode] = useState(true);
  const [keycodeButton, setKeycodeButton] = useState<number | null>(null);
  const [shortcutTarget, setShortcutTarget] = useState<{ layer: "primary" | "g-shift"; button: number } | null>(null);
  const [shortcutSteps, setShortcutSteps] = useState<Array<{ key: number; modifiers: number; label: string; delayMs: number }>>([]);
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [shortcutError, setShortcutError] = useState("");
  const lastShortcutAt = useRef(0);
  const heldModifiers = useRef(new Set<string>());
  const modifierChord = useRef(0);
  const modifierUsedWithKey = useRef(false);
  const inner = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const profiles = snapshot.onboardProfiles;

  useEffect(() => {
    const bodyEl = body.current;
    const innerEl = inner.current;
    if (!bodyEl || !innerEl) return;
    const sync = (): void => {
      bodyEl.style.maxHeight = snapshot.profilesExpanded ? `${innerEl.scrollHeight}px` : "0px";
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(innerEl);
    return () => observer.disconnect();
  }, [snapshot.profilesExpanded]);

  const locale = snapshot.preferences.locale;
  const modelName = snapshot.deviceStatus?.name ?? snapshot.status?.name ?? '';
  const physicalControl = (slot: number): { badge: string; name: string; fullName: string } => {
    const control = logitechProfileControl(modelName, slot);
    const name = tp(locale, control.label, { n: slot + 1 });
    return { badge: control.badge, name, fullName: control.label === 'controls.button' ? name : `${control.badge} · ${name}` };
  };
  const summary = snapshot.profile.summary;
  const hostOpened = snapshot.editedProfile === "host";
  const hostRunning = snapshot.deviceMode === "Host";
  const format = snapshot.profileFormat;
  const layoutVerified = format?.verified === true;
  const contentsWritable = format?.writable === true;
  const nameLimit = format ? capabilitiesForFormat(format.id).maxNameLength : null;
  const hostTags = [hostRunning ? t(locale, "prof.active") : null, hostOpened ? t(locale, "prof.editingTag") : null].filter(Boolean).join(" · ");
  const openedProfile = typeof snapshot.editedProfile === "number"
    ? profiles?.find((profile) => profile.sector === snapshot.editedProfile) ?? null
    : null;
  const selectedDevice = snapshot.devices.find((device) => device.selected)?.index;
  const editingDisabled = snapshot.settingInProgress;
  useEffect(() => {
    setKeycodeButton(null);
  }, [selectedDevice, snapshot.editedProfile, assignmentLayer]);

  return (
    <section
      id="logitech-onboard"
      className={`profile-disclosure device-data${snapshot.profilesExpanded ? " is-open" : ""}`}
      role="tabpanel"
      aria-labelledby="workspace-tab-profiles"
    >
      <div className="profile-summary">
        <button
          id="profile-disclosure-toggle"
          className="profile-summary-main"
          type="button"
          aria-expanded={snapshot.profilesExpanded}
          aria-controls="profile-disclosure-body"
          onClick={control.toggleProfilesExpanded}
        >
          <span className="profile-summary-text">
            <span className="profile-summary-label">{t(locale, "prof.editingTag")}</span>
            <strong id="profile-summary-name">{summary.name}</strong>
            <small id="profile-summary-detail">{displayText(locale, summary.detail)}</small>
          </span>
          <i className="profile-summary-chevron" aria-hidden="true" />
        </button>
        <button
          id="onboard-refresh"
          className="icon-button"
          type="button"
          aria-label={t(locale, "prof.reload")}
          title={t(locale, "prof.reload")}
          onClick={() => control.rereadOnboardProfiles()}
        >
          <IconRefresh />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={t(locale, "panel.shareProfile")}
          title={t(locale, "panel.shareProfile")}
          onClick={onShareProfile}
        >
          <IconShare />
        </button>
        {snapshot.setupProfilesAvailable ? (
          <button
            id="setup-logitech-profiles"
            className="icon-button profile-setup-button"
            type="button"
            disabled={editingDisabled}
            onClick={() => void control.setUpLogitechProfiles()}
          >
            {t(locale, "prof.setUp")}
          </button>
        ) : null}
        {snapshot.resetProfilesAvailable ? (
          <button
            id="reset-logitech-profiles"
            className="icon-button profile-delete-button"
            type="button"
            aria-label={t(locale, "prof.deleteReset")}
            title={t(locale, "prof.restoreDefaults")}
            disabled={editingDisabled}
            onClick={() => void control.resetLogitechProfiles()}
          >
            <IconTrash />
          </button>
        ) : null}
      </div>

      <div id="profile-disclosure-body" className="profile-disclosure-body" ref={body}>
        <div className="profile-disclosure-inner" ref={inner}>
          <div id="onboard-profile-list">
            {profiles === null ? null : (
              <>
                <div className={`profile-row${hostOpened ? " is-open" : ""}`}>
                  <button
                    type="button"
                    title={t(locale, "prof.openHost")}
                    className="profile-row-open"
                    onClick={() => control.openOnboardProfile("host")}
                  >
                    <span className="profile-slot">{t(locale, "prof.hostName")}</span>
                    <span className="profile-row-text">
                      <strong>{t(locale, "prof.hostName")}{hostTags ? <span className={`om-badge${hostRunning ? " is-accent" : ""}`}>{hostTags}</span> : null}</strong>
                      <small>{t(locale, "prof.liveDetail")}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={hostRunning}
                    title={displayText(locale, hostRunning ? t(locale, "prof.hostAlready") : t(locale, "prof.switchHost"))}
                    aria-label={t(locale, "prof.switchHostAria")}
                    aria-pressed={hostRunning}
                    className={`icon-button${hostRunning ? " is-active" : ""}`}
                    onClick={() => void control.applyOnboardMode("Host")}
                  >
                    {hostRunning ? <IconRunning /> : <IconActivate />}
                  </button>
                </div>

                <div className="profile-row-rule">
                  <small> {displayText(locale, "STORED ON THE MOUSE")} </small>
                </div>
                {profiles.length > 0 ? <small className="profile-list-hint"> {displayText(locale, "Click a profile to edit it. Use the circle to switch the mouse to it.")} </small> : null}

                {profiles.length === 0 ? (
                  <small className="setting-note profile-empty-note">
                    {t(locale, "prof.noProfiles")}
                    {" "}
                    {t(locale, snapshot.setupProfilesAvailable ? "prof.noProfilesSetup" : "prof.noProfilesGhub")}
                  </small>
                ) : null}

                {profiles.map((profile) => {
                  const dpi = profile.dpiStages.length > 0
                    ? profile.dpiStages
                      .map((stage) => (stage.x === stage.y ? `${stage.x}` : `${stage.x}/${stage.y}`))
                      .join(" · ")
                    : "no DPI stages";
                  const rate = profile.reportRateWireless
                    ? `${profile.reportRateWireless.toLocaleString()} Hz`
                    : "—";
                  const detail = [
                    `${dpi} DPI`,
                    rate,
                    profile.enabled ? "enabled" : "disabled",
                    profile.crcValid ? null : "checksum mismatch",
                  ].filter(Boolean).join(" · ");
                  const locked = !layoutVerified;
                  const opened = snapshot.editedProfile === profile.sector;
                  const nameable = nameLimit !== null;
                  const running = profile.isCurrent && !hostRunning;
                  const tags = [running ? "active" : null, opened ? "editing" : null].filter(Boolean).join(" · ");
                  const renameDisabled = locked || !nameable || !contentsWritable || editingDisabled;
                  const activateDisabled = locked || running || !profile.enabled;

                  return (
                    <div key={profile.sector} className={`profile-row${opened ? " is-open" : ""}${profile.enabled ? "" : " is-disabled"}`}>
                      <button
                        type="button"
                        disabled={locked}
                        title={displayText(locale, locked
                          ? t(locale, "prof.layoutUnverified")
                          : t(locale, "prof.openProfile"))}
                        className="profile-row-open"
                        onClick={() => control.openOnboardProfile(profile.sector)}
                      >
                        <span className="profile-slot">{profile.sector}</span>
                        <span className="profile-row-text">
                          <strong>
                            {(opened && snapshot.stagedProfileName) || profile.name || displayText(locale, `Profile ${profile.sector}`)}
                            {tags ? <span className={`om-badge${running ? " is-accent" : ""}`}>{displayText(locale, tags)}</span> : null}
                          </strong>
                          <small>{displayText(locale, detail)}</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={renameDisabled}
                        title={displayText(locale, !nameable
                          ? t(locale, "prof.noNameField")
                          : !contentsWritable
                            ? t(locale, "prof.contentUnverified")
                            : t(locale, "prof.renameProfile"))}
                        aria-label={displayText(locale, `Rename profile ${profile.sector}`)}
                        className="icon-button"
                        onClick={() => control.renameOnboardProfile(profile.sector)}
                      >
                        <IconRename />
                      </button>
                      <button
                        type="button"
                        disabled={activateDisabled}
                        title={displayText(locale, running
                          ? t(locale, "prof.runningProfile")
                          : !profile.enabled
                            ? t(locale, "prof.enableFirst")
                            : t(locale, "prof.switchProfile"))}
                        aria-label={displayText(locale, `Switch to profile ${profile.sector}`)}
                        aria-pressed={running}
                        className={`icon-button${running ? " is-active" : ""}`}
                        onClick={() => void control.selectOnboardProfile(profile.sector)}
                      >
                        {running ? <IconRunning /> : <IconActivate />}
                      </button>
                      <button
                        type="button"
                        disabled={locked || editingDisabled}
                        title={displayText(locale, locked
                          ? t(locale, "prof.layoutUnverified")
                          : profile.enabled ? t(locale, "prof.disableProfile") : t(locale, "prof.enableProfile"))}
                        aria-label={tp(locale, "prof.toggleProfile", { a: profile.enabled ? t(locale, "prof.disable") : t(locale, "prof.enable"), n: profile.sector })}
                        className="icon-button"
                        onClick={() => void control.toggleOnboardProfileEnabled(profile.sector, !profile.enabled)}
                      >
                        {profile.enabled ? <IconEnabled /> : <IconDisabled />}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          {openedProfile && contentsWritable ? (
            <div className="profile-button-editor">
              <div className="profile-button-heading">
                <div><h2>{t(locale, "prof.assign")}</h2><small>{t(locale, "prof.assignBody")}</small></div>
                <div className="assignment-layer-tabs" role="tablist" aria-label={t(locale, "prof.assignLayer")}>
                  <button type="button" role="tab" aria-selected={assignmentLayer === "primary"} onClick={() => setAssignmentLayer("primary")}>{t(locale, "prof.normalTab")}</button>
                  <button type="button" role="tab" aria-selected={assignmentLayer === "g-shift"} onClick={() => setAssignmentLayer("g-shift")}>G-Shift</button>
                </div>
              </div>
              <div className="keycode-mode segmented" role="group" aria-label={t(locale, 'keycode.editor')}>
                <button type="button" aria-pressed={keycodeMode} onClick={() => setKeycodeMode(true)}>{t(locale, 'keycode.mode')}</button>
                <button type="button" aria-pressed={!keycodeMode} onClick={() => setKeycodeMode(false)}>{t(locale, 'keycode.commands')}</button>
              </div>
              <div className="assignment-grid">
                {(assignmentLayer === "primary" ? openedProfile.buttonAssignments : openedProfile.gShiftAssignments).map((assignment) => {
                  const physical = physicalControl(assignment.button);
                  const stagedAssignment = snapshot.stagedProfileButtonAssignments.find(
                    (staged) => staged.layer === assignmentLayer && staged.button === assignment.button,
                  );
                  const primaryLocked = assignmentLayer === "primary" && assignment.button <= 1;
                  const binding = stagedAssignment
                    ? stagedAssignment.binding ?? null
                    : bindingFromAssignment(assignment.action, assignment.raw);
                  return (
                    <div key={`${assignmentLayer}-${assignment.button}`} data-profile-button={assignment.button} className={`assignment-card${stagedAssignment ? ' is-staged' : ''}`}>
                      <span className="assignment-button-number">{physical.badge}</span>
                      <span className="assignment-button-name">{physical.name}</span>
                      <span className="assignment-select-wrap">
                        {keycodeMode ? <button type="button" className="om-btn assignment-keycode"
                          disabled={editingDisabled || primaryLocked}
                          aria-label={tp(locale, 'controls.assign', { control: physical.fullName })}
                          onClick={() => setKeycodeButton(assignment.button)}>
                          {binding ? <code dir="ltr">{formatKeycode(binding)}</code> : t(locale, 'prof.customPreserved')}
                        </button> : <select
                          aria-label={tp(locale, 'controls.assign', { control: physical.fullName })}
                          value={stagedAssignment?.value ?? assignment.action}
                          disabled={editingDisabled || primaryLocked}
                          title={primaryLocked
                            ? "Primary click buttons cannot be remapped to prevent losing control of the mouse."
                            : assignment.action === "Custom" ? `Unknown mapping: ${assignment.raw.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}` : undefined}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (value === "keyboard") {
                              setShortcutSteps([]);
                              setShortcutRecording(false);
                              setShortcutError("");
                              heldModifiers.current.clear();
                              modifierChord.current = 0;
                              modifierUsedWithKey.current = false;
                              setShortcutTarget({ layer: assignmentLayer, button: assignment.button });
                              return;
                            }
                            if (value.startsWith("consumer:")) control.applyLogitechConsumerAssignment(assignmentLayer, assignment.button, Number(value.slice(9)));
                            else void control.applyLogitechButtonAssignment(assignmentLayer, assignment.button, value as LogitechButtonAction);
                          }}
                        >
                          {assignment.action === "Custom"
                            ? <option value="Custom">{assignment.raw[0] === 0x80 && assignment.raw[1] === 0x02 ? t(locale, "prof.keyboardShortcut") : t(locale, "prof.customPreserved")}</option>
                            : null}
                          {LOGITECH_BUTTON_ACTIONS.map((action) => <option key={action} value={action}>{displayText(locale, action)}</option>)}
                          <option value="keyboard">{t(locale, "prof.keyboardOpt")}</option>
                          <option value="consumer:233">{t(locale, "prof.volUp")}</option>
                          <option value="consumer:234">{t(locale, "prof.volDown")}</option>
                          <option value="consumer:226">{t(locale, "prof.mute")}</option>
                          <option value="consumer:205">{t(locale, "prof.playPause")}</option>
                          <option value="consumer:181">{t(locale, "prof.nextTrack")}</option>
                          <option value="consumer:182">{t(locale, "prof.prevTrack")}</option>
                        </select>}
                        <i aria-hidden="true" />
                      </span>
                    </div>
                  );
                })}
              </div>
              {keycodeButton !== null ? (() => {
                const stored = (assignmentLayer === 'primary' ? openedProfile.buttonAssignments : openedProfile.gShiftAssignments)
                  .find((assignment) => assignment.button === keycodeButton);
                const staged = snapshot.stagedProfileButtonAssignments.find((assignment) => assignment.layer === assignmentLayer && assignment.button === keycodeButton);
                const initial = staged ? staged.binding ?? null : stored ? bindingFromAssignment(stored.action, stored.raw) : null;
                return <KeycodeDialog key={`${selectedDevice}-${openedProfile.sector}-${assignmentLayer}-${keycodeButton}`}
                  locale={locale} button={keycodeButton} initial={initial} controlLabel={physicalControl(keycodeButton).fullName}
                  disabled={editingDisabled || !stored || (assignmentLayer === 'primary' && keycodeButton <= 1)}
                  onAssign={(binding) => { void control.applyLogitechButtonAssignment(assignmentLayer, keycodeButton, binding); }}
                  onClose={() => setKeycodeButton(null)} />;
              })() : null}
              <small className="setting-note">{t(locale, 'controls.note')}</small>
              <small className="setting-note">{displayText(locale, "Changes are stored in this onboard profile. Existing custom macros are preserved byte-for-byte.")}</small>
              {shortcutTarget ? (
                <div className="shortcut-dialog-backdrop" role="presentation" onMouseDown={(event) => {
                  if (event.currentTarget === event.target) setShortcutTarget(null);
                }}>
                  <div
                    className="shortcut-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="shortcut-dialog-title"
                    tabIndex={0}
                    autoFocus
                    onKeyDown={(event) => {
                      if (!shortcutRecording) {
                        if (event.key === "Escape") setShortcutTarget(null);
                        return;
                      }
                      event.preventDefault(); event.stopPropagation();
                      if (event.key === "Escape" && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                        setShortcutRecording(false);
                        setShortcutError("");
                        return;
                      }
                      if (event.repeat) return;
                      if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
                        heldModifiers.current.add(event.code);
                        modifierChord.current |= (event.ctrlKey ? 0x01 : 0) | (event.shiftKey ? 0x02 : 0)
                          | (event.altKey ? 0x04 : 0) | (event.metaKey ? 0x08 : 0);
                        return;
                      }
                      if (heldModifiers.current.size) modifierUsedWithKey.current = true;
                      const key = hidKeyForCode(event.code);
                      if (key === null) {
                        setShortcutError(`${event.key} cannot be stored by this mouse.`);
                        return;
                      }
                      if (shortcutSteps.some((step) => step.key === 0)) {
                        setShortcutError("A modifier-only shortcut cannot be part of a sequence. Record again to replace it.");
                        return;
                      }
                      const modifiers = (event.ctrlKey ? 0x01 : 0) | (event.shiftKey ? 0x02 : 0)
                        | (event.altKey ? 0x04 : 0) | (event.metaKey ? 0x08 : 0);
                      const now = performance.now();
                      setShortcutSteps((steps) => [...steps, {
                        key, modifiers, label: shortcutLabel(event),
                        delayMs: steps.length === 0 ? 0 : Math.min(9999, Math.round(now - lastShortcutAt.current)),
                      }]);
                      lastShortcutAt.current = now;
                      setShortcutError("");
                    }}
                    onKeyUp={(event) => {
                      if (!shortcutRecording || !["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
                      event.preventDefault(); event.stopPropagation();
                      heldModifiers.current.delete(event.code);
                      if (heldModifiers.current.size) return;
                      const modifiers = modifierChord.current;
                      modifierChord.current = 0;
                      if (modifierUsedWithKey.current || !modifiers) {
                        modifierUsedWithKey.current = false;
                        return;
                      }
                      if (shortcutSteps.length) {
                        setShortcutError("A modifier-only shortcut cannot be part of a sequence. Record again to replace it.");
                        return;
                      }
                      const label = [modifiers & 0x01 ? "Ctrl" : null, modifiers & 0x02 ? "Shift" : null,
                        modifiers & 0x04 ? "Alt" : null, modifiers & 0x08 ? "Meta" : null].filter(Boolean).join(" + ");
                      const now = performance.now();
                      setShortcutSteps((steps) => [...steps, {
                        key: 0, modifiers, label,
                        delayMs: steps.length === 0 ? 0 : Math.min(9999, Math.round(now - lastShortcutAt.current)),
                      }]);
                      lastShortcutAt.current = now;
                      setShortcutError("");
                    }}
                  >
                    <h3 id="shortcut-dialog-title">{t(locale, "prof.recordTitle")}</h3>
                    <p>{t(locale, "prof.recordBody")}</p>
                    <button
                      type="button"
                      className={`shortcut-record-button${shortcutRecording ? " is-recording" : ""}`}
                      onClick={() => {
                        if (shortcutRecording) {
                          setShortcutRecording(false);
                        } else {
                          setShortcutSteps([]);
                          setShortcutError("");
                          heldModifiers.current.clear();
                          modifierChord.current = 0;
                          modifierUsedWithKey.current = false;
                          lastShortcutAt.current = performance.now();
                          setShortcutRecording(true);
                        }
                      }}
                    ><i aria-hidden="true" />{displayText(locale, shortcutRecording ? t(locale, "prof.stopRec") : t(locale, "prof.record"))}</button>
                    <div className={`shortcut-capture${shortcutSteps.length ? " has-value" : ""}`} aria-live="polite">
                      {shortcutSteps.length ? (
                        <ol>{shortcutSteps.map((step, index) => <li key={`${step.label}-${index}`}>
                          {index > 0 && step.delayMs > 0 ? <small>{step.delayMs} ms</small> : null}
                          <kbd>{displayText(locale, step.label)}</kbd>
                        </li>)}</ol>
                      ) : shortcutRecording ? t(locale, "prof.listening") : t(locale, "prof.nothingRec")}
                    </div>
                    {shortcutError ? <small className="shortcut-error" role="alert">{displayText(locale, shortcutError)}</small> : null}
                    {shortcutSteps.length > 1 ? <small className="shortcut-macro-note">{t(locale, "prof.macroNote")}</small> : null}
                    <div className="shortcut-dialog-actions">
                      <button type="button" onClick={() => setShortcutTarget(null)}>{t(locale, "common.cancel")}</button>
                      <button
                        type="button"
                        className="is-primary"
                        disabled={shortcutRecording || shortcutSteps.length === 0}
                        onClick={() => {
                          const shortcut = shortcutSteps[0];
                          if (!shortcut) return;
                          if (shortcutSteps.length === 1) {
                            control.applyLogitechKeyboardShortcut(shortcutTarget.layer, shortcutTarget.button, shortcut.key, shortcut.modifiers);
                          } else {
                            void control.applyLogitechKeyboardSequence(shortcutTarget.layer, shortcutTarget.button,
                              shortcutSteps.map(({ key, modifiers, delayMs }) => ({ key, modifiers, delayMs })));
                          }
                          setShortcutTarget(null);
                        }}
                      >{displayText(locale, shortcutSteps.length > 1 ? t(locale, "prof.assignSeq") : t(locale, "prof.assignShortcut"))}</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <small id="onboard-status">{displayText(locale, snapshot.onboardStatus)}</small>
        </div>
      </div>
    </section>
  );
}
