import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    console.log('Map image upload started');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    const user = getUserFromRequest(request);
    console.log('User authentication:', { user: !!user, role: user?.role });

    if (!user || user.role !== 'admin') {
      console.log('Authentication failed - Admin access required');
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { client_id } = await params;
    console.log('Uploading map image for client:', client_id);
    console.log('client_id type:', typeof client_id);
    console.log('client_id value:', JSON.stringify(client_id));

    console.log('Attempting to parse FormData...');
    const formData = await request.formData();
    console.log('FormData parsed successfully');

    // Debug: log all form data entries
    for (const [key, value] of formData.entries()) {
      console.log('FormData entry:', key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
    }

    // Handle multiple image files
    const imageFiles = formData.getAll('images') as File[];
    const singleImageFile = formData.get('image') as File;

    // Support both single image (legacy) and multiple images
    const filesToProcess = imageFiles.length > 0 ? imageFiles : (singleImageFile ? [singleImageFile] : []);

    console.log('Image files to process:', filesToProcess.length);

    if (filesToProcess.length === 0) {
      console.log('No image files found in FormData');
      return NextResponse.json(
        { error: 'At least one image file is required' },
        { status: 400 }
      );
    }

    // Convert all files to base64 for storage
    const dataUrls: string[] = [];
    for (const file of filesToProcess) {
      console.log('Processing file:', file.name, 'size:', file.size, 'type:', file.type);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const mimeType = file.type;
      const dataUrl = `data:${mimeType};base64,${base64}`;

      dataUrls.push(dataUrl);
      console.log('Converted file to base64, length:', base64.length);
    }

    // Update the client with the map images
    console.log('Updating client with client_id:', client_id);
    console.log('Update data:', {
      map_images: `${dataUrls.length} images`,
      map_image: dataUrls[0] ? dataUrls[0].substring(0, 50) + '...' : null, // Keep first image for backward compatibility
      updated_at: new Date().toISOString(),
      client_id,
      role: 'client'
    });

    // First, find the client to get their ID
    const { data: clientData, error: findError } = await supabase
      .from('users')
      .select('id, client_id, role')
      .eq('client_id', client_id)
      .eq('role', 'client')
      .single();

    console.log('Find client result:', { clientData, findError: findError?.message });

    if (findError) {
      console.error('Error finding client:', findError);
      return NextResponse.json(
        { error: `Client lookup failed: ${findError.message}` },
        { status: 500 }
      );
    }

    if (!clientData) {
      console.log('No client found with client_id:', client_id);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    console.log('Found client:', clientData);

    // Now update using the numeric ID
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Store multiple images as JSON in existing map_image field as interim solution
    if (dataUrls.length > 1) {
      updateData.map_image = JSON.stringify(dataUrls);
    } else if (dataUrls.length === 1) {
      updateData.map_image = dataUrls[0];
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', clientData.id)
      .select()
      .single();

    console.log('Database operation completed');
    console.log('Update result:', { data: !!data, error: error?.message });

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: `Database update failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    console.log('Map image(s) uploaded successfully for client:', client_id);

    return NextResponse.json({
      message: `${dataUrls.length} map image(s) uploaded successfully`,
      map_image: dataUrls.length > 1 ? JSON.stringify(dataUrls) : dataUrls[0],
      imageUrl: dataUrls[0], // Keep backward compatibility
      count: dataUrls.length
    });

  } catch (error) {
    console.error('Map image upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload map image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}