/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/ophtho',
        destination: '/ophtho/index.html',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
