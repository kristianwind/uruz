/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow a verification build to write somewhere else, so running `npm run
  // build:check` never clobbers a running dev server's .next directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Uruz is designed to be mountable under a larger "Yggdrasil Panel" at a
  // sub-path later. Set NEXT_PUBLIC_BASE_PATH (e.g. "/uruz") to mount it there.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  async headers() {
    return [
      {
        // The service worker must be served with no aggressive caching so
        // updates roll out; scope is the whole app.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
