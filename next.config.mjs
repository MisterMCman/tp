/** @type {import('next').NextConfig} */
const MR_BASE = (process.env.NEXT_PUBLIC_MR_API_BASE_URL || "https://www.medienreich.de/api/instructorPortal").replace(/\/+$/, "");

const nextConfig = {
  async rewrites() {
    return [
      // Proxy all instructorPortal API calls to avoid CORS in the browser
      {
        source: `${process.env.NEXT_PUBLIC_API_PROXY_PATH || "/mr"}/:path*`,
        destination: `${MR_BASE}/:path*`,
      },
      // Special-case for all_skills (.com host)
      {
        source: "/mr-all-skills",
        destination:
          process.env.NEXT_PUBLIC_MR_ALL_SKILLS_URL ||
          "https://www.medienreich.com/api/instructorPortal/all_skills",
      },
    ];
  },
};

export default nextConfig;
