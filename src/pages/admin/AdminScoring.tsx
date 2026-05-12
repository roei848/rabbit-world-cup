import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { FONTS } from '../../theme/tokens';
import {
  getScoringDoc,
  saveScoringDoc,
  type ScoringDoc,
} from '../../firebase/firestore';

// ── Constants ──────────────────────────────────────────────────

const DEFAULT_SCORING: ScoringDoc = {
  stageMultipliers: { group: 1, r16: 2, qf: 3, sf: 3, final: 4 },
  basePoints: { exactScore: 3, correctGap: 2, correctWinner: 1 },
  bonusPoints: { topScorer: 10, worldCupWinner: 15 },
};

interface StageConfig {
  id: keyof ScoringDoc['stageMultipliers'];
  label: string;
  matchCount: number;
}

const STAGES: StageConfig[] = [
  { id: 'group', label: 'Group Stage', matchCount: 48 },
  { id: 'r16',   label: 'Round of 16', matchCount: 16 },
  { id: 'qf',    label: 'Quarter-finals', matchCount: 8 },
  { id: 'sf',    label: 'Semi-finals', matchCount: 4 },
  { id: 'final', label: 'Final', matchCount: 2 },
];

const MAX_MULTIPLIER = 20;
const MAX_BASE = 20;
const MAX_BONUS = 50;

// ── Stepper ────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

function Stepper({ value, min = 0, max = 20, onChange }: StepperProps) {
  const { theme: t } = useTheme();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      overflow: 'hidden',
      width: 120,
      flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          border: 0,
          background: t.surface2,
          color: t.ink,
          width: 32,
          height: 36,
          fontFamily: FONTS.mono,
          fontSize: 14,
          cursor: value <= min ? 'not-allowed' : 'pointer',
          opacity: value <= min ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        −
      </button>
      <div style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: FONTS.mono,
        fontWeight: 800,
        fontSize: 16,
        color: t.yellow,
      }}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          border: 0,
          background: t.surface2,
          color: t.ink,
          width: 32,
          height: 36,
          fontFamily: FONTS.mono,
          fontSize: 14,
          cursor: value >= max ? 'not-allowed' : 'pointer',
          opacity: value >= max ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { theme: t } = useTheme();
  return (
    <h2 style={{
      fontSize: 11,
      fontWeight: 700,
      color: t.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      margin: '0 0 10px 0',
      fontFamily: FONTS.body,
    }}>
      {label}
    </h2>
  );
}

// ── Component ──────────────────────────────────────────────────

export function AdminScoring() {
  const { theme: t } = useTheme();
  const { isAdmin, loading } = useAuth();

  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string>('');
  const [scoring, setScoring] = useState<ScoringDoc>(DEFAULT_SCORING);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ─────────────────────────────────────────────────────

  const loadScoring = useCallback(async () => {
    setFetching(true);
    setFetchError('');
    try {
      const doc = await getScoringDoc();
      setScoring(doc ?? DEFAULT_SCORING);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load scoring settings');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      loadScoring();
    }
  }, [loading, isAdmin, loadScoring]);

  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  // ── Auth guards ──────────────────────────────────────────────

  if (!loading && !isAdmin) {
    return <Navigate to="/matches" replace />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: t.yellow, fontSize: 14, fontFamily: FONTS.body }}>
          Loading...
        </div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────

  function setStageMultiplier(id: keyof ScoringDoc['stageMultipliers'], value: number) {
    setScoring((prev) => ({
      ...prev,
      stageMultipliers: { ...prev.stageMultipliers, [id]: value },
    }));
  }

  function setBasePoint(key: keyof ScoringDoc['basePoints'], value: number) {
    setScoring((prev) => ({
      ...prev,
      basePoints: { ...prev.basePoints, [key]: value },
    }));
  }

  function setBonusPoint(key: keyof ScoringDoc['bonusPoints'], value: number) {
    setScoring((prev) => ({
      ...prev,
      bonusPoints: { ...prev.bonusPoints, [key]: value },
    }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await saveScoringDoc(scoring);
      setSaveSuccess(true);
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
      saveSuccessTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Shared card style ────────────────────────────────────────

  const card: React.CSSProperties = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    padding: 18,
    marginBottom: 32,
  };

  // ── Loading state ────────────────────────────────────────────

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg }}>
        {/* Header */}
        <div style={{
          background: t.surface,
          borderBottom: `1px solid ${t.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.ink, margin: 0, fontFamily: FONTS.display }}>
            Scoring
          </h1>
          <Link
            to="/admin"
            style={{
              color: t.yellow,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${t.border}`,
            }}
          >
            ← Admin
          </Link>
        </div>
        {fetchError ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 80,
        }}>
          <div style={{ color: t.down, fontSize: 14, fontFamily: FONTS.mono }}>
            {fetchError}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 80,
        }}>
          <div style={{ color: t.inkMuted, fontSize: 14, fontFamily: FONTS.body }}>
            Loading scoring settings…
          </div>
        </div>
      )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: FONTS.body }}>
      {/* Header bar */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: t.ink, margin: 0, fontFamily: FONTS.display }}>
          Scoring
        </h1>
        <Link
          to="/admin"
          style={{
            color: t.yellow,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: 'transparent',
          }}
        >
          ← Admin
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Stage Multipliers ── */}
        <SectionLabel label="Stage Multipliers" />
        <div style={card}>
          {STAGES.map((s, i) => {
            const mult = scoring.stageMultipliers[s.id];
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 1.6fr',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 0',
                  borderBottom: i === STAGES.length - 1 ? 'none' : `1px solid ${t.border}`,
                }}
              >
                {/* Stage label */}
                <div>
                  <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 14, color: t.ink }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                    Applied to all {s.matchCount} matches
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${t.border}`, borderRadius: 9, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setStageMultiplier(s.id, Math.max(0, mult - 1))}
                    style={{
                      border: 0,
                      background: t.surface2,
                      color: t.ink,
                      width: 30,
                      height: 36,
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      cursor: mult <= 0 ? 'not-allowed' : 'pointer',
                      opacity: mult <= 0 ? 0.4 : 1,
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    flex: 1,
                    textAlign: 'center',
                    fontFamily: FONTS.mono,
                    fontWeight: 800,
                    fontSize: 18,
                    color: t.yellow,
                    minWidth: 44,
                  }}>
                    ×{mult}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStageMultiplier(s.id, Math.min(MAX_MULTIPLIER, mult + 1))}
                    style={{
                      border: 0,
                      background: t.surface2,
                      color: t.ink,
                      width: 30,
                      height: 36,
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      cursor: mult >= MAX_MULTIPLIER ? 'not-allowed' : 'pointer',
                      opacity: mult >= MAX_MULTIPLIER ? 0.4 : 1,
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Live preview */}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  background: t.yellowTint,
                  fontFamily: FONTS.mono,
                  fontSize: 11,
                  color: t.ink,
                }}>
                  {s.label} ×{mult} → exact score ={' '}
                  <b style={{ color: t.yellow }}>
                    {scoring.basePoints.exactScore * mult} pts
                  </b>
                  <span style={{ color: t.inkMuted }}>
                    {' '}· gap = {scoring.basePoints.correctGap * mult} pts · winner = {scoring.basePoints.correctWinner * mult} pt
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Base Points ── */}
        <SectionLabel label="Base Points" />
        <div style={card}>
          {/* Exact score */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 1.6fr',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
            borderBottom: `1px solid ${t.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: t.ink, fontFamily: FONTS.display }}>
                Exact score
              </div>
              <div style={{ fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                Predict the exact scoreline
              </div>
            </div>
            <Stepper
              value={scoring.basePoints.exactScore}
              max={MAX_BASE}
              onChange={(v) => setBasePoint('exactScore', v)}
            />
            <div style={{
              padding: '8px 12px',
              borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: t.ink,
            }}>
              Exact score at Group Stage ={' '}
              <b style={{ color: t.yellow }}>
                {scoring.basePoints.exactScore} × {scoring.stageMultipliers.group} = {scoring.basePoints.exactScore * scoring.stageMultipliers.group} pts
              </b>
            </div>
          </div>

          {/* Correct gap */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 1.6fr',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
            borderBottom: `1px solid ${t.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: t.ink, fontFamily: FONTS.display }}>
                Correct gap
              </div>
              <div style={{ fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                Predict the correct goal difference
              </div>
            </div>
            <Stepper
              value={scoring.basePoints.correctGap}
              max={MAX_BASE}
              onChange={(v) => setBasePoint('correctGap', v)}
            />
            <div style={{
              padding: '8px 12px',
              borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: t.ink,
            }}>
              Correct gap at Group Stage ={' '}
              <b style={{ color: t.yellow }}>
                {scoring.basePoints.correctGap} × {scoring.stageMultipliers.group} = {scoring.basePoints.correctGap * scoring.stageMultipliers.group} pts
              </b>
            </div>
          </div>

          {/* Correct winner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 1.6fr',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: t.ink, fontFamily: FONTS.display }}>
                Correct winner
              </div>
              <div style={{ fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                Predict the right winning side
              </div>
            </div>
            <Stepper
              value={scoring.basePoints.correctWinner}
              max={MAX_BASE}
              onChange={(v) => setBasePoint('correctWinner', v)}
            />
            <div style={{
              padding: '8px 12px',
              borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: t.ink,
            }}>
              Correct winner at Group Stage ={' '}
              <b style={{ color: t.yellow }}>
                {scoring.basePoints.correctWinner} × {scoring.stageMultipliers.group} = {scoring.basePoints.correctWinner * scoring.stageMultipliers.group} pts
              </b>
            </div>
          </div>
        </div>

        {/* ── Bonus Points ── */}
        <SectionLabel label="Bonus Points" />
        <div style={card}>
          {/* Top scorer */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 1.6fr',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
            borderBottom: `1px solid ${t.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: t.ink, fontFamily: FONTS.display }}>
                Top Scorer pick
              </div>
              <div style={{ fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                Correctly predict the tournament top scorer
              </div>
            </div>
            <Stepper
              value={scoring.bonusPoints.topScorer}
              max={MAX_BONUS}
              onChange={(v) => setBonusPoint('topScorer', v)}
            />
            <div style={{
              padding: '8px 12px',
              borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: t.ink,
            }}>
              Awarded once if correct →{' '}
              <b style={{ color: t.yellow }}>{scoring.bonusPoints.topScorer} pts</b>
            </div>
          </div>

          {/* World Cup winner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 1.6fr',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: t.ink, fontFamily: FONTS.display }}>
                World Cup Winner pick
              </div>
              <div style={{ fontSize: 11, color: t.inkMuted, marginTop: 1 }}>
                Correctly predict the tournament winner
              </div>
            </div>
            <Stepper
              value={scoring.bonusPoints.worldCupWinner}
              max={MAX_BONUS}
              onChange={(v) => setBonusPoint('worldCupWinner', v)}
            />
            <div style={{
              padding: '8px 12px',
              borderRadius: 9,
              background: t.yellowTint,
              fontFamily: FONTS.mono,
              fontSize: 11,
              color: t.ink,
            }}>
              Awarded once if correct →{' '}
              <b style={{ color: t.yellow }}>{scoring.bonusPoints.worldCupWinner} pts</b>
            </div>
          </div>
        </div>

        {/* ── Save ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: t.yellow,
              color: '#1A1410',
              border: 'none',
              borderRadius: 8,
              padding: '11px 24px',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONTS.body,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          {saveSuccess && (
            <span style={{
              color: t.up,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONTS.body,
            }}>
              Saved!
            </span>
          )}

          {saveError && (
            <span style={{
              color: t.down,
              fontSize: 13,
              fontFamily: FONTS.mono,
            }}>
              {saveError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
