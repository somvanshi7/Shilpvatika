import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function QuotationsPage() {
  const { profile } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list'); // 'list', 'edit', 'view'
  const [currentQuote, setCurrentQuote] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  
  const printRef = useRef();

  useEffect(() => {
    fetchQuotes();
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('settings').select('*');
      const s = {};
      data?.forEach(d => s[d.key] = d.value);
      setSettings(s);
    } catch (err) {}
  }

  async function fetchQuotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    const defaultSlug = 'QT-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setCurrentQuote({
      slug: defaultSlug,
      client_name: '',
      company: '',
      email: '',
      phone: '',
      project_type: '',
      scope_summary: '',
      line_items: [{ id: 1, description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      total: 0,
      status: 'draft',
      expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] // 30 days from now
    });
    setViewState('edit');
  }

  function calculateTotals(items) {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += (Number(item.quantity) * Number(item.rate));
    });
    return subtotal;
  }

  function handleItemChange(index, field, value) {
    const updated = [...currentQuote.line_items];
    updated[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = Number(updated[index].quantity) * Number(updated[index].rate);
    }
    
    const subtotal = calculateTotals(updated);
    
    setCurrentQuote({
      ...currentQuote,
      line_items: updated,
      subtotal,
      total: subtotal // No GST for now
    });
  }

  function addItem() {
    setCurrentQuote({
      ...currentQuote,
      line_items: [...currentQuote.line_items, { id: Date.now(), description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  }

  function removeItem(index) {
    const updated = currentQuote.line_items.filter((_, i) => i !== index);
    const subtotal = calculateTotals(updated);
    setCurrentQuote({
      ...currentQuote,
      line_items: updated,
      subtotal,
      total: subtotal
    });
  }

  async function saveQuote() {
    try {
      setSaving(true);
      const payload = {
        ...currentQuote,
        created_by: profile?.id
      };
      
      const { error } = await supabase.from('quotes').upsert([payload]);
      if (error) throw error;
      
      setViewState('list');
      fetchQuotes();
    } catch (err) {
      console.error('Error saving quote:', err);
      alert('Failed to save quote');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(slug, newStatus) {
    try {
      const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('slug', slug);
      if (error) throw error;
      fetchQuotes();
    } catch (err) {
      console.error(err);
    }
  }

  if (viewState === 'edit' && currentQuote) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{currentQuote.status === 'draft' ? 'Create Quote' : 'Edit Quote'}</h1>
            <p>{currentQuote.slug}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setViewState('list')} style={{ padding: '0.625rem 1rem', background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)' }}>Cancel</button>
            <button onClick={saveQuote} disabled={saving} style={{ padding: '0.625rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              {saving ? 'Saving...' : 'Save Quote'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Client Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label>Client Name</label>
                <input value={currentQuote.client_name} onChange={e => setCurrentQuote({...currentQuote, client_name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Company/Address</label>
                <input value={currentQuote.company} onChange={e => setCurrentQuote({...currentQuote, company: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={currentQuote.email} onChange={e => setCurrentQuote({...currentQuote, email: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input value={currentQuote.phone} onChange={e => setCurrentQuote({...currentQuote, phone: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Project Type</label>
                <input placeholder="e.g. Wardrobe, Kitchen, Full House" value={currentQuote.project_type} onChange={e => setCurrentQuote({...currentQuote, project_type: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Valid Until</label>
                <input type="date" value={currentQuote.expires_at} onChange={e => setCurrentQuote({...currentQuote, expires_at: e.target.value})} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Scope Summary</label>
                <textarea rows="2" value={currentQuote.scope_summary} onChange={e => setCurrentQuote({...currentQuote, scope_summary: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Line Items</h2>
              <button onClick={addItem} style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '0.875rem' }}>+ Add Item</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)' }}>
                <tr>
                  <th style={{ padding: '0.5rem', width: '45%' }}>Description</th>
                  <th style={{ padding: '0.5rem', width: '15%' }}>Quantity (sq ft / unit)</th>
                  <th style={{ padding: '0.5rem', width: '15%' }}>Rate (₹)</th>
                  <th style={{ padding: '0.5rem', width: '15%', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.5rem', width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {currentQuote.line_items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} placeholder="Item description" />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                      ₹{item.amount}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button onClick={() => removeItem(index)} style={{ color: 'var(--error-600)', fontSize: '1.25rem' }}>&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--gray-900)' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
                  <span>Total Amount:</span>
                  <span>₹{currentQuote.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'view' && currentQuote) {
    return (
      <div className="page-container">
        <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>View Quote</h1>
            <p>{currentQuote.slug}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setViewState('list')} style={{ padding: '0.625rem 1rem', background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)' }}>Back</button>
            <button onClick={() => window.print()} style={{ padding: '0.625rem 1.5rem', background: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              Print PDF
            </button>
          </div>
        </div>

        {/* Printable Quote */}
        <div className="print-area" ref={printRef} style={{ background: 'white', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', minHeight: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--brand-600)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0, textTransform: 'uppercase' }}>{settings.company_name || 'Shilpvatika'}</h2>
              <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                {settings.company_address}<br/>
                {settings.company_phone && `Ph: ${settings.company_phone}`}<br/>
                {settings.company_email && `Email: ${settings.company_email}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand-600)', margin: 0, letterSpacing: '2px' }}>QUOTATION</h1>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Quote No:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{currentQuote.slug}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Date:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{new Date(currentQuote.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Valid Till:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{new Date(currentQuote.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--brand-500)' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Quotation For</h3>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)' }}>{currentQuote.client_name || '-'}</div>
              <div style={{ color: 'var(--gray-700)', marginTop: '0.25rem' }}>{currentQuote.company || ''}</div>
              <div style={{ color: 'var(--gray-600)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {currentQuote.email}<br/>
                {currentQuote.phone}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Project Details</h3>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--gray-900)' }}>{currentQuote.project_type || '-'}</div>
              <div style={{ color: 'var(--gray-600)', marginTop: '0.5rem', fontSize: '0.875rem' }}>{currentQuote.scope_summary || '-'}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
            <thead style={{ background: 'var(--brand-600)', color: 'white' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', width: '50%', borderTopLeftRadius: 'var(--radius-sm)', borderBottomLeftRadius: 'var(--radius-sm)' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', width: '15%' }}>Quantity</th>
                <th style={{ padding: '0.75rem 1rem', width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '0.75rem 1rem', width: '20%', textAlign: 'right', borderTopRightRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {currentQuote.line_items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <td style={{ padding: '1rem', color: 'var(--gray-800)' }}>{item.description}</td>
                  <td style={{ padding: '1rem', color: 'var(--gray-600)' }}>{item.quantity}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--gray-600)' }}>{item.rate}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--gray-900)' }}>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
            <div style={{ width: '350px', background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-600)', borderTop: '2px solid var(--gray-300)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <span>Grand Total:</span>
                <span>₹{currentQuote.total}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '2rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>Terms & Conditions</h4>
            <ul style={{ color: 'var(--gray-600)', fontSize: '0.75rem', paddingLeft: '1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>This quotation is valid for 30 days from the date of issue.</li>
              <li>A 50% advance payment is required to commence work.</li>
              <li>Prices mentioned are exclusive of any applicable taxes unless stated otherwise.</li>
              <li>Any additional work beyond the scope mentioned will be charged separately.</li>
            </ul>
          </div>
          
          <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '60px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/images/signature-munesh-kumar-sharma.jpg" alt="Signature" style={{ maxHeight: '100%' }} />
              </div>
              <div style={{ width: '200px', borderTop: '1px solid var(--gray-400)', paddingTop: '0.5rem', margin: '0 auto' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-900)' }}>{settings.owner_name || 'Authorized Signatory'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{settings.company_name || 'Shilpvatika Interiors'}</div>
              </div>
            </div>
          </div>

        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; padding: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // List View
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quotations</h1>
          <p>Create and manage client quotations</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
        >
          + Create Quote
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No quotes found. Create one to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Quote #</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Client</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => (
                <tr key={quote.slug} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {quote.slug}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 400 }}>{new Date(quote.created_at).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{quote.client_name || 'Unnamed Client'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{quote.project_type}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                    ₹{quote.total}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <select 
                      value={quote.status}
                      onChange={(e) => updateStatus(quote.slug, e.target.value)}
                      style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '99px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        border: '1px solid transparent',
                        background: quote.status === 'draft' ? 'var(--gray-100)' : quote.status === 'sent' ? 'var(--blue-50)' : quote.status === 'approved' ? 'var(--success-50)' : 'var(--error-50)',
                        color: quote.status === 'draft' ? 'var(--gray-700)' : quote.status === 'sent' ? 'var(--blue-700)' : quote.status === 'approved' ? 'var(--success-700)' : 'var(--error-700)',
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => { setCurrentQuote(quote); setViewState('view'); }}
                        style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '0.8125rem' }}
                      >View/Print</button>
                      <button 
                        onClick={() => { setCurrentQuote(quote); setViewState('edit'); }}
                        style={{ color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.8125rem' }}
                      >Edit</button>
                    </div>
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
