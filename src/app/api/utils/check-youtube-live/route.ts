import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ isLive: false, error: "No URL provided" }, { status: 400 });
  }

  try {
    // Basic YouTube ID extraction
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return NextResponse.json({ isLive: false, error: "Invalid YouTube URL" });
    }

    // Fetch the page to look for live indicator
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const html = await response.text();

    // Check for specific live indicators in the YouTube page source
    // "isLive":true or "isLiveBroadcast":true inside script tags
    const isLive = html.includes('"isLive":true') || html.includes('"isLiveBroadcast":true');
    
    return NextResponse.json({ isLive });
  } catch (error) {
    console.error("Error checking YouTube live status:", error);
    return NextResponse.json({ isLive: false, error: "CORS or Fetch error" });
  }
}
