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

    // Get the latest metrics for calculations
    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('metric_type, value, date')
      .eq('client_id', client_id)
      .in('metric_type', ['gbp_clicks', 'gsc_organic_clicks'])
      .order('date', { ascending: false })
      .limit(6); // Get recent data for calculations

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

    // Calculate monthly averages
    const gbpClicks = metricsData?.filter(m => m.metric_type === 'gbp_clicks') || [];
    const organicClicks = metricsData?.filter(m => m.metric_type === 'gsc_organic_clicks') || [];

    const avgGbpClicks = gbpClicks.length > 0
      ? gbpClicks.reduce((sum, m) => sum + m.value, 0) / gbpClicks.length
      : 0;

    const avgOrganicClicks = organicClicks.length > 0
      ? organicClicks.reduce((sum, m) => sum + m.value, 0) / organicClicks.length
      : 0;

    // Calculate potential leads and revenue
    // Note: conversion_rate is stored as percentage (e.g., 50) but calculated as decimal (0.5)
    const totalClicks = avgGbpClicks + avgOrganicClicks;
    const potentialLeads = totalClicks * (conversion_rate / 100);
    const monthlyRevenue = potentialLeads * lead_value;
    const annualRevenue = monthlyRevenue * 12;

    console.log('Lead potential calculated:', {
      lead_value,
      conversion_rate,
      avgGbpClicks,
      avgOrganicClicks,
      totalClicks,
      potentialLeads,
      monthlyRevenue,
      annualRevenue
    });

    // Get current month for display
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Calculate current month totals
    // total_value should be the final calculated revenue, not clicks
    const currentMonthValue = Math.round(monthlyRevenue);

    // Calculate since start totals (simplified - could be enhanced with actual start date)
    const sinceStartValue = Math.round(monthlyRevenue * 6); // Assume 6 months average

    const leadPotential = {
      client_id,
      lead_value,
      conversion_rate,
      current_month: {
        month: currentMonth,
        total_clicks: Math.round(totalClicks),
        total_value: currentMonthValue,
        breakdown: [
          {
            type: 'GBP Clicks',
            total_value: Math.round(avgGbpClicks)
          },
          {
            type: 'Organic Clicks',
            total_value: Math.round(avgOrganicClicks)
          }
        ]
      },
      since_start: {
        total_clicks: Math.round(totalClicks * 6), // Estimate 6 months
        total_value: sinceStartValue,
        breakdown: [
          {
            type: 'GBP Clicks',
            total_value: Math.round(avgGbpClicks * 6)
          },
          {
            type: 'Organic Clicks',
            total_value: Math.round(avgOrganicClicks * 6)
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