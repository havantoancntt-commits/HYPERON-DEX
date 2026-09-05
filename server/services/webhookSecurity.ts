/**
 * HYPERON-DEX Enterprise Webhook Security & SSRF Protection Engine
 * Remediates CVE-2026-63730 (Server-Side Request Forgery).
 *
 * Strict Security Principles:
 * 1. Whitelist-Only Domain Validation (No blacklists).
 * 2. Strict HTTPS Scheme Enforcement.
 * 3. Comprehensive Private / Internal / Cloud Metadata IP Rejection.
 * 4. Sensitive Port Filtering (Only 443 permitted).
 * 5. Static Path Constraint (Query strings & fragments forbidden).
 * 6. Structured Security Audit Logging.
 */

import crypto from 'crypto';

export interface WebhookAuditLog {
  id: string;
  timestamp: number;
  targetUrl: string;
  sourceIp: string;
  decision: 'ALLOWED' | 'BLOCKED_UNAUTHORIZED_HOST' | 'BLOCKED_PRIVATE_IP' | 'BLOCKED_PORT' | 'BLOCKED_SCHEME' | 'BLOCKED_QUERY_PARAM';
  reason: string;
  latencyMs?: number;
  httpStatus?: number;
}

// Immutable default trusted external webhook hostnames
export const DEFAULT_ALLOWED_HOSTS: readonly string[] = [
  'api.hyperon.io',
  'webhook.trusted.com',
  'hooks.slack.com',
  'discord.com',
  'api.telegram.org',
  'api.pagerduty.com',
] as const;

// In-memory structured security audit log ring buffer (last 500 events)
const auditLogs: WebhookAuditLog[] = [];
const MAX_AUDIT_LOGS = 500;

export function recordAuditLog(log: WebhookAuditLog): void {
  auditLogs.unshift(log);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }
}

export function getWebhookAuditLogs(): WebhookAuditLog[] {
  return [...auditLogs];
}

/**
 * Checks if a hostname or IP matches RFC 1918, RFC 3927 (link-local), loopback, or cloud metadata IP ranges.
 */
