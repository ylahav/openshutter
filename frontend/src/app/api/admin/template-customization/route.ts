import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const collection = db.collection('template_customization')
    
    const customization = await collection.findOne({ key: 'default' })
    
    if (!customization) {
      // Return default customization if none exists
      const defaultCustomization = {
        colors: {
          primary: '#0ea5e9',
          secondary: '#64748b',
          accent: '#06b6d4',
          background: '#ffffff',
          text: '#1e293b'
        },
        typography: {
          fontFamily: 'Inter',
          headingSize: 'large',
          bodySize: 'medium'
        },
        layout: {
          headerStyle: 'modern',
          cardStyle: 'rounded',
          spacing: 'comfortable'
        },
        effects: {
          animations: true,
          shadows: true,
          gradients: true,
          glassMorphism: true
        }
      }
      
      return NextResponse.json({ success: true, data: defaultCustomization })
    }
    
    return NextResponse.json({ success: true, data: customization })
  } catch (error) {
    console.error('Failed to get template customization:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get template customization' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const customization = await request.json()
    const { db } = await connectToDatabase()
    const collection = db.collection('template_customization')
    
    // Validate the customization object
    if (!customization.colors || !customization.typography || !customization.layout || !customization.effects) {
      return NextResponse.json(
        { success: false, error: 'Invalid customization data' },
        { status: 400 }
      )
    }
    
    // Upsert the customization
    const result = await collection.updateOne(
      { key: 'default' },
      { 
        $set: {
          key: 'default',
          ...customization,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
    
    return NextResponse.json({ 
      success: true, 
      data: customization,
      message: 'Template customization saved successfully'
    })
  } catch (error) {
    console.error('Failed to save template customization:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save template customization' },
      { status: 500 }
    )
  }
}
