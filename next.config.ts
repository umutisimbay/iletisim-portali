/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',           // Ana sayfa (kök dizin)
        destination: '/login', // Hedef sayfa
        permanent: false,      // Geliştirme aşamasında 'false' tutmak daha iyidir
      },
    ]
  },
}

module.exports = nextConfig