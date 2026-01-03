import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { client_id } = await params;

    // Check access rights
    if (user.role !== 'admin' && user.client_id !== client_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let query = supabase.from('metrics').select('*').eq('client_id', client_id);

    if (type) {
      query = query.eq('metric_type', type);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: false }).order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { client_id } = await params;

    // Check access rights
    if (user.role !== 'admin' && user.client_id !== client_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const requestBody = await request.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));
    console.log('Client ID from params:', client_id);
    console.log('User info:', { id: user.id, role: user.role, client_id: user.client_id });

    const { metric_type, value, date } = requestBody;

    if (!metric_type || value === undefined || !date) {
      return NextResponse.json(
        {
          error: 'metric_type, value, and date are required',
          received: { metric_type, value, date, hasMetricType: !!metric_type, hasValue: value !== undefined, hasDate: !!date }
        },
        { status: 400 }
      );
    }

    // Validate date format and convert YYYY-MM to YYYY-MM-01
    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM format', received: date },
        { status: 400 }
      );
    }

    // Convert YYYY-MM to YYYY-MM-01 for PostgreSQL date column
    const fullDate = `${date}-01`;

    // Validate value is a number
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return NextResponse.json(
        { error: 'Value must be a valid number', received: value },
        { status: 400 }
      );
    }

    console.log('Attempting to insert:', { client_id, metric_type, value: numericValue, date: fullDate });

    const { data, error } = await supabase
      .from('metrics')
      .insert({
        client_id,
        metric_type,
        value: numericValue,
        date: fullDate,
        created_at: new Date().toISOString()
      })
      .select();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        {
          error: 'Database insert failed',
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from insert' },
        { status: 500 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Metrics insert error:', error);
    return NextResponse.json(
      {
        error: 'Database error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}