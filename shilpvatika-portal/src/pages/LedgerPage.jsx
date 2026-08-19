import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function LedgerPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaydayModalOpen, setIsPaydayModalOpen] = useState(false);
  const [error, setError] = useState('');
  
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Advance',
    amount: '',
    notes: ''
  });

  const [paydayForm, setPaydayForm] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
  });

  const [paydayPreview, setPaydayPreview] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      fetchLedger(selectedEmp);
    } else {
      setTransactions([]);
      setEmployeeDetails(null);
    }
  }, [selectedEmp]);

  async function fetchEmployees() {
    try {
      const { data } = await supabase.from('employees').select('id, name, category, day_pay').order('name');
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }

  async function fetchLedger(empId) {
    try {
      setLoading(true);
      const emp = employees.find(e => e.id === empId);
      setEmployeeDetails(emp);

      const { data, error: err } = await supabase
        .from('transactions')
        .select('*')
        .eq('employee_id', empId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTxSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        id: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        employee_id: selectedEmp,
        date: txForm.date,
        type: txForm.type,
        amount: Number(txForm.amount),
        notes: txForm.notes,
        created_by: profile?.id
      };

      const { error: err } = await supabase.from('transactions').insert([payload]);
      if (err) throw err;

      setIsModalOpen(false);
      setTxForm({ ...txForm, amount: '', notes: '' });
      fetchLedger(selectedEmp);
    } catch (err) {
      setError('Failed to add transaction: ' + err.message);
    }
  }

  async function calculatePayday() {
    if (!paydayForm.startDate || !paydayForm.endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    try {
      setError('');
      // Fetch attendance in range
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('present')
        .eq('employee_id', selectedEmp)
        .gte('date', paydayForm.startDate)
        .lte('date', paydayForm.endDate)
        .eq('present', 'Y');
        
      if (attErr) throw attErr;

      const presentDays = attData.length;
      const totalEarned = presentDays * (employeeDetails?.day_pay || 0);

      // We should also calculate total advances/deductions since last payday to show balance, 
      // but for a simple Payday Credit, we just calculate the earned amount.
      
      setPaydayPreview({
        presentDays,
        totalEarned
      });
      
    } catch (err) {
      setError('Error calculating payday: ' + err.message);
    }
  }

  async function handlePaydaySubmit() {
    if (!paydayPreview) return;
    
    try {
      const payload = {
        id: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        employee_id: selectedEmp,
        date: paydayForm.endDate,
        type: 'Credit', // Earned money from attendance
        amount: paydayPreview.totalEarned,
        notes: `Payday: ${paydayForm.startDate} to ${paydayForm.endDate} (${paydayPreview.presentDays} days)`,
        created_by: profile?.id
      };

      const { error: err } = await supabase.from('transactions').insert([payload]);
      if (err) throw err;

      setIsPaydayModalOpen(false);
      setPaydayPreview(null);
      fetchLedger(selectedEmp);
    } catch (err) {
      setError('Failed to process payday: ' + err.message);
    }
  }

  // Calculate current balance based on transactions
  // Credit / Adjustment (if positive) adds to balance owed TO employee
  // Advance / Deduction / PaydayPayment subtracts from balance owed TO employee
  const currentBalance = transactions.reduce((acc, tx) => {
    if (['Credit'].includes(tx.type)) {
      return acc + tx.amount;
    } else if (['Advance', 'PaydayPayment', 'Deduction'].includes(tx.type)) {
      return acc - tx.amount;
    } else if (tx.type === 'Adjustment') {
      return acc + tx.amount; // Adjustments can be negative or positive
    }
    return acc;
  }, 0);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Ledger & Payday</h1>
          <p>Transaction ledger and monthly payday processing</p>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
        <div className="form-field" style={{ flex: 1, maxWidth: '300px' }}>
          <label>Select Employee</label>
          <select 
            value={selectedEmp} 
            onChange={(e) => setSelectedEmp(e.target.value)}
            style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
          >
            <option value="">-- Choose Employee --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.category})</option>
            ))}
          </select>
        </div>
        
        {selectedEmp && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Current Balance</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentBalance < 0 ? 'var(--error-600)' : 'var(--success-600)' }}>
                {currentBalance < 0 ? '-' : ''}₹{Math.abs(currentBalance)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {currentBalance > 0 ? '(Owed to Employee)' : currentBalance < 0 ? '(Employee Owes Company)' : 'Settled'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { setError(''); setIsPaydayModalOpen(true); }}
                style={{ padding: '0.625rem 1rem', background: 'var(--gray-800)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
              >
                Process Payday
              </button>
              <button 
                onClick={() => { setError(''); setIsModalOpen(true); }}
                style={{ padding: '0.625rem 1rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
              >
                + Add Transaction
              </button>
            </div>
          </>
        )}
      </div>

      {selectedEmp && (
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading ledger...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
              No transactions found for this employee.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1.5rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1.5rem' }}>Notes</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isCredit = ['Credit', 'Adjustment'].includes(tx.type) && tx.amount > 0;
                  const isDebit = ['Advance', 'PaydayPayment', 'Deduction'].includes(tx.type) || (tx.type === 'Adjustment' && tx.amount < 0);
                  
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '99px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: isCredit ? 'var(--success-50)' : isDebit ? 'var(--error-50)' : 'var(--gray-100)',
                          color: isCredit ? 'var(--success-700)' : isDebit ? 'var(--error-700)' : 'var(--gray-700)'
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                        {tx.notes || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: isCredit ? 'var(--success-600)' : isDebit ? 'var(--error-600)' : 'inherit' }}>
                        {isCredit ? '+' : isDebit ? '-' : ''}₹{Math.abs(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Transaction</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>&times;</button>
            </div>
            
            {error && <div style={{ color: 'var(--error-700)', background: 'var(--error-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleTxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label>Date</label>
                <input type="date" required value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              <div className="form-field">
                <label>Type</label>
                <select 
                  value={txForm.type} 
                  onChange={e => setTxForm({...txForm, type: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  <option value="Advance">Advance (Paid to employee)</option>
                  <option value="PaydayPayment">Payday Payment (Paid to employee)</option>
                  <option value="Deduction">Deduction (Penalty/Fee)</option>
                  <option value="Credit">Credit (Earned/Bonus)</option>
                  <option value="Adjustment">Adjustment (+/-)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Amount (₹)</label>
                <input type="number" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              <div className="form-field">
                <label>Notes</label>
                <input value={txForm.notes} onChange={e => setTxForm({...txForm, notes: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payday Modal */}
      {isPaydayModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Process Payday</h2>
              <button onClick={() => { setIsPaydayModalOpen(false); setPaydayPreview(null); }} style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>&times;</button>
            </div>
            
            {error && <div style={{ color: 'var(--error-700)', background: 'var(--error-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            {!paydayPreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Calculate earned pay based on attendance records.</p>
                <div className="form-field">
                  <label>Start Date</label>
                  <input type="date" required value={paydayForm.startDate} onChange={e => setPaydayForm({...paydayForm, startDate: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
                </div>
                <div className="form-field">
                  <label>End Date</label>
                  <input type="date" required value={paydayForm.endDate} onChange={e => setPaydayForm({...paydayForm, endDate: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setIsPaydayModalOpen(false)} style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Cancel</button>
                  <button onClick={calculatePayday} style={{ padding: '0.75rem 1.5rem', background: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>Calculate</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--gray-600)' }}>Days Present:</span>
                    <span style={{ fontWeight: 600 }}>{paydayPreview.presentDays}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--gray-600)' }}>Daily Rate:</span>
                    <span style={{ fontWeight: 600 }}>₹{employeeDetails?.day_pay || 0}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0.5rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
                    <span style={{ fontWeight: 600 }}>Total Earned:</span>
                    <span style={{ fontWeight: 800, color: 'var(--success-600)' }}>₹{paydayPreview.totalEarned}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                  This will add a 'Credit' transaction to the employee's ledger. You can then settle the final balance by adding a 'Payday Payment' transaction.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setPaydayPreview(null)} style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Back</button>
                  <button onClick={handlePaydaySubmit} style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>Confirm Payday</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
