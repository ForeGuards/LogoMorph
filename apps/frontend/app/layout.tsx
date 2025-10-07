'use client';

import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import React from 'react';

export const metadata = {
  title: 'LogoMorph',
  description: 'AI-powered logo variant generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
