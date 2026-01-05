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
  map_images?: string[];
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
  [key: string]: string | number | undefined;
}

export default function ClientDashboardView({ clientId, token }: ClientDashboardViewProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [leadPotential, setLeadPotential] = useState<LeadPotentialData | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapImageModalOpen, setMapImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Google Search Console states
  const [activeGscTab, setActiveGscTab] = useState<'queries' | 'pages'>('queries');
  const [selectedGscPeriod, setSelectedGscPeriod] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<string>('clicks');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch client data
      const clientResponse = await fetch(`/api/admin/clients/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        setClientData(clientResult);
      }

      // Fetch metrics
      const metricsResponse = await fetch(`/api/dashboard/${clientId}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch search queries
      const queriesResponse = await fetch(`/api/admin/clients/${clientId}/search-queries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (queriesResponse.ok) {
        const queriesData = await queriesResponse.json();
        setSearchQueries(queriesData);
      }

      // Fetch top pages
      const pagesResponse = await fetch(`/api/admin/clients/${clientId}/top-pages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        setTopPages(pagesData);
      }

      // Fetch lead potential
      const leadResponse = await fetch(`/api/dashboard/${clientId}/lead-potential`, {
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

    // Calculate cumulative reviews
    const reviewsStartCount = clientData?.reviews_start_count || 0;
    let cumulativeReviews = reviewsStartCount;

    let sortedData = Array.from(dataMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Add cumulative reviews calculation
    sortedData = sortedData.map(item => {
      if (item.gbp_reviews) {
        cumulativeReviews += item.gbp_reviews;
      }
      return {
        ...item,
        gbp_reviews_cumulative: cumulativeReviews
      };
    });

    return sortedData;
  }, [metrics, clientData?.reviews_start_count]);

  // Helper functions for Google Search Console
  const getMostRecentPeriod = useCallback(() => {
    const allPeriods = Array.from(new Set([
      ...searchQueries.map(q => q.period),
      ...topPages.map(p => p.period)
    ]));
    if (allPeriods.length === 0) return '';
    return allPeriods.sort((a, b) => b.localeCompare(a))[0];
  }, [searchQueries, topPages]);

  const getPreviousMonthPeriod = (currentPeriod: string): string => {
    const [year, month] = currentPeriod.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1); // month - 2 because Date month is 0-indexed
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  };

  const getComparisonData = useCallback((currentItem: any, field: string) => {
    const previousPeriod = getPreviousMonthPeriod(selectedGscPeriod);
    if (!previousPeriod) return null;

    const data = activeGscTab === 'queries' ? searchQueries : topPages;
    const keyField = activeGscTab === 'queries' ? 'query' : 'page_url';

    const previousItem = data.find(
      item => {
        return (item as any)[keyField] === currentItem[keyField] && item.period === previousPeriod;
      }
    );

    if (!previousItem) return null;

    const currentValue = (currentItem as any)[field];
    const previousValue = (previousItem as any)[field];
    const change = currentValue - previousValue;
    const percentChange = previousValue > 0 ? (change / previousValue) * 100 : 0;

    return {
      change,
      percentChange,
      isIncrease: change > 0,
      isDecrease: change < 0,
      previousValue
    };
  }, [selectedGscPeriod, searchQueries, topPages, activeGscTab]);

  // Set most recent period as default when data is loaded
  useEffect(() => {
    if ((searchQueries.length > 0 || topPages.length > 0) && !selectedGscPeriod) {
      const mostRecent = getMostRecentPeriod();
      if (mostRecent) {
        setSelectedGscPeriod(mostRecent);
      }
    }
  }, [searchQueries, topPages, selectedGscPeriod, getMostRecentPeriod]);

  // Reset sorting and pagination when switching tabs
  useEffect(() => {
    setSortField('clicks');
    setSortDirection('desc');
    setCurrentPage(1);
  }, [activeGscTab]);

  const handlePeriodFilter = useCallback((period: string) => {
    setSelectedGscPeriod(period);
    setCurrentPage(1);
  }, []);

  const handleTabSwitch = useCallback((tab: 'queries' | 'pages') => {
    setActiveGscTab(tab);
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortedData = () => {
    const data = activeGscTab === 'queries' ? searchQueries : topPages;
    const filteredData = data.filter(item => item.period === selectedGscPeriod);
    return [...filteredData].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'query' || sortField === 'page_url') {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      } else {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  };

  const getPaginatedData = () => {
    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const sortedData = getSortedData();
    return Math.ceil(sortedData.length / itemsPerPage);
  };

  const formatTooltip = (value: any, name: string | undefined) => {
    const formatValue = (val: number) => {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString();
    };

    return [formatValue(Number(value)), name ? name.replace(/_/g, ' ').toUpperCase() : ''];
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
        <p className="text-gray-700">Track your website and GBP's performance and growth</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Notes Section */}
      {clientData?.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-dark mb-3 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Notes from WELTO
          </h3>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-gray-700 whitespace-pre-wrap">{clientData.notes}</p>
          </div>
        </div>
      )}

      {/* Start Date & Days Since Starting */}
      {clientData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-2 flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                Started with WELTO
              </h3>
              <div className="text-2xl font-bold text-blue-600">
                {clientData.start_date
                  ? new Date(clientData.start_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : new Date(clientData.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                }
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Days with WELTO</p>
              <div className="text-3xl font-bold text-emerald-600">
                {Math.floor(
                  (new Date().getTime() - new Date(clientData.start_date || clientData.created_at).getTime())
                  / (1000 * 60 * 60 * 24)
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estimated Lead Value */}
      {leadPotential && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-text-dark mb-6">Estimated Lead Value</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-text-dark mb-2">{leadPotential.current_month.month}</h4>
                <div className="text-3xl font-bold text-emerald-600 mb-2">
                  £{leadPotential.current_month.total_value.toLocaleString()}
                </div>
                <p className="text-gray-700 mb-1">
                  From {leadPotential.current_month.total_clicks.toLocaleString()} total clicks and phone calls
                </p>
                <p className="text-sm text-gray-500">
                  Based on £{leadPotential.lead_value.toLocaleString()} estimated job value at {leadPotential.conversion_rate}% conversion rate
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-text-dark mb-2">Total Value Since Started with WELTO</h4>
                <div className="text-3xl font-bold text-primary-blue mb-2">
                  £{leadPotential.since_start.total_value.toLocaleString()}
                </div>
                <p className="text-gray-700 mb-1">
                  From {leadPotential.since_start.total_clicks.toLocaleString()} total clicks and phone calls since {leadPotential.since_start.start_date}
                </p>
                <p className="text-sm text-gray-500">
                  Based on £{leadPotential.lead_value.toLocaleString()} estimated job value at {leadPotential.conversion_rate}% conversion rate
                </p>
              </div>
            </div>
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

          {/* Organic Search Clicks */}
          {chartData.some(d => d.gsc_organic_clicks) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Organic Search Clicks</h3>
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Organic Search Impressions */}
          {chartData.some(d => d.gsc_organic_impressions) && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Organic Search Impressions</h3>
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

      {/* Google Search Console Data */}
      {(searchQueries.length > 0 || topPages.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex justify-between items-center p-6 pb-0">
              <div className="flex items-center">
                <Search className="w-5 h-5 text-primary-blue mr-2" />
                <h3 className="text-lg font-semibold text-text-dark">Google Search Console Data</h3>
              </div>
              <div className="flex items-center gap-4">
                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter by month:</label>
                  <select
                    value={selectedGscPeriod}
                    onChange={(e) => handlePeriodFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-blue"
                  >
                    {Array.from(new Set([
                      ...searchQueries.map(q => q.period),
                      ...topPages.map(p => p.period)
                    ])).sort((a, b) => b.localeCompare(a)).map(period => (
                      <option key={period} value={period}>
                        {new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => handleTabSwitch('queries')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeGscTab === 'queries'
                    ? 'border-primary-blue text-primary-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Search Queries ({searchQueries.filter(q => q.period === selectedGscPeriod).length})
              </button>
              <button
                onClick={() => handleTabSwitch('pages')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeGscTab === 'pages'
                    ? 'border-primary-blue text-primary-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Top Pages ({topPages.filter(p => p.period === selectedGscPeriod).length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeGscTab === 'queries' && searchQueries.length > 0 && (
              <div>
                <div className="overflow-x-auto" data-table-container>
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3">
                          <button
                            onClick={() => handleSort('query')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Query
                            {sortField === 'query' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3">
                          <button
                            onClick={() => handleSort('clicks')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Clicks
                            {sortField === 'clicks' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3">
                          <button
                            onClick={() => handleSort('impressions')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Impressions
                            {sortField === 'impressions' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3">
                          <button
                            onClick={() => handleSort('position')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Position
                            {sortField === 'position' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-gray-700">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().map((query: any, index: number) => {
                        const clicksComparison = getComparisonData(query, 'clicks');
                        const impressionsComparison = getComparisonData(query, 'impressions');
                        const positionComparison = getComparisonData(query, 'position');

                        return (
                          <tr key={`${query.query}-${query.period}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium text-text-dark">{query.query}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{query.clicks}</span>
                                {clicksComparison && (
                                  <span className={`text-xs flex items-center ${
                                    clicksComparison.isIncrease ? 'text-green-600' : clicksComparison.isDecrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {clicksComparison.isIncrease ? '↗' : clicksComparison.isDecrease ? '↙' : '→'} {Math.abs(clicksComparison.change)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{query.impressions.toLocaleString()}</span>
                                {impressionsComparison && (
                                  <span className={`text-xs flex items-center ${
                                    impressionsComparison.isIncrease ? 'text-green-600' : impressionsComparison.isDecrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {impressionsComparison.isIncrease ? '↗' : impressionsComparison.isDecrease ? '↙' : '→'} {Math.abs(impressionsComparison.change)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{query.position.toFixed(1)}</span>
                                {positionComparison && (
                                  <span className={`text-xs flex items-center ${
                                    positionComparison.isDecrease ? 'text-green-600' : positionComparison.isIncrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {positionComparison.isDecrease ? '↗' : positionComparison.isIncrease ? '↙' : '→'} {Math.abs(positionComparison.change).toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(query.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getSortedData().length)} of {getSortedData().length} results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {currentPage} of {getTotalPages()}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                        disabled={currentPage === getTotalPages()}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeGscTab === 'pages' && topPages.length > 0 && (
              <div>
                <div className="overflow-x-auto" data-table-container>
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 w-2/5">
                          <button
                            onClick={() => handleSort('page_url')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Page URL
                            {sortField === 'page_url' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3 w-1/6">
                          <button
                            onClick={() => handleSort('clicks')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Clicks
                            {sortField === 'clicks' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3 w-1/6">
                          <button
                            onClick={() => handleSort('impressions')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Impressions
                            {sortField === 'impressions' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3 w-1/6">
                          <button
                            onClick={() => handleSort('position')}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Position
                            {sortField === 'position' && (
                              <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                            )}
                          </button>
                        </th>
                        <th className="text-left p-3 w-1/6 text-sm font-medium text-gray-700">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().map((page: any, index: number) => {
                        const clicksComparison = getComparisonData(page, 'clicks');
                        const impressionsComparison = getComparisonData(page, 'impressions');
                        const positionComparison = getComparisonData(page, 'position');

                        return (
                          <tr key={`${page.page_url}-${page.period}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium text-text-dark">{page.page_url}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{page.clicks}</span>
                                {clicksComparison && (
                                  <span className={`text-xs flex items-center ${
                                    clicksComparison.isIncrease ? 'text-green-600' : clicksComparison.isDecrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {clicksComparison.isIncrease ? '↗' : clicksComparison.isDecrease ? '↙' : '→'} {Math.abs(clicksComparison.change)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{page.impressions.toLocaleString()}</span>
                                {impressionsComparison && (
                                  <span className={`text-xs flex items-center ${
                                    impressionsComparison.isIncrease ? 'text-green-600' : impressionsComparison.isDecrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {impressionsComparison.isIncrease ? '↗' : impressionsComparison.isDecrease ? '↙' : '→'} {Math.abs(impressionsComparison.change)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-primary-blue">{page.position.toFixed(1)}</span>
                                {positionComparison && (
                                  <span className={`text-xs flex items-center ${
                                    positionComparison.isDecrease ? 'text-green-600' : positionComparison.isIncrease ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {positionComparison.isDecrease ? '↗' : positionComparison.isIncrease ? '↙' : '→'} {Math.abs(positionComparison.change).toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-600">
                              {new Date(page.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getSortedData().length)} of {getSortedData().length} results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {currentPage} of {getTotalPages()}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                        disabled={currentPage === getTotalPages()}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {((activeGscTab === 'queries' && searchQueries.filter(q => q.period === selectedGscPeriod).length === 0) ||
              (activeGscTab === 'pages' && topPages.filter(p => p.period === selectedGscPeriod).length === 0)) && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 mb-2">
                  No {activeGscTab === 'queries' ? 'search queries' : 'top pages'} data available for the selected month.
                </p>
                <p className="text-sm text-gray-700">
                  Your Google Search Console data will appear here once uploaded by your team.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Pack Ranking Images */}
      {(() => {
        let mapImages: string[] = [];

        if (clientData?.map_images?.length) {
          // If map_images array exists, use it
          mapImages = clientData.map_images;
        } else if (clientData?.map_image) {
          // Check if map_image contains JSON array (multiple images) or single image
          try {
            const parsed = JSON.parse(clientData.map_image);
            if (Array.isArray(parsed)) {
              mapImages = parsed;
            } else {
              mapImages = [clientData.map_image];
            }
          } catch {
            // Not JSON, treat as single image
            mapImages = [clientData.map_image];
          }
        }

        if (mapImages.length === 0) return null;

        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Map Pack Ranking {mapImages.length > 1 && `(${mapImages.length} images)`}
            </h3>
            {mapImages.length === 1 ? (
              <div
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => {
                  setSelectedImageIndex(0);
                  setMapImageModalOpen(true);
                }}
              >
                <img
                  src={mapImages[0]}
                  alt="Map Pack Ranking"
                  className="w-full max-w-md mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-500 text-center mt-2">Click to enlarge</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mapImages.map((image, index) => (
                  <div
                    key={index}
                    className="cursor-pointer transition-transform hover:scale-[1.02]"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setMapImageModalOpen(true);
                    }}
                  >
                    <img
                      src={image}
                      alt={`Map Pack Ranking ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg shadow-md"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">Image {index + 1}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Map Image Modal */}
      {mapImageModalOpen && (() => {
        let mapImages: string[] = [];

        if (clientData?.map_images?.length) {
          // If map_images array exists, use it
          mapImages = clientData.map_images;
        } else if (clientData?.map_image) {
          // Check if map_image contains JSON array (multiple images) or single image
          try {
            const parsed = JSON.parse(clientData.map_image);
            if (Array.isArray(parsed)) {
              mapImages = parsed;
            } else {
              mapImages = [clientData.map_image];
            }
          } catch {
            // Not JSON, treat as single image
            mapImages = [clientData.map_image];
          }
        }

        if (mapImages.length === 0) return null;

        const currentImage = mapImages[selectedImageIndex];
        const canNavigate = mapImages.length > 1;

        const nextImage = () => {
          setSelectedImageIndex((prev) => (prev + 1) % mapImages.length);
        };

        const prevImage = () => {
          setSelectedImageIndex((prev) => (prev - 1 + mapImages.length) % mapImages.length);
        };

        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setMapImageModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg p-4 max-w-4xl max-h-full overflow-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-text-dark">
                  Map Pack Ranking
                  {canNavigate && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      {selectedImageIndex + 1} of {mapImages.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setMapImageModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="relative">
                <img
                  src={currentImage}
                  alt={`Map Pack Ranking ${selectedImageIndex + 1}`}
                  className="w-full h-auto rounded-lg"
                />

                {canNavigate && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      ←
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {canNavigate && (
                <div className="flex justify-center mt-4 space-x-2">
                  {mapImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === selectedImageIndex
                          ? 'bg-blue-600'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}