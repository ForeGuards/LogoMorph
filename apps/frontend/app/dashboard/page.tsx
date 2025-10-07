import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

export default function DashboardPage() {
  return (
    <>
      <SignedIn>
        <main className="p-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p>Welcome to LogoMorph.</p>
        </main>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
