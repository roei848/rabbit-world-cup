const FLAG: Record<string, string> = {
  BRA: '🇧🇷', ARG: '🇦🇷', FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', GER: '🇩🇪',
  ESP: '🇪🇸', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', CRO: '🇭🇷',
  USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦', JPN: '🇯🇵', KOR: '🇰🇷',
  MAR: '🇲🇦', SEN: '🇸🇳', URU: '🇺🇾', COL: '🇨🇴', ITA: '🇮🇹',
  AUS: '🇦🇺', DEN: '🇩🇰', SUI: '🇨🇭', POL: '🇵🇱', GHA: '🇬🇭',
};

interface FlagProps {
  code: string;
  size?: number;
}

export function Flag({ code, size = 22 }: FlagProps) {
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        width: size * 1.3,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {FLAG[code] ?? '🏳️'}
    </span>
  );
}
