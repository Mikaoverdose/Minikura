// @ts-check
 
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  async rewrites() {
    const apiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000")
      .replace(/\/$/, "");

    return [
      {
        source: "/auth/:path*",
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};
 
export default nextConfig;
