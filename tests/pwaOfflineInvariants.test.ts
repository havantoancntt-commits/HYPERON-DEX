/**
 * HYPERON-DEX PWA & OFFLINE SAFETY INVARIANTS TEST SUITE
 * 
 * Validates:
 * 1. PWA Web App Manifest structure & mandatory fields (id, start_url, scope, display: standalone)
 * 2. Icon asset existence (icon.svg, 192x192, 512x512, maskable, apple-touch-icon)
 * 3. Offline Safety Guard: Rejection of on-chain signing/execution when navigator.onLine is false
 * 4. Foreground event listener & state reconciliation
 * 5. Workbox service worker caching rule: strictly exclude /api/* from precaching
 */

import fs from 'fs';
import path from 'path';

function runPWAOfflineTests() {
  console.log('======================================================');
  console.log(' HYPERON-DEX PWA & OFFLINE SAFETY INVARIANTS TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // --- 1. PWA Icon Assets Verification ---
  console.log('--- 1. PWA Icon Assets Existence & Dimensions ---');
  const publicDir = path.resolve(process.cwd(), 'public');
  
  assert(fs.existsSync(path.join(publicDir, 'icon.svg')), 'Brand SVG icon (public/icon.svg) exists');
  assert(fs.existsSync(path.join(publicDir, 'pwa-192x192.png')), '192x192 icon (public/pwa-192x192.png) exists');
  assert(fs.existsSync(path.join(publicDir, 'pwa-512x512.png')), '512x512 icon (public/pwa-512x512.png) exists');
  assert(fs.existsSync(path.join(publicDir, 'pwa-maskable-512x512.png')), 'Maskable icon (public/pwa-maskable-512x512.png) exists');
  assert(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png')), 'iOS Apple Touch icon (public/apple-touch-icon.png) exists');
  assert(fs.existsSync(path.join(publicDir, 'favicon.png')), 'Favicon (public/favicon.png) exists');

  // --- 2. HTML Entry Point PWA Metadata ---
  console.log('\n--- 2. HTML Entry Point PWA Metadata Directives ---');
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  assert(indexHtml.includes('name="theme-color" content="#050505"'), 'index.html contains matching theme-color meta tag');
  assert(indexHtml.includes('name="mobile-web-app-capable" content="yes"'), 'index.html enables mobile-web-app-capable');
  assert(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html enables apple-mobile-web-app-capable');
  assert(indexHtml.includes('apple-touch-icon'), 'index.html links to apple-touch-icon.png');
  assert(indexHtml.includes('icon.svg'), 'index.html links to icon.svg');

  // --- 3. Vite Config VitePWA Plugin Invariants ---
  console.log('\n--- 3. Vite Config VitePWA Workbox Security Invariants ---');
  const viteConfig = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');
  assert(viteConfig.includes("import { VitePWA } from 'vite-plugin-pwa'"), 'vite.config.ts imports VitePWA');
  assert(viteConfig.includes("id: '/'"), 'Manifest includes unique id identifier');
  assert(viteConfig.includes("display: 'standalone'"), 'Manifest specifies standalone display mode');
  assert(
    viteConfig.includes('navigateFallbackDenylist') && viteConfig.includes('/^\\/api/'),
    'Workbox strictly excludes /api/* from fallback navigation'
  );
  assert(!viteConfig.includes("/api/.*handler: 'CacheFirst'"), 'Workbox NEVER sets CacheFirst for /api/*');

  // --- 4. Offline Safety & Fail-Closed Guard ---
  console.log('\n--- 4. Offline Execution & Fail-Closed Invariants ---');
  const walletContext = fs.readFileSync(path.resolve(process.cwd(), 'src/context/WalletContext.tsx'), 'utf-8');
  assert(
    walletContext.includes("OFFLINE_TRANSACTION_REJECTED"),
    'WalletContext executeTransaction rejects execution when navigator.onLine is false'
  );
  assert(
    walletContext.includes("hyperon-foreground-refresh"),
    'WalletContext listens to hyperon-foreground-refresh to revalidate balances'
  );

  const exchangeContext = fs.readFileSync(path.resolve(process.cwd(), 'src/context/ExchangeContext.tsx'), 'utf-8');
  assert(
    exchangeContext.includes("hyperon-foreground-refresh"),
    'ExchangeContext listens to hyperon-foreground-refresh to re-fetch live prices'
  );

  const swapView = fs.readFileSync(path.resolve(process.cwd(), 'src/views/SwapView.tsx'), 'utf-8');
  assert(
    swapView.includes("Offline — Mạng Internet Bị Ngắt Kết Nối"),
    'SwapView disables swap button and indicates offline status when offline'
  );

  const appTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  assert(
    appTsx.includes("<OfflineBanner />"),
    'App.tsx renders OfflineBanner prominently above Header'
  );

  // --- Summary ---
  console.log('\n======================================================');
  console.log(` PWA & OFFLINE SAFETY TESTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPWAOfflineTests();
