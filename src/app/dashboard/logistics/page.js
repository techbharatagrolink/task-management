'use client';

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function LogisticsDashboard() {
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logistics/stats?period=${period}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const orderChartData = stats?.stats ? {
    labels: stats.stats.map(s => new Date(s.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Confirmed',
        data: stats.stats.map(s => s.confirmed_count || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      },
      {
        label: 'Dispatched',
        data: stats.stats.map(s => s.dispatched_count || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      },
      {
        label: 'Out for Delivery',
        data: stats.stats.map(s => s.out_for_delivery_count || 0),
        backgroundColor: 'rgba(255, 206, 86, 0.6)'
      },
      {
        label: 'Delivered',
        data: stats.stats.map(s => s.delivered_count || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      },
      {
        label: 'RTO',
        data: stats.stats.map(s => s.rto_count || 0),
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }
    ]
  } : null;

  const rtoChartData = stats?.stats ? {
    labels: stats.stats.map(s => new Date(s.date).toLocaleDateString()),
    datasets: [{
      label: 'RTO Percentage',
      data: stats.stats.map(s => s.rto_percentage || 0),
      borderColor: 'rgba(255, 99, 132, 1)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      tension: 0.1
    }]
  } : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Logistics Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 28 Days</option>
          <option value="last_month">Last Month</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totals.confirmed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Dispatched</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totals.dispatched}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Out for Delivery</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totals.out_for_delivery}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Delivered</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totals.delivered}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">RTO</p>
            <p className="text-2xl font-bold text-red-600">{stats.totals.rto}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totals.rto_percentage?.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orderChartData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Order Status Over Time</h2>
            <Bar data={orderChartData} />
          </div>
        )}

        {rtoChartData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">RTO Rate Trend</h2>
            <Line data={rtoChartData} />
          </div>
        )}
      </div>

      <div className="mt-6">
        <a
          href="/dashboard/logistics/orders"
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Manage Orders
        </a>
      </div>
    </div>
  );
}

