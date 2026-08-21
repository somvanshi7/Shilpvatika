import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Carpenter', 'Labor', 'Painter', 'Design Expert', 'Other'];

export default function EmployeesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Carpenter');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(getInitialFormState());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function getInitialFormState() {
    return {
      name: '',
      father_name: '',
      id_proof_type: 'Aadhaar',
      id_proof_number: '',
      address: '',
      category: activeTab,
      day_pay: 0,
      variable_pay: false,
      join_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      notes: '',
    };
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    // When tab changes, update default category for new entries
    if (!editingId) {
      setFormData(prev => ({ ...prev, category: activeTab }));
    }
  }, [activeTab, editingId]);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (err) throw err;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEmployee(id, name) {
    if (!window.confirm(`Delete employee "${name}"? This will also delete their attendance, transactions, and payout records. This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('Failed to delete employee. ' + (err.message || ''));
    }
  }

  function handleOpenModal(emp = null) {
    if (emp) {
      setEditingId(emp.id);
      setFormData({ ...emp });
    } else {
      setEditingId(null);
      setFormData(getInitialFormState());
    }
    setError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        ...formData,
        day_pay: Number(formData.day_pay),
      };

      if (editingId) {
        const { error: err } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', editingId);
        
        if (err) throw err;
      } else {
        // Generate a random ID or use simple incremental logic. For now, UUID-like logic:
        payload.id = 'EMP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        payload.created_by = profile?.id;
        
        const { error: err } = await supabase
          .from('employees')
          .insert([payload]);
          
        if (err) throw err;
      }

      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      setError('Failed to save employee. ' + err.message);
    }
  }

  const filteredEmployees = employees.filter(e => e.category === activeTab);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Employees</h1>
          <p>Manage your workforce</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
        >
          + Add Employee
        </button>
      </div>

      {error && <div style={{ color: 'var(--error-700)', background: 'var(--error-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: activeTab === cat ? '2px solid var(--brand-600)' : '2px solid transparent',
              color: activeTab === cat ? 'var(--brand-700)' : 'var(--gray-500)',
              fontWeight: activeTab === cat ? 600 : 400,
            }}
          >
            {cat} ({employees.filter(e => e.category === cat).length})
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No employees found in this category.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>ID Proof</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Day Pay</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{emp.father_name && `s/o ${emp.father_name}`}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                    {emp.id_proof_type}: {emp.id_proof_number || 'N/A'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                    ₹{emp.day_pay} {emp.variable_pay && '(Variable)'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: emp.status === 'Active' ? 'var(--success-50)' : 'var(--gray-100)',
                      color: emp.status === 'Active' ? 'var(--success-700)' : 'var(--gray-600)'
                    }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleOpenModal(emp)}
                        style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '0.875rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        style={{ color: 'var(--error-600)', fontWeight: 600, fontSize: '0.875rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Father's Name</label>
                <input value={formData.father_name} onChange={e => setFormData({...formData, father_name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="form-field">
                <label>ID Proof Type</label>
                <select 
                  value={formData.id_proof_type} 
                  onChange={e => setFormData({...formData, id_proof_type: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label>ID Proof Number</label>
                <input value={formData.id_proof_number} onChange={e => setFormData({...formData, id_proof_number: e.target.value})} />
              </div>

              <div className="form-field">
                <label>Day Pay (₹)</label>
                <input type="number" required min="0" value={formData.day_pay} onChange={e => setFormData({...formData, day_pay: e.target.value})} />
              </div>
              <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end', paddingBottom: '0.5rem' }}>
                <input type="checkbox" id="vp" checked={formData.variable_pay} onChange={e => setFormData({...formData, variable_pay: e.target.checked})} style={{ width: 'auto' }} />
                <label htmlFor="vp" style={{ marginBottom: 0 }}>Variable Pay</label>
              </div>

              <div className="form-field">
                <label>Join Date</label>
                <input type="date" required value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                  rows="2"
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', fontWeight: 600, color: 'var(--gray-600)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
