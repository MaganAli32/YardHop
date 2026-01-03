import React from 'react';
import Header from './Header';

interface HeaderWrapperProps {
  unreadNotifications?: number;
}

/**
 * HeaderWrapper - Wrapper component for the unified Header
 * The Header component now handles both authenticated and non-authenticated states
 */
export default function HeaderWrapper({ 
  unreadNotifications = 0 
}: HeaderWrapperProps) {
  // The new Header component handles authentication state internally
  return <Header />;
}

