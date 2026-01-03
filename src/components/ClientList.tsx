'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, User, Calendar, Trash2, Plus, X } from 'lucide-react';
import ClientCharts from './ClientCharts';

interface Client {
  id: number;
  username: string;
  client_id: string;
  created_at: string;
  start_date?: string;
  notes?: string;
}

interface ClientListProps {
  token: string;
}

export default function ClientList({ token }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    password: '',
    client_id: '',
    start_date: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        throw new Error('Failed to fetch clients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setClients(clients.filter(client => client.id !== clientId));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const createClient = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/admin/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createFormData)
      });

      if (response.ok) {
        const data = await response.json();
        setClients([...clients, data.client]);
        setCreateFormData({ username: '', password: '', client_id: '', start_date: '' });
        setShowCreateForm(false);
        fetchClients();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  // Show client charts view
  if (showCharts && selectedClient) {
    return (
      <ClientCharts
        client={selectedClient}
        token={token}
        onBack={() => {
          setShowCharts(false);
          setSelectedClient(null);
        }}
      />
    );
  }

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
          <h2 className="text-2xl font-bold text-text-dark">Client Overview</h2>
          <p className="text-gray-700">View performance analytics for all clients</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError('')} className="text-red-800 underline text-sm">Dismiss</button>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-dark">Create New Client</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={createFormData.client_id}
                  onChange={(e) => setCreateFormData({...createFormData, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={createFormData.start_date}
                  onChange={(e) => setCreateFormData({...createFormData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createClient}
                  disabled={!createFormData.username || !createFormData.password || !createFormData.client_id}
                  className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Delete Client</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this client? This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteClient(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark mb-2">No Clients Found</h3>
          <p className="text-gray-700">Create clients in the Admin tab to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-blue rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-text-dark">{client.client_id}</h3>
                    <p className="text-sm text-gray-700">{client.username}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(client.id);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center text-sm text-gray-700 mb-4">
                <Calendar className="w-4 h-4 mr-2" />
                Created {new Date(client.created_at).toLocaleDateString()}
              </div>

              <button
                onClick={() => {
                  setSelectedClient(client);
                  setShowCharts(true);
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-light-blue transition-colors"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}