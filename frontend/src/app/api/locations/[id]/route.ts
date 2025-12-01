import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { LocationModel } from '@/lib/models/Location'
import { ObjectId } from 'mongodb'
import { SUPPORTED_LANGUAGES } from '@/types/multi-lang'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = await params
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      )
    }
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Find location
    const location = await LocationModel.findById(id).lean()
    
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: location
    })
    
  } catch (error) {
    console.error('Get location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = await params
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      )
    }
    
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
      category,
      isActive 
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
    
    // Check if location exists
    const existingLocation = await LocationModel.findById(id)
    if (!existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
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
    
    // Check for duplicate name and address (check by English name)
    const nameConditions = SUPPORTED_LANGUAGES
      .map(l => ({ [`name.${l.code}`]: (nameObj as any)[l.code] }))
      .filter(cond => Object.values(cond)[0])
    const duplicateLocation = nameConditions.length
      ? await LocationModel.findOne({
          _id: { $ne: id },
          $or: nameConditions,
          city: city?.trim(),
          country: country?.trim()
        })
      : null
    
    if (duplicateLocation) {
      return NextResponse.json(
        { success: false, error: 'Location with this name and address already exists' },
        { status: 409 }
      )
    }
    
    // Update location
    const updateData: any = {
      name: nameObj,
      description: descriptionObj,
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim(),
      postalCode: postalCode?.trim(),
      placeId: placeId?.trim(),
      category: category || 'custom',
      updatedAt: new Date()
    }
    
    if (coordinates) {
      updateData.coordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      }
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }
    
    const updatedLocation = await LocationModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean()
    
    return NextResponse.json({
      success: true,
      data: updatedLocation
    })
    
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await connectToDatabase()
    const { id } = await params
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      )
    }
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if location exists
    const location = await LocationModel.findById(id)
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }
    
    // Check if location is being used in photos
    const photosUsingLocation = await db.collection('photos').countDocuments({
      location: new ObjectId(id)
    })
    
    if (photosUsingLocation > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete location. It is being used by ${photosUsingLocation} photo(s). Please remove the location from photos first.` 
        },
        { status: 409 }
      )
    }
    
    // Delete location
    await LocationModel.findByIdAndDelete(id)
    
    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
