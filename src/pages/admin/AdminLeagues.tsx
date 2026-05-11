import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { FONTS, USER_COLORS } from '../../theme/tokens';
import { leaguesCol, leagueDoc, type LeagueDoc } from '../../firebase/firestore';
import { storage } from '../../firebase/client';

// ── Types ──────────────────────────────────────────────────────

type LeagueColor = LeagueDoc['color'];
type FormMode = 'create' | 'edit' | null;

interface LeagueRow extends LeagueDoc {
  id: string;
}

// ── Helpers ────────────────────────────────────────────────────

const COLOR_OPTIONS: LeagueColor[] = ['pink', 'blue', 'green', 'yellow', 'orange', 'purple'];

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function uploadLeaguePhoto(leagueId: string, file: File): Promise<string> {
  if (!storage) throw new Error('Storage not configured');
  const storageRef = ref(storage, `leagues/${leagueId}/photo`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function getColorBg(color: LeagueColor, yellowToken: string): string {
  if (color === 'yellow') return yellowToken;
  return USER_COLORS[color]?.bg ?? yellowToken;
}

// ── Component ──────────────────────────────────────────────────

export function AdminLeagues() {
  const { theme: t } = useTheme();
  const { user, isAdmin, loading } = useAuth();

  // List state
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formLeagueId, setFormLeagueId] = useState<string>('');
  const [editingLeague, setEditingLeague] = useState<LeagueRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState<LeagueColor>('blue');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>('');

  // ── Load leagues ────────────────────────────────────────────

  const loadLeagues = useCallback(async () => {
    setListLoading(true);
    try {
      const snap = await getDocs(leaguesCol());
      const rows: LeagueRow[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setLeagues(rows);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      loadLeagues();
    }
  }, [loading, isAdmin, loadLeagues]);

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

  // ── Form helpers ────────────────────────────────────────────

  function openCreateForm() {
    const newId = doc(leaguesCol()).id;
    setFormLeagueId(newId);
    setEditingLeague(null);
    setFormName('');
    setFormColor('blue');
    setFormPhotoUrl('');
    setFormError('');
    setFormMode('create');
  }

  function openEditForm(league: LeagueRow) {
    setFormLeagueId(league.id);
    setEditingLeague(league);
    setFormName(league.name);
    setFormColor(league.color);
    setFormPhotoUrl(league.photoUrl ?? '');
    setFormError('');
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode(null);
    setEditingLeague(null);
    setFormError('');
    setUploading(false);
    setSaving(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const url = await uploadLeaguePhoto(formLeagueId, file);
      setFormPhotoUrl(url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    if (saving) return;
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!user) {
      setFormError('Not authenticated');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await setDoc(leagueDoc(formLeagueId), {
          name: formName.trim(),
          code: generateCode(),
          color: formColor,
          ...(formPhotoUrl ? { photoUrl: formPhotoUrl } : {}),
          memberIds: [],
          createdBy: user.uid,
          createdAt: Timestamp.now(),
        });
      } else if (formMode === 'edit') {
        if (!editingLeague) {
          setFormError('No league selected for editing');
          return; // finally will reset saving
        }
        await updateDoc(leagueDoc(editingLeague.id), {
          name: formName.trim(),
          color: formColor,
          photoUrl: formPhotoUrl || editingLeague.photoUrl || '',
        });
      }
      closeForm();
      await loadLeagues();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
      if (formMode === 'create' && formPhotoUrl && storage) {
        deleteObject(ref(storage, `leagues/${formLeagueId}/photo`)).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(league: LeagueRow) {
    if (!window.confirm(`Delete league "${league.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(leagueDoc(league.id));
      if (league.photoUrl && storage) {
        const storageRef = ref(storage, `leagues/${league.id}/photo`);
        await deleteObject(storageRef).catch(() => {});
      }
      await loadLeagues();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // ── Styles ──────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: FONTS.body }}>
      {/* Header */}
      <div style={{
        background: t.surface,
        borderBottom: `1px solid ${t.border}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.ink, margin: 0, fontFamily: FONTS.display }}>
            Leagues
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
          ← Back to Admin
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 700,
            color: t.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            margin: 0,
          }}>
            Leagues
          </h2>
          <button
            onClick={openCreateForm}
            style={{
              background: t.yellow,
              color: '#1A1410',
              border: 'none',
              borderRadius: 8,
              padding: '9px 16px',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: FONTS.body,
              cursor: 'pointer',
            }}
          >
            + New League
          </button>
        </div>

        {/* League table card */}
        <div style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 32,
        }}>
          {listLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: t.inkMuted, fontSize: 14 }}>
              Loading leagues…
            </div>
          ) : leagues.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: t.inkMuted, fontSize: 14 }}>
              No leagues yet. Create one above.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {['Color', 'Name', 'Code', 'Members', 'Photo', 'Actions'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.inkMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leagues.map((league, idx) => (
                  <tr
                    key={league.id}
                    style={{
                      borderBottom: idx < leagues.length - 1 ? `1px solid ${t.border}` : 'none',
                    }}
                  >
                    {/* Color swatch */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: getColorBg(league.color, t.yellow),
                      }} />
                    </td>
                    {/* Name */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: t.ink, fontSize: 14 }}>
                      {league.name}
                    </td>
                    {/* Join code */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: FONTS.mono,
                        fontSize: 13,
                        color: t.inkMuted,
                        background: t.surface2,
                        padding: '3px 8px',
                        borderRadius: 5,
                      }}>
                        {league.code}
                      </span>
                    </td>
                    {/* Member count */}
                    <td style={{ padding: '12px 16px', color: t.inkMuted, fontSize: 14 }}>
                      {league.memberIds.length}
                    </td>
                    {/* Photo */}
                    <td style={{ padding: '12px 16px' }}>
                      {league.photoUrl ? (
                        <img
                          src={league.photoUrl}
                          alt={league.name}
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: t.surface2,
                          border: `1px solid ${t.border}`,
                        }} />
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openEditForm(league)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${t.border}`,
                            borderRadius: 7,
                            padding: '6px 12px',
                            color: t.ink,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: FONTS.body,
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(league)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${t.down}`,
                            borderRadius: 7,
                            padding: '6px 12px',
                            color: t.down,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: FONTS.body,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create / Edit form */}
        {formMode !== null && (
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 24,
          }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 700,
              color: t.ink,
              margin: '0 0 20px 0',
              fontFamily: FONTS.display,
            }}>
              {formMode === 'create' ? 'Create League' : `Edit "${editingLeague?.name}"`}
            </h3>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="league-name">Name</label>
                <input
                  id="league-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Black Rabbit FC"
                  style={inputStyle}
                  disabled={saving}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      title={c}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: getColorBg(c, t.yellow),
                        border: 'none',
                        cursor: 'pointer',
                        outline: formColor === c ? `2px solid ${t.yellow}` : '2px solid transparent',
                        outlineOffset: 2,
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Photo upload */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle} htmlFor="league-photo">League Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    id="league-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={uploading || saving}
                    style={{
                      fontSize: 13,
                      color: t.ink,
                      fontFamily: FONTS.body,
                    }}
                  />
                  {uploading && (
                    <span style={{ fontSize: 13, color: t.inkMuted }}>Uploading…</span>
                  )}
                  {formPhotoUrl && !uploading && (
                    <img
                      src={formPhotoUrl}
                      alt="Preview"
                      style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: `1px solid ${t.border}` }}
                    />
                  )}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div style={{
                  color: t.down,
                  fontSize: 13,
                  marginBottom: 16,
                  fontFamily: FONTS.mono,
                }}>
                  {formError}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  style={{
                    background: t.yellow,
                    color: '#1A1410',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: FONTS.body,
                    cursor: saving || uploading ? 'not-allowed' : 'pointer',
                    opacity: saving || uploading ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving…' : formMode === 'create' ? 'Create League' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    padding: '10px 20px',
                    color: t.inkMuted,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONTS.body,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
