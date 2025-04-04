/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['116.124.191.174'],
      allowedForwardedHosts: ['116.124.191.174'],
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Accept, Content-Type' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/menus',
        destination: 'http://116.124.191.174:15026/menus/'
      },
      {
        source: '/api/menus/',
        destination: 'http://116.124.191.174:15026/menus/'
      },
      {
        source: '/api/:path*',
        destination: 'http://116.124.191.174:15026/:path*'
      }
    ]
  }
}

module.exports = nextConfig 