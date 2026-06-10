/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide Next's dev-tools indicator (the floating "N" badge). Dev-only anyway,
  // but it clutters the welcome screen and screenshots.
  devIndicators: false,
  // @sparticuz/chromium ships a binary and puppeteer-core must load it from
  // node_modules at runtime — keep both out of the bundler so the PDF route
  // works on Vercel serverless.
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
