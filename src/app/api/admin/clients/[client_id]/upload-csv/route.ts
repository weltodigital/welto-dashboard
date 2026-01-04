import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function POST(
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
    const formData = await request.formData();

    const csvFile = formData.get('csv') as File;
    const period = formData.get('period') as string;
    const dataType = formData.get('data_type') as string;

    if (!csvFile || !period || !dataType) {
      return NextResponse.json(
        { error: 'csv, period, and data_type are required' },
        { status: 400 }
      );
    }

    // Read CSV file content
    const csvContent = await csvFile.text();
    const lines = csvContent.split('\n');

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    // Process data rows
    const dataRows = lines.slice(1).filter(line => line.trim()); // Remove empty lines
    let recordsInserted = 0;

    console.log('CSV Headers:', headers);
    console.log('Data Type:', dataType);
    console.log('Period:', period);
    console.log('Client ID:', client_id);
    console.log('First 3 data rows:', dataRows.slice(0, 3));

    if (dataType === 'queries') {
      // Find column indices dynamically
      const queryIndex = headers.findIndex(h => h.toLowerCase().includes('query'));
      const clicksIndex = headers.findIndex(h => h.toLowerCase().includes('clicks'));
      const impressionsIndex = headers.findIndex(h => h.toLowerCase().includes('impressions'));
      const positionIndex = headers.findIndex(h => h.toLowerCase().includes('position'));

      console.log('Column mapping for queries:', { queryIndex, clicksIndex, impressionsIndex, positionIndex });

      if (queryIndex === -1 || clicksIndex === -1 || impressionsIndex === -1 || positionIndex === -1) {
        return NextResponse.json(
          { error: 'Required columns not found. Expected: Query, Clicks, Impressions, Position' },
          { status: 400 }
        );
      }

      // Process search queries
      for (const line of dataRows) {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

        if (values.length > Math.max(queryIndex, clicksIndex, impressionsIndex, positionIndex)) {
          const query = values[queryIndex];
          const clicks = values[clicksIndex];
          const impressions = values[impressionsIndex];
          const position = values[positionIndex];

          if (query && clicks && impressions && position) {
            const { error } = await supabase
              .from('search_queries')
              .insert({
                client_id,
                query: query,
                clicks: parseInt(clicks) || 0,
                impressions: parseInt(impressions) || 0,
                position: parseFloat(position) || 0,
                period: period,
                created_at: new Date().toISOString()
              });

            if (!error) {
              recordsInserted++;
            } else {
              console.error('Error inserting query:', error);
            }
          }
        }
      }
    } else if (dataType === 'pages') {
      // Find column indices dynamically
      const pageIndex = headers.findIndex(h => h.toLowerCase().includes('page'));
      const clicksIndex = headers.findIndex(h => h.toLowerCase().includes('clicks'));
      const impressionsIndex = headers.findIndex(h => h.toLowerCase().includes('impressions'));
      const positionIndex = headers.findIndex(h => h.toLowerCase().includes('position'));

      console.log('Column mapping for pages:', { pageIndex, clicksIndex, impressionsIndex, positionIndex });

      if (pageIndex === -1 || clicksIndex === -1 || impressionsIndex === -1 || positionIndex === -1) {
        return NextResponse.json(
          { error: 'Required columns not found. Expected: Page, Clicks, Impressions, Position' },
          { status: 400 }
        );
      }

      // Process top pages
      for (const line of dataRows) {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

        if (values.length > Math.max(pageIndex, clicksIndex, impressionsIndex, positionIndex)) {
          const page_url = values[pageIndex];
          const clicks = values[clicksIndex];
          const impressions = values[impressionsIndex];
          const position = values[positionIndex];

          if (page_url && clicks && impressions && position) {
            const { error } = await supabase
              .from('top_pages')
              .insert({
                client_id,
                page_url: page_url,
                clicks: parseInt(clicks) || 0,
                impressions: parseInt(impressions) || 0,
                position: parseFloat(position) || 0,
                period: period,
                created_at: new Date().toISOString()
              });

            if (!error) {
              recordsInserted++;
            } else {
              console.error('Error inserting page:', error);
            }
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid data_type. Must be "queries" or "pages"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      recordsInserted,
      message: `Successfully imported ${recordsInserted} records`
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}