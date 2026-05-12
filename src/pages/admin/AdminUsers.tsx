import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { FONTS, colorForName, USER_COLORS } from '../../theme/tokens';
import {
  usersCol,
  type UserDoc,
  updateUserRole,
  updateUserStatus,
} from '../../firebase/firestore';
import { app } from '../../firebase/client';

// ── Types ───────────────────────────────────────────────────

interface UserRow extends UserDoc {
  id: string;
}

type ModalMode = 'invite' | 'edit' | null;

// ── Helpers ─────────────────────────────────────────────────

function formatJoinedAt(ts: ReturnType<typeof import('firebase/firestore').serverTimestamp>): string {
  try {
    const t = ts as unknown as Timestamp;
    if (!t || typeof t.toDate !== 'function') return '—';
    return t.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function InitialAvatar({ name, size }: { name: string; size: number }) {
  const colorKey = colorForName(name);
  const color = USER_COLORS[colorKey] ?? { bg: '#A39B8E', ink: '#1A1410' };
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color.bg,
      color: color.ink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONTS.display,
      fontWeight: 700,
      fontSize: size * 0.46,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {initial}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export function AdminUsers() {
  const { theme: t } = useTheme();
  const { isAdmin, loading } = useAuth();

  // List state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLeagueId, setInviteLeagueId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit role state
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Ban/unban state (track which uid is being toggled)
  const [banningUid, setBanningUid] = useState<string | null>(null);

  // ── Load users ──────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const snap = await getDocs(usersCol());
      const rows: UserRow[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(rows);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      loadUsers();
    }
  }, [loading, isAdmin, loadUsers]);

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
        <div style={{ color: t.yellow, fontSize: 14, fontFamily: FONTS.body }}>Loading...</div>
      </div>
    );
  }

  // ── Computed stats ──────────────────────────────────────────

  const totalCount  = users.length;
  const bannedCount = users.filter((u) => u.status === 'banned').length;
  const adminCount  = users.filter((u) => u.isAdmin).length;
  const subtitle    = `${totalCount} member${totalCount !== 1 ? 's' : ''} · ${bannedCount} banned · ${adminCount} admin${adminCount !== 1 ? 's' : ''}`;

  // ── Invite handlers ─────────────────────────────────────────

  function openInviteModal() {
    setInviteEmail('');
    setInviteLeagueId('');
    setInviteResult(null);
    setInviteLoading(false);
    setModalMode('invite');
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteResult(null);
    try {
      if (!app) throw new Error('Firebase not configured');
      const functions = getFunctions(app);
      const inviteUserFn = httpsCallable<{ email: string; leagueId?: string }, { token: string }>(
        functions,
        'inviteUser',
      );
      await inviteUserFn({ email: inviteEmail.trim(), leagueId: inviteLeagueId.trim() || undefined });
      setInviteResult({ type: 'success', message: 'Invite sent!' });
      setInviteEmail('');
      setInviteLeagueId('');
    } catch (err) {
      setInviteResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to send invite' });
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Edit role handlers ──────────────────────────────────────

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setEditIsAdmin(user.isAdmin);
    setEditError('');
    setEditSaving(false);
    setModalMode('edit');
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError('');
    try {
      await updateUserRole(editingUser.id, editIsAdmin);
      closeModal();
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Ban/unban handler ────────────────────────────────────────

  async function handleToggleBan(user: UserRow) {
    setBanningUid(user.id);
    try {
      const next: 'active' | 'banned' = user.status === 'banned' ? 'active' : 'banned';
      await updateUserStatus(user.id, next);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBanningUid(null);
    }
  }

  // ── Close modal ─────────────────────────────────────────────

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
    setEditError('');
    setInviteResult(null);
  }

  // ── Shared styles ────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: t.ink,
    fontSize: 14,
    fontFamily: FONTS.body,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: t.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.ink, margin: 0, fontFamily: FONTS.display }}>
            Users
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
          }}
        >
          ← Admin
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* AdminPageHeader */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingBottom: 18,
          borderBottom: `1px solid ${t.border}`,
          marginBottom: 18,
        }}>
          <div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 10,
              fontWeight: 700,
              color: t.inkMuted,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>Admin</div>
            <div style={{
              fontFamily: FONTS.display,
              fontSize: 24,
              fontWeight: 700,
              color: t.ink,
              letterSpacing: -0.6,
            }}>User management</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: t.inkMuted, marginTop: 4 }}>
              {listLoading ? 'Loading…' : subtitle}
            </div>
          </div>
          <button
            onClick={openInviteModal}
            style={{
              border: 0,
              padding: '9px 14px',
              borderRadius: 10,
              background: t.yellow,
              color: '#1A1410',
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            + Invite member
          </button>
        </div>

        {/* Users table */}
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {/* Table head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1.6fr 0.9fr 0.7fr 0.9fr 1fr',
            padding: '10px 16px',
            borderBottom: `1px solid ${t.border}`,
            fontFamily: FONTS.body,
            fontSize: 10,
            fontWeight: 700,
            color: t.inkMuted,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {listLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: t.inkMuted, fontSize: 14 }}>
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: t.inkMuted, fontSize: 14 }}>
              No users yet.
            </div>
          ) : (
            users.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1.6fr 0.9fr 0.7fr 0.9fr 1fr',
                  padding: '10px 16px',
                  borderBottom: i === users.length - 1 ? 'none' : `1px solid ${t.border}`,
                  alignItems: 'center',
                  fontFamily: FONTS.body,
                  fontSize: 12,
                  color: t.ink,
                }}
              >
                {/* User */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <InitialAvatar name={u.displayName || u.email} size={26} />
                  <span style={{ fontFamily: FONTS.display, fontWeight: 600 }}>{u.displayName}</span>
                </span>

                {/* Email */}
                <span style={{ color: t.inkMuted, fontFamily: FONTS.mono, fontSize: 11 }}>{u.email}</span>

                {/* Role badge */}
                <span>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: u.isAdmin ? t.yellowTint : t.surface2,
                    color: u.isAdmin ? t.yellow : t.inkMuted,
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {u.isAdmin ? 'Admin' : 'Member'}
                  </span>
                </span>

                {/* Joined */}
                <span style={{ color: t.inkMuted, fontFamily: FONTS.mono, fontSize: 11 }}>
                  {formatJoinedAt(u.joinedAt)}
                </span>

                {/* Status */}
                <span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: u.status === 'banned' ? t.down : t.up,
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: u.status === 'banned' ? t.down : t.up,
                    }} />
                    {u.status ?? 'active'}
                  </span>
                </span>

                {/* Actions */}
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => openEditModal(u)}
                    style={{
                      border: `1px solid ${t.border}`,
                      background: 'transparent',
                      color: t.ink,
                      padding: '4px 9px',
                      borderRadius: 7,
                      fontFamily: FONTS.body,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleBan(u)}
                    disabled={banningUid === u.id}
                    style={{
                      border: `1px solid ${t.border}`,
                      background: 'transparent',
                      color: u.status === 'banned' ? t.up : t.down,
                      padding: '4px 9px',
                      borderRadius: 7,
                      fontFamily: FONTS.body,
                      fontSize: 11,
                      cursor: banningUid === u.id ? 'not-allowed' : 'pointer',
                      opacity: banningUid === u.id ? 0.5 : 1,
                    }}
                  >
                    {u.status === 'banned' ? 'Unban' : 'Ban'}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal overlay */}
      {modalMode !== null && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: 28,
              width: '100%',
              maxWidth: 420,
            }}
          >
            {/* ── Invite Modal ── */}
            {modalMode === 'invite' && (
              <>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: t.ink,
                  margin: '0 0 20px 0',
                  fontFamily: FONTS.display,
                }}>
                  Invite member
                </h3>
                <form onSubmit={handleSendInvite} noValidate>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle} htmlFor="invite-email">Email</label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                      required
                      disabled={inviteLoading}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle} htmlFor="invite-league">League ID (optional)</label>
                    <input
                      id="invite-league"
                      type="text"
                      value={inviteLeagueId}
                      onChange={(e) => setInviteLeagueId(e.target.value)}
                      placeholder="e.g. abc123"
                      disabled={inviteLoading}
                      style={inputStyle}
                    />
                  </div>

                  {inviteResult && (
                    <div style={{
                      marginBottom: 16,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: inviteResult.type === 'success' ? 'rgba(61,214,140,0.12)' : 'rgba(244,85,74,0.12)',
                      color: inviteResult.type === 'success' ? t.up : t.down,
                      fontFamily: FONTS.mono,
                      fontSize: 12,
                    }}>
                      {inviteResult.message}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail.trim()}
                      style={{
                        background: t.yellow,
                        color: '#1A1410',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 20px',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: FONTS.body,
                        cursor: inviteLoading || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                        opacity: inviteLoading || !inviteEmail.trim() ? 0.65 : 1,
                      }}
                    >
                      {inviteLoading ? 'Sending…' : 'Send invite'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={inviteLoading}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        padding: '10px 20px',
                        color: t.inkMuted,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: FONTS.body,
                        cursor: inviteLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Edit Role Modal ── */}
            {modalMode === 'edit' && editingUser && (
              <>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: t.ink,
                  margin: '0 0 6px 0',
                  fontFamily: FONTS.display,
                }}>
                  Edit role
                </h3>
                <p style={{ margin: '0 0 20px 0', color: t.inkMuted, fontSize: 13 }}>
                  {editingUser.displayName} · {editingUser.email}
                </p>
                <form onSubmit={handleSaveRole} noValidate>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle} htmlFor="edit-role">Role</label>
                    <select
                      id="edit-role"
                      value={editIsAdmin ? 'admin' : 'member'}
                      onChange={(e) => setEditIsAdmin(e.target.value === 'admin')}
                      disabled={editSaving}
                      style={{
                        ...inputStyle,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {editError && (
                    <div style={{
                      color: t.down,
                      fontSize: 13,
                      marginBottom: 16,
                      fontFamily: FONTS.mono,
                    }}>
                      {editError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={editSaving}
                      style={{
                        background: t.yellow,
                        color: '#1A1410',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 20px',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: FONTS.body,
                        cursor: editSaving ? 'not-allowed' : 'pointer',
                        opacity: editSaving ? 0.7 : 1,
                      }}
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={editSaving}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        padding: '10px 20px',
                        color: t.inkMuted,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: FONTS.body,
                        cursor: editSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
