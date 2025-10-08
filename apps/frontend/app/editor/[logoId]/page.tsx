'use client';

import { SignedIn, SignedOut, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VariantEditor } from '../../components/VariantEditor';
import type { EditorSettings } from '../../components/VariantEditor';
import { parseApiResponse } from '../../lib/api';

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const logoId = params.logoId as string;

  interface EditorLogo {
    filename: string;
    url: string;
  }
  const [logo, setLogo] = useState<EditorLogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (logoId) {
      fetchLogo();
    }
  }, [logoId]);

  async function fetchLogo() {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/logos/${logoId}`, {
        credentials: 'include',
      });
      const data = await parseApiResponse<EditorLogo>(response);
      if (response.ok && data.success) {
        setLogo(data.data ?? null);
      } else {
        console.error('Failed to fetch logo:', data.error);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(settings: EditorSettings) {
    try {
      setGenerating(true);

      // Call backend to generate variant with settings
      const response = await fetch('http://localhost:4000/api/variants/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logoId,
          settings,
        }),
      });

      const data = await parseApiResponse<unknown>(response);

      if (response.ok && data.success) {
        alert('Variant generated successfully!');
        router.push('/dashboard');
      } else {
        alert('Failed to generate variant: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating variant:', error);
      alert('Failed to generate variant');
    } finally {
      setGenerating(false);
    }
  }

  function handleCancel() {
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!logo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Logo not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={handleCancel} className="text-gray-600 hover:text-gray-900">
                    ← Back
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">LogoMorph Editor</h1>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">Editing: {logo.filename}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Customize your logo variant with precision controls
              </p>
            </div>

            {generating ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Generating variant...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            ) : (
              <VariantEditor
                logoUrl={logo.url}
                logoId={logoId}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}
          </main>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
