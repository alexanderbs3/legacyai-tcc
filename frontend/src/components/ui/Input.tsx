import type { InputHTMLAttributes, Ref } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ label, error, hint, id, className, ref, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const describedBy =
    [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-1.5 text-left">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={ref}
        className={cn('control', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
