interface RabbitMarkProps {
  size?: number;
  color?: string;
}

export function RabbitMark({ size = 14, color = '#fff' }: RabbitMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="8.5" cy="6" rx="2.2" ry="4.5" fill={color} />
      <ellipse cx="15.5" cy="6" rx="2.2" ry="4.5" fill={color} />
      <ellipse cx="12" cy="15" rx="6.5" ry="6" fill={color} />
    </svg>
  );
}
