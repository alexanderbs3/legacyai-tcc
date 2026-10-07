type ProgressProps = {
  /** 0–100. Omita para um indicador indeterminado (sem simular percentual). */
  value?: number;
  label: string;
};

export function Progress({ value, label }: ProgressProps) {
  const determinate = typeof value === 'number';
  const normalizedValue = determinate ? Math.min(100, Math.max(0, value)) : undefined;
  return (
    <div
      className={`progress-track ${determinate ? '' : 'progress-indeterminate'}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={normalizedValue}
    >
      <div
        className="progress-value"
        style={determinate ? { width: `${normalizedValue}%` } : undefined}
      />
    </div>
  );
}
