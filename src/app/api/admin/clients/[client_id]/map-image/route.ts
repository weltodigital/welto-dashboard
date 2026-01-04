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

    console.log('Attempting to parse FormData...');
    const formData = await request.formData();
    console.log('FormData parsed successfully');

    // Debug: log all form data entries
    for (const [key, value] of formData.entries()) {
      console.log('FormData entry:', key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
    }

    const imageFile = formData.get('image') as File;
    console.log('Image file from FormData:', imageFile);

    if (!imageFile) {
      console.log('No image file found in FormData');
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    console.log('Image file received:', imageFile.name, 'size:', imageFile.size, 'type:', imageFile.type);

    // Convert file to base64 for storage
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = imageFile.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Converted to base64, length:', base64.length);

    // Update the client with the map image
    const { data, error } = await supabase
      .from('users')
      .update({
        map_image: dataUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(client_id))
      .eq('role', 'client')
      .select()
      .single();

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

    console.log('Map image uploaded successfully for client:', client_id);

    return NextResponse.json({
      message: 'Map image uploaded successfully',
      map_image: dataUrl,
      imageUrl: dataUrl
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