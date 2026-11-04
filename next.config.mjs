/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `npm run build` writes a plain static site to out/,
  // which GitHub Pages (or any static host) can serve.
  output: "export",
  trailingSlash: true,
  // GitHub Pages project sites live under /<repo>/; the deploy workflow
  // sets PAGES_BASE_PATH. Locally it's empty.
  basePath: process.env.PAGES_BASE_PATH || "",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
