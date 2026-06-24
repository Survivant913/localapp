import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className='p-8 bg-red-50 text-red-900 border border-red-500 rounded-lg m-8'>
          <h2 className="text-xl font-bold mb-4">Une erreur technique est survenue dans l'éditeur :</h2>
          <pre className="whitespace-pre-wrap bg-white p-4 rounded border border-red-200">{this.state.error?.toString()}</pre>
          <pre className="whitespace-pre-wrap bg-white p-4 rounded border border-red-200 mt-4 text-sm">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