export function isPrivateOrInternalIp(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();

  // Localhost aliases & cloud metadata hostnames
  if (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '0.0.0.0' ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal') ||
    clean.endsWith('.localhost') ||
    clean.includes('metadata.google.internal') ||
    clean.includes('instance-data') ||
    clean.includes('169.254.169.254')
  ) {
    return true;
  }

  // IPv4 dotted-quad check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = clean.match(ipv4Regex);
  if (match) {
    const o1 = parseInt(match[1], 10);
    const o2 = parseInt(match[2], 10);
    const o3 = parseInt(match[3], 10);
    const o4 = parseInt(match[4], 10);

    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    // Loopback: 127.0.0.0/8
    if (o1 === 127) return true;

    // Zero-conf / Current network: 0.0.0.0/8
    if (o1 === 0) return true;

    // Private Class A: 10.0.0.0/8
    if (o1 === 10) return true;

    // Private Class B: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

    // Private Class C: 192.168.0.0/16
    if (o1 === 192 && o2 === 168) return true;

    // Link-local / Cloud Metadata (AWS, GCP, Azure): 169.254.0.0/16 (e.g. 169.254.169.254)
    if (o1 === 169 && o2 === 254) return true;

    // Carrier-grade NAT: 100.64.0.0/10
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;

    // Benchmark testing: 198.18.0.0/15
    if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;

    // Multicast & Reserved: 224.0.0.0/4 and 240.0.0.0/4
    if (o1 >= 224) return true;

    // Broadcast: 255.255.255.255
    if (o1 === 255) return true;
  }

  // IPv6 prefix checks
  if (
    clean.startsWith('fc') ||
    clean.startsWith('fd') ||
    clean.startsWith('fe80') ||
    clean.startsWith('::ffff:') ||
    clean.startsWith('2001:db8') ||
    clean === '::'
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against enterprise SSRF rules.
 */
export function validateWebhookUrl(
  rawUrl: string,
  sourceIp: string = '127.0.0.1'
): { isValid: boolean; reason: string; sanitizedUrl?: string; decision: WebhookAuditLog['decision'] } {
  const logId = crypto.randomUUID();

  if (!rawUrl || typeof rawUrl !== 'string') {
    const res = { isValid: false, reason: 'URL must be a non-empty string', decision: 'BLOCKED_SCHEME' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl || '', sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    const res = { isValid: false, reason: 'Invalid URI formatting', decision: 'BLOCKED_SCHEME' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // 1. Strict HTTPS Scheme
  if (parsed.protocol !== 'https:') {
    const res = { isValid: false, reason: `Forbidden protocol '${parsed.protocol}'. Only 'https:' is permitted.`, decision: 'BLOCKED_SCHEME' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // 2. Sensitive Port Restriction: Only port 443 (default) is permitted
  const port = parsed.port ? parseInt(parsed.port, 10) : 443;
  if (port !== 443) {
    const res = { isValid: false, reason: `Port ${port} is restricted. Only standard HTTPS port 443 is permitted.`, decision: 'BLOCKED_PORT' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // 3. Static Path & Query String Constraints
  // Disallow user-controlled query strings and fragments in webhook destinations to prevent parameter pollution
  if (parsed.search && parsed.search.length > 0) {
    const res = { isValid: false, reason: 'Webhook URLs must be static endpoints. Query parameters are prohibited.', decision: 'BLOCKED_QUERY_PARAM' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  if (parsed.hash && parsed.hash.length > 0) {
    const res = { isValid: false, reason: 'URL fragments are prohibited.', decision: 'BLOCKED_QUERY_PARAM' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // Path character sanitization: must only contain alphanumeric, hyphens, underscores, slashes
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(parsed.pathname)) {
    const res = { isValid: false, reason: 'Path contains prohibited characters or directory traversal sequences.', decision: 'BLOCKED_QUERY_PARAM' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // 4. Private / Internal IP Detection
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateOrInternalIp(hostname)) {
    const res = { isValid: false, reason: `Internal/Private network destination '${hostname}' is strictly blocked (RFC 1918 / Cloud Metadata protection).`, decision: 'BLOCKED_PRIVATE_IP' as const };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // 5. Whitelist Domain Enforcement
  const envHosts = (process.env.ALLOWED_WEBHOOK_DOMAINS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const allowedHosts = new Set([...DEFAULT_ALLOWED_HOSTS, ...envHosts]);

  if (!allowedHosts.has(hostname)) {
    const res = {
      isValid: false,
      reason: `Host '${hostname}' is not present in the institutional webhook whitelist. Registered domains: ${Array.from(allowedHosts).join(', ')}`,
      decision: 'BLOCKED_UNAUTHORIZED_HOST' as const,
    };
    recordAuditLog({ id: logId, timestamp: Date.now(), targetUrl: rawUrl, sourceIp, decision: res.decision, reason: res.reason });
    return res;
  }

  // Allowed
  const sanitizedUrl = `https://${hostname}${parsed.pathname}`;
  recordAuditLog({
    id: logId,
    timestamp: Date.now(),
    targetUrl: sanitizedUrl,
    sourceIp,
    decision: 'ALLOWED',
    reason: 'Verified against HTTPS whitelist and internal IP filters.',
  });

  return { isValid: true, reason: 'Valid whitelisted webhook destination', sanitizedUrl, decision: 'ALLOWED' };
}

/**
 * Dispatches an event payload to a validated webhook destination with HMAC signature.
 */
export async function dispatchSecureWebhook(
  targetUrl: string,
  event: string,
  payload: Record<string, unknown>,
  secret: string = process.env.WEBHOOK_SECRET || 'hyperon-default-secret'
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const validation = validateWebhookUrl(targetUrl);
  if (!validation.isValid || !validation.sanitizedUrl) {
    return { success: false, error: validation.reason };
  }

  const bodyString = JSON.stringify({
    event,
    timestamp: Date.now(),
    data: payload,
  });

  const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(validation.sanitizedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HYPERON-DEX-SecurityEngine/4.1.0',
        'X-Hyperon-Signature': signature,
        'X-Hyperon-Event': event,
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `Destination returned HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    return { success: false, error: message };
  }
}
