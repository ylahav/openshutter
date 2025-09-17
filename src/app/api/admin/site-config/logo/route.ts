import { NextRequest, NextResponse } from 'next/server'
import { siteConfigService } from '@/services/site-config'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('logo') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No logo file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `logo-${timestamp}.${extension}`
    const logoPath = `logos/${filename}`

    // Create logos directory in public folder if it doesn't exist
    const publicLogosDir = path.join(process.cwd(), 'public', 'logos')
    await fs.mkdir(publicLogosDir, { recursive: true })
    
    // Save file to public folder
    const filePath = path.join(publicLogosDir, filename)
    await fs.writeFile(filePath, buffer)
    
    // Update site configuration with new logo URL
    const logoUrl = `/api/logos/${filename}`
    const updatedConfig = await siteConfigService.updateConfig({ logo: logoUrl })

    return NextResponse.json({
      success: true,
      data: {
        logo: logoUrl,
        config: updatedConfig
      }
    })
  } catch (error) {
    console.error('Failed to upload logo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentConfig = await siteConfigService.getConfig()
    
    if (currentConfig.logo) {
      // Extract the filename from the logo URL
      const filename = currentConfig.logo.replace('/api/logos/', '')
      
      try {
        // Delete the logo file from public folder
        const filePath = path.join(process.cwd(), 'public', 'logos', filename)
        await fs.unlink(filePath)
      } catch (deleteError) {
        // Log the error but don't fail the request
        console.warn('Failed to delete logo file from public folder:', deleteError)
      }
    }

    // Update site configuration to remove logo
    const updatedConfig = await siteConfigService.updateConfig({ logo: '' })

    return NextResponse.json({
      success: true,
      data: {
        logo: '',
        config: updatedConfig
      }
    })
  } catch (error) {
    console.error('Failed to delete logo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete logo' },
      { status: 500 }
    )
  }
}
