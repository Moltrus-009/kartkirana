import React from 'react';
import { logger } from '../core/logger/logger';

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo): void {
    logger.error('A customer screen failed to render', error);
  }

  private retry = (): void => {
    window.location.reload();
  };

  private goHome = (): void => {
    window.location.assign('/');
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-gray-50 px-6 py-16 text-center text-gray-900 dark:bg-gray-950 dark:text-white">
        <section className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-lg dark:bg-gray-900">
          <h1 className="text-xl font-bold">This screen could not be loaded</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Your cart and account are safe. Check your connection, then try again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={this.retry} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
              Try again
            </button>
            <button type="button" onClick={this.goHome} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold dark:border-gray-700">
              Go home
            </button>
          </div>
        </section>
      </main>
    );
  }
}
