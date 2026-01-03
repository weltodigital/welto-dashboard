'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, BarChart3, Trash2, Edit3, TrendingUp } from 'lucide-react';
import ClientCharts from './ClientCharts';

interface Client {
  id: number;
  username: string;
  client_id: string;
  created_at: string;
  start_date?: string;
  notes?: string;
}

interface Metric {
  id: number;
  client_id: string;
  metric_type: string;
  value: number;
  date: string;
  created_at: string;
}

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientMetrics, setClientMetrics] = useState<Metric[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showStartDateForm, setShowStartDateForm] = useState(false);
  const [startDate, setStartDate] = useState('');

  const [newClient, setNewClient] = useState({ username: '', password: '', client_id: '', start_date: '' });
  const [editingNotes, setEditingNotes] = useState<{ [key: number]: boolean }>({});
  const [notesText, setNotesText] = useState<{ [key: number]: string }>({});
  const [newMetric, setNewMetric] = useState({ metric_type: '', value: '', month: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`http://localhost:5001/api/admin${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API call failed');
    }

    return response.json();
  };

  const fetchClients = async () => {
    try {
      const data = await apiCall('/clients');
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientMetrics = async (clientId: string) => {
    try {
      const data = await apiCall(`/clients/${clientId}/data`);
      setClientMetrics(data.metrics || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch client metrics');
    }
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });
      setNewClient({ username: '', password: '', client_id: '', start_date: '' });
      setShowCreateForm(false);
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  const deleteClient = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client? All their data will be lost.')) return;

    try {
      await apiCall(`/clients/${id}`, { method: 'DELETE' });
      fetchClients();
      if (selectedClient?.id === id) {
        setSelectedClient(null);
        setClientMetrics([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const addMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      await apiCall(`/clients/${selectedClient.client_id}/metrics`, {
        method: 'POST',
        body: JSON.stringify({
          ...newMetric,
          value: parseFloat(newMetric.value),
          month: newMetric.month || new Date().toISOString().slice(0, 7),
        }),
      });
      setNewMetric({ metric_type: '', value: '', month: '' });
      setShowMetricForm(false);
      fetchClientMetrics(selectedClient.client_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add metric');
    }
  };

  const deleteMetric = async (id: number) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;

    try {
      await apiCall(`/metrics/${id}`, { method: 'DELETE' });
      if (selectedClient) fetchClientMetrics(selectedClient.client_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metric');
    }
  };

  const updateStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !startDate) return;

    try {
      await apiCall(`/clients/${selectedClient.id}/start-date`, {
        method: 'PUT',
        body: JSON.stringify({ start_date: startDate }),
      });
      setStartDate('');
      setShowStartDateForm(false);
      fetchClients();
      // Update selected client with new start date
      setSelectedClient({ ...selectedClient, start_date: startDate });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update start date');
    }
  };

  const startEditingNotes = (client: Client) => {
    setEditingNotes({ ...editingNotes, [client.id]: true });
    setNotesText({ ...notesText, [client.id]: client.notes || '' });
  };

  const cancelEditingNotes = (clientId: number) => {
    setEditingNotes({ ...editingNotes, [clientId]: false });
    setNotesText({ ...notesText, [clientId]: '' });
  };

  const saveNotes = async (clientId: number) => {
    const notes = notesText[clientId] || '';

    try {
      await apiCall(`/clients/${clientId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
      setEditingNotes({ ...editingNotes, [clientId]: false });
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-dark">Client Management</h2>
          <p className="text-gray-700">Create clients and manage their SEO data</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-red-800 underline text-sm">Dismiss</button>
        </div>
      )}

      {/* Client Management Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-dark">Client Accounts</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Client
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-text-dark mb-4">Create New Client</h4>
            <form onSubmit={createClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={newClient.username}
                    onChange={(e) => setNewClient({ ...newClient, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newClient.password}
                    onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={newClient.client_id}
                    onChange={(e) => setNewClient({ ...newClient, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., CLIENT002"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newClient.start_date}
                    onChange={(e) => setNewClient({ ...newClient, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue"
                >
                  Create Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Client ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-text-dark">{client.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{client.client_id}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingNotes[client.id] ? (
                      <div className="flex items-center space-x-2">
                        <textarea
                          value={notesText[client.id] || ''}
                          onChange={(e) => setNotesText({ ...notesText, [client.id]: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-text-dark bg-white resize-none"
                          rows={2}
                          placeholder="Add notes about this client..."
                        />
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => saveNotes(client.id)}
                            className="px-2 py-1 bg-primary-blue text-white text-xs rounded hover:bg-light-blue"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => cancelEditingNotes(client.id)}
                            className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-700 flex-1">
                          {client.notes || 'No notes'}
                        </span>
                        <button
                          onClick={() => startEditingNotes(client)}
                          className="text-primary-blue hover:text-light-blue text-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        fetchClientMetrics(client.client_id);
                      }}
                      className="text-primary-blue hover:text-light-blue"
                    >
                      <Edit3 className="w-4 h-4 inline" /> Manage Data
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Data Management Section */}
      {selectedClient && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-text-dark">
                Client Data - {selectedClient.client_id}
              </h3>
              <p className="text-sm text-gray-700">
                Started: {selectedClient.start_date
                  ? new Date(selectedClient.start_date).toLocaleDateString()
                  : 'Not set'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              {!selectedClient.start_date && (
                <button
                  onClick={() => setShowStartDateForm(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Set Start Date
                </button>
              )}
              <button
                onClick={() => setShowMetricForm(true)}
                className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue"
              >
                <Plus className="w-4 h-4 inline mr-1" /> Add Metric
              </button>
            </div>
          </div>

          {/* Start Date Form */}
          {showStartDateForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-text-dark mb-4">Set Start Date</h4>
              <form onSubmit={updateStartDate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Set Start Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStartDateForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Metric Form */}
          {showMetricForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium mb-4">Add New Metric</h4>
              <form onSubmit={addMetric} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
                    <select
                      value={newMetric.metric_type}
                      onChange={(e) => setNewMetric({ ...newMetric, metric_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      required
                    >
                      <option value="">Select metric type</option>
                      <optgroup label="SEO Metrics">
                        <option value="organic_traffic">Organic Traffic</option>
                        <option value="keyword_rankings">Keyword Rankings</option>
                        <option value="backlinks">Backlinks</option>
                        <option value="local_ranking">Local Ranking</option>
                        <option value="click_through_rate">Click Through Rate</option>
                        <option value="conversion_rate">Conversion Rate</option>
                      </optgroup>
                      <optgroup label="Google Business Profile">
                        <option value="gbp_calls">Calls</option>
                        <option value="gbp_directions">Directions</option>
                        <option value="gbp_website_clicks">Website Clicks</option>
                      </optgroup>
                      <optgroup label="Google Search Console">
                        <option value="gsc_organic_clicks">Organic Clicks</option>
                        <option value="gsc_organic_impressions">Organic Impressions</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newMetric.value}
                      onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <input
                      type="month"
                      value={newMetric.month}
                      onChange={(e) => setNewMetric({ ...newMetric, month: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue"
                  >
                    Add Metric
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMetricForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Metrics Section */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Metrics</h4>
            {clientMetrics.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientMetrics.map((metric) => (
                      <tr key={metric.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-text-dark">
                          {metric.metric_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{metric.value}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {metric.date}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => deleteMetric(metric.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-700">No metrics added yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}