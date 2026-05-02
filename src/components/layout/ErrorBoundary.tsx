import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const missingConfig = error.message.includes('invalid-api-key') ||
                          error.message.includes('api-key');

    return (
      <div style={{
        minHeight: '100vh',
        background: '#13110F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        gap: 20,
        fontFamily: 'Inter, sans-serif',
        color: '#F5F1EA',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36 }}>🐇</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {missingConfig ? 'Firebase not configured' : 'Something went wrong'}
        </div>
        {missingConfig ? (
          <div style={{ fontSize: 13, color: '#A39B8E', maxWidth: 340, lineHeight: 1.7 }}>
            Copy <code style={{ background: '#221E1A', padding: '2px 6px', borderRadius: 4 }}>.env.example</code> to{' '}
            <code style={{ background: '#221E1A', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> and fill in
            your Firebase project credentials from the Firebase console.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#6E6760', maxWidth: 400 }}>
            {error.message}
          </div>
        )}
      </div>
    );
  }
}
