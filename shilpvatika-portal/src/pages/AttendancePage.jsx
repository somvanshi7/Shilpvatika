import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Carpenter', 'Labor', 'Painter', 'Design Expert', 'Other'];

export default function AttendancePage() {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('Carpenter');
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [date, activeTab]);

  async function fetchData() {
    try {
      setLoading(true);
      setMessage('');

      // Fetch employees for this category
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, name, father_name, status')
        .eq('category', activeTab)
        .order('name');
      
      if (empErr) throw empErr;

      // Filter employees: active ones, or those who might have attendance records today
      // For simplicity, we just fetch all employees of that category and will display Active ones mostly, 
      // but let's just keep all so past attendance can be viewed.
      setEmployees(empData || []);

      // Fetch attendance for the selected date and category
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .eq('category', activeTab);
      
      if (attErr) throw attErr;

      const attMap = {};
      if (attData) {
        attData.forEach(record => {
          attMap[record.employee_id] = {
            present: record.present,
            notes: record.notes || '',
            overtime_pay: record.overtime_pay || 0
          };
        });
      }
      setAttendance(attMap);

    } catch (err) {
      console.error('Error fetching data:', err);
      setMessage('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  function handleAttendanceChange(empId, presentValue) {
    setAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        present: presentValue,
        // Reset overtime pay if not overtime
        overtime_pay: presentValue === 'O' ? (prev[empId]?.overtime_pay || 0) : 0
      }
    }));
  }

  function handleNotesChange(empId, notesValue) {
    setAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        present: prev[empId]?.present || 'N', // default to N if notes entered but present not clicked
        notes: notesValue
      }
    }));
  }

  function handleOvertimePayChange(empId, payValue) {
    setAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        present: 'O',
        overtime_pay: parseInt(payValue) || 0
      }
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage('');

      const recordsToUpsert = [];
      const recordsToDelete = [];

      for (const emp of employees) {
        const att = attendance[emp.id];
        const recordId = `${emp.id}_${date}`;

        if (att) {
          recordsToUpsert.push({
            id: recordId,
            date: date,
            employee_id: emp.id,
            category: activeTab,
            present: att.present,
            notes: att.notes,
            overtime_pay: att.overtime_pay || 0,
            recorded_by: profile?.id
          });
        }
      }

      if (recordsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('attendance')
          .upsert(recordsToUpsert);
        if (upsertErr) throw upsertErr;
      }

      setMessage('Attendance saved successfully!');
      setTimeout(() => setMessage(''), 3000);

    } catch (err) {
      console.error('Error saving attendance:', err);
      setMessage('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDayAttendance() {
    const recordCount = Object.keys(attendance).length;
    if (recordCount === 0) { alert('No attendance records to delete for this date.'); return; }
    if (!window.confirm(`Delete all ${activeTab} attendance records for ${date}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('date', date)
        .eq('category', activeTab);
      if (error) throw error;
      setAttendance({});
      setMessage('Attendance records deleted.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting attendance:', err);
      alert('Failed to delete attendance records.');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Attendance</h1>
          <p>Daily category-wise attendance tracking</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div className="form-field" style={{ flexShrink: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
          />
        </div>
      </div>

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
            {cat}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          borderRadius: 'var(--radius-md)',
          background: message.includes('success') ? 'var(--success-50)' : 'var(--error-50)',
          color: message.includes('success') ? 'var(--success-700)' : 'var(--error-700)'
        }}>
          {message}
        </div>
      )}

      {/* Data Table */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading...</div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No employees found in this category.
          </div>
        ) : (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1.5rem', width: '30%' }}>Employee</th>
                  <th style={{ padding: '0.75rem 1.5rem', width: '20%' }}>Status</th>
                  <th style={{ padding: '0.75rem 1.5rem', width: '25%' }}>Attendance</th>
                  <th style={{ padding: '0.75rem 1.5rem', width: '25%' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const att = attendance[emp.id] || {};
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{emp.name}</div>
                        {emp.father_name && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>s/o {emp.father_name}</div>}
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
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <select
                          value={att.present || 'N'}
                          onChange={(e) => handleAttendanceChange(emp.id, e.target.value)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--gray-300)',
                            fontWeight: 600,
                            background: att.present === 'Y' ? 'var(--success-50)' : 
                                        att.present === 'H' ? 'var(--warning-50)' : 
                                        att.present === 'O' ? 'var(--brand-50)' : 'var(--error-50)',
                            color: att.present === 'Y' ? 'var(--success-700)' : 
                                   att.present === 'H' ? 'var(--warning-700)' : 
                                   att.present === 'O' ? 'var(--brand-700)' : 'var(--error-700)',
                            width: '100%'
                          }}
                        >
                          <option value="N">Absent</option>
                          <option value="Y">Present (Full Day)</option>
                          <option value="H">Half Day</option>
                          <option value="O">Overtime</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Notes (Half day, late, etc.)" 
                            value={att.notes || ''} 
                            onChange={(e) => handleNotesChange(emp.id, e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '0.5rem', 
                              borderRadius: 'var(--radius-sm)', 
                              border: '1px solid var(--gray-300)',
                              fontSize: '0.8125rem'
                            }} 
                          />
                          {att.present === 'O' && (
                            <input 
                              type="number" 
                              placeholder="Extra OT Amount (₹)" 
                              value={att.overtime_pay || ''} 
                              onChange={(e) => handleOvertimePayChange(emp.id, e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem', 
                                borderRadius: 'var(--radius-sm)', 
                                border: '1px solid var(--brand-300)',
                                background: 'var(--brand-50)',
                                fontSize: '0.8125rem'
                              }} 
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--gray-50)' }}>
              <button 
                onClick={handleDeleteDayAttendance}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  color: 'var(--error-600)', 
                  border: '1px solid var(--error-200)',
                  borderRadius: 'var(--radius-md)', 
                  fontWeight: 600,
                  background: 'white'
                }}
              >
                Clear Day's Records
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{ 
                  padding: '0.75rem 2rem', 
                  background: 'var(--brand-600)', 
                  color: 'white', 
                  borderRadius: 'var(--radius-md)', 
                  fontWeight: 600,
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
