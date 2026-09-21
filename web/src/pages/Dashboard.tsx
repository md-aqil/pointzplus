import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

function App() {
  return <Dashboard />;
}

function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [statsRes, accountsRes] = await Promise.all([
          axios.get(`${API_URL}/analytics/portfolio/user-1`, { headers }), // Demo user
          axios.get(`${API_URL}/accounts`, { headers })
        ]);
        
        setStats(statsRes.data);
        setAccounts(accountsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
  </div>;

  const totalValue = stats?.summary?.total_points * 0.35 || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">PointzPlus</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">U</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500 mb-1">Total Points</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.summary?.total_points?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500 mb-1">Portfolio Value</p>
            <p className="text-3xl font-bold text-cyan-600">
              ₹{totalValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500 mb-1">Expiring Soon</p>
            <p className="text-3xl font-bold text-red-500">
              {stats?.summary?.expiring_points?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <p className="text-sm text-gray-500 mb-1">Linked Accounts</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.summary?.total_accounts || 0}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Points by Category</h2>
          <div className="space-y-4">
            {stats?.categories?.map((cat: any) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">{cat.category}</span>
                  <span className="text-sm font-bold text-gray-900">{cat.total_points?.toLocaleString()} pts</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                    style={{ width: `${(cat.total_points / stats.summary.total_points) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Linked Programs</h2>
            <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600">
              + Add Account
            </button>
          </div>
          <div className="divide-y">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                    {account.logo_initial || '💳'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{account.program_name}</p>
                    <p className="text-sm text-gray-500">{account.account_number_masked}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-lg">{account.current_balance?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">points</p>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No linked accounts yet. Add your first loyalty program!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;