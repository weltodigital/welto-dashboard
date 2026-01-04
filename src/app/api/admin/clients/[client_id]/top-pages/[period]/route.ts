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

    // First check if data exists
    const { data: existingData, error: checkError } = await supabase
      .from('top_pages')
      .select('id')
      .eq('client_id', client_id)
      .eq('period', period);

    if (checkError) {
      console.error('Error checking top pages:', checkError);
      return NextResponse.json(
        { error: `Database check failed: ${checkError.message}` },
        { status: 500 }
      );
    }

    console.log('Found pages to delete:', existingData?.length || 0);

    if (!existingData || existingData.length === 0) {
      return NextResponse.json({
        message: `No top pages found for ${period}`,
        deletedCount: 0
      });
    }

    // Now delete the data
    const { error: deleteError, count } = await supabase
      .from('top_pages')
      .delete({ count: 'exact' })
      .eq('client_id', client_id)
      .eq('period', period);

    if (deleteError) {
      console.error('Error deleting top pages:', deleteError);
      return NextResponse.json(
        { error: `Delete failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully deleted pages. Count:', count);

    return NextResponse.json({
      message: `Successfully deleted ${count || existingData.length} top pages for ${period}`,
      deletedCount: count || existingData.length
    });
  } catch (error) {
    console.error('Top pages delete error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete top pages',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}