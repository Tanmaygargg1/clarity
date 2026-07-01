'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Section crashed:', this.props.name, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1.5rem', backgroundColor: '#1A1D27', borderRadius: '0.5rem', border: '1px solid #374151' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            {this.props.name || 'Section'} — render error
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#EF4444' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
