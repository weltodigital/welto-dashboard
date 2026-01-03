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
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Phone, Navigation, MousePointer, Search, Eye, Plus, X, Edit, Trash2, Upload, FileText, ChevronUp, ChevronDown, MapPin } from 'lucide-react';

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

interface ClientChartsProps {
  client: Client;
  onBack: () => void;
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

export default function ClientCharts({ client, onBack, token }: ClientChartsProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPeriod, setViewPeriod] = useState<'6months' | '12months' | 'custom'>('6months');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [newMetricValue, setNewMetricValue] = useState<string>('');
  const [notes, setNotes] = useState<string>(client.notes || '');
  const [editingNotes, setEditingNotes] = useState<boolean>(false);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [mapImage, setMapImage] = useState<string>(client.map_image || '');
  const [editingMap, setEditingMap] = useState<boolean>(false);
  const [mapLoading, setMapLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMetricMonth, setNewMetricMonth] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showExistingData, setShowExistingData] = useState<string | null>(null);
  const [editingExistingMetric, setEditingExistingMetric] = useState<Metric | null>(null);
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvPeriod, setCsvPeriod] = useState<string>('');
  const [csvDataType, setCsvDataType] = useState<'queries' | 'pages'>('queries');
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [activeGscTab, setActiveGscTab] = useState<'queries' | 'pages'>('queries');
  const [selectedGscPeriod, setSelectedGscPeriod] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<string>('clicks');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [leadPotential, setLeadPotential] = useState<LeadPotentialData | null>(null);
  const [leadPotentialLoading, setLeadPotentialLoading] = useState(true);
  const [editingLeadValue, setEditingLeadValue] = useState(false);
  const [newLeadValue, setNewLeadValue] = useState<string>('');
  const [leadValueLoading, setLeadValueLoading] = useState(false);
  const [editingConversionRate, setEditingConversionRate] = useState(false);
  const [newConversionRate, setNewConversionRate] = useState<string>('');
  const [conversionRateLoading, setConversionRateLoading] = useState(false);
  const [editingReviewsStart, setEditingReviewsStart] = useState(false);
  const [newReviewsStart, setNewReviewsStart] = useState<string>('');
  const [reviewsStartLoading, setReviewsStartLoading] = useState(false);

  // Get most recent period from available data
  const getMostRecentPeriod = useCallback(() => {
    const allPeriods = Array.from(new Set([
      ...searchQueries.map(q => q.period),
      ...topPages.map(p => p.period)
    ]));
    if (allPeriods.length === 0) return '';
    return allPeriods.sort((a, b) => b.localeCompare(a))[0];
  }, [searchQueries, topPages]);

  // Calculate previous month period (YYYY-MM format)
  const getPreviousMonthPeriod = (currentPeriod: string): string => {
    if (!currentPeriod) return '';
    const [year, month] = currentPeriod.split('-').map(Number);
    const prevMonth = new Date(year, month - 2); // month - 2 because JS months are 0-indexed
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  };

  // Get comparison data for an item between current and previous month
  const getComparisonData = useCallback((currentItem: any, field: string) => {
    const previousPeriod = getPreviousMonthPeriod(selectedGscPeriod);
    if (!previousPeriod) return null;

    const data = activeGscTab === 'queries' ? searchQueries : topPages;
    const keyField = activeGscTab === 'queries' ? 'query' : 'page_url';

    const previousItem = data.find(
      item => item[keyField] === currentItem[keyField] && item.period === previousPeriod
    );

    if (!previousItem) return null;

    const currentValue = currentItem[field];
    const previousValue = previousItem[field];
    const change = currentValue - previousValue;
    const percentChange = previousValue !== 0 ? (change / previousValue) * 100 : 0;

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

  useEffect(() => {
    fetchClientMetrics();
    fetchSearchQueries();
    fetchTopPages();
    fetchLeadPotential();
    // Set default month to current month
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    setNewMetricMonth(currentMonth);
    setCsvPeriod(currentMonth);
  }, []);

  useEffect(() => {
    if (metrics.length > 0) {
      processChartData();
    }
  }, [metrics, viewPeriod, selectedMonths]);

  const fetchClientMetrics = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.client_id}/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch client metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchQueries = async () => {
    try {
      const url = `http://localhost:5001/api/admin/clients/${client.client_id}/search-queries`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchQueries(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch search queries:', error);
    }
  };

  const fetchTopPages = async () => {
    try {
      const url = `http://localhost:5001/api/admin/clients/${client.client_id}/top-pages`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTopPages(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch top pages:', error);
    }
  };

  const fetchLeadPotential = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/dashboard/${client.client_id}/lead-potential`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeadPotential(data);
      }
    } catch (error) {
      console.error('Failed to fetch lead potential:', error);
    } finally {
      setLeadPotentialLoading(false);
    }
  };

  const saveLeadValue = async () => {
    if (!newLeadValue || isNaN(parseFloat(newLeadValue))) {
      alert('Please enter a valid lead value');
      return;
    }

    setLeadValueLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.id}/lead-value`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_value: parseFloat(newLeadValue)
        })
      });

      if (response.ok) {
        setEditingLeadValue(false);
        setNewLeadValue('');
        // Refresh lead potential data to show updated calculations
        await fetchLeadPotential();
      } else {
        const error = await response.json();
        alert(`Failed to update lead value: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating lead value:', error);
      alert('Failed to update lead value');
    } finally {
      setLeadValueLoading(false);
    }
  };

  const saveConversionRate = async () => {
    if (!newConversionRate || isNaN(parseFloat(newConversionRate))) {
      alert('Please enter a valid conversion rate');
      return;
    }

    const rate = parseFloat(newConversionRate);
    if (rate < 0 || rate > 100) {
      alert('Conversion rate must be between 0% and 100%');
      return;
    }

    setConversionRateLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.id}/conversion-rate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversion_rate: rate
        })
      });

      if (response.ok) {
        setEditingConversionRate(false);
        setNewConversionRate('');
        // Refresh lead potential data to show updated calculations
        await fetchLeadPotential();
      } else {
        const error = await response.json();
        alert(`Failed to update conversion rate: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating conversion rate:', error);
      alert('Failed to update conversion rate');
    } finally {
      setConversionRateLoading(false);
    }
  };

  const saveReviewsStartCount = async () => {
    if (!newReviewsStart || isNaN(parseInt(newReviewsStart))) {
      alert('Please enter a valid number for starting reviews count');
      return;
    }

    setReviewsStartLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.id}/reviews-start-count`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reviews_start_count: parseInt(newReviewsStart)
        })
      });

      if (response.ok) {
        setEditingReviewsStart(false);
        setNewReviewsStart('');
        // Update the client object to reflect the change
        client.reviews_start_count = parseInt(newReviewsStart);
        // Refresh chart data to recalculate cumulative values
        if (metrics.length > 0) {
          processChartData();
        }
      } else {
        const error = await response.json();
        alert(`Failed to update reviews start count: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating reviews start count:', error);
      alert('Failed to update reviews start count');
    } finally {
      setReviewsStartLoading(false);
    }
  };

  const handlePeriodFilter = useCallback((period: string) => {
    setSelectedGscPeriod(period);
    setCurrentPage(1); // Reset to first page
    if (activeGscTab === 'queries') {
      fetchSearchQueries(period || undefined);
    } else {
      fetchTopPages(period || undefined);
    }
  }, [activeGscTab, client.client_id, token]);

  const handleTabSwitch = useCallback((tab: 'queries' | 'pages') => {
    setActiveGscTab(tab);
    setCurrentPage(1); // Reset to first page
    if (tab === 'queries') {
      fetchSearchQueries();
    } else {
      fetchTopPages();
    }
  }, [client.client_id, token]);

  // Pagination logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortedData = () => {
    const data = activeGscTab === 'queries' ? searchQueries : topPages;
    // Filter by selected period only
    const filteredData = selectedGscPeriod ? data.filter(item => item.period === selectedGscPeriod) : data;
    return [...filteredData].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle string values (query, page_url)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const getCurrentData = () => {
    const sortedData = getSortedData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const data = activeGscTab === 'queries' ? searchQueries : topPages;
    return Math.ceil(data.length / itemsPerPage);
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';

    return (
      <th
        className="text-left px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center justify-between">
          {children}
          <div className="flex flex-col ml-1">
            <ChevronUp
              className={`w-3 h-3 ${isActive && isAsc ? 'text-primary-blue' : 'text-gray-400'}`}
            />
            <ChevronDown
              className={`w-3 h-3 -mt-1 ${isActive && !isAsc ? 'text-primary-blue' : 'text-gray-400'}`}
            />
          </div>
        </div>
      </th>
    );
  };

  const ComparisonCell = ({ comparison, showPercent = true, isPosition = false }: { comparison: any; showPercent?: boolean; isPosition?: boolean }) => {
    if (!comparison) {
      return <span className="text-xs text-gray-400">-</span>;
    }

    const { change, percentChange, isIncrease, isDecrease } = comparison;

    // For position, reverse the logic - decrease is good (green/up), increase is bad (red/down)
    const isGood = isPosition ? isDecrease : isIncrease;
    const isBad = isPosition ? isIncrease : isDecrease;

    const color = isGood ? 'text-green-600' : isBad ? 'text-red-600' : 'text-gray-500';
    const ArrowIcon = isGood ? TrendingUp : isBad ? TrendingDown : null;

    return (
      <div className={`flex items-center text-xs ${color}`}>
        {ArrowIcon && <ArrowIcon className="w-3 h-3 mr-1" />}
        <span>
          {showPercent
            ? `${Math.abs(percentChange).toFixed(1)}%`
            : Math.abs(change).toLocaleString()
          }
        </span>
      </div>
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table when changing pages
    const tableContainer = document.querySelector('[data-table-container]');
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pagination component
  const PaginationControls = () => {
    const totalPages = getTotalPages();
    const currentData = activeGscTab === 'queries' ? searchQueries : topPages;

    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 7;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, currentData.length);

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        <div className="text-sm text-gray-700">
          Showing {startIndex.toLocaleString()} to {endIndex.toLocaleString()} of {currentData.length.toLocaleString()} results
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? handlePageChange(page) : undefined}
                disabled={page === '...' || page === currentPage}
                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                  page === currentPage
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : page === '...'
                    ? 'border-transparent cursor-default'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const processChartData = () => {
    const monthlyData: { [key: string]: ChartData } = {};

    metrics.forEach(metric => {
      const month = metric.date;
      if (!monthlyData[month]) {
        monthlyData[month] = { month };
      }

      monthlyData[month][metric.metric_type as keyof ChartData] = metric.value;
    });

    // Calculate cumulative reviews
    const reviewsStartCount = client.reviews_start_count || 0;
    let cumulativeReviews = reviewsStartCount;

    let sortedData = Object.values(monthlyData).sort((a, b) =>
      new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime()
    );

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

    // Filter based on view period
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    if (viewPeriod === '6months') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      const sixMonthsAgoStr = sixMonthsAgo.getFullYear() + '-' + String(sixMonthsAgo.getMonth() + 1).padStart(2, '0');

      sortedData = sortedData.filter(item => item.month >= sixMonthsAgoStr && item.month <= currentMonth);
    } else if (viewPeriod === '12months') {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      const twelveMonthsAgoStr = twelveMonthsAgo.getFullYear() + '-' + String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0');

      sortedData = sortedData.filter(item => item.month >= twelveMonthsAgoStr && item.month <= currentMonth);
    } else if (viewPeriod === 'custom' && selectedMonths.length > 0) {
      sortedData = sortedData.filter(item => selectedMonths.includes(item.month));
    }

    // Format month labels
    sortedData = sortedData.map(item => ({
      ...item,
      month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }));

    setChartData(sortedData);
  };

  const getAvailableMonths = () => {
    const months = [...new Set(metrics.map(m => m.date))].sort();
    return months;
  };

  const getTotalGBPData = () => {
    return chartData.map(item => ({
      ...item,
      total: (item.gbp_calls || 0) + (item.gbp_directions || 0) + (item.gbp_website_clicks || 0)
    }));
  };

  const calculateDaysSinceStart = () => {
    if (!client.start_date) return null;

    const startDate = new Date(client.start_date);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const handleNewMetricValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMetricValue(e.target.value);
  }, []);

  const handleNewMetricMonthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMetricMonth(e.target.value);
  }, []);

  const handleAddMetric = useCallback(async (metricType: string) => {
    if (!newMetricValue || !newMetricMonth) {
      alert('Please enter both value and month');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5001/api/dashboard/${client.client_id}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metric_type: metricType,
          metric_name: metricType,
          value: parseFloat(newMetricValue),
          date: newMetricMonth
        })
      });

      if (response.ok) {
        setEditingMetric(null);
        setNewMetricValue('');
        await fetchClientMetrics(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Failed to add metric: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding metric:', error);
      alert('Failed to add metric');
    } finally {
      setSubmitting(false);
    }
  }, [newMetricValue, newMetricMonth, token, client.client_id, fetchClientMetrics]);

  const openEditForm = (metricType: string) => {
    setEditingMetric(metricType);
    setNewMetricValue('');
  };

  const closeEditForm = () => {
    setEditingMetric(null);
    setNewMetricValue('');
  };

  const saveNotes = async () => {
    setNotesLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: notes
        })
      });

      if (response.ok) {
        setEditingNotes(false);
        // Update the client object to reflect the change
        client.notes = notes;
      } else {
        const error = await response.json();
        alert(`Failed to save notes: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setNotesLoading(false);
    }
  };

  const cancelNotesEdit = () => {
    setNotes(client.notes || '');
    setEditingNotes(false);
  };

  const uploadMapImage = async () => {
    if (!selectedFile) {
      alert('Please select an image file');
      return;
    }

    setMapLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.id}/map-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setMapImage(result.map_image);
        setEditingMap(false);
        setSelectedFile(null);
        // Update the client object to reflect the change
        client.map_image = result.map_image;
      } else {
        const error = await response.json();
        alert(`Failed to upload map image: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading map image:', error);
      alert('Failed to upload map image');
    } finally {
      setMapLoading(false);
    }
  };

  const cancelMapEdit = () => {
    setSelectedFile(null);
    setEditingMap(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleEditExistingMetric = async (metric: Metric, newValue: number) => {
    setSubmitting(true);
    try {
      // Since there's no PUT endpoint, we'll delete and recreate
      await fetch(`http://localhost:5001/api/admin/metrics/${metric.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Add new metric with updated value
      const response = await fetch(`http://localhost:5001/api/dashboard/${client.client_id}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          metric_type: metric.metric_type,
          metric_name: metric.metric_type,
          value: newValue,
          date: metric.date
        })
      });

      if (response.ok) {
        setEditingExistingMetric(null);
        await fetchClientMetrics();
      } else {
        const error = await response.json();
        alert(`Failed to update metric: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating metric:', error);
      alert('Failed to update metric');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMetric = async (metricId: number) => {
    if (!confirm('Are you sure you want to delete this metric?')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5001/api/admin/metrics/${metricId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchClientMetrics();
      } else {
        const error = await response.json();
        alert(`Failed to delete metric: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting metric:', error);
      alert('Failed to delete metric');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedCsvFile(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedCsvFile || !csvPeriod) {
      alert('Please select a CSV file and enter a period');
      return;
    }

    setUploadingCsv(true);
    try {
      const formData = new FormData();
      formData.append('csv', selectedCsvFile);
      formData.append('period', csvPeriod);
      formData.append('data_type', csvDataType);

      const response = await fetch(`http://localhost:5001/api/admin/clients/${client.client_id}/upload-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const dataTypeName = csvDataType === 'pages' ? 'top pages' : 'search queries';
        alert(`Successfully uploaded ${result.recordsInserted} ${dataTypeName}`);
        setSelectedCsvFile(null);
        setCsvPeriod('');
        if (csvDataType === 'pages') {
          await fetchTopPages();
        } else {
          await fetchSearchQueries();
        }
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Failed to upload CSV file');
    } finally {
      setUploadingCsv(false);
    }
  };

  const getMetricsForType = (metricType: string): Metric[] => {
    return metrics.filter(m => m.metric_type === metricType).sort((a, b) =>
      new Date(b.date + '-01').getTime() - new Date(a.date + '-01').getTime()
    );
  };

  const EditForm = ({ metricType, title }: { metricType: string; title: string }) => (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h5 className="text-sm font-medium text-text-dark mb-3">Add {title} Data</h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Month (YYYY-MM)</label>
          <input
            key={`month-input-${metricType}`}
            type="month"
            value={newMetricMonth}
            onChange={handleNewMetricMonthChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
          <input
            key={`value-input-${metricType}`}
            type="number"
            value={newMetricValue}
            onChange={handleNewMetricValueChange}
            placeholder="Enter value"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue"
            autoComplete="off"
          />
        </div>
        <div className="flex items-end space-x-2">
          <button
            onClick={() => handleAddMetric(metricType)}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-primary-blue text-white rounded hover:bg-light-blue disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add'}
          </button>
          <button
            onClick={closeEditForm}
            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const ExistingDataSection = ({ metricType, title }: { metricType: string; title: string }) => {
    const existingMetrics = getMetricsForType(metricType);

    if (existingMetrics.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-sm font-medium text-text-dark">Existing {title} Data</h5>
          <button
            onClick={() => setShowExistingData(showExistingData === metricType ? null : metricType)}
            className="text-xs text-primary-blue hover:text-light-blue"
          >
            {showExistingData === metricType ? 'Hide' : 'Show'} ({existingMetrics.length})
          </button>
        </div>

        {showExistingData === metricType && (
          <div className="space-y-2">
            {existingMetrics.map(metric => (
              <div key={metric.id} className="flex items-center justify-between bg-white p-3 rounded border">
                {editingExistingMetric?.id === metric.id ? (
                  <EditExistingMetricForm
                    metric={metric}
                    onSave={(newValue) => handleEditExistingMetric(metric, newValue)}
                    onCancel={() => setEditingExistingMetric(null)}
                  />
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium text-text-dark">
                        {new Date(metric.date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                      <span className="ml-3 text-primary-blue font-semibold">{metric.value}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingExistingMetric(metric)}
                        className="text-primary-blue hover:text-light-blue"
                        disabled={submitting}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMetric(metric.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={submitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const EditExistingMetricForm = ({
    metric,
    onSave,
    onCancel
  }: {
    metric: Metric;
    onSave: (newValue: number) => void;
    onCancel: () => void;
  }) => {
    const [value, setValue] = useState(metric.value.toString());

    return (
      <div className="flex items-center space-x-2 flex-1">
        <span className="text-sm text-text-dark">
          {new Date(metric.date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded w-20"
          autoFocus
        />
        <button
          onClick={() => onSave(parseFloat(value))}
          disabled={submitting || !value}
          className="px-2 py-1 text-xs bg-primary-blue text-white rounded hover:bg-light-blue disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center px-3 py-2 text-gray-700 hover:text-text-dark hover:bg-gray-100 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </button>
          <div>
            <h2 className="text-2xl font-bold text-text-dark">{client.client_id} Analytics</h2>
            <p className="text-gray-700">Performance data and insights</p>
          </div>
        </div>

      </div>

      {/* Lead Potential Value Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">Lead Potential Value</h3>
              <p className="text-sm text-gray-600 mt-1">Based on {leadPotential?.conversion_rate || 50}% conversion rate</p>
            </div>
          </div>
          {leadPotential && (
            <div className="flex items-center gap-3">
              {editingLeadValue ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Lead Value: £</span>
                  <input
                    type="number"
                    value={newLeadValue}
                    onChange={(e) => setNewLeadValue(e.target.value)}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                    min="0"
                    step="1"
                    autoFocus
                  />
                  <button
                    onClick={saveLeadValue}
                    disabled={leadValueLoading || !newLeadValue}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {leadValueLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingLeadValue(false);
                      setNewLeadValue('');
                    }}
                    disabled={leadValueLoading}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    Estimated Job Value: <span className="font-semibold text-green-600">£{leadPotential.lead_value.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingLeadValue(true);
                      setNewLeadValue(leadPotential.lead_value.toString());
                    }}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              )}
              {editingConversionRate ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Conversion Rate:</span>
                  <input
                    type="number"
                    value={newConversionRate}
                    onChange={(e) => setNewConversionRate(e.target.value)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="100"
                    step="0.1"
                    autoFocus
                  />
                  <span className="text-sm text-gray-600">%</span>
                  <button
                    onClick={saveConversionRate}
                    disabled={conversionRateLoading || !newConversionRate}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {conversionRateLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingConversionRate(false);
                      setNewConversionRate('');
                    }}
                    disabled={conversionRateLoading}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    Conversion Rate: <span className="font-semibold text-green-600">{leadPotential.conversion_rate}%</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingConversionRate(true);
                      setNewConversionRate(leadPotential.conversion_rate.toString());
                    }}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {leadPotentialLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : leadPotential ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Month */}
            <div className="bg-white rounded-lg p-6 border border-green-200">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Last Month</h4>
                <p className="text-sm text-gray-600">
                  {new Date(leadPotential.current_month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  £{leadPotential.current_month.total_value.toLocaleString()}
                </div>
                <div className="text-lg text-gray-600">
                  {leadPotential.current_month.total_clicks.toLocaleString()} clicks × {leadPotential.conversion_rate}% × £{leadPotential.lead_value.toLocaleString()}
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-gray-700 text-center mb-3">Breakdown by Source:</h5>
                {leadPotential.current_month.breakdown.map((item) => {
                  const getMetricDisplay = (type: string) => {
                    switch (type) {
                      case 'gbp_website_clicks':
                        return { label: 'GBP Website Clicks', icon: MousePointer, color: 'text-orange-600' };
                      case 'gbp_phone_calls':
                        return { label: 'GBP Phone Calls', icon: Phone, color: 'text-blue-600' };
                      case 'gsc_organic_clicks':
                        return { label: 'Organic Search Clicks', icon: Search, color: 'text-purple-600' };
                      default:
                        return { label: type, icon: TrendingUp, color: 'text-gray-600' };
                    }
                  };
                  const display = getMetricDisplay(item.metric_type);
                  const IconComponent = display.icon;
                  return (
                    <div key={item.metric_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <IconComponent className={`w-4 h-4 mr-2 ${display.color}`} />
                        <span className="text-sm text-gray-700">{display.label}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">{item.total_value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">
                          {item.total_value} × {leadPotential.conversion_rate}% × £{leadPotential.lead_value} = £{(item.total_value * leadPotential.conversion_rate / 100 * leadPotential.lead_value).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Since Start */}
            <div className="bg-white rounded-lg p-6 border border-green-200">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Since Started with WELTO</h4>
                <p className="text-sm text-gray-600">
                  Since {new Date(leadPotential.since_start.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  £{leadPotential.since_start.total_value.toLocaleString()}
                </div>
                <div className="text-lg text-gray-600">
                  {leadPotential.since_start.total_clicks.toLocaleString()} clicks × {leadPotential.conversion_rate}% × £{leadPotential.lead_value.toLocaleString()}
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-gray-700 text-center mb-3">Breakdown by Source:</h5>
                {leadPotential.since_start.breakdown.map((item) => {
                  const getMetricDisplay = (type: string) => {
                    switch (type) {
                      case 'gbp_website_clicks':
                        return { label: 'GBP Website Clicks', icon: MousePointer, color: 'text-orange-600' };
                      case 'gbp_phone_calls':
                        return { label: 'GBP Phone Calls', icon: Phone, color: 'text-blue-600' };
                      case 'gsc_organic_clicks':
                        return { label: 'Organic Search Clicks', icon: Search, color: 'text-purple-600' };
                      default:
                        return { label: type, icon: TrendingUp, color: 'text-gray-600' };
                    }
                  };
                  const display = getMetricDisplay(item.metric_type);
                  const IconComponent = display.icon;
                  return (
                    <div key={item.metric_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <IconComponent className={`w-4 h-4 mr-2 ${display.color}`} />
                        <span className="text-sm text-gray-700">{display.label}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800">{item.total_value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">
                          {item.total_value} × {leadPotential.conversion_rate}% × £{leadPotential.lead_value} = £{(item.total_value * leadPotential.conversion_rate / 100 * leadPotential.lead_value).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No lead potential data available</p>
            <p className="text-sm text-gray-500">
              Add GBP and organic search metrics to see lead potential calculations
            </p>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-dark flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Client Notes
          </h3>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="flex items-center px-3 py-2 text-sm text-primary-blue hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about client progress, observations, or important information..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue resize-none"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={cancelNotesEdit}
                disabled={notesLoading}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={notesLoading}
                className="flex items-center px-4 py-2 text-sm bg-primary-blue text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {notesLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                Save Notes
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-[100px]">
            {notes ? (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes added yet. Click "Edit" to add notes about this client's progress and data insights.</p>
            )}
          </div>
        )}
      </div>


      {/* Client Timeline Information */}
      {client.start_date && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-primary-blue rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm font-medium text-gray-700">Work Started</p>
              <p className="text-lg font-bold text-text-dark">
                {new Date(client.start_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Today's Date</p>
              <p className="text-lg font-bold text-text-dark">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Days Working Together</p>
              <p className="text-2xl font-bold text-primary-blue">
                {calculateDaysSinceStart()} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Month Selection */}
      {viewPeriod === 'custom' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-text-dark mb-3">Select Months to Display:</h4>
          <div className="flex flex-wrap gap-2">
            {getAvailableMonths().map(month => (
              <label key={month} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMonths.includes(month)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMonths([...selectedMonths, month]);
                    } else {
                      setSelectedMonths(selectedMonths.filter(m => m !== month));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {chartData.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-dark mb-2">No Data Available</h3>
            <p className="text-gray-700">Add metrics for this client to see performance charts.</p>
          </div>

          {/* Add Data Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Business Profile Metrics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 text-primary-blue mr-2" />
                Google Business Profile Metrics
              </h3>

              <div className="space-y-4">
                {['gbp_calls', 'gbp_directions', 'gbp_website_clicks', 'gbp_reviews'].map((metricType) => {
                  const titles = {
                    'gbp_calls': 'Phone Calls',
                    'gbp_directions': 'Directions',
                    'gbp_website_clicks': 'Website Clicks',
                    'gbp_reviews': 'Reviews (New)'
                  };

                  return (
                    <div key={metricType} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">{titles[metricType]}</h4>
                        <button
                          onClick={() => openEditForm(metricType)}
                          className="flex items-center px-2 py-1 text-xs bg-primary-blue text-white rounded hover:bg-light-blue"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </button>
                      </div>

                      {editingMetric === metricType && (
                        <EditForm metricType={metricType} title={titles[metricType]} />
                      )}

                      <ExistingDataSection metricType={metricType} title={titles[metricType]} />
                    </div>
                  );
                })}

                {/* Reviews Start Count Setting */}
                <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Reviews Starting Count</h4>
                    {editingReviewsStart ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newReviewsStart}
                          onChange={(e) => setNewReviewsStart(e.target.value)}
                          placeholder="Start count"
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                          min="0"
                        />
                        <button
                          onClick={saveReviewsStartCount}
                          disabled={reviewsStartLoading}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {reviewsStartLoading ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingReviewsStart(false);
                            setNewReviewsStart('');
                          }}
                          disabled={reviewsStartLoading}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingReviewsStart(true);
                          setNewReviewsStart((client.reviews_start_count || 0).toString());
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-1 rounded"
                      >
                        Set: {client.reviews_start_count || 0}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Set how many reviews this client had when you started working with them.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Search Console Metrics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
                <Search className="w-5 h-5 text-primary-blue mr-2" />
                Google Search Console Metrics
              </h3>

              <div className="space-y-4">
                {['gsc_organic_clicks', 'gsc_organic_impressions'].map((metricType) => {
                  const titles = {
                    'gsc_organic_clicks': 'Organic Clicks',
                    'gsc_organic_impressions': 'Organic Impressions'
                  };

                  return (
                    <div key={metricType} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">{titles[metricType]}</h4>
                        <button
                          onClick={() => openEditForm(metricType)}
                          className="flex items-center px-2 py-1 text-xs bg-primary-blue text-white rounded hover:bg-light-blue"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </button>
                      </div>

                      {editingMetric === metricType && (
                        <EditForm metricType={metricType} title={titles[metricType]} />
                      )}

                      <ExistingDataSection metricType={metricType} title={titles[metricType]} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* View Period Controls */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-dark">Chart View Period</h3>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-700" />
                <select
                  value={viewPeriod}
                  onChange={(e) => setViewPeriod(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue text-text-dark bg-white"
                >
                  <option value="6months">Last 6 Months</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="custom">Custom Period</option>
                </select>
              </div>
            </div>
          </div>

          {/* Google Business Profile Total Performance */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-primary-blue mr-2" />
              <h3 className="text-lg font-semibold text-text-dark">Google Business Profile - Total Performance</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getTotalGBPData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#004bad" fill="#0066cc" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Individual GBP Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calls */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-primary-blue mr-2" />
                  <h4 className="text-md font-semibold text-text-dark">Phone Calls</h4>
                </div>
                <button
                  onClick={() => openEditForm('gbp_calls')}
                  className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gbp_calls" stroke="#004bad" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gbp_calls' && (
                <EditForm metricType="gbp_calls" title="Phone Calls" />
              )}
              <ExistingDataSection metricType="gbp_calls" title="Phone Calls" />
            </div>

            {/* Directions */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Navigation className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="text-md font-semibold text-text-dark">Directions</h4>
                </div>
                <button
                  onClick={() => openEditForm('gbp_directions')}
                  className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gbp_directions" stroke="#0066cc" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gbp_directions' && (
                <EditForm metricType="gbp_directions" title="Directions" />
              )}
              <ExistingDataSection metricType="gbp_directions" title="Directions" />
            </div>

            {/* Website Clicks */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MousePointer className="w-5 h-5 text-orange-600 mr-2" />
                  <h4 className="text-md font-semibold text-text-dark">Website Clicks</h4>
                </div>
                <button
                  onClick={() => openEditForm('gbp_website_clicks')}
                  className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gbp_website_clicks" stroke="#fbb22f" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gbp_website_clicks' && (
                <EditForm metricType="gbp_website_clicks" title="Website Clicks" />
              )}
              <ExistingDataSection metricType="gbp_website_clicks" title="Website Clicks" />
            </div>

            {/* Reviews */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="text-md font-semibold text-text-dark">Reviews (Cumulative)</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditForm('gbp_reviews')}
                    className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Data
                  </button>
                  {editingReviewsStart ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={newReviewsStart}
                        onChange={(e) => setNewReviewsStart(e.target.value)}
                        placeholder="Start count"
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                        min="0"
                      />
                      <button
                        onClick={saveReviewsStartCount}
                        disabled={reviewsStartLoading}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {reviewsStartLoading ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingReviewsStart(false);
                          setNewReviewsStart('');
                        }}
                        disabled={reviewsStartLoading}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingReviewsStart(true);
                        setNewReviewsStart((client.reviews_start_count || 0).toString());
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-1 rounded"
                      title="Set starting review count"
                    >
                      Start: {client.reviews_start_count || 0}
                    </button>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gbp_reviews_cumulative" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gbp_reviews' && (
                <EditForm metricType="gbp_reviews" title="Reviews (New)" />
              )}
              <ExistingDataSection metricType="gbp_reviews" title="Reviews" />
            </div>
          </div>

          {/* Google Search Console */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Organic Clicks */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Search className="w-5 h-5 text-primary-blue mr-2" />
                  <h4 className="text-lg font-semibold text-text-dark">Organic Clicks</h4>
                </div>
                <button
                  onClick={() => openEditForm('gsc_organic_clicks')}
                  className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gsc_organic_clicks" stroke="#004bad" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gsc_organic_clicks' && (
                <EditForm metricType="gsc_organic_clicks" title="Organic Clicks" />
              )}
              <ExistingDataSection metricType="gsc_organic_clicks" title="Organic Clicks" />
            </div>

            {/* Organic Impressions */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Eye className="w-5 h-5 text-indigo-600 mr-2" />
                  <h4 className="text-lg font-semibold text-text-dark">Organic Impressions</h4>
                </div>
                <button
                  onClick={() => openEditForm('gsc_organic_impressions')}
                  className="flex items-center px-3 py-1 text-sm bg-primary-blue text-white rounded hover:bg-light-blue"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Data
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="gsc_organic_impressions" stroke="#0066cc" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              {editingMetric === 'gsc_organic_impressions' && (
                <EditForm metricType="gsc_organic_impressions" title="Organic Impressions" />
              )}
              <ExistingDataSection metricType="gsc_organic_impressions" title="Organic Impressions" />
            </div>
          </div>

          {/* Google Search Console CSV Upload */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <Upload className="w-5 h-5 text-primary-blue mr-2" />
              <h3 className="text-lg font-semibold text-text-dark">Upload Google Search Console CSV</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                <select
                  value={csvDataType}
                  onChange={(e) => setCsvDataType(e.target.value as 'queries' | 'pages')}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue"
                >
                  <option value="queries">Search Queries</option>
                  <option value="pages">Top Pages</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period (YYYY-MM)</label>
                <input
                  type="month"
                  value={csvPeriod}
                  onChange={(e) => setCsvPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCsvUpload}
                  disabled={uploadingCsv || !selectedCsvFile || !csvPeriod}
                  className="w-full px-4 py-2 bg-primary-blue text-white rounded hover:bg-light-blue disabled:opacity-50"
                >
                  {uploadingCsv ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Upload separate CSV files from Google Search Console:<br/>
              <strong>Search Queries:</strong> Query, Clicks, Impressions, Position<br/>
              <strong>Top Pages:</strong> Page/URL, Clicks, Impressions, Position
            </p>
          </div>

          {/* Google Search Console Data Tabs */}
          {(searchQueries.length > 0 || topPages.length > 0) && (
            <div className="bg-white rounded-lg border border-gray-200">
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
                        ]))
                        .sort((a, b) => b.localeCompare(a))
                        .map(period => (
                          <option key={period} value={period}>
                            {new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tab Headers */}
                <div className="flex px-6">
                  <button
                    onClick={() => handleTabSwitch('queries')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeGscTab === 'queries'
                        ? 'border-primary-blue text-primary-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Search Queries ({searchQueries.length})
                  </button>
                  <button
                    onClick={() => handleTabSwitch('pages')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeGscTab === 'pages'
                        ? 'border-primary-blue text-primary-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Top Pages ({topPages.length})
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
                          <tr className="bg-gray-50">
                            <SortableHeader field="query">Query</SortableHeader>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="clicks">Clicks</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="impressions">Impressions</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="position">Position</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCurrentData().map((query) => (
                            <tr key={query.id} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-text-dark font-medium">
                                {query.query}
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-primary-blue font-semibold">
                                    {query.clicks.toLocaleString()}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(query, 'clicks')} showPercent={false} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-gray-700">
                                    {query.impressions.toLocaleString()}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(query, 'impressions')} showPercent={false} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-gray-700">
                                    {query.position.toFixed(1)}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(query, 'position')} showPercent={false} isPosition={true} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 border-l border-gray-300">
                                {new Date(query.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls />
                  </div>
                )}

                {activeGscTab === 'pages' && topPages.length > 0 && (
                  <div>
                    <div className="overflow-x-auto" data-table-container>
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="bg-gray-50">
                            <SortableHeader field="page_url">Page URL</SortableHeader>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="clicks">Clicks</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="impressions">Impressions</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">
                              <SortableHeader field="position">Position</SortableHeader>
                            </th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-300">Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCurrentData().map((page) => (
                            <tr key={page.id} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-text-dark font-medium max-w-xs">
                                <div className="truncate" title={page.page_url}>
                                  {page.page_url}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-primary-blue font-semibold">
                                    {page.clicks.toLocaleString()}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(page, 'clicks')} showPercent={false} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-gray-700">
                                    {page.impressions.toLocaleString()}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(page, 'impressions')} showPercent={false} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-l border-gray-300">
                                <div className="flex flex-col">
                                  <span className="text-gray-700">
                                    {page.position.toFixed(1)}
                                  </span>
                                  <ComparisonCell comparison={getComparisonData(page, 'position')} showPercent={false} isPosition={true} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 border-l border-gray-300">
                                {new Date(page.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls />
                  </div>
                )}

                {/* Empty State */}
                {((activeGscTab === 'queries' && searchQueries.length === 0) ||
                  (activeGscTab === 'pages' && topPages.length === 0)) && (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-700 mb-2">
                      No {activeGscTab === 'queries' ? 'search queries' : 'top pages'} data available.
                    </p>
                    <p className="text-sm text-gray-700">
                      Upload your Google Search Console CSV file to see {activeGscTab === 'queries' ? 'query' : 'page'} performance data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Image Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-dark flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Map Pack Position
              </h3>
              {!editingMap && (
                <button
                  onClick={() => setEditingMap(true)}
                  className="flex items-center px-3 py-2 text-sm text-primary-blue hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </button>
              )}
            </div>

            {editingMap ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Map Screenshot
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="map-image-upload"
                    />
                    <label
                      htmlFor="map-image-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 text-center">
                        Click to select a map screenshot or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, or other image formats
                      </p>
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        Selected: <span className="font-medium">{selectedFile.name}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={cancelMapEdit}
                    disabled={mapLoading}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={uploadMapImage}
                    disabled={mapLoading || !selectedFile}
                    className="flex items-center px-4 py-2 text-sm bg-primary-blue text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {mapLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                    Upload Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-h-[500px]">
                {mapImage ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:5001${mapImage}`}
                      alt="Map Pack Position"
                      className="w-full h-auto max-h-[700px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No map image uploaded yet</p>
                    <p className="text-sm text-gray-500">
                      Click "Upload Image" to add a screenshot of your client's local search results
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}