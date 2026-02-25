/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/proxy/auth/:path*", destination: "http://localhost:3009/:path*" },
      { source: "/proxy/registration/:path*", destination: "http://localhost:3008/:path*" },
      { source: "/proxy/obligation/:path*", destination: "http://localhost:3007/:path*" },
      { source: "/proxy/filing/:path*", destination: "http://localhost:3001/:path*" },
      { source: "/proxy/amendment/:path*", destination: "http://localhost:3005/:path*" },
      { source: "/proxy/assessment/:path*", destination: "http://localhost:3004/:path*" },
      { source: "/proxy/claim/:path*", destination: "http://localhost:3006/:path*" },
    ];
  },
};

export default nextConfig;


