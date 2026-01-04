import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database';

export async function GET() {
  try {
    console.log('Test endpoint called');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Supabase Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Test basic connection
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Database test error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      });
    }

    console.log('Database test successful. Users found:', count);

    return NextResponse.json({
      success: true,
      userCount: count,
      users: data?.map(u => ({ id: u.id, username: u.username, role: u.role })) || []
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
}