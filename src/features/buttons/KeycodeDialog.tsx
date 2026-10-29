import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { LogitechButtonBinding } from '@openmouse/protocol/drivers/logitech/onboard-profiles';
import type { InterfaceLocale } from '../settings/interface-preferences';
import { t, tp, type I18nKey } from '../../i18n/index';
import { formatKeycode, KEYCODE_NAMES, parseKeycode } from './logitech-keycodes';
import { searchKeycodes, type KeycodeCategory, type KeycodeChoice } from './keycode-catalogue';

const categories: Array<[KeycodeCategory | 'all', I18nKey]> = [
  ['all', 'supp.tabAll'], ['mac', 'catalog.mac'], ['media', 'catalog.media'],
  ['keyboard', 'home.keyboard'], ['mouse', 'home.mouse'], ['special', 'catalog.special'],
];

export function KeycodeDialog({ locale, button, initial, disabled, onAssign, onClose, controlLabel }: {
  locale: InterfaceLocale;
  button: number;
  initial: LogitechButtonBinding | null;
  disabled: boolean;
  onAssign: (binding: LogitechButtonBinding) => void;
  onClose: () => void;
  controlLabel?: string;
}): ReactNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [text, setText] = useState(initial ? formatKeycode(initial) : '');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<KeycodeCategory | 'all'>('all');
  const results = useRef<HTMLDivElement>(null);
  const result = parseKeycode(text);
  const label = (choice: KeycodeChoice): string => choice.label ? t(locale, choice.label) : choice.glyph ?? choice.code;
  const choices = searchKeycodes(query, category, label);
  const canonical = result.binding ? formatKeycode(result.binding) : null;
  useEffect(() => {
    if (results.current) {
      results.current.scrollTop = 0;
    }
  }, [query, category]);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      element.showModal();
      input.current?.focus();
      input.current?.select();
    }
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} className="support-dialog keycode-dialog" aria-labelledby={`${id}-title`}
      onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) { onClose(); } }}>
      <form className="support-dialog-inner keycode-dialog-inner" onSubmit={(event) => {
        event.preventDefault();
        if (result.binding && !disabled) {
          onAssign(result.binding);
          onClose();
        }
      }}>
        <header className="om-dialog-head">
          <h2 id={`${id}-title`}>{tp(locale, 'controls.assign', { control: controlLabel ?? tp(locale, 'controls.button', { n: button + 1 }) })}</h2>
          <button type="button" className="om-icon-btn" onClick={onClose} aria-label={t(locale, 'common.close')}>×</button>
        </header>
        <p className="setting-description" id={`${id}-help`}>{t(locale, 'keycode.help')}</p>
        <label className="keycode-field" htmlFor={`${id}-input`}>
          <span>{t(locale, 'keycode.label')}</span>
          <input ref={input} id={`${id}-input`} value={text} list={`${id}-names`} dir="ltr"
            autoComplete="off" autoCapitalize="off" spellcheck={false} maxLength={256}
            aria-invalid={Boolean(text && result.error)} aria-describedby={`${id}-help ${id}-result`}
            onInput={(event) => setText(event.currentTarget.value)} />
        </label>
        <datalist id={`${id}-names`}>{KEYCODE_NAMES.map((name) => <option key={name} value={name} />)}</datalist>
        <div id={`${id}-result`} className="keycode-result" role="status" aria-live="polite">
          {result.binding ? <code dir="ltr">{formatKeycode(result.binding)}</code>
            : text ? <span className="keycode-error">{t(locale, result.error)}</span> : null}
        </div>
        <section className="keycode-catalogue" aria-label={t(locale, 'catalog.title')}>
          <input type="search" aria-label={t(locale, 'catalog.search')} placeholder={t(locale, 'catalog.search')}
            value={query} autoComplete="off" onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); } }} />
          <div className="keycode-categories" role="group" aria-label={t(locale, 'catalog.category')}>
            {categories.map(([value, title]) => <button key={value} type="button" className="om-btn is-sm"
              aria-pressed={category === value} onClick={() => setCategory(value)}>{t(locale, title)}</button>)}
          </div>
          <div ref={results} className="keycode-choices">
            {choices.map((choice) => {
              const binding = parseKeycode(choice.code).binding;
              return <button key={choice.code} type="button" className="om-btn keycode-choice"
                aria-pressed={Boolean(binding && canonical === formatKeycode(binding))}
                disabled={disabled} onClick={() => {
                  setText(choice.code);
                  input.current?.focus();
                  input.current?.select();
                }}>
                <span>{label(choice)}</span><code dir="ltr">{choice.code}</code>
              </button>;
            })}
            {choices.length === 0 ? <p className="setting-description" role="status">{t(locale, 'catalog.noResults')}</p> : null}
          </div>
        </section>
        <small className="setting-description">{t(locale, 'catalog.platformNote')}</small>
        <small className="setting-description">{t(locale, 'keycode.limits')}</small>
        <div className="shortcut-dialog-actions">
          <button type="button" onClick={onClose}>{t(locale, 'common.cancel')}</button>
          <button type="submit" className="is-primary" disabled={disabled || !result.binding}>{t(locale, 'keycode.stage')}</button>
        </div>
      </form>
    </dialog>
  );
}
