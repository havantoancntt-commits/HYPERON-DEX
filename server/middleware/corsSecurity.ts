/**
 * HYPERON-DEX Enterprise CORS Security Middleware (P0 Hardening)
 * 
 * Enforces strict origin allowlists, route categorization, Vary: Origin header,
 * credentials policy, preflight handling, and prevention of arbitrary origin reflection.
 */

import { Request, Response, NextFunction } from 'express';

export enum RouteCategory {
  PUBLIC_READ = 'PUBLIC_READ',
  AUTHENTICATED = 'AUTHENTICATED',
  PRIVILEGED = 'PRIVILEGED',
  RELAY_TRANSACTION = 'RELAY_TRANSACTION',
}

// Configured development origins
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

let testAllowedOrigins: string[] | null = null;

export function setCustomAllowedOriginsForTest(origins: string[] | null): void {
  testAllowedOrigins = origins;
}

export function getConfiguredOrigins(): string[] {
  if (testAllowedOrigins !== null) {
    return testAllowedOrigins;
  }
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return [...DEFAULT_DEV_ORIGINS, ...envOrigins];
}

/**
 * Validates whether an incoming origin header matches the trusted allowlist.
 * Never reflects arbitrary origins.
 */
export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return false;
  
  const allowlist = getConfiguredOrigins();
  if (allowlist.includes(origin)) {
    return true;
  }

  // Allow canonical Google Cloud Run AI Studio preview/dev subdomains:
  // e.g. https://ais-dev-*.asia-east1.run.app or https://ais-pre-*.asia-east1.run.app
  const aiStudioPattern = /^https:\/\/ais-(dev|pre)-[a-z0-9]+-[0-9]+\.[a-z0-9-]+\.run\.app$/;
  if (aiStudioPattern.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Classifies an incoming API route for granular CORS policy enforcement.
 */
export function classifyRoute(path: string, method: string): RouteCategory {
  const normalizedPath = path.toLowerCase();

  // Privileged administration & security override endpoints
  if (
    normalizedPath.startsWith('/api/admin') ||
    normalizedPath.startsWith('/api/v1/oracle/circuit-breaker/reset') ||
    normalizedPath.startsWith('/api/v1/webhooks/dispatch')
  ) {
    return RouteCategory.PRIVILEGED;
  }

  // Relay and on-chain transaction submission endpoints
  if (
    normalizedPath === '/api/relay' ||
    normalizedPath === '/api/relay-zk-proof' ||
    normalizedPath === '/api/submit' ||
    normalizedPath === '/api/swaps/simulate' ||
    normalizedPath === '/api/simulate-swap'
  ) {
    return RouteCategory.RELAY_TRANSACTION;
  }

  // Wallet-authenticated state mutations (lottery actions, claims, etc.)
  if (
    normalizedPath.startsWith('/api/lottery/buy') ||
    normalizedPath.startsWith('/api/lottery/claim') ||
    normalizedPath.startsWith('/api/lottery/deposit-savings') ||
    normalizedPath.startsWith('/api/lottery/syndicate/join') ||
    normalizedPath.startsWith('/api/lottery/syndicate/claim')
  ) {
    return RouteCategory.AUTHENTICATED;
  }

  // Public telemetry, pricing, oracle consensus and market reads
  return RouteCategory.PUBLIC_READ;
}

/**
 * Enterprise Tiered CORS Middleware.
 * Rejects unauthorized origins, prevents wildcard leaks on authenticated endpoints,
 * and sets strict headers.
 */
export function corsSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;
  const category = classifyRoute(req.path, req.method);

  // Always set Vary: Origin to prevent cache poisoning across origins
  res.setHeader('Vary', 'Origin');

  // Case 1: Missing Origin (Same-origin direct browser requests, CLI tools, server-to-server)
  if (!origin) {
    if (req.method === 'OPTIONS') {
      return res.status(400).json({
        error: 'CORS_INVALID_PREFLIGHT',
        message: 'Preflight OPTIONS request missing Origin header.',
      });
    }
    // Allow same-origin execution without CORS headers
    return next();
  }

  // Case 2: Origin is present -> Verify against strict allowlist
  const allowed = isOriginAllowed(origin);

  if (!allowed) {
    // Untrusted Origin: strictly reject preflights and mutations
    if (req.method === 'OPTIONS' || category !== RouteCategory.PUBLIC_READ) {
      return res.status(403).json({
        error: 'CORS_ORIGIN_NOT_ALLOWED',
        message: `Cross-Origin request from origin '${origin}' is blocked by HYPERON security policy.`,
        category,
      });
    }
    // For PUBLIC_READ with unknown origin, do not set Access-Control-Allow-Origin header
    return res.status(403).json({
      error: 'CORS_ORIGIN_NOT_ALLOWED',
      message: `Origin '${origin}' not authorized for API access.`,
      category,
    });
  }

  // Case 3: Trusted Allowed Origin -> Set strict explicit headers (never wildcard *)
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Wallet-Address, X-Auth-Message, X-Auth-Nonce, X-Correlation-ID'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Set credentials only for authenticated and privileged routes
  if (category === RouteCategory.AUTHENTICATED || category === RouteCategory.PRIVILEGED) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Respond immediately to OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
