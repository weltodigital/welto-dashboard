import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function DELETE(
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

    // Get client info first
    const { data: client, error: findError } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('client_id', client_id)
      .eq('role', 'client')
      .single();

    if (findError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete client data first
    const { error: deleteMetricsError } = await supabase
      .from('metrics')
      .delete()
      .eq('client_id', client_id);

    const { error: deleteQueriesError } = await supabase
      .from('search_queries')
      .delete()
      .eq('client_id', client_id);

    const { error: deletePagesError } = await supabase
      .from('top_pages')
      .delete()
      .eq('client_id', client_id);

    // Delete the client user
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', client.id);

    if (deleteUserError) {
      console.error('Error deleting client:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const updates = await request.json();

    console.log('Updating client:', client_id, 'with:', updates);

    // Find the client first
    const { data: client, error: findError } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('client_id', client_id)
      .eq('role', 'client')
      .single();

    if (findError || !client) {
      console.error('Client not found:', findError);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update the client
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', client.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating client:', updateError);
      return NextResponse.json(
        { error: `Failed to update client: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('Client updated successfully:', data);
    return NextResponse.json({
      message: 'Client updated successfully',
      data
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}