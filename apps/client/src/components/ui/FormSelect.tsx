import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A labelled group of options, rendered as an `<optgroup>`.
 *
 * Used for lists long enough that a flat ordering is hard to scan — notably the
 * ICD-10 diagnosis picker. Groups render in the order given, and each group's
 * options in the order given, so the caller controls the reading order.
 */
export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helpText?: string;
  /** Flat options. Ignored when `groups` is provided. */
  options?: SelectOption[];
  /** Grouped options, rendered as `<optgroup>` elements. */
  groups?: SelectGroup[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    { label, error, helpText, options, groups, placeholder, className = '', id, ...props },
    ref,
  ) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className="w-full">
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-status-delayed-text focus:ring-status-delayed-text/50' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {/* `groups` takes precedence: a caller supplies one or the other. */}
          {groups
            ? groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-status-delayed-text">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1.5 text-sm text-text-secondary">{helpText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
