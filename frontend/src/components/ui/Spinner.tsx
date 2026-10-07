type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
};

const sizes = { sm: 'size-3.5', md: 'size-5', lg: 'size-10 border-[3px]' };

export function Spinner({ size = 'md', label = 'Carregando' }: SpinnerProps) {
  return <span className={`spinner ${sizes[size]}`} role="status" aria-label={label} />;
}
