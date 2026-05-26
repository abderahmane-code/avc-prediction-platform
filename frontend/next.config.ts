import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "http://127.0.0.1:8000/admin/:path*",
      },
      {
        source: "/static/admin/:path*",
        destination: "http://127.0.0.1:8000/static/admin/:path*",
      },
      {
        source: "/prediction/detail/:id/pdf",
        destination: "http://127.0.0.1:8000/prediction/detail/:id/pdf/",
      },
    ];
  },
};

export default nextConfig;
