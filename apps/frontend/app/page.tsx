'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="p-6">
      <header className="flex items-center justify-between">
        <div className="font-semibold">LogoMorph</div>
        <div>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </header>

      <section className="mt-8">
        <SignedIn>
          <a className="text-blue-600 underline" href="/dashboard">
            Go to dashboard
          </a>
        </SignedIn>
        <SignedOut>
          <p>Please sign in to continue.</p>
        </SignedOut>
      </section>
    </main>
  );
}
