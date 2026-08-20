import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const STATUS_COLORS = {
  New: { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
  Contacted: { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' },
  Resolved: { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [editNotes, setEditNotes] = useState({});

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status.');
    }
  }

  async function saveNotes(id) {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ notes: editNotes[id] || '' })
        .eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: editNotes[id] || '' } : l));
      alert('Notes saved!');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes.');
    }
  }

  async function deleteLead(id) {
    if (!window.confirm('Are you sure you want to delete this inquiry? This cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert('Failed to delete inquiry.');
    }
  }

  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter);
  const counts = {
    All: leads.length,
    New: leads.filter(l => l.status === 'New').length,
    Contacted: leads.filter(l => l.status === 'Contacted').length,
    Resolved: leads.filter(l => l.status === 'Resolved').length,
  };

  const cellStyle = { padding: '1rem 1.5rem' };
  const thStyle = { padding: '0.75rem 1.5rem' };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Website Inquiries</h1>
          <p>Leads from your main website's consultation & quote forms</p>
        </div>
        <button
          onClick={fetchLeads}
          style={{ padding: '0.625rem 1rem', background: 'white', color: 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontWeight: 600, border: '1px solid var(--gray-300)', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'New', 'Contacted', 'Resolved'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '99px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              border: filter === f ? '2px solid var(--primary-600, #2563eb)' : '1px solid var(--gray-300)',
              background: filter === f ? 'var(--primary-50, #eff6ff)' : 'white',
              color: filter === f ? 'var(--primary-700, #1d4ed8)' : 'var(--gray-600)',
              cursor: 'pointer',
            }}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading inquiries...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            {filter === 'All'
              ? 'No inquiries yet. Website form submissions will appear here.'
              : `No ${filter.toLowerCase()} inquiries.`}
          </div>
        ) : (
          <>
            {/* Desktop table (hidden on mobile) */}
            <div className="leads-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>City</th>
                    <th style={thStyle}>Message</th>
                    <th style={thStyle}>Walk-in</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.New;
                    const isExpanded = expandedId === lead.id;
                    return (
                      <>
                        <tr key={lead.id} style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }} onClick={() => { setExpandedId(isExpanded ? null : lead.id); if (!isExpanded && !editNotes[lead.id]) setEditNotes(prev => ({ ...prev, [lead.id]: lead.notes || '' })); }}>
                          <td style={{ ...cellStyle, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                            {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <br />
                            <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                              {new Date(lead.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--gray-900)' }}>{lead.name}</td>
                          <td style={cellStyle}>
                            <a href={`tel:${lead.phone}`} style={{ color: 'var(--primary-600, #2563eb)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{lead.phone}</a>
                            <br />
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: '0.7rem', color: '#25d366', fontWeight: 600, textDecoration: 'none' }}
                            >
                              WhatsApp ↗
                            </a>
                          </td>
                          <td style={{ ...cellStyle, color: 'var(--gray-600)' }}>{lead.email}</td>
                          <td style={{ ...cellStyle, color: 'var(--gray-600)' }}>{lead.city}</td>
                          <td style={{ ...cellStyle, color: 'var(--gray-600)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.message || '—'}
                          </td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            {lead.walkin_demo ? (
                              <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
                            ) : (
                              <span style={{ color: 'var(--gray-300)' }}>—</span>
                            )}
                          </td>
                          <td style={cellStyle}>
                            <span style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '99px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                            }}>
                              {lead.status}
                            </span>
                          </td>
                          <td style={cellStyle} onClick={e => e.stopPropagation()}>
                            <select
                              value={lead.status}
                              onChange={(e) => updateStatus(lead.id, e.target.value)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--gray-300)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                background: 'white',
                              }}
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${lead.id}-detail`} style={{ background: 'var(--gray-50)' }}>
                            <td colSpan="9" style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: '700px' }}>
                                <div>
                                  <strong style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Full Message</strong>
                                  <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-700)' }}>{lead.message || 'No message provided'}</p>
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Admin Notes</strong>
                                  <textarea
                                    value={editNotes[lead.id] ?? lead.notes ?? ''}
                                    onChange={(e) => setEditNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                    placeholder="Add notes about this inquiry..."
                                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => saveNotes(lead.id)} style={{ padding: '0.4rem 0.8rem', background: 'var(--primary-600, #2563eb)', color: 'white', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
                                      Save Notes
                                    </button>
                                    <button onClick={() => deleteLead(lead.id)} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #fca5a5', cursor: 'pointer' }}>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (hidden on desktop) */}
            <div className="leads-mobile-cards">
              {filtered.map(lead => {
                const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.New;
                const isExpanded = expandedId === lead.id;
                return (
                  <div key={lead.id} style={{ borderBottom: '1px solid var(--gray-100)', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }} onClick={() => { setExpandedId(isExpanded ? null : lead.id); if (!isExpanded && !editNotes[lead.id]) setEditNotes(prev => ({ ...prev, [lead.id]: lead.notes || '' })); }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '1rem' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {lead.city}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '99px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {lead.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <a href={`tel:${lead.phone}`} style={{ color: 'var(--primary-600, #2563eb)', fontSize: '0.85rem', textDecoration: 'none' }}>{lead.phone}</a>
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25d366', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>WhatsApp ↗</a>
                      {lead.walkin_demo && <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>Walk-in ✓</span>}
                    </div>
                    {lead.message && <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: '0 0 0.5rem' }}>{lead.message}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)', fontSize: '0.8rem', cursor: 'pointer', background: 'white' }}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                        <strong style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Admin Notes</strong>
                        <textarea
                          value={editNotes[lead.id] ?? lead.notes ?? ''}
                          onChange={(e) => setEditNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          placeholder="Add notes..."
                          style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--gray-300)', fontSize: '0.85rem', minHeight: '50px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button onClick={() => saveNotes(lead.id)} style={{ padding: '0.4rem 0.8rem', background: 'var(--primary-600, #2563eb)', color: 'white', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>Save Notes</button>
                          <button onClick={() => deleteLead(lead.id)} style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #fca5a5', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
