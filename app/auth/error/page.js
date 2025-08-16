'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error) => {
    switch (error) {
      case 'OAuthCallbackError':
        return {
          title: 'Authentication Error',
          message: 'There was a problem with the authentication process. This is usually due to browser settings or connectivity issues.',
          suggestions: [
            'Clear your browser cookies and try again',
            'Disable ad-blockers temporarily',
            'Try signing in with an incognito/private window',
            'Check if third-party cookies are enabled'
          ]
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'Account creation has been disabled or you do not have permission to access this application.',
          suggestions: [
            'Contact the administrator if you believe this is an error',
            'Check if you are using the correct email address'
          ]
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during authentication.',
          suggestions: ['Try signing in again', 'Contact support if the problem persists']
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorInfo.message}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Try these solutions:
          </h3>
          <ul className="space-y-2">
            {errorInfo.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-sm text-gray-600">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>
          
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Return to Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="text-center">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Technical Details</summary>
              <p className="mt-2 font-mono bg-gray-100 p-2 rounded">
                Error: {error}
              </p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}