import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeEmployees: 0,
    todaysPresent: 0,
    activeQuotes: 0,
    unpaidInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // 1. Active Employees
        const { count: activeEmployees } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Active');

        // 2. Today's Present
        const today = new Date().toISOString().split('T')[0];
        const { count: todaysPresent } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .eq('present', 'Y');

        // 3. Active Quotes
        const { count: activeQuotes } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');

        // 4. Unpaid Invoices
        const { count: unpaidInvoices } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .in('payment_status', ['Unpaid', 'Partial']);

        setStats({
          activeEmployees: activeEmployees || 0,
          todaysPresent: todaysPresent || 0,
          activeQuotes: activeQuotes || 0,
          unpaidInvoices: unpaidInvoices || 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your business operations</p>
      </div>
      
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
          Loading stats...
        </div>
      ) : (
        <div className="placeholder-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Employees</span>
              <span className="stat-value">{stats.activeEmployees}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Today's Present</span>
              <span className="stat-value">{stats.todaysPresent}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Quotes</span>
              <span className="stat-value">{stats.activeQuotes}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon rose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Unpaid Invoices</span>
              <span className="stat-value">{stats.unpaidInvoices}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
