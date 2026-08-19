import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Audit Log</h1>
          <p>Track system actions and events</p>
        </div>
        <button 
          onClick={fetchLogs}
          style={{ padding: '0.625rem 1rem', background: 'white', color: 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontWeight: 600, border: '1px solid var(--gray-300)' }}
        >
          Refresh
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No audit logs found. System events will be recorded here.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Actor</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Action</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Entity</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {log.actor_name || 'System'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: 'var(--blue-50)',
                      color: 'var(--blue-700)'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-600)' }}>
                    {log.entity} {log.entity_id ? `(#${log.entity_id.split('-').pop()})` : ''}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                    {Object.keys(log.details || {}).length > 0 ? (
                      <pre style={{ margin: 0, fontFamily: 'inherit', background: 'var(--gray-50)', padding: '0.5rem', borderRadius: '4px' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
