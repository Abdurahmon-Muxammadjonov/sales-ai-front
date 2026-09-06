import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except Next internals, the public API and files with an
  // extension. `/api` must be excluded or locale routing would rewrite a
  // customer's POST to /uz/api/... and every integration would break.
  matcher: ["/", "/(uz|ru)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
