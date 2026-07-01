/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2', 'fflate'],
  },
  webpack: (config) => {
    // yahoo-finance2's ESM build imports test-only deps that don't exist in prod
    config.resolve.alias = {
      ...config.resolve.alias,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
      '@gadicc/fetch-mock-cache/stores/fs.ts': false,
    };
    return config;
  },
};

module.exports = nextConfig;
