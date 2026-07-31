import { InputHTMLAttributes, forwardRef } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helpText, className = '', id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 border border-border-default rounded-[var(--radius-control)] bg-bg-surface text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-status-delayed-text focus:ring-status-delayed-text/50' : ''
          } ${className}`}
          {...props}
        />
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

FormInput.displayName = 'FormInput';
