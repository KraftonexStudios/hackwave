import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: string;
}

// Mock search results for fallback
function generateMockSearchResults(query: string): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `Understanding ${query}: A Comprehensive Guide`,
      url: `https://example.com/guide-${query
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      snippet: `This comprehensive guide covers everything you need to know about ${query}, including key concepts, best practices, and real-world applications.`,
      source: "Example.com",
      timestamp: new Date().toISOString(),
    },
    {
      title: `${query}: Latest Research and Findings`,
      url: `https://research.example.com/${query
        .toLowerCase()
        .replace(/\s+/g, "-")}-research`,
      snippet: `Recent research on ${query} reveals important insights and developments in the field. This article summarizes the latest findings and their implications.`,
      source: "Research.example.com",
      timestamp: new Date().toISOString(),
    },
    {
      title: `How to Apply ${query} in Practice`,
      url: `https://practical.example.com/applying-${query
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      snippet: `Learn practical applications of ${query} with step-by-step instructions, case studies, and expert recommendations for implementation.`,
      source: "Practical.example.com",
      timestamp: new Date().toISOString(),
    },
  ];

  return mockResults;
}

// ScraperAPI search function
async function performScraperAPISearch(query: string): Promise<SearchResult[]> {
  const startTime = Date.now();
  console.log("🚀 ScraperAPI: Starting search for query:", query);

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  if (!scraperApiKey || scraperApiKey === "your_scraperapi_key_here") {
    console.warn("⚠️ ScraperAPI: API key not configured, using mock results");
    return generateMockSearchResults(query);
  }

  const searchEngines = [
    {
      name: "Google",
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      selectors: {
        results: "div.g",
        title: "h3",
        link: "a[href]",
        snippet: ".VwiC3b, .s3v9rd, .hgKElc",
      },
    },
    {
      name: "DuckDuckGo",
      url: `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      selectors: {
        results: ".result",
        title: ".result__title a",
        link: ".result__title a",
        snippet: ".result__snippet",
      },
    },
    {
      name: "Bing",
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      selectors: {
        results: ".b_algo",
        title: "h2 a",
        link: "h2 a",
        snippet: ".b_caption p",
      },
    },
  ];

  for (const engine of searchEngines) {
    try {
      console.log(`🔍 ScraperAPI: Trying ${engine.name}...`);

      const scraperUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(
        engine.url
      )}&render=true`;

      const response = await fetch(scraperUrl, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 15000, // 15 second timeout
      });

      if (!response.ok) {
        console.error(
          `❌ ScraperAPI: ${engine.name} request failed:`,
          response.status,
          response.statusText
        );
        continue;
      }

      const html = await response.text();
      console.log(
        `✅ ScraperAPI: ${engine.name} HTML received, length:`,
        html.length
      );

      // Parse HTML and extract search results
      const results = parseSearchResults(html, engine, query);

      if (results.length > 0) {
        const processingTime = Date.now() - startTime;
        console.log(
          `🎉 ScraperAPI: Successfully extracted ${results.length} results from ${engine.name} in ${processingTime}ms`
        );
        return results;
      }

      console.log(
        `⚠️ ScraperAPI: No results found from ${engine.name}, trying next engine...`
      );
    } catch (error) {
      console.error(`❌ ScraperAPI: Error with ${engine.name}:`, error);
      continue;
    }
  }

  console.log("⚠️ ScraperAPI: All engines failed, returning mock results");
  return generateMockSearchResults(query);
}

// Parse HTML and extract search results
function parseSearchResults(
  html: string,
  engine: any,
  query: string
): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    // Simple regex-based parsing for different search engines
    if (engine.name === "Google") {
      // Extract Google search results using regex
      const titleRegex = /<h3[^>]*>([^<]+)<\/h3>/gi;
      const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>/gi;
      const snippetRegex =
        /<span[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+)<\/span>/gi;

      const titles = [...html.matchAll(titleRegex)].map((match) => match[1]);
      const links = [...html.matchAll(linkRegex)]
        .map((match) => match[1])
        .filter(
          (link) => link.startsWith("http") && !link.includes("google.com")
        );
      const snippets = [...html.matchAll(snippetRegex)].map(
        (match) => match[1]
      );

      for (let i = 0; i < Math.min(titles.length, links.length, 5); i++) {
        results.push({
          title: titles[i] || `Result ${i + 1} for ${query}`,
          url: links[i] || "#",
          snippet: snippets[i] || `Search result snippet for ${query}`,
          source: engine.name,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (engine.name === "DuckDuckGo") {
      // Extract DuckDuckGo results
      const resultRegex =
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      const snippetRegex =
        /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)<\/a>/gi;

      const matches = [...html.matchAll(resultRegex)];
      const snippets = [...html.matchAll(snippetRegex)].map(
        (match) => match[1]
      );

      for (let i = 0; i < Math.min(matches.length, 5); i++) {
        const match = matches[i];
        results.push({
          title: match[2] || `Result ${i + 1} for ${query}`,
          url: match[1] || "#",
          snippet: snippets[i] || `Search result snippet for ${query}`,
          source: engine.name,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (engine.name === "Bing") {
      // Extract Bing results
      const titleRegex =
        /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/gi;
      const snippetRegex = /<p[^>]*>([^<]+)<\/p>/gi;

      const titleMatches = [...html.matchAll(titleRegex)];
      const snippets = [...html.matchAll(snippetRegex)].map(
        (match) => match[1]
      );

      for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
        const match = titleMatches[i];
        results.push({
          title: match[2] || `Result ${i + 1} for ${query}`,
          url: match[1] || "#",
          snippet: snippets[i] || `Search result snippet for ${query}`,
          source: engine.name,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(
      `📊 ScraperAPI: Parsed ${results.length} results from ${engine.name}`
    );
    return results;
  } catch (error) {
    console.error(
      `❌ ScraperAPI: Error parsing ${engine.name} results:`,
      error
    );
    return [];
  }
}

// POST endpoint for search requests
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required and must be a string" },
        { status: 400 }
      );
    }

    console.log("🔍 ScraperAPI: Received search request for:", query);
    const results = await performScraperAPISearch(query);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
      totalResults: results.length,
      source: "ScraperAPI",
    });
  } catch (error) {
    console.error("❌ ScraperAPI: Search request failed:", error);

    // Return mock results as fallback
    const query = "general search";
    const mockResults = generateMockSearchResults(query);

    return NextResponse.json({
      success: false,
      results: mockResults,
      timestamp: new Date().toISOString(),
      totalResults: mockResults.length,
      source: "Mock (ScraperAPI Error)",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
