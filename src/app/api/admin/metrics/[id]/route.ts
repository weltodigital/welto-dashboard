import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const { error } = await supabase
      .from('metrics')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Metric deleted successfully' });
  } catch (error) {
    console.error('Error deleting metric:', error);
    return NextResponse.json(
      { error: 'Failed to delete metric' },
      { status: 500 }
    );
  }
}