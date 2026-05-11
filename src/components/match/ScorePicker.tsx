import { useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { FONTS } from '../../theme/tokens';
import type { MatchDoc, PickDoc } from '../../firebase/firestore';

interface ScorePickerProps {
  match: MatchDoc;
  pick: PickDoc | null;
  onSave: (home: number, away: number) => Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ScorePicker({ match, pick, onSave }: ScorePickerProps) {
  const { theme: t } = useTheme();

  const [home, setHome] = useState<number>(pick?.homeGoals ?? 0);
  const [away, setAway] = useState<number>(pick?.awayGoals ?? 0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Caller should not render this at all for locked matches, but guard anyway
  if (match.locked) return null;

  function clamp(v: number) {
    return Math.max(0, Math.min(20, v));
  }

  async function handleSave() {
    setSaveState('saving');
    setErrorMsg('');
    try {
      await onSave(home, away);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setErrorMsg(msg);
      setSaveState('error');
    }
  }

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 7,
    border: `1px solid ${t.border}`,
    background: disabled ? 'transparent' : t.surface2,
    color: disabled ? t.inkDim : t.ink,
    fontFamily: FONTS.body,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    outline: 'none',
    flexShrink: 0,
    padding: 0,
  });

  const inputStyle: React.CSSProperties = {
    width: 36,
    textAlign: 'center',
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 18,
    color: t.ink,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
  };

  const isSaving = saveState === 'saving';

  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: `1px dashed ${t.border}`,
      }}
    >
      {/* Score controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {/* Home score stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            style={btnStyle(home <= 0 || isSaving)}
            disabled={home <= 0 || isSaving}
            onClick={() => { setHome(clamp(home - 1)); setSaveState('idle'); }}
            aria-label="Decrease home score"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={20}
            value={home}
            onChange={(e) => {
              setHome(clamp(parseInt(e.target.value, 10) || 0));
              setSaveState('idle');
            }}
            disabled={isSaving}
            style={inputStyle}
            aria-label={`${match.homeTeam.name} goals`}
          />
          <button
            style={btnStyle(home >= 20 || isSaving)}
            disabled={home >= 20 || isSaving}
            onClick={() => { setHome(clamp(home + 1)); setSaveState('idle'); }}
            aria-label="Increase home score"
          >
            +
          </button>
        </div>

        {/* Separator */}
        <span
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 16,
            color: t.inkDim,
          }}
        >
          –
        </span>

        {/* Away score stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            style={btnStyle(away <= 0 || isSaving)}
            disabled={away <= 0 || isSaving}
            onClick={() => { setAway(clamp(away - 1)); setSaveState('idle'); }}
            aria-label="Decrease away score"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={20}
            value={away}
            onChange={(e) => {
              setAway(clamp(parseInt(e.target.value, 10) || 0));
              setSaveState('idle');
            }}
            disabled={isSaving}
            style={inputStyle}
            aria-label={`${match.awayTeam.name} goals`}
          />
          <button
            style={btnStyle(away >= 20 || isSaving)}
            disabled={away >= 20 || isSaving}
            onClick={() => { setAway(clamp(away + 1)); setSaveState('idle'); }}
            aria-label="Increase away score"
          >
            +
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            marginLeft: 4,
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: saveState === 'saved' ? t.up : t.yellow,
            color: saveState === 'saved' ? '#fff' : '#1A1410',
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: 12,
            cursor: isSaving ? 'default' : 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            transition: 'background 0.2s, color 0.2s',
            opacity: isSaving ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
          aria-label="Save pick"
        >
          {isSaving && (
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: `2px solid rgba(26,20,16,0.3)`,
                borderTopColor: '#1A1410',
                animation: 'br-spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
          )}
          {saveState === 'saved' ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Inline error */}
      {saveState === 'error' && errorMsg && (
        <div
          style={{
            marginTop: 6,
            textAlign: 'center',
            fontFamily: FONTS.body,
            fontSize: 11,
            color: t.down,
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
