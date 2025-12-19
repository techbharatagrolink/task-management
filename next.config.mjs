/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
