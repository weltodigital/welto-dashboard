'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Phone, Navigation, MousePointer, Search, Eye, MapPin } from 'lucide-react';

interface Client {
  id: number;
  username: string;
  client_id: string;
  created_at: string;
  start_date?: string;
  notes?: string;
  map_image?: string;
  reviews_start_count?: number;
}

interface Metric {
  id: number;
  client_id: string;
  metric_type: string;
  value: number;
  date: string;
  created_at: string;
}

interface SearchQuery {
  id: number;
  client_id: string;
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  period: string;
  created_at: string;
}

interface TopPage {
  id: number;
  client_id: string;
  page_url: string;
  clicks: number;
  impressions: number;
  position: number;
  period: string;
  created_at: string;
}

interface LeadPotentialData {
  client_id: string;
  lead_value: number;
  conversion_rate: number;
  current_month: {
    month: string;
    total_clicks: number;
    total_value: number;
    breakdown: {
      metric_type: string;
      total_value: number;
    }[];
  };
  since_start: {
    start_date: string;
    total_clicks: number;
    total_value: number;
    breakdown: {
      metric_type: string;
      total_value: number;
    }[];
  };
}

interface ClientDashboardViewProps {
  clientId: string;
  token: string;
}

interface ChartData {
  month: string;
  gbp_calls?: number;
  gbp_directions?: number;
  gbp_website_clicks?: number;
  gbp_reviews?: number;
  gbp_reviews_cumulative?: number;
  gsc_organic_clicks?: number;
  gsc_organic_impressions?: number;
}

export default function ClientDashboardView({ clientId, token }: ClientDashboardViewProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [leadPotential, setLeadPotential] = useState<LeadPotentialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch metrics
      const metricsResponse = await fetch(`http://localhost:5001/api/dashboard/${clientId}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch search queries
      const queriesResponse = await fetch(`http://localhost:5001/api/admin/clients/${clientId}/search-queries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (queriesResponse.ok) {
        const queriesData = await queriesResponse.json();
        setSearchQueries(queriesData);
      }

      // Fetch top pages
      const pagesResponse = await fetch(`http://localhost:5001/api/admin/clients/${clientId}/top-pages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setTopPages(pagesData);
      }

      // Fetch lead potential
      const leadResponse = await fetch(`http://localhost:5001/api/dashboard/${clientId}/lead-potential`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (leadResponse.ok) {
        const leadData = await leadResponse.json();
        setLeadPotential(leadData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process chart data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, ChartData>();

    metrics.forEach(metric => {
      const month = metric.date;
      if (!dataMap.has(month)) {
        dataMap.set(month, { month });
      }

      const data = dataMap.get(month)!;
      data[metric.metric_type as keyof ChartData] = metric.value;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [metrics]);

  const formatTooltip = (value: any, name: string) => {
    const formatValue = (val: number) => {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString();
    };

    return [formatValue(Number(value)), name.replace(/_/g, ' ').toUpperCase()];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-dark">Your SEO Dashboard</h2>
        <p className="text-gray-700">Track your website's performance and growth</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Lead Potential Overview */}
      {leadPotential && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-text-dark mb-4">This Month's Value</h3>
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              ${leadPotential.current_month.total_value.toLocaleString()}
            </div>
            <p className="text-gray-700">
              From {leadPotential.current_month.total_clicks.toLocaleString()} total clicks
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Total Value Since Start</h3>
            <div className="text-3xl font-bold text-primary-blue mb-2">
              ${leadPotential.since_start.total_value.toLocaleString()}
            </div>
            <p className="text-gray-700">
              From {leadPotential.since_start.total_clicks.toLocaleString()} total clicks
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Google Business Profile Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Google Business Profile Activity</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={formatTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gbp_calls"
                    stroke="#4F46E5"
                    name="Phone Calls"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gbp_directions"
                    stroke="#10B981"
                    name="Direction Requests"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gbp_website_clicks"
                    stroke="#F59E0B"
                    name="Website Clicks"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reviews Chart */}
          {chartData.some(d => d.gbp_reviews || d.gbp_reviews_cumulative) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Review Growth</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={formatTooltip} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="gbp_reviews_cumulative"
                      stackId="1"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      name="Total Reviews"
                      fillOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="gbp_reviews"
                      stroke="#EC4899"
                      name="New Reviews"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Organic Search Performance */}
          {chartData.some(d => d.gsc_organic_clicks || d.gsc_organic_impressions) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Organic Search Performance</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={formatTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="gsc_organic_clicks"
                      stroke="#EF4444"
                      name="Organic Clicks"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="gsc_organic_impressions"
                      stroke="#06B6D4"
                      name="Impressions"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark mb-2">No Data Available</h3>
          <p className="text-gray-700">Your SEO metrics will appear here once data is uploaded by your team.</p>
        </div>
      )}

      {/* Top Search Queries */}
      {searchQueries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Top Search Queries
          </h3>
          <div className="space-y-3">
            {searchQueries.slice(0, 10).map((query, index) => (
              <div key={query.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-text-dark">{query.query}</p>
                  <p className="text-sm text-gray-700">Position: {query.position.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-text-dark">{query.clicks} clicks</p>
                  <p className="text-sm text-gray-700">{query.impressions.toLocaleString()} impressions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Pages */}
      {topPages.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Top Performing Pages
          </h3>
          <div className="space-y-3">
            {topPages.slice(0, 10).map((page, index) => (
              <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-text-dark truncate">{page.page_url}</p>
                  <p className="text-sm text-gray-700">Position: {page.position.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-text-dark">{page.clicks} clicks</p>
                  <p className="text-sm text-gray-700">{page.impressions.toLocaleString()} impressions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}