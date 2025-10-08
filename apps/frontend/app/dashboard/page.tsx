'use client';

import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { parseApiResponse } from '../lib/api';
import { LogoGrid, type Logo } from '../components/LogoGrid';
import Link from 'next/link';

export default function DashboardPage() {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

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
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    fetchLogos();
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-20 right-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
          </div>

          {/* Confetti Effect */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Header */}
          <header className="relative z-10 glass border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-xl font-bold gradient-text">LogoMorph</span>
                  </Link>
                  <Link
                    href="/presets"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 group"
                  >
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Presets
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="glass px-4 py-2 rounded-full text-sm font-medium text-gray-700">
                    <span className="text-blue-600 font-bold">{logos.length}</span> Logo{logos.length !== 1 ? 's' : ''}
                  </div>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Upload Section */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="inline-block w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
                    Upload Your Logo
                  </h2>
                  <p className="text-gray-600 mt-2">Drop your logo and watch the magic happen</p>
                </div>
              </div>
              <div className="animate-slide-up">
                <UploadZone onUploadSuccess={handleUploadSuccess} />
              </div>
            </section>

            {/* Logos Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="inline-block w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
                    Your Logo Library
                  </h2>
                  <p className="text-gray-600 mt-2">Click any logo to generate variants</p>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-24">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
                  </div>
                  <p className="mt-6 text-lg text-gray-600 font-medium">Loading your logos...</p>
                </div>
              ) : logos.length > 0 ? (
                <div className="animate-slide-up">
                  <LogoGrid logos={logos} onDelete={fetchLogos} />
                </div>
              ) : (
                <div className="text-center py-24 glass rounded-3xl border-2 border-dashed border-gray-300 animate-slide-up">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
                    <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No logos yet</h3>
                  <p className="text-gray-600 mb-6">
                    Upload your first logo above to start creating amazing variants!
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Supports SVG and PNG formats
                  </div>
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
