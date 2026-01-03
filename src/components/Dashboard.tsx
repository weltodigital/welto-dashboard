'use client';

import { useState, useEffect } from 'react';
import {
  LogOut,
  User
} from 'lucide-react';
import Image from 'next/image';
import ClientList from './ClientList';
import ClientDashboardView from './ClientDashboardView';

interface User {
  id: number;
  username: string;
  role: string;
  client_id?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const clientId = user.role === 'client' ? user.client_id : 'CLIENT001';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <Image
                  src="/welto-logo.png"
                  alt="WELTO Digital"
                  width={48}
                  height={48}
                  className="mr-3"
                />
                <h1 className="text-xl font-bold text-text-dark">Dashboard</h1>
              </div>
              {user.role === 'client' && (
                <span className="ml-4 px-3 py-1 bg-primary-blue text-white text-sm rounded-full">
                  Client: {clientId}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="w-4 h-4 mr-2" />
                {user.username}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {user.role === 'admin' ? (
          <ClientList token={localStorage.getItem('token') || ''} />
        ) : (
          <ClientDashboardView
            clientId={clientId || ''}
            token={localStorage.getItem('token') || ''}
          />
        )}
      </main>
    </div>
  );
}