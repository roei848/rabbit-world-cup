import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useLeagues } from './useLeagues';

vi.mock('../firebase/firestore', () => ({
  leagueDoc: vi.fn((id: string) => ({ _id: id })),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    onSnapshot: vi.fn(),
  };
});

import { onSnapshot } from 'firebase/firestore';

const mockOnSnapshot = onSnapshot as Mock;

function makeLeague(id: string) {
  return {
    name: `League ${id}`,
    code: `CODE${id}`,
    color: 'blue' as const,
    memberIds: [],
    createdBy: 'user1',
    createdAt: Timestamp.fromDate(new Date('2026-01-01')),
  };
}

describe('useLeagues', () => {
  it('returns empty array and loading=false when leagueIds is empty', () => {
    const { result } = renderHook(() => useLeagues([]));
    expect(result.current.leagues).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns leagues when leagueIds are provided', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      const ref = _ref as { _id: string };
      const id = ref._id;
      onNext({
        exists: () => true,
        id,
        data: () => makeLeague(id),
      });
      return () => {};
    });

    const { result } = renderHook(() => useLeagues(['league1', 'league2']));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].id).toBe('league1');
    expect(result.current.leagues[1].id).toBe('league2');
    expect(result.current.leagues[0].name).toBe('League league1');
  });

  it('handles non-existent docs by omitting them', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext({ exists: () => false, id: 'missing', data: () => undefined });
      return () => {};
    });

    const { result } = renderHook(() => useLeagues(['missing']));

    expect(result.current.loading).toBe(false);
    expect(result.current.leagues).toHaveLength(0);
  });

  it('sets error and loading=false when onSnapshot fails', () => {
    mockOnSnapshot.mockImplementation(
      (_ref: unknown, _onNext: unknown, onError: (err: Error) => void) => {
        onError(new Error('Permission denied'));
        return () => {};
      }
    );

    const { result } = renderHook(() => useLeagues(['league1']));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Permission denied');
  });

  it('cleans up listeners on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useLeagues(['league1']));
    act(() => { unmount(); });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('surfaces partial results when some listeners succeed and one errors', () => {
    // First two calls succeed, third call errors
    let callCount = 0;
    mockOnSnapshot.mockImplementation(
      (_ref: unknown, onNext: (snap: unknown) => void, onError: (err: Error) => void) => {
        const index = callCount++;
        if (index < 2) {
          const id = ((_ref as { _id: string })._id);
          onNext({
            exists: () => true,
            id,
            data: () => makeLeague(id),
          });
        } else {
          onError(new Error('Permission denied'));
        }
        return () => {};
      }
    );

    const { result } = renderHook(() => useLeagues(['league1', 'league2', 'league3']));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Permission denied');
    expect(result.current.leagues).toHaveLength(2);
    expect(result.current.leagues[0].id).toBe('league1');
    expect(result.current.leagues[1].id).toBe('league2');
  });
});
