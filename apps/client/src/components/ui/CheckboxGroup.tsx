import { useId } from 'react';

export interface CheckboxOption {
  value: string;
  label: string;
}

interface CheckboxGroupProps {
  /** Group label, rendered as the fieldset legend. */
  label: string;
  options: CheckboxOption[];
  /** Currently selected values. */
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helpText?: string;
  disabled?: boolean;
}

/**
 * Multi-select checkbox group for a small, fixed set of options.
 *
 * Use this instead of a `<select multiple>` when the option count is small and
 * every option should stay visible — a multi-select list hides the alternatives
 * behind a modifier key and is hard to operate on touch devices.
 *
 * Rendered as a `<fieldset>`/`<legend>` pair so assistive technology announces
 * the group label with each checkbox, which a bare `<div>` of inputs does not.
 */
export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  error,
  helpText,
  disabled = false,
}: CheckboxGroupProps) {
  const groupId = useId();

  const toggle = (optionValue: string, checked: boolean) => {
    onChange(
      checked
        ? [...value, optionValue]
        : value.filter((selected) => selected !== optionValue),
    );
  };

  return (
    <fieldset className="w-full" disabled={disabled}>
      <legend className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="flex items-center gap-2 min-h-[44px] text-sm text-text-primary cursor-pointer"
            >
              <input
                id={optionId}
                type="checkbox"
                value={option.value}
                checked={value.includes(option.value)}
                onChange={(e) => toggle(option.value, e.target.checked)}
                className="w-4 h-4 rounded-(--radius-control) border-border-default text-primary focus:ring-2 focus:ring-primary/50"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-status-delayed-text">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1.5 text-sm text-text-secondary">{helpText}</p>
      )}
    </fieldset>
  );
}
