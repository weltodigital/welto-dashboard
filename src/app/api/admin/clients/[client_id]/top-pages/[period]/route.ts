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

    console.log('Deleting top pages for client:', client_id, 'period:', period);

    const { data, error } = await supabase
      .from('top_pages')
      .delete()
      .eq('client_id', client_id)
      .eq('period', period)
      .select('count');

    if (error) {
      console.error('Error deleting top pages:', error);
      throw error;
    }

    return NextResponse.json({
      message: `Successfully deleted top pages for ${period}`,
      deletedCount: data?.length || 0
    });
  } catch (error) {
    console.error('Top pages delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete top pages' },
      { status: 500 }
    );
  }
}