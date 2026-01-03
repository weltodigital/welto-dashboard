import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { client_id: string } }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check access rights
    if (user.role !== 'admin' && user.client_id !== params.client_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get recent reports count
    const { count: reportCount, error: reportError } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', params.client_id);

    if (reportError) {
      throw reportError;
    }

    // Get recent metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('metric_type')
      .eq('client_id', params.client_id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (metricsError) {
      throw metricsError;
    }

    // Group metrics by type and count
    const metricsCounts: { [key: string]: number } = {};
    metricsData?.forEach(metric => {
      metricsCounts[metric.metric_type] = (metricsCounts[metric.metric_type] || 0) + 1;
    });

    const formattedMetrics = Object.entries(metricsCounts).map(([metric_type, count]) => ({
      metric_type,
      count
    }));

    return NextResponse.json({
      client_id: params.client_id,
      reports: {
        total: reportCount || 0
      },
      metrics: formattedMetrics,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
}