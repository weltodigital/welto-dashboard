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

    console.log('Fetching lead potential for client:', client_id);

    // Get client details for lead value and conversion rate
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('lead_value, conversion_rate')
      .eq('client_id', client_id)
      .eq('role', 'client')
      .single();

    if (clientError) {
      console.error('Error fetching client data:', clientError);
      return NextResponse.json(
        { error: `Client lookup failed: ${clientError.message}` },
        { status: 500 }
      );
    }

    if (!clientData) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get all metrics for calculations
    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('metric_type, value, date')
      .eq('client_id', client_id)
      .in('metric_type', ['gbp_website_clicks', 'gbp_phone_calls', 'gsc_organic_clicks'])
      .order('date', { ascending: false });

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: `Metrics lookup failed: ${metricsError.message}` },
        { status: 500 }
      );
    }

    // Default values
    const lead_value = clientData.lead_value || 2500; // Default £2500
    const conversion_rate = clientData.conversion_rate || 50; // Default 50%

    // Get previous month (December 2024 since current month is January 2025)
    const now = new Date();
    let previousMonth;

    if (now.getMonth() === 0) {
      // Current month is January, so previous month is December of previous year
      previousMonth = new Date(now.getFullYear() - 1, 11, 1); // December of previous year
    } else {
      previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

    console.log('Previous month for calculations:', previousMonthStr);

    // Filter metrics by type
    const gbpWebClicks = metricsData?.filter(m => m.metric_type === 'gbp_website_clicks') || [];
    const gbpPhoneCalls = metricsData?.filter(m => m.metric_type === 'gbp_phone_calls') || [];
    const organicClicks = metricsData?.filter(m => m.metric_type === 'gsc_organic_clicks') || [];

    // Get previous month data
    const prevMonthGbpWeb = gbpWebClicks.find(m => m.date.startsWith(previousMonthStr))?.value || 0;
    const prevMonthGbpPhone = gbpPhoneCalls.find(m => m.date.startsWith(previousMonthStr))?.value || 0;
    const prevMonthOrganic = organicClicks.find(m => m.date.startsWith(previousMonthStr))?.value || 0;

    // Calculate totals since start
    const totalGbpWeb = gbpWebClicks.reduce((sum, m) => sum + m.value, 0);
    const totalGbpPhone = gbpPhoneCalls.reduce((sum, m) => sum + m.value, 0);
    const totalOrganic = organicClicks.reduce((sum, m) => sum + m.value, 0);

    // Calculate potential leads and revenue for previous month
    const prevMonthTotalClicks = prevMonthGbpWeb + prevMonthGbpPhone + prevMonthOrganic;
    const prevMonthPotentialLeads = prevMonthTotalClicks * (conversion_rate / 100);
    const prevMonthRevenue = prevMonthPotentialLeads * lead_value;

    // Calculate totals since start
    const sinceStartTotalClicks = totalGbpWeb + totalGbpPhone + totalOrganic;
    const sinceStartPotentialLeads = sinceStartTotalClicks * (conversion_rate / 100);
    const sinceStartRevenue = sinceStartPotentialLeads * lead_value;

    console.log('Lead potential calculated:', {
      lead_value,
      conversion_rate,
      previousMonthStr,
      prevMonthGbpWeb,
      prevMonthGbpPhone,
      prevMonthOrganic,
      prevMonthTotalClicks,
      prevMonthRevenue,
      sinceStartTotalClicks,
      sinceStartRevenue
    });

    // Get previous month name for display
    const previousMonthName = previousMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Find the earliest date from all metrics to determine start date
    const allDates = metricsData?.map(m => {
      // Handle both YYYY-MM and YYYY-MM-DD formats
      const dateStr = m.date.includes('-01') ? m.date : m.date + '-01';
      return new Date(dateStr);
    }).filter(d => !isNaN(d.getTime())) || [];

    const startDate = allDates.length > 0
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : null;

    const startDateDisplay = startDate && !isNaN(startDate.getTime())
      ? startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'No data available';

    console.log('Start date calculated:', startDateDisplay);

    const leadPotential = {
      client_id,
      lead_value,
      conversion_rate,
      current_month: {
        month: previousMonthName, // Show previous month (e.g., "December 2024")
        total_clicks: prevMonthTotalClicks,
        total_value: Math.round(prevMonthRevenue),
        breakdown: [
          {
            type: 'GBP Website Clicks',
            total_value: prevMonthGbpWeb
          },
          {
            type: 'GBP Phone Calls',
            total_value: prevMonthGbpPhone
          },
          {
            type: 'Organic Clicks',
            total_value: prevMonthOrganic
          }
        ]
      },
      since_start: {
        start_date: startDateDisplay,
        total_clicks: sinceStartTotalClicks,
        total_value: Math.round(sinceStartRevenue),
        breakdown: [
          {
            type: 'GBP Website Clicks',
            total_value: totalGbpWeb
          },
          {
            type: 'GBP Phone Calls',
            total_value: totalGbpPhone
          },
          {
            type: 'Organic Clicks',
            total_value: totalOrganic
          }
        ]
      }
    };

    return NextResponse.json(leadPotential);

  } catch (error) {
    console.error('Lead potential fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch lead potential',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}