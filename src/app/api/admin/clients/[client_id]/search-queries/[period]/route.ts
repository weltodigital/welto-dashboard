import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string; period: string }> }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { client_id, period } = await params;

    console.log('Deleting search queries for client:', client_id, 'period:', period);

    const { data, error } = await supabase
      .from('search_queries')
      .delete()
      .eq('client_id', client_id)
      .eq('period', period)
      .select('count');

    if (error) {
      console.error('Error deleting search queries:', error);
      throw error;
    }

    return NextResponse.json({
      message: `Successfully deleted search queries for ${period}`,
      deletedCount: data?.length || 0
    });
  } catch (error) {
    console.error('Search queries delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete search queries' },
      { status: 500 }
    );
  }
}