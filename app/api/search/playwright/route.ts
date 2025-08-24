import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// Reusable function for search engine logic
export async function performWebSearch(query: string) {
  let browser: any = null;

  try {
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required");
    }

    const startTime = Date.now();
    console.log("🚀 Starting web search for query:", query);

    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      extraHTTPHeaders: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const page = await context.newPage();

    // Navigate to Google search with improved error handling
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}&num=10`;
    console.log("🌐 Navigating to URL:", searchUrl);

    try {
      // Add some delay to appear more human-like
      await page.waitForTimeout(1000 + Math.random() * 2000);

      await page.goto(searchUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Add another small delay
      await page.waitForTimeout(2000 + Math.random() * 3000);

      // Wait for search results to load with multiple selectors and longer timeout
      let selectorFound = false;
      const selectors = [
        "div[data-ved] h3",
        "h3",
        ".g h3",
        ".tF2Cxc h3",
        "[data-header-feature] h3",
        "div[id='search'] h3",
        "#search h3",
        "[role='main'] h3",
      ];

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`✅ Found elements with selector: ${selector}`);
          selectorFound = true;
          break;
        } catch {
          console.log(`❌ Selector failed: ${selector}`);
          continue;
        }
      }

      if (!selectorFound) {
        throw new Error("No search result selectors found on the page");
      }

      console.log("✅ Page loaded successfully");
    } catch (navigationError) {
      console.error("❌ Navigation failed:", navigationError);
      throw new Error(
        `Failed to load search results: ${
          navigationError instanceof Error
            ? navigationError.message
            : "Unknown navigation error"
        }`
      );
    }

    // Extract search results with improved error handling using Playwright
    console.log("📊 Extracting search results from page...");
    const results: SearchResult[] = [];

    try {
      // Use Playwright's locator API for more reliable element selection with comprehensive selectors
      const searchResultElements = await page
        .locator(
          "div[data-ved] h3, .g h3, .tF2Cxc h3, [data-header-feature] h3, div[id='search'] h3, #search h3, [role='main'] h3, h3"
        )
        .all();
      console.log(
        "Found",
        searchResultElements.length,
        "result elements on page"
      );

      for (let i = 0; i < Math.min(searchResultElements.length, 10); i++) {
        try {
          const titleElement = searchResultElements[i];
          const title = await titleElement.textContent();

          if (!title) continue;

          // Find the parent link element
          const linkElement = await titleElement
            .locator("xpath=ancestor::a")
            .first();
          const url = await linkElement.getAttribute("href");

          if (!url || !url.startsWith("http")) continue;

          // Find snippet text - target the specific result container
          let snippet = "";
          try {
            // Get the immediate parent result container for this specific link
            const resultContainer = await linkElement
              .locator(
                "xpath=ancestor::div[contains(@class, 'g') or contains(@class, 'tF2Cxc')]"
              )
              .first();

            // Try to find snippet in the same result container
            const snippetSelectors = [
              ".VwiC3b", // Google snippet class
              "[data-sncf]", // Google snippet attribute
              "span:not(:has(a)):not(:has(h1)):not(:has(h2)):not(:has(h3))", // Spans without links or headers
            ];

            for (const selector of snippetSelectors) {
              try {
                const snippetElements = await resultContainer
                  .locator(selector)
                  .all();
                for (const element of snippetElements) {
                  const text = await element.textContent();
                  if (
                    text &&
                    text.length > 30 &&
                    text.length < 300 &&
                    !text.includes(title) &&
                    !text.includes(url) &&
                    !text.toLowerCase().includes("sign up") &&
                    !text.toLowerCase().includes("learn more") &&
                    !text.includes("...")
                  ) {
                    snippet = text.replace(/\s+/g, " ").trim();
                    break;
                  }
                }
                if (snippet) break;
              } catch {
                continue;
              }
            }

            // Fallback: extract from the result container text
            if (!snippet) {
              const allText = await resultContainer.textContent();
              if (allText) {
                // Split by common separators and find descriptive text
                const parts = allText
                  .split(/[\n\r]/)
                  .filter(
                    (part) =>
                      part.trim().length > 30 &&
                      part.trim().length < 300 &&
                      !part.includes(title) &&
                      !part.includes(url) &&
                      !part.toLowerCase().includes("sign up") &&
                      !part.toLowerCase().includes("learn more")
                  );

                snippet = parts[0]
                  ? parts[0].replace(/\s+/g, " ").trim()
                  : "No description available";
              }
            }
          } catch {
            snippet = "No description available";
          }

          try {
            const domain = new URL(url).hostname.replace("www.", "");
            const result = {
              title: title.trim(),
              url,
              snippet: snippet.substring(0, 200),
              source: domain,
            };

            console.log(`Result ${i + 1}:`, {
              title: title.substring(0, 50) + "...",
              source: domain,
              snippetLength: snippet.length,
            });

            results.push(result);
          } catch (e) {
            console.log(`Skipping result ${i + 1} due to invalid URL:`, url);
          }
        } catch (elementError) {
          console.log(`Error processing result ${i + 1}:`, elementError);
        }
      }
    } catch (evaluationError) {
      console.error("❌ Error during page evaluation:", evaluationError);
      throw new Error(
        `Failed to extract search results: ${
          evaluationError instanceof Error
            ? evaluationError.message
            : "Unknown evaluation error"
        }`
      );
    }

    console.log("📈 Raw results extracted:", results.length, "items");
    console.log(
      "📋 Raw results summary:",
      results.map((r, i) => ({
        index: i + 1,
        title: r.title.substring(0, 30) + "...",
        source: r.source,
        hasSnippet: !!r.snippet,
      }))
    );

    const processingTime = Date.now() - startTime;

    // Filter and clean results
    console.log("🧹 Filtering and cleaning results...");
    const cleanResults = results
      .filter((result) => result.title && result.url && result.source)
      .slice(0, 5); // Top 5 results

    console.log("✨ Final cleaned results:", cleanResults.length, "items");
    console.log(
      "📊 Final results data:",
      cleanResults.map((r, i) => ({
        index: i + 1,
        title: r.title,
        source: r.source,
        url: r.url.substring(0, 50) + "...",
        snippetLength: r.snippet.length,
      }))
    );
    console.log("⏱️ Total processing time:", processingTime, "ms");

    return {
      success: true,
      results: cleanResults,
      query,
      totalResults: cleanResults.length,
      processingTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Playwright search error for query:", query || "unknown");
    console.error("🔍 Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    throw error;
  } finally {
    // Always close browser to prevent memory leaks
    if (browser) {
      try {
        await browser.close();
        console.log("🔒 Browser closed successfully");
      } catch (closeError) {
        console.error("⚠️ Error closing browser:", closeError);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const query = requestBody.query;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const searchData = await performWebSearch(query);
    return NextResponse.json(searchData);
  } catch (error) {
    console.error("❌ Search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform web search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
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
