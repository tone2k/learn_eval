# Web Scraper Improvement Plan

## Current Implementation Analysis

### Location
`/src/server/tools/crawler.ts`

### Current Features
- **HTML Parsing**: Uses Cheerio for server-side HTML parsing
- **Content Extraction**: Basic article selectors (article, main, .content)
- **Markdown Conversion**: Turndown service for HTML to Markdown
- **Robots.txt Compliance**: Checks robots.txt before crawling
- **Retry Logic**: Exponential backoff with configurable max retries
- **Caching**: Redis cache with 6-hour TTL
- **Bulk Operations**: Support for crawling multiple URLs

### Current Limitations
1. **No JavaScript Rendering**: Cannot handle SPAs or dynamically loaded content
2. **Limited Content Extraction**: May miss content in non-standard layouts
3. **No CAPTCHA Handling**: Will fail on protected pages
4. **Performance**: Sequential processing in bulk operations
5. **No Advanced Features**: No metadata extraction, structured data, or media handling

## Improvement Options

### Option 1: Playwright Integration (Self-Hosted)

#### Pros
- Full JavaScript rendering capability
- Can handle SPAs and dynamic content
- Screenshot capabilities
- Network interception for advanced use cases
- Full control over implementation

#### Cons
- Resource intensive (runs full browser)
- Slower than current implementation
- More complex deployment (requires browser binaries)
- Still doesn't solve CAPTCHA issues
- Higher server costs

#### Implementation Approach
```typescript
// Example implementation structure
interface PlaywrightCrawler {
  crawl(url: string): Promise<CrawlResponse>;
  crawlWithScreenshot(url: string): Promise<CrawlResponse & { screenshot: Buffer }>;
  crawlWithNetworkMonitoring(url: string): Promise<CrawlResponse & { requests: NetworkRequest[] }>;
}
```

### Option 2: Free Tier Services Integration

#### Jina AI (Recommended for Starting)
- **Free Tier**: 10M tokens (very generous)
- **Pricing**: $0.02 per 1M tokens after free tier
- **Integration**: Dead simple - just prepend `https://r.jina.ai/` to any URL
- **Features**: 
  - Automatic main content extraction
  - JavaScript rendering
  - Clean markdown output
  - Built-in caching

#### Implementation Example
```typescript
const crawlWithJina = async (url: string): Promise<CrawlResponse> => {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl);
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`);
    }
    
    const content = await response.text();
    return { success: true, data: content };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
```

#### Firecrawl
- **Free Tier**: 500 credits/month
- **Pricing**: $16/month for 3,000 credits
- **Best For**: Full website crawling, not just single pages
- **Features**: Site maps, automatic crawling, TypeScript SDK

#### Tavily
- **Free Tier**: 1,000 requests/month
- **Pricing**: $30/month for 11,000 requests
- **Best For**: Real-time web search for AI agents
- **Features**: Optimized for LLM consumption, search API

## Recommended Implementation Plan

### Phase 1: Hybrid Approach (Quick Win)
1. **Keep current Cheerio implementation** as the default fast path
2. **Add Jina AI integration** as a fallback for:
   - Pages that return empty content
   - URLs known to have JavaScript content
   - User-specified enhanced crawling

### Phase 2: Smart Router
```typescript
interface CrawlerRouter {
  // Determine best crawler based on URL patterns
  selectCrawler(url: string): 'cheerio' | 'jina' | 'playwright';
  
  // Track success rates for different domains
  recordSuccess(url: string, crawler: string): void;
  
  // Automatic fallback chain
  crawlWithFallback(url: string): Promise<CrawlResponse>;
}
```

### Phase 3: Enhanced Features
1. **Metadata Extraction**
   - OpenGraph tags
   - JSON-LD structured data
   - Author, date, title extraction

2. **Content Quality Scoring**
   - Measure content density
   - Detect and filter boilerplate
   - Identify main article vs. comments

3. **Performance Optimization**
   - Concurrent crawling with rate limiting
   - Smart caching strategies
   - Domain-specific optimizations

## Migration Strategy

### Step 1: Add Service Integration (1-2 days)
```typescript
// Add to crawler.ts
export interface CrawlerService {
  crawl(url: string, options?: CrawlOptions): Promise<CrawlResponse>;
}

