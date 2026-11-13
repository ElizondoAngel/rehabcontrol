import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === 'production'

// Content-Security-Policy: solo en producción (en desarrollo Next necesita 'unsafe-eval').
// Permite lo que usa la app: Supabase, MediaPipe (WASM desde jsDelivr y modelo de Google),
// Google Fonts, y blob:/data: para cámara, fotos y video.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const headersSeguridad = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Cámara solo para este sitio (necesaria para Terapia Interactiva); micrófono, GPS y otros bloqueados
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(esProduccion ? [{ key: 'Content-Security-Policy', value: csp }] : []),
]

const nextConfig: NextConfig = {
  // No revelar la tecnología del servidor
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: headersSeguridad },
      // Áreas con datos privados: nunca guardar en caché del navegador/proxy
      ...['/admin', '/secretaria', '/terapeuta', '/paciente', '/api'].map(base => ({
        source: `${base}/:path*`,
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      })),
    ]
  },
};

export default nextConfig;
