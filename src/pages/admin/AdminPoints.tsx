import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { getDocs, query, orderBy, limit, type Timestamp } from 'firebase/firestore';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { FONTS } from '../../theme/tokens';
import {
  usersCol,
  auditLogCol,
  applyPointAdjustment,
  type UserDoc,
  type AuditLogEntry,
} from '../../firebase/firestore';

// ── Types ──────────────────────────────────────────────────────

interface UserRow extends UserDoc {
  id: string;
}

interface AuditRow extends AuditLogEntry {
  id: string;
}

// ── Component ──────────────────────────────────────────────────

export function AdminPoints() {
  const { theme: t } = useTheme();
  const { user, isAdmin, loading } = useAuth();

  // Users for dropdown
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Load errors
  const [usersError, setUsersError] = useState('');
  const [auditError, setAuditError] = useState('');

  // Success auto-clear timer
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load users ──────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const snap = await getDocs(usersCol());
      const rows: UserRow[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(rows);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── Load audit log ──────────────────────────────────────────

  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const q = query(auditLogCol(), orderBy('when', 'desc'), limit(50));
      const snap = await getDocs(q);
      const rows: AuditRow[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAuditLog(rows);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Failed to load audit log.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      loadUsers();
      loadAuditLog();
    }
  }, [loading, isAdmin, loadUsers, loadAuditLog]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ── Auth guards ─────────────────────────────────────────────

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

  // ── Derived ─────────────────────────────────────────────────

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  // ── Submit ──────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!user) {
      setFormError('Not authenticated.');
      return;
    }
    if (!selectedUser) {
      setFormError('Please select a user.');
      return;
    }
    if (delta === 0) {
      setFormError('Delta cannot be zero.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Reason is required.');
      return;
    }

    const deltaLabel = delta > 0 ? `+${delta}` : String(delta);
    if (!window.confirm(`Apply ${deltaLabel} pts to ${selectedUser.displayName}?\n\nReason: "${reason.trim()}"\n\nThis cannot be undone.`)) return;

    setSubmitting(true);
    try {
      await applyPointAdjustment(
        user.displayName ?? 'Admin',
        user.uid,
        { id: selectedUser.id, displayName: selectedUser.displayName, leagueIds: selectedUser.leagueIds },
        delta,
        reason.trim(),
      );
      setDelta(0);
      setReason('');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      setSuccessMsg('Adjustment applied.');
      successTimerRef.current = setTimeout(() => setSuccessMsg(''), 4000);
      await loadAuditLog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to apply adjustment.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: t.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontFamily: FONTS.body,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: 9,
    padding: '10px 12px',
    color: t.ink,
    fontSize: 13,
    fontFamily: FONTS.body,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const deltaColor = delta > 0 ? t.up : delta < 0 ? t.down : t.inkMuted;
  const deltaLabel = delta > 0 ? `+${delta}` : String(delta);

  const applyDisabled = submitting || !selectedUser || !reason.trim() || delta === 0;

  // ── Render ──────────────────────────────────────────────────

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.ink, margin: 0, fontFamily: FONTS.display }}>
            Point Adjustments
          </h1>
        </div>
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
            cursor: 'pointer',
          }}
        >
          ← Admin
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page title section */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: FONTS.display,
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            margin: '0 0 6px 0',
          }}>
            Point adjustments
          </h2>
          <p style={{
            fontFamily: FONTS.body,
            fontSize: 13,
            color: t.inkMuted,
            margin: 0,
          }}>
            Manual corrections require a reason · all changes audit-logged
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }}>

          {/* ── Form panel ── */}
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: 18,
          }}>
            <div style={{
              fontFamily: FONTS.display,
              fontSize: 14,
              fontWeight: 700,
              color: t.ink,
              marginBottom: 14,
            }}>
              New adjustment
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* User select */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle} htmlFor="points-user">User</label>
                {usersError && (
                  <div style={{ color: t.down, fontSize: 12, fontFamily: FONTS.mono, marginBottom: 6 }}>
                    {usersError}
                  </div>
                )}
                {usersLoading ? (
                  <div style={{ ...inputStyle, color: t.inkMuted }}>Loading users…</div>
                ) : (
                  <select
                    id="points-user"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setFormError('');
                      setSuccessMsg('');
                    }}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                    disabled={submitting}
                  >
                    <option value="">Select a user…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} · {u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Delta stepper */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Delta</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setDelta((d) => Math.max(-50, d - 1))}
                    disabled={submitting || delta <= -50}
                    style={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      background: t.surface2,
                      color: t.ink,
                      fontSize: 18,
                      fontWeight: 700,
                      cursor: submitting || delta <= -50 ? 'not-allowed' : 'pointer',
                      opacity: delta <= -50 ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    flex: 1,
                    background: t.surface2,
                    border: `1px solid ${t.border}`,
                    borderRadius: 9,
                    padding: '10px 12px',
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    fontWeight: 800,
                    color: deltaColor,
                    textAlign: 'center',
                  }}>
                    {deltaLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDelta((d) => Math.min(50, d + 1))}
                    disabled={submitting || delta >= 50}
                    style={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      background: t.surface2,
                      color: t.ink,
                      fontSize: 18,
                      fontWeight: 700,
                      cursor: submitting || delta >= 50 ? 'not-allowed' : 'pointer',
                      opacity: delta >= 50 ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle} htmlFor="points-reason">
                  Reason{' '}
                  <span style={{ color: t.down, fontWeight: 600 }}>*</span>
                </label>
                <textarea
                  id="points-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setFormError('');
                    setSuccessMsg('');
                  }}
                  placeholder="e.g. Late-submission grace (kickoff bug)"
                  disabled={submitting}
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 60,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Error / success */}
              {formError && (
                <div style={{
                  color: t.down,
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  marginBottom: 10,
                }}>
                  {formError}
                </div>
              )}
              {successMsg && (
                <div style={{
                  color: t.up,
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  marginBottom: 10,
                }}>
                  {successMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={applyDisabled}
                style={{
                  marginTop: 4,
                  width: '100%',
                  border: 0,
                  padding: '11px 14px',
                  borderRadius: 10,
                  background: t.yellow,
                  color: '#1A1410',
                  fontFamily: FONTS.display,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: applyDisabled ? 'not-allowed' : 'pointer',
                  opacity: applyDisabled ? 0.6 : 1,
                }}
              >
                {submitting ? 'Applying…' : 'Apply adjustment'}
              </button>
            </form>
          </div>

          {/* ── Audit log panel ── */}
          <div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 10,
              fontWeight: 700,
              color: t.inkMuted,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Recent adjustments
            </div>

            {auditError && (
              <div style={{ color: t.down, fontSize: 12, fontFamily: FONTS.mono, marginBottom: 8 }}>
                {auditError}
              </div>
            )}
            {auditLoading ? (
              <div style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: 24,
                textAlign: 'center',
                color: t.inkMuted,
                fontSize: 13,
                fontFamily: FONTS.body,
              }}>
                Loading…
              </div>
            ) : auditLog.length === 0 ? (
              <div style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: 24,
                textAlign: 'center',
                color: t.inkMuted,
                fontSize: 13,
                fontFamily: FONTS.body,
              }}>
                No adjustments yet.
              </div>
            ) : (
              <div style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}>
                {auditLog.map((entry, i) => {
                  const isLast = i === auditLog.length - 1;
                  const when = entry.when as Timestamp;
                  const whenStr = when
                    .toDate()
                    .toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  const entryDeltaColor = entry.delta > 0 ? t.up : t.down;
                  const entryDeltaLabel = entry.delta > 0 ? `+${entry.delta}` : String(entry.delta);

                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '12px 14px',
                        borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{
                        width: 38,
                        textAlign: 'center',
                        fontFamily: FONTS.mono,
                        fontWeight: 800,
                        fontSize: 14,
                        color: entryDeltaColor,
                        flexShrink: 0,
                      }}>
                        {entryDeltaLabel}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: FONTS.body,
                          fontSize: 12,
                          color: t.ink,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          <b style={{ fontWeight: 700 }}>{entry.target}</b>{' · '}{entry.reason}
                        </div>
                        <div style={{
                          fontFamily: FONTS.mono,
                          fontSize: 10.5,
                          color: t.inkDim,
                          marginTop: 2,
                        }}>
                          {whenStr} · by {entry.who}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
