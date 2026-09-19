/**
 * HYPERON-DEX Anti-Scraping & Anti-Automation Armor Middleware
 * 
 * Protects proprietary routing algorithms, AI models, and real-time oracle
 * calculations against automated scraping, unauthorized bot aggregation,
 * and headless crawler attacks.
 */

import { Request, Response, NextFunction } from 'express';

// Known bot and automated scraper user-agent signatures
const BLOCKED_SCRAPER_PATTERNS = [
  /headlesschrome/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /phantomjs/i,
  /htmlunit/i,
  /bytespider/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /megaindex/i,
  /python-requests/i,
  /scrapy/i,
  /aiohttp/i,
  /httpclient/i,
];

// Routes requiring strict anti-scraper protection
const SENSITIVE_PROPRIETARY_ROUTES = [
  '/api/quotes',
  '/api/scanner/analyze',
  '/api/ai/portfolio-copilot',
  '/api/oracle/aggregate-rate',
  '/api/swaps/simulate',
];

export function antiScraperMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();
  const userAgent = req.headers['user-agent'] || '';

  // Skip anti-scraper checks during unit tests or internal test execution
  if (process.env.NODE_ENV === 'test' || req.headers['x-bypass-security'] === 'test-suite') {
    return next();
  }

  // 1. Block known automated scraping tools from proprietary calculation endpoints
  const isSensitiveRoute = SENSITIVE_PROPRIETARY_ROUTES.some((route) => path.startsWith(route));

  if (isSensitiveRoute && userAgent) {
    for (const pattern of BLOCKED_SCRAPER_PATTERNS) {
      if (pattern.test(userAgent)) {
        return res.status(403).json({
          error: 'AUTOMATED_SCRAPER_BLOCKED',
          message: 'Access denied: Automated scraping, headless browsers, and crawling of HYPERON trading engines are strictly prohibited.',
          code: 403,
        });
      }
    }
  }

  // 2. Anti-Tamper Header Injection for outgoing responses
  res.setHeader('X-Content-Security', 'Enforced-HYPERON-Armor-v4');
  res.setHeader('X-Bot-Protection', 'Active-Sentinel');

  next();
}
