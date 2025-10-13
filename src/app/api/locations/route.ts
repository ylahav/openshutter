import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { LocationModel } from '@/lib/models/Location'
import { SUPPORTED_LANGUAGES } from '@/types/multi-lang'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { db } = await connectToDatabase()
    
    // Get query parameters
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'usageCount'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Build query
    const query: any = {}
    
    if (search) {
      query.$text = { $search: search }
    }
    
    if (category) {
      query.category = category
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true'
    }
    
    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1
    
    // Get locations with pagination
    const skip = (page - 1) * limit
    const [locations, total] = await Promise.all([
      LocationModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      LocationModel.countDocuments(query)
    ])
    
    return NextResponse.json({
      success: true,
      data: locations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('Locations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      name, 
      description, 
      address, 
      city, 
      state, 
      country, 
      postalCode, 
      coordinates, 
      placeId, 
      category 
    } = body
    
    // Validate required fields
    const hasAnyName = typeof name === 'string'
      ? !!name.trim()
      : Object.values((name as Record<string, string>) || {}).some((v) => (v || '').trim())
    if (!hasAnyName) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      )
    }
    
    // Convert name to multi-language format if it's a string
    const nameObj = typeof name === 'string' 
      ? { en: name.trim() }
      : Object.fromEntries(
          SUPPORTED_LANGUAGES
            .map(l => [l.code, (name as any)[l.code]?.trim() || ''])
        )
    
    // Convert description to multi-language format if it's a string
    const descriptionObj = description 
      ? (typeof description === 'string' 
          ? { en: description.trim() }
          : Object.fromEntries(
              SUPPORTED_LANGUAGES
                .map(l => [l.code, (description as any)[l.code]?.trim() || ''])
            ))
      : {}
    
    // Check if location already exists (check by any language name)
    const nameConditions = SUPPORTED_LANGUAGES
      .map(l => ({ [`name.${l.code}`]: (nameObj as any)[l.code] }))
      .filter(cond => Object.values(cond)[0])
    const existingLocation = nameConditions.length
      ? await LocationModel.findOne({
          $or: nameConditions,
          city: city?.trim(),
          country: country?.trim()
        })
      : null
    
    if (existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location with this name and address already exists' },
        { status: 409 }
      )
    }
    
    // Create new location
    const location = new LocationModel({
      name: nameObj,
      description: descriptionObj,
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim(),
      postalCode: postalCode?.trim(),
      coordinates: coordinates ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      } : undefined,
      placeId: placeId?.trim(),
      category: category || 'custom',
      createdBy: user.id
    })
    
    await location.save()
    
    return NextResponse.json({
      success: true,
      data: location
    })
    
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
