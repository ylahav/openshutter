import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ width: string; height: string }> }
) {
  try {
    const { width, height } = await params
    const w = parseInt(width, 10)
    const h = parseInt(height, 10)
    
    // Validate dimensions
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0 || w > 2000 || h > 2000) {
      return NextResponse.json(
        { error: 'Invalid dimensions. Width and height must be between 1 and 2000.' },
        { status: 400 }
      )
    }
    
    // Create a simple SVG placeholder
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="5,5"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
          ${w} × ${h}
        </text>
      </svg>
    `.trim()
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    console.error('Placeholder API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate placeholder' },
      { status: 500 }
    )
  }
}