export class JinaCrawler implements CrawlerService {
  // Implementation
}

export class PlaywrightCrawler implements CrawlerService {
  // Implementation
}
```

### Step 2: Implement Fallback Logic (1 day)
```typescript
export const crawlWithFallback = async (
  url: string,
  options?: CrawlOptions
): Promise<CrawlResponse> => {
  // Try Cheerio first
  const cheerioResult = await crawlWithCheerio(url, options);
  
  // If content is too short or empty, try Jina
  if (!cheerioResult.success || cheerioResult.data.length < 100) {
    return await crawlWithJina(url, options);
  }
  
  return cheerioResult;
};
```

### Step 3: Add Configuration (1 day)
```typescript
// config/crawler.ts
export const CRAWLER_CONFIG = {
  defaultService: 'cheerio',
  fallbackService: 'jina',
  jinaApiKey: process.env.JINA_API_KEY, // Optional for premium features
  playwrightEnabled: process.env.ENABLE_PLAYWRIGHT === 'true',
  
  // Domain-specific configurations
  domainOverrides: {
    'reddit.com': 'jina',
    'twitter.com': 'playwright',
    'github.com': 'cheerio',
  }
};
```

## Cost Analysis

### Current Implementation
- **Infrastructure**: Minimal (just Node.js server)
- **Performance**: Fast (50-200ms per page)
- **Success Rate**: ~70% (estimated based on static content prevalence)

### With Jina AI
- **Infrastructure**: Same as current
- **API Costs**: Free for first 10M tokens, then $0.02/1M tokens
- **Performance**: 200-500ms per page (includes API latency)
- **Success Rate**: ~95% (handles JavaScript, better extraction)

### With Playwright
- **Infrastructure**: +2-4GB RAM, +1-2 CPU cores
- **Performance**: 2-5s per page
- **Success Rate**: ~90% (no CAPTCHA handling)

## Recommendation

**Start with Jina AI integration** for these reasons:

1. **Immediate Value**: Can be implemented in hours, not days
2. **Cost Effective**: Generous free tier perfect for hobby projects
3. **Low Risk**: No infrastructure changes required
4. **High Success Rate**: Better than both current and Playwright options
5. **Future Flexibility**: Easy to add Playwright later if needed

## Next Steps

1. Create Jina AI integration branch
2. Implement `JinaCrawler` class
3. Add fallback logic to existing crawler
4. Test with problematic URLs (Reddit, Twitter, etc.)
5. Monitor usage and success rates
6. Consider Playwright only if specific features are needed

## Code Examples

### Simple Jina Integration
```typescript
// src/server/tools/crawlers/jina.ts
export class JinaCrawler {
  async crawl(url: string): Promise<CrawlResponse> {
    const jinaUrl = `https://r.jina.ai/${url}`;
    
    try {
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/markdown',
          // Optional: Add API key for premium features
          // 'Authorization': `Bearer ${process.env.JINA_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      return {
        success: true,
        data: content
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

### Enhanced Crawler with Fallback
```typescript
// src/server/tools/crawler-enhanced.ts
import { crawlWebsite as crawlWithCheerio } from './crawler';
import { JinaCrawler } from './crawlers/jina';

const jinaCrawler = new JinaCrawler();

export const crawlWebsiteEnhanced = async (
  url: string,
  options?: CrawlOptions & { forceJina?: boolean }
): Promise<CrawlResponse> => {
  // Use Jina if explicitly requested
  if (options?.forceJina) {
    return await jinaCrawler.crawl(url);
  }
  
  // Try Cheerio first for speed
  const cheerioResult = await crawlWithCheerio({ url, ...options });
  
  // If successful and has reasonable content, return it
  if (cheerioResult.success && cheerioResult.data.length > 200) {
    return cheerioResult;
  }
  
  // Otherwise, fall back to Jina
  console.log(`Falling back to Jina for ${url}`);
  return await jinaCrawler.crawl(url);
};
```

This plan provides a clear path forward that balances simplicity, cost, and effectiveness for a hobby project while leaving room for future enhancements.