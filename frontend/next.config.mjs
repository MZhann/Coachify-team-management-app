/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* calls to the Express backend.
  // In dev  → http://localhost:5000
  // In prod → your Railway URL (set NEXT_PUBLIC_API_URL env var on Vercel)
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
