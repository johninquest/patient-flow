import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helpText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helpText, options, placeholder, className = '', id, ...props }, ref) => {
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
          {options.map((option) => (
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
