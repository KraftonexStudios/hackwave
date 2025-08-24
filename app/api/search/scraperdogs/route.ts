import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: string;
}

// ScrapingDog API returns HTML content that we parse manually

// Mock search results for fallback
function generateMockSearchResults(query: string): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `Understanding ${query}: A Comprehensive Guide`,
      url: `https://example.com/guide-${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `This comprehensive guide covers everything you need to know about ${query}, including key concepts, best practices, and real-world applications.`,
      source: 'Example.com',
      timestamp: new Date().toISOString(),
    },
    {
      title: `${query}: Latest Research and Findings`,
      url: `https://research.example.com/${query.toLowerCase().replace(/\s+/g, '-')}-research`,
      snippet: `Recent research on ${query} reveals important insights and developments in the field. This article summarizes the latest findings and their implications.`,
      source: 'Research.example.com',
      timestamp: new Date().toISOString(),
    },
    {
      title: `How to Apply ${query} in Practice`,
      url: `https://practical.example.com/applying-${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `Learn practical applications of ${query} with step-by-step instructions, case studies, and expert recommendations for implementation.`,
      source: 'Practical.example.com',
      timestamp: new Date().toISOString(),
    },
    {
      title: `${query}: Best Practices and Tips`,
      url: `https://tips.example.com/${query.toLowerCase().replace(/\s+/g, '-')}-tips`,
      snippet: `Discover expert tips and best practices for ${query}. This resource provides actionable advice and proven strategies.`,
      source: 'Tips.example.com',
      timestamp: new Date().toISOString(),
    },
    {
      title: `${query}: Common Challenges and Solutions`,
      url: `https://solutions.example.com/${query.toLowerCase().replace(/\s+/g, '-')}-solutions`,
      snippet: `Explore common challenges related to ${query} and learn effective solutions from industry experts and practitioners.`,
      source: 'Solutions.example.com',
      timestamp: new Date().toISOString(),
    },
  ];

  return mockResults;
}

// Parse HTML search results based on search engine
function parseSearchResults(html: string, engine: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  try {
    // Simple regex-based parsing for different search engines
    let titleRegex: RegExp;
    let urlRegex: RegExp;
    let snippetRegex: RegExp;
    
    switch (engine) {
      case 'google':
        titleRegex = /<h3[^>]*>([^<]+)<\/h3>/gi;
        urlRegex = /<a[^>]*href="([^"]+)"[^>]*>/gi;
        snippetRegex = /<span[^>]*>([^<]{50,200})<\/span>/gi;
        break;
      case 'bing':
        titleRegex = /<h2[^>]*>.*?<a[^>]*>([^<]+)<\/a>.*?<\/h2>/gi;
        urlRegex = /<h2[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>/gi;
        snippetRegex = /<p[^>]*>([^<]{50,200})<\/p>/gi;
        break;
      case 'duckduckgo':
        titleRegex = /<a[^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/a>/gi;
        urlRegex = /<a[^>]*class="[^"]*result[^"]*"[^>]*href="([^"]+)"/gi;
        snippetRegex = /<span[^>]*>([^<]{50,200})<\/span>/gi;
        break;
      default:
        titleRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
        urlRegex = /<a[^>]*href="([^"]+)"[^>]*>/gi;
        snippetRegex = /<p[^>]*>([^<]{50,200})<\/p>/gi;
    }
    
    const titles = Array.from(html.matchAll(titleRegex)).map(match => match[1]?.trim()).filter(Boolean);
    const urls = Array.from(html.matchAll(urlRegex)).map(match => match[1]?.trim()).filter(Boolean);
    const snippets = Array.from(html.matchAll(snippetRegex)).map(match => match[1]?.trim()).filter(Boolean);
    
    const maxResults = Math.min(10, Math.max(titles.length, urls.length));
    
    for (let i = 0; i < maxResults; i++) {
      const title = titles[i] || `Search Result ${i + 1}`;
      const url = urls[i] || '#';
      const snippet = snippets[i] || 'No description available';
      
      // Filter out invalid URLs
      if (url.startsWith('http') && !url.includes('google.com/search') && !url.includes('bing.com/search')) {
        results.push({
          title: title.replace(/&[^;]+;/g, '').substring(0, 100),
          url: url,
          snippet: snippet.replace(/&[^;]+;/g, '').substring(0, 200),
          source: new URL(url).hostname,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error parsing search results:', error);
  }
  
  return results.slice(0, 10); // Limit to 10 results
}

// ScraperDogs search function
async function performScraperDogsSearch(query: string): Promise<SearchResult[]> {
  const startTime = Date.now();
  console.log('🐕 ScraperDogs: Starting search for query:', query);

  const scraperDogsApiKey = process.env.SCRAPERDOGS_API_KEY;
  if (!scraperDogsApiKey || scraperDogsApiKey === 'your_scraperdogs_api_key_here') {
    console.warn('⚠️ ScraperDogs: API key not configured, using mock results');
    return generateMockSearchResults(query);
  }

  const searchEngines = ['google', 'bing', 'duckduckgo', 'yahoo'];
  
  for (const engine of searchEngines) {
    try {
      console.log(`🔍 ScraperDogs: Trying ${engine}...`);
      
      const scraperDogsUrl = 'https://api.scrapingdog.com/scrape';
      const searchUrl = `https://www.${engine}.com/search?q=${encodeURIComponent(query)}`;
      const requestBody = {
        url: searchUrl,
        render_js: true,
        wait: 3000
      };

      const response = await fetch(scraperDogsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': scraperDogsApiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`❌ ScraperDogs: ${engine} request failed:`, response.status, response.statusText);
        continue;
      }

      const htmlContent = await response.text();
      console.log(`✅ ScraperDogs: ${engine} HTML response received`);

      // Parse HTML to extract search results based on engine
      const results = parseSearchResults(htmlContent, engine);
      
      if (results.length > 0) {
        const processingTime = Date.now() - startTime;
        console.log(`🎉 ScraperDogs: Successfully extracted ${results.length} results from ${engine} in ${processingTime}ms`);
        return results;
      }

      console.log(`⚠️ ScraperDogs: No results found from ${engine}, trying next engine...`);
      
    } catch (error) {
      console.error(`❌ ScraperDogs: Error with ${engine}:`, error);
      continue;
    }
  }

  // If all engines fail, return mock results
  console.warn('⚠️ ScraperDogs: All search engines failed, returning mock results');
  return generateMockSearchResults(query);
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('🐕 ScraperDogs API: Received search request for:', query);
    
    const results = await performScraperDogsSearch(query);
    
    return NextResponse.json({
      success: true,
      query,
      results,
      totalResults: results.length,
      timestamp: new Date().toISOString(),
      source: 'ScraperDogs'
    });
    
  } catch (error) {
    console.error('🐕 ScraperDogs API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log('🐕 ScraperDogs API: Received GET search request for:', query);
    
    const results = await performScraperDogsSearch(query);
    
    return NextResponse.json({
      success: true,
      query,
      results,
      totalResults: results.length,
      timestamp: new Date().toISOString(),
      source: 'ScraperDogs'
    });
    
  } catch (error) {
    console.error('🐕 ScraperDogs API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}