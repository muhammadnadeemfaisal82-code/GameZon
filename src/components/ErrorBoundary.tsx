import { Component, type ErrorInfo, type ReactNode } from 'react';
import { formatReadableFirestoreError } from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: formatReadableFirestoreError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('NEWS WORLD ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-neutral-950 flex items-center justify-center px-6">
          <div className="max-w-md w-full border border-neutral-200 rounded-lg p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
              NEWS WORLD · Service Notice
            </p>
            <h1 className="mt-2 font-serif text-2xl font-bold text-neutral-950">
              Unable to Load Edition
            </h1>
            <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
            >
              Reload NEWS WORLD
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
