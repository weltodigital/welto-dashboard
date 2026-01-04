import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { client_id } = await params;
    console.log('Uploading map image for client:', client_id);

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    console.log('Image file received:', imageFile.name, 'size:', imageFile.size);

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