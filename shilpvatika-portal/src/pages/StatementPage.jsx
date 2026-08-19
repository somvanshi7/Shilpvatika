import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function StatementPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const { data } = await supabase.from('employees').select('id, name, father_name, category').order('name');
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  }

  async function generateStatement() {
    if (!selectedEmp || !startDate || !endDate) {
      setError('Please select an employee and date range.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const emp = employees.find(e => e.id === selectedEmp);
      
      // 1. Fetch transactions in range
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('employee_id', selectedEmp)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
        
      if (txErr) throw txErr;

      // 2. Fetch past transactions to calculate opening balance
      const { data: pastTxData, error: pastTxErr } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('employee_id', selectedEmp)
        .lt('date', startDate);
        
      if (pastTxErr) throw pastTxErr;

      let openingBalance = 0;
      pastTxData.forEach(tx => {
        if (['Credit'].includes(tx.type)) openingBalance += tx.amount;
        else if (['Advance', 'PaydayPayment', 'Deduction'].includes(tx.type)) openingBalance -= tx.amount;
        else if (tx.type === 'Adjustment') openingBalance += tx.amount;
      });

      // 3. Fetch attendance in range
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', selectedEmp)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (attErr) throw attErr;

      let presentDays = 0;
      let absentDays = 0;
      attData.forEach(att => {
        if (att.present === 'Y') presentDays++;
        else absentDays++;
      });

      setStatementData({
        employee: emp,
        startDate,
        endDate,
        openingBalance,
        transactions: txData || [],
        attendance: { presentDays, absentDays, records: attData || [] },
        generatedAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Error generating statement:', err);
      setError('Failed to generate statement.');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Calculate closing balance
  let currentBal = statementData?.openingBalance || 0;
  const processedTxs = statementData?.transactions.map(tx => {
    if (['Credit'].includes(tx.type)) currentBal += tx.amount;
    else if (['Advance', 'PaydayPayment', 'Deduction'].includes(tx.type)) currentBal -= tx.amount;
    else if (tx.type === 'Adjustment') currentBal += tx.amount;
    
    return { ...tx, runningBalance: currentBal };
  });

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <h1>PDF Statement</h1>
        <p>Generate monthly date-wise account statements</p>
      </div>

      <div className="no-print" style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-field" style={{ flex: '1 1 200px' }}>
          <label>Employee</label>
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
        <div className="form-field" style={{ flex: '1 1 150px' }}>
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
        </div>
        <div className="form-field" style={{ flex: '1 1 150px' }}>
          <label>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
        </div>
        <button 
          onClick={generateStatement}
          disabled={loading}
          style={{ padding: '0.625rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, height: '42px', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Generating...' : 'Generate Statement'}
        </button>
      </div>

      {error && <div className="no-print" style={{ color: 'var(--error-700)', background: 'var(--error-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      {statementData && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            onClick={handlePrint}
            style={{ padding: '0.625rem 1.5rem', background: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Print PDF
          </button>
        </div>
      )}

      {/* Printable Area */}
      {statementData && (
        <div className="print-area" ref={printRef} style={{ background: 'white', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', minHeight: '800px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-900)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>Shilpvatika Interiors & Woodworks</h2>
              <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Sector 88, Near RPS Auria, Faridabad, Haryana, 121002</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Account Statement</h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Generated: {new Date(statementData.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '0.25rem' }}>Employee Details</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--gray-900)' }}>{statementData.employee.name}</div>
              {statementData.employee.father_name && <div style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>s/o {statementData.employee.father_name}</div>}
              <div style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>Category: {statementData.employee.category}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '0.25rem' }}>Statement Period</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                {new Date(statementData.startDate).toLocaleDateString()} — {new Date(statementData.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--gray-50)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '1rem' }}>Account Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Opening Balance:</span>
                <span style={{ fontWeight: 600 }}>₹{statementData.openingBalance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Closing Balance:</span>
                <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{currentBal}</span>
              </div>
            </div>
            
            <div style={{ background: 'var(--gray-50)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '1rem' }}>Attendance Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Days Present:</span>
                <span style={{ fontWeight: 600 }}>{statementData.attendance.presentDays}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Days Absent:</span>
                <span style={{ fontWeight: 600 }}>{statementData.attendance.absentDays}</span>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem' }}>Transactions</h4>
          {processedTxs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.875rem' }}>No transactions in this period.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', marginBottom: '2rem' }}>
              <thead style={{ borderBottom: '2px solid var(--gray-200)' }}>
                <tr>
                  <th style={{ padding: '0.5rem 0', color: 'var(--gray-600)' }}>Date</th>
                  <th style={{ padding: '0.5rem 0', color: 'var(--gray-600)' }}>Description</th>
                  <th style={{ padding: '0.5rem 0', color: 'var(--gray-600)', textAlign: 'right' }}>Credit (+)</th>
                  <th style={{ padding: '0.5rem 0', color: 'var(--gray-600)', textAlign: 'right' }}>Debit (-)</th>
                  <th style={{ padding: '0.5rem 0', color: 'var(--gray-600)', textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '0.75rem 0', fontStyle: 'italic', color: 'var(--gray-500)' }}>{new Date(statementData.startDate).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem 0', fontStyle: 'italic', color: 'var(--gray-500)' }}>Opening Balance</td>
                  <td style={{ padding: '0.75rem 0' }}></td>
                  <td style={{ padding: '0.75rem 0' }}></td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>₹{statementData.openingBalance}</td>
                </tr>
                {processedTxs.map(tx => {
                  const isCredit = ['Credit', 'Adjustment'].includes(tx.type) && tx.amount > 0;
                  const isDebit = ['Advance', 'PaydayPayment', 'Deduction'].includes(tx.type) || (tx.type === 'Adjustment' && tx.amount < 0);
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>{new Date(tx.date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 0' }}>{tx.type} {tx.notes ? `- ${tx.notes}` : ''}</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--success-600)' }}>{isCredit ? `₹${Math.abs(tx.amount)}` : ''}</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', color: 'var(--error-600)' }}>{isDebit ? `₹${Math.abs(tx.amount)}` : ''}</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>₹{tx.runningBalance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          
          <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '150px', borderBottom: '1px solid var(--gray-400)', marginBottom: '0.5rem' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Employee Signature</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/images/signature-munesh-kumar-sharma.jpg" alt="Owner Signature" style={{ maxHeight: '100%', opacity: 0.8 }} />
              </div>
              <div style={{ width: '150px', borderTop: '1px solid var(--gray-400)', paddingTop: '0.25rem', margin: '0 auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Munesh Kumar Sharma</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Manager</div>
              </div>
            </div>
          </div>
          
        </div>
      )}
      
      {/* Add a global style for printing just the statement */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
