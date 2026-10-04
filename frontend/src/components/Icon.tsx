type IconProps = {
  name: string;
  className?: string;
};

export function Icon({ name, className = '' }: IconProps) {
  return (
    <span className={`material-icons icon ${className}`.trim()} aria-hidden="true" translate="no">
      {name}
    </span>
  );
}
