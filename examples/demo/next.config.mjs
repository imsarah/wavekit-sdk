/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the WaveKit workspace packages with Next's own compiler.
  transpilePackages: ['@wavekit-sdk/core', '@wavekit-sdk/react', '@wavekit-sdk/adapter-xaman'],
  // xrpl is used only in server API routes — don't try to bundle it.
  experimental: {
    serverComponentsExternalPackages: ['xrpl', 'xumm-sdk'],
  },
};

export default nextConfig;
