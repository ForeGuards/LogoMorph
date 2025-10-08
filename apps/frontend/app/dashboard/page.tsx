'use client';

import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { parseApiResponse } from '../lib/api';
import { LogoGrid, type Logo } from '../components/LogoGrid';

export default function DashboardPage() {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogos();
  }, []);

  async function fetchLogos() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/logos', {
        credentials: 'include',
      });
      const data = await parseApiResponse<Logo[]>(response);
      if (response.ok && data.success) {
        setLogos(data.data ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch logos:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleUploadSuccess() {
    fetchLogos();
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-2xl font-bold text-gray-900">LogoMorph</h1>
                  <a
                    href="/presets"
                    className="text-sm text-gray-600 hover:text-gray-900 transition"
                  >
                    Manage Presets
                  </a>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Upload Section */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Logo</h2>
              <UploadZone onUploadSuccess={handleUploadSuccess} />
            </section>

            {/* Logos Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Logos</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-4 text-gray-600">Loading logos...</p>
                </div>
              ) : logos.length > 0 ? (
                <LogoGrid logos={logos} onDelete={fetchLogos} />
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600">No logos uploaded yet.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload your first logo to get started!
                  </p>
                </div>
              )}
            </section>
          </main>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
