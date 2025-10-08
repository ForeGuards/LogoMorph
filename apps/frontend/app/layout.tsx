import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

// Force dynamic rendering to support Clerk's async headers() usage
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'LogoMorph',
  description: 'AI-powered logo variant generator',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Explicitly await headers() before Clerk tries to access it synchronously
  await headers();

  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
