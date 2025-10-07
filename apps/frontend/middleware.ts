import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: ['/dashboard(.*)', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
