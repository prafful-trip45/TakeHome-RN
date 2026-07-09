/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // App link verification files must be served as JSON, from the exact well-known
  // paths, with no redirect. See public/.well-known/* and Task 4 in ARCHITECTURE.md.
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        // The native app fetches the version-gate config with a plain fetch (no
        // CORS preflight), but keep it explicitly open so a browser probe also works.
        source: '/api/version-config',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;
