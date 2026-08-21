import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PayoutsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      const { data: empData } = await supabase.from('employees').select('id, name, category, status').order('name');
      setEmployees(empData || []);

      const { data: reqData, error: reqErr } = await supabase
        .from('payout_requests')
        .select('*, employees(name, category)')
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;
      setRequests(reqData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePayout(id) {
    if (!window.confirm('Delete this payout request? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('payout_requests').delete().eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting payout:', err);
      alert('Failed to delete payout request.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        id: 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        employee_id: formData.employee_id,
        amount: Number(formData.amount),
        reason: formData.reason,
        status: 'Pending',
        actioned_by: null
      };

      const { error: err } = await supabase.from('payout_requests').insert([payload]);
      if (err) throw err;

      setIsModalOpen(false);
      setFormData({ employee_id: '', amount: '', reason: '' });
      fetchData();
    } catch (err) {
      setError('Failed to submit request: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(reqId, newStatus, empId, amount) {
    try {
      setLoading(true);
      const { error: err } = await supabase
        .from('payout_requests')
        .update({ 
          status: newStatus,
          actioned_by: profile?.id
        })
        .eq('id', reqId);
      
      if (err) throw err;

      // If marked as 'Paid', we must also create a Ledger transaction 'Advance'
      if (newStatus === 'Paid') {
        const txPayload = {
          id: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          employee_id: empId,
          date: new Date().toISOString().split('T')[0],
          type: 'Advance',
          amount: amount,
          notes: `Advance Payout: ${reqId}`,
          created_by: profile?.id
        };
        const { error: txErr } = await supabase.from('transactions').insert([txPayload]);
        if (txErr) console.error('Failed to create ledger transaction for payout', txErr);
      }

      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Payout Requests</h1>
          <p>Create, approve, and track advance payout requests</p>
        </div>
        <button 
          onClick={() => { setError(''); setIsModalOpen(true); }}
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
        >
          + Request Payout
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No payout requests found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Employee</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Reason</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{req.employees?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{req.employees?.category}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                    ₹{req.amount}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                    {req.reason || '-'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: 
                        req.status === 'Pending' ? 'var(--warning-50)' : 
                        req.status === 'Approved' ? 'var(--blue-50)' : 
                        req.status === 'Paid' ? 'var(--success-50)' : 'var(--error-50)',
                      color: 
                        req.status === 'Pending' ? 'var(--warning-500)' : 
                        req.status === 'Approved' ? 'var(--blue-700)' : 
                        req.status === 'Paid' ? 'var(--success-700)' : 'var(--error-700)',
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    {req.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => updateStatus(req.id, 'Approved', req.employee_id, req.amount)}
                          style={{ color: 'var(--blue-700)', fontWeight: 600, fontSize: '0.8125rem' }}
                        >Approve</button>
                        <button 
                          onClick={() => updateStatus(req.id, 'Rejected', req.employee_id, req.amount)}
                          style={{ color: 'var(--error-700)', fontWeight: 600, fontSize: '0.8125rem' }}
                        >Reject</button>
                      </div>
                    )}
                    {req.status === 'Approved' && (
                      <button 
                        onClick={() => updateStatus(req.id, 'Paid', req.employee_id, req.amount)}
                        style={{ color: 'var(--success-700)', fontWeight: 600, fontSize: '0.8125rem', padding: '0.4rem 0.8rem', background: 'var(--success-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success-500)' }}
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeletePayout(req.id)}
                      style={{ color: 'var(--error-600)', fontWeight: 600, fontSize: '0.8125rem', marginLeft: '0.5rem' }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Request Payout</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>&times;</button>
            </div>

            {error && <div style={{ color: 'var(--error-700)', background: 'var(--error-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label>Employee</label>
                <select 
                  required 
                  value={formData.employee_id} 
                  onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.filter(e => e.status === 'Active').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.category})</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Amount (₹)</label>
                <input required type="number" min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              <div className="form-field">
                <label>Reason / Notes</label>
                <input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
