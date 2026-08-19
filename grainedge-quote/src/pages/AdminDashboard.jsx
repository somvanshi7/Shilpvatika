import { useEffect, useState } from 'react';
import { listQuotes, updateQuote, getPdfDownloadUrl, getQuotePreviewUrl } from '../lib/api.js';
import { QUOTE_STATUSES, formatCurrency, formatDate } from '../lib/constants.js';

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQuotes = async (currentToken) => {
    setLoading(true);
    setError('');
    try {
      const data = await listQuotes({ page, status: statusFilter, search }, currentToken);
      setQuotes(data.quotes);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      if (err.message.includes('401')) {
        setIsAuthenticated(false);
        localStorage.removeItem('adminToken');
      } else {
        setError('Failed to load quotes. ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchQuotes(token);
    }
  }, [isAuthenticated, page, statusFilter, search]);

  const handleLogin = (e) => {
    e.preventDefault();
    const inputToken = e.target.token.value;
    if (inputToken) {
      setToken(inputToken);
      localStorage.setItem('adminToken', inputToken);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setQuotes([]);
  };

  const handleStatusChange = async (slug, newStatus) => {
    try {
      await updateQuote(slug, { status: newStatus }, token);
      // Refresh
      fetchQuotes(token);
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container-narrow">
        <div className="card admin-login">
          <div className="lock-icon">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Admin Login</h2>
          <p>Please enter the admin secret key to access the dashboard.</p>
          <form onSubmit={handleLogin} className="login-group">
            <input type="password" name="token" placeholder="Enter admin secret..." required />
            <button type="submit" className="btn btn-primary">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="admin-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '.25rem' }}>Quotations</h1>
          <p style={{ color: 'var(--clr-text-secondary)', fontSize: '.9rem' }}>Manage all generated quotes.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
        </div>
      </div>

      <div className="admin-filters">
        <div style={{ display: 'flex', gap: '.5rem', flex: 1 }}>
          <button 
            className={`filter-btn ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => { setStatusFilter(''); setPage(1); }}
          >
            All
          </button>
          <button 
            className={`filter-btn ${statusFilter === QUOTE_STATUSES.READY ? 'active' : ''}`}
            onClick={() => { setStatusFilter(QUOTE_STATUSES.READY); setPage(1); }}
          >
            Ready
          </button>
          <button 
            className={`filter-btn ${statusFilter === QUOTE_STATUSES.PROCESSING ? 'active' : ''}`}
            onClick={() => { setStatusFilter(QUOTE_STATUSES.PROCESSING); setPage(1); }}
          >
            Processing
          </button>
          <button 
            className={`filter-btn ${statusFilter === QUOTE_STATUSES.ERROR ? 'active' : ''}`}
            onClick={() => { setStatusFilter(QUOTE_STATUSES.ERROR); setPage(1); }}
          >
            Errors
          </button>
        </div>
        
        <input 
          type="text" 
          placeholder="Search by client or ID..." 
          className="search-input"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
        <table>
          <thead>
            <tr>
              <th>Quote ID / Date</th>
              <th>Client Details</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Value</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--clr-text-light)' }}>No quotes found.</td></tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.slug}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--clr-accent)', fontSize: '.85rem' }}>{q.slug}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--clr-text-light)' }}>{formatDate(q.created_at)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{q.clientName}</div>
                    {q.company && <div style={{ fontSize: '.8rem', color: 'var(--clr-text-light)' }}>{q.company}</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${q.status}`}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(q.total)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="btn-group" style={{ justifyContent: 'flex-end', gap: '.4rem' }}>
                      <a href={getQuotePreviewUrl(q.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="Web Preview">
                        View
                      </a>
                      {q.status === QUOTE_STATUSES.READY && (
                        <a href={getPdfDownloadUrl(q.slug)} download className="btn btn-primary btn-sm" title="Download PDF">
                          PDF
                        </a>
                      )}
                      <select 
                        value={q.status} 
                        onChange={(e) => handleStatusChange(q.slug, e.target.value)}
                        style={{ padding: '.3rem .5rem', borderRadius: '4px', border: '1px solid var(--clr-border)', fontSize: '.75rem', background: '#fff' }}
                      >
                        <option value={QUOTE_STATUSES.PROCESSING}>Processing</option>
                        <option value={QUOTE_STATUSES.READY}>Ready</option>
                        <option value={QUOTE_STATUSES.EXPIRED}>Expired</option>
                        <option value={QUOTE_STATUSES.ERROR}>Error</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={page === i + 1 ? 'current' : ''} onClick={() => setPage(i + 1)}>
              {i + 1}
            </button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
