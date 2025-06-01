/** @type {import('next').NextConfig} */
const crypto = require('crypto');

// .env 파일의 NEXT_PUBLIC_API_URL을 최우선으로 사용합니다.
// Next.js는 자동으로 프로젝트 루트의 .env 파일을 로드합니다.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://116.124.191.174:15049'; // 기본값은 .env 파일이 없을 경우 대비
const AITOPIA_URL = process.env.NEXT_PUBLIC_AITOPIA_URL || 'https://extensions.aitopia.ai';
const OPENAI_API_URL = process.env.NEXT_PUBLIC_OPENAI_API_URL || 'https://api.openai.com';

console.log(`[NextJS Config] Using Backend Server URL: ${BACKEND_URL}`);
console.log(`[NextJS Config] Using Aitopia URL: ${AITOPIA_URL}`);
console.log(`[NextJS Config] Using OpenAI API URL: ${OPENAI_API_URL}`);

let backendHostname = 'localhost';
let backendPort = '15049';
let backendProtocol = 'http';

try {
  const url = new URL(BACKEND_URL);
  backendHostname = url.hostname;
  backendPort = url.port || (url.protocol === 'https:' ? '443' : '80');
  backendProtocol = url.protocol.slice(0, -1); // 'http:' -> 'http'
} catch (error) {
  console.error(`[NextJS Config] Invalid BACKEND_URL: ${BACKEND_URL}. Using defaults for image patterns.`);
}

console.log(`[NextJS Config] Backend hostname for images: ${backendHostname}, port: ${backendPort}, protocol: ${backendProtocol}`);

const nextConfig = {
  eslint: {
    // 빌드 시 ESLint 경고가 있어도 빌드가 실패하지 않음
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 타입 체크를 건너뜀
    ignoreBuildErrors: true,
  },
  // 슬래시 자동 추가 비활성화
  trailingSlash: false,
  reactStrictMode: true,
  
  // 정적 export를 위해 이미지 최적화 비활성화
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24, // 24시간
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: backendProtocol,
        hostname: backendHostname,
        port: backendPort,
        pathname: '/static/**', // 백엔드 정적 파일 경로
      },
      // 로컬 개발 환경에서 localhost 및 127.0.0.1 명시적 허용 (다른 포트 사용 가능성)
      {
        protocol: 'http',
        hostname: 'localhost',
        // port: backendPort, // localhost의 다른 포트도 허용하려면 port 지정 제거 또는 와일드카드 사용
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        // port: backendPort,
        pathname: '/static/**',
      },
       // 필요한 경우 외부 이미지 도메인 추가
      // {
      //   protocol: 'https',
      //   hostname: 'some-other-domain.com',
      //   pathname: '/**',
      // },
      {
        protocol: "http",
        hostname: process.env.BACKEND_HOSTNAME || "localhost",
        port: process.env.BACKEND_PORT || "15049",
        pathname: "/static/menu_images/**",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        port: "",
        pathname: "/private/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
    // domains는 remotePatterns 사용 시 더 이상 권장되지 않음.
    // domains: [backendHostname, 'localhost', '127.0.0.1', '116.124.191.174'], 
  },
  
  // webpack 설정 추가 - 청크 로딩 타임아웃 증가 및 성능 최적화
  webpack: (config, { isServer }) => {
    // 청크 로딩 타임아웃을 20초로 설정
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000,
    };
    config.output.chunkLoadTimeout = 20000; // 20초로 설정
    
    // 프로덕션 모드에서 번들 최적화
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: Infinity, // 기본값 Infinity 또는 Next.js 기본값 유지 (25는 너무 작을 수 있음)
          minSize: 20000, // 20KB
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              name: 'vendors-general',
            },
            reactFramework: {
              chunks: 'all',
              name: 'framework-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // commons와 lib 그룹은 Next.js 기본 최적화에 맡기거나 더 세밀하게 조정 가능
            // 기본 splitChunks 설정을 활용하는 것이 더 효율적일 수 있음
            // 아래는 예시로 남겨두지만, Next.js 최신 버전은 더 지능적으로 처리함
            /*
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2, // 여러 페이지에서 공유되는 모듈
              priority: 20,
            },
            lib: {
              test(module) {
                return (
                  module.size() > 80000 && // 80KB 이상인 큰 라이브러리
                  /node_modules[/\\]/.test(module.layer || module.identifier?.() || '')
                );
              },
              name(module, chunks, cacheGroupKey) {
                const moduleFileName = module
                  .identifier()
                  .split('/')
                  .reduceRight((item) => item);
                const allChunksNames = chunks.map((item) => item.name).join('~');
                const hash = crypto.createHash('sha1')
                  .update(allChunksNames)
                  .digest('hex')
                  .substring(0, 8);
                return `${cacheGroupKey}-${hash}-${moduleFileName.replace(/[@.]/g, '')}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            */
          },
        },
      };
    }
    
    return config;
  },
  
  // 페이지 로딩 최적화 설정
  experimental: {
    scrollRestoration: true,
    optimizeCss: true,
  },
  
  // API 경로 재작성 설정
  async rewrites() {
    return [
      // 정적 파일 요청을 백엔드 서버로 리다이렉션
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
      },
      // aitopia.ai 프록시는 유지 (필요하다면 .env로 URL 관리)
      {
        source: '/api/extensions/:path*',
        destination: `${AITOPIA_URL}/:path*`,
      },
    ];
  },
  
  // 브라우저 로그에서 오류 표시 방지 
  onDemandEntries: {
    // 개발 서버가 페이지를 메모리에 유지하는 시간(ms)
    maxInactiveAge: 60 * 60 * 1000,
    // 동시에 유지할 페이지 수
    pagesBufferLength: 5,
  },
  
  // Content Security Policy 설정
  async headers() {
    return [
      {
        // 모든 경로에 적용
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' http: https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:", // 'unsafe-eval'은 개발 중에만, 프로덕션에서는 제거 고려
              "style-src 'self' 'unsafe-inline' http: https:",
              // BACKEND_URL의 origin과 localhost, 127.0.0.1의 이미지 허용
              `img-src 'self' data: blob: http: https: ${new URL(BACKEND_URL).origin} http://localhost:${backendPort} http://127.0.0.1:${backendPort}`,
              "font-src 'self' http: https:",
              // BACKEND_URL의 origin, OPENAI_API_URL, AITOPIA_URL 및 localhost 백엔드(127.0.0.1 포함) 연결 허용
              `connect-src 'self' ${new URL(BACKEND_URL).origin} ${OPENAI_API_URL} ${AITOPIA_URL} http://127.0.0.1:${backendPort} http://localhost:${backendPort} ws: wss:`,
              "frame-src 'self' http: https:",
              "media-src 'self' http: https:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'"
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 