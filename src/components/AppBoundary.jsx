import React, { Component, Suspense } from 'react';

export default class AppBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" style={{ padding: 24 }}>This app couldn’t load. Please reload the page to try again.</div>;
    return <Suspense fallback={<p role="status" style={{ padding: 24 }}>Loading app…</p>}>{this.props.children}</Suspense>;
  }
}
