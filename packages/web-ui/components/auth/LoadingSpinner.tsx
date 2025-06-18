'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'text-indigo-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    gray: 'text-gray-400'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const spinner = (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
      <svg 
        className="w-full h-full" 
        fill="none" 
        viewBox="0 0 24 24"
        role="img"
        aria-label="読み込み中"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );

  const content = (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      {spinner}
      {text && (
        <span className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50"
        role="dialog"
        aria-label="読み込み中"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;

// Alternative inline loading component for buttons
export const ButtonSpinner: React.FC<{ size?: 'sm' | 'md' }> = ({ 
  size = 'sm' 
}) => (
  <div className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-white`}>
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
);

// Loading skeleton for forms
export const FormSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);