import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function BillingPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list'); // 'list', 'edit', 'view', 'payment'
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', bank_transaction_id: '', cheque_number: '', notes: '' });
  
  const printRef = useRef();

  useEffect(() => {
    fetchInvoices();
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

  async function fetchInvoices() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    const defaultId = 'INV-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setCurrentInvoice({
      id: defaultId,
      client_name: '',
      client_address: '',
      client_email: '',
      client_phone: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      line_items: [{ id: 1, description: '', calcType: 'area', l_ft: 0, l_in: 0, w_ft: 0, w_in: 0, unit: 1, sqft: 0, rate: 0, amount: 0 }],
      subtotal: 0,
      labour_charges: 0,
      other_charges_label: 'Other Charges',
      other_charges: 0,
      grand_total: 0,
      advance_deposit: 0,
      balance_due: 0,
      payment_status: 'Unpaid',
      notes: ''
    });
    setViewState('edit');
  }

  function calculateItemAmount(item) {
    if (item.calcType === 'area') {
      const totalInchesL = (Number(item.l_ft || 0) * 12) + Number(item.l_in || 0);
      const totalInchesW = (Number(item.w_ft || 0) * 12) + Number(item.w_in || 0);
      const sqft = (totalInchesL * totalInchesW) / 144;
      return { sqft: Number(sqft.toFixed(2)), amount: Math.round(sqft * Number(item.rate || 0)) };
    } else {
      return { sqft: 0, amount: Math.round(Number(item.unit || 0) * Number(item.rate || 0)) };
    }
  }

  function calculateTotals(items, labour, other, advance) {
    let subtotal = 0;
    items.forEach(item => subtotal += item.amount);
    const grand_total = subtotal + Number(labour || 0) + Number(other || 0);
    const balance_due = grand_total - Number(advance || 0);
    return { subtotal, grand_total, balance_due };
  }

  function handleItemChange(index, field, value) {
    const updated = [...currentInvoice.line_items];
    updated[index][field] = value;
    
    // Recalculate item
    const calcs = calculateItemAmount(updated[index]);
    updated[index].sqft = calcs.sqft;
    updated[index].amount = calcs.amount;
    
    // Recalculate totals
    const totals = calculateTotals(updated, currentInvoice.labour_charges, currentInvoice.other_charges, currentInvoice.amount_paid > 0 ? currentInvoice.amount_paid : currentInvoice.advance_deposit);
    
    setCurrentInvoice({
      ...currentInvoice,
      line_items: updated,
      ...totals
    });
  }

  function handleChargeChange(field, value) {
    const nextInvoice = { ...currentInvoice, [field]: value };
    const totals = calculateTotals(nextInvoice.line_items, nextInvoice.labour_charges, nextInvoice.other_charges, nextInvoice.amount_paid > 0 ? nextInvoice.amount_paid : nextInvoice.advance_deposit);
    setCurrentInvoice({ ...nextInvoice, ...totals });
  }

  function addItem() {
    setCurrentInvoice({
      ...currentInvoice,
      line_items: [...currentInvoice.line_items, { id: Date.now(), description: '', calcType: 'area', l_ft: 0, l_in: 0, w_ft: 0, w_in: 0, unit: 1, sqft: 0, rate: 0, amount: 0 }]
    });
  }

  function removeItem(index) {
    const updated = currentInvoice.line_items.filter((_, i) => i !== index);
    const totals = calculateTotals(updated, currentInvoice.labour_charges, currentInvoice.other_charges, currentInvoice.amount_paid > 0 ? currentInvoice.amount_paid : currentInvoice.advance_deposit);
    setCurrentInvoice({
      ...currentInvoice,
      line_items: updated,
      ...totals
    });
  }

  async function saveInvoice() {
    try {
      setSaving(true);
      // Determine payment status based on balance
      let pStatus = 'Unpaid';
      const paid = currentInvoice.amount_paid > 0 ? currentInvoice.amount_paid : currentInvoice.advance_deposit;
      if (paid >= currentInvoice.grand_total && currentInvoice.grand_total > 0) pStatus = 'Paid';
      else if (paid > 0) pStatus = 'Partial';

      const payload = {
        ...currentInvoice,
        payment_status: pStatus,
        billed_by: profile?.id,
        billed_by_name: profile?.full_name
      };
      
      const { error } = await supabase.from('invoices').upsert([payload]);
      if (error) throw error;
      
      setViewState('list');
      fetchInvoices();
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payAmount = Number(paymentForm.amount);
      const newPaid = Number(currentInvoice.amount_paid || currentInvoice.advance_deposit || 0) + payAmount;
      const newBalance = currentInvoice.grand_total - newPaid;
      
      let pStatus = 'Partial';
      if (newBalance <= 0) pStatus = 'Paid';

      // 1. Update Invoice
      const { error: invErr } = await supabase
        .from('invoices')
        .update({ 
          amount_paid: newPaid, 
          balance_due: newBalance,
          payment_status: pStatus
        })
        .eq('id', currentInvoice.id);
        
      if (invErr) throw invErr;

      // 2. Record Payment (if we want to use the payments table, for now we just update invoice to keep it simple, but we should probably use the payments table for history)
      const payPayload = {
        id: 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        invoice_id: currentInvoice.id,
        amount: payAmount,
        method: paymentForm.method,
        bank_transaction_id: paymentForm.bank_transaction_id,
        cheque_number: paymentForm.cheque_number,
        notes: paymentForm.notes,
        received_by: profile?.id,
        received_by_name: profile?.full_name
      };

      const { error: pErr } = await supabase.from('payments').insert([payPayload]);
      if (pErr) console.error("Payment record insert failed", pErr);

      setViewState('list');
      setPaymentForm({ amount: '', method: 'Cash', bank_transaction_id: '', cheque_number: '', notes: '' });
      fetchInvoices();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvoice(id) {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      fetchInvoices();
      if (viewState === 'view') setViewState('list');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice.');
    }
  }

  if (viewState === 'edit' && currentInvoice) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{currentInvoice.payment_status === 'Unpaid' && currentInvoice.created_at ? 'Edit Invoice' : 'Create Invoice'}</h1>
            <p>{currentInvoice.id}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setViewState('list')} style={{ padding: '0.625rem 1rem', background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)' }}>Cancel</button>
            <button onClick={saveInvoice} disabled={saving} style={{ padding: '0.625rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Client Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label>Client Name</label>
                <input value={currentInvoice.client_name} onChange={e => setCurrentInvoice({...currentInvoice, client_name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Contact Number</label>
                <input value={currentInvoice.client_phone} onChange={e => setCurrentInvoice({...currentInvoice, client_phone: e.target.value})} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Client Address</label>
                <textarea rows="2" value={currentInvoice.client_address} onChange={e => setCurrentInvoice({...currentInvoice, client_address: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              <div className="form-field">
                <label>Issue Date</label>
                <input type="date" value={currentInvoice.issue_date} onChange={e => setCurrentInvoice({...currentInvoice, issue_date: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Due Date</label>
                <input type="date" value={currentInvoice.due_date} onChange={e => setCurrentInvoice({...currentInvoice, due_date: e.target.value})} />
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Itemised Cost Breakdown</h2>
              <button onClick={addItem} style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '0.875rem' }}>+ Add Item</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', minWidth: '800px' }}>
              <thead style={{ borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)' }}>
                <tr>
                  <th style={{ padding: '0.5rem', width: '25%' }}>Entity Name</th>
                  <th style={{ padding: '0.5rem', width: '15%' }}>Calculation</th>
                  <th style={{ padding: '0.5rem', width: '25%' }}>Measurements</th>
                  <th style={{ padding: '0.5rem', width: '15%' }}>Rate (₹)</th>
                  <th style={{ padding: '0.5rem', width: '15%', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.5rem', width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {currentInvoice.line_items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} placeholder="Entity Name" />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select value={item.calcType} onChange={e => handleItemChange(index, 'calcType', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }}>
                        <option value="area">Area (Sq.Ft)</option>
                        <option value="unit">Fixed Unit</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {item.calcType === 'area' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>L:</span>
                            <input type="number" placeholder="ft" value={item.l_ft} onChange={e => handleItemChange(index, 'l_ft', e.target.value)} style={{ width: '40px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                            <input type="number" placeholder="in" value={item.l_in} onChange={e => handleItemChange(index, 'l_in', e.target.value)} style={{ width: '40px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>W:</span>
                            <input type="number" placeholder="ft" value={item.w_ft} onChange={e => handleItemChange(index, 'w_ft', e.target.value)} style={{ width: '40px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                            <input type="number" placeholder="in" value={item.w_in} onChange={e => handleItemChange(index, 'w_in', e.target.value)} style={{ width: '40px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                          </div>
                          <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: 'var(--brand-600)', fontWeight: 600 }}>
                            = {item.sqft} sq.ft
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="number" placeholder="Qty" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} style={{ width: '80px', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: '4px' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Units</span>
                        </div>
                      )}
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
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Notes & Policy</h2>
              <div className="form-field">
                <label>Notes</label>
                <textarea rows="3" value={currentInvoice.notes} onChange={e => setCurrentInvoice({...currentInvoice, notes: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
            </div>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-600)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>₹{currentInvoice.subtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-600)' }}>Labour Charges</span>
                  <input type="number" value={currentInvoice.labour_charges} onChange={e => handleChargeChange('labour_charges', e.target.value)} style={{ width: '100px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px', textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <input value={currentInvoice.other_charges_label} onChange={e => setCurrentInvoice({...currentInvoice, other_charges_label: e.target.value})} style={{ width: '120px', padding: '0.25rem', border: '1px solid transparent', background: 'var(--gray-50)', borderRadius: '4px' }} />
                  <input type="number" value={currentInvoice.other_charges} onChange={e => handleChargeChange('other_charges', e.target.value)} style={{ width: '100px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px', textAlign: 'right' }} />
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 700 }}>
                  <span>Grand Total</span>
                  <span>₹{currentInvoice.grand_total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--gray-600)' }}>Amount Paid / Advance</span>
                  <input type="number" value={currentInvoice.advance_deposit} onChange={e => handleChargeChange('advance_deposit', e.target.value)} disabled={currentInvoice.amount_paid > 0} style={{ width: '100px', padding: '0.25rem', border: '1px solid var(--gray-300)', borderRadius: '4px', textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: currentInvoice.balance_due > 0 ? 'var(--error-600)' : 'var(--success-600)', marginTop: '0.5rem', background: 'var(--gray-50)', padding: '0.75rem', borderRadius: '4px' }}>
                  <span>Balance Due</span>
                  <span>₹{currentInvoice.balance_due}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  if (viewState === 'view' && currentInvoice) {
    return (
      <div className="page-container">
        <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>View Invoice</h1>
            <p>{currentInvoice.id}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => handleDeleteInvoice(currentInvoice.id)} style={{ padding: '0.625rem 1rem', background: 'white', color: 'var(--error-600)', border: '1px solid var(--error-200)', borderRadius: 'var(--radius-md)' }}>Delete</button>
            <button onClick={() => setViewState('list')} style={{ padding: '0.625rem 1rem', background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)' }}>Back</button>
            <button onClick={() => window.print()} style={{ padding: '0.625rem 1.5rem', background: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              Print PDF
            </button>
          </div>
        </div>

        {/* Printable Invoice */}
        <div className="print-area" ref={printRef} style={{ background: 'white', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', minHeight: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-900)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <img src="/images/logo-shilpvatika.png" alt="Logo" style={{ height: '60px' }} onError={(e) => e.target.style.display='none'} />
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>{settings.company_name || 'Shilpvatika Interiors & Woodworks'}</h2>
                <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Premium Interior Designing and Carpentry Services</p>
                <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                  {settings.company_address}<br/>
                  {settings.company_phone && `Ph: ${settings.company_phone} | `} {settings.company_email && `Email: ${settings.company_email}`}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0, letterSpacing: '2px' }}>INVOICE</h1>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Invoice No:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{currentInvoice.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Issue Date:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{new Date(currentInvoice.issue_date).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Due Date:</span>
                  <span style={{ fontWeight: 700, minWidth: '100px' }}>{new Date(currentInvoice.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--gray-800)', marginBottom: '3rem', width: '50%' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Billed To</h3>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)' }}>{currentInvoice.client_name || '-'}</div>
            <div style={{ color: 'var(--gray-600)', marginTop: '0.5rem', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
              {currentInvoice.client_address}<br/>
              {currentInvoice.client_phone}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
            <thead style={{ background: 'var(--gray-800)', color: 'white' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', width: '40%', borderTopLeftRadius: 'var(--radius-sm)', borderBottomLeftRadius: 'var(--radius-sm)' }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', width: '25%' }}>Measurements / Qty</th>
                <th style={{ padding: '0.75rem 1rem', width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '0.75rem 1rem', width: '20%', textAlign: 'right', borderTopRightRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoice.line_items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <td style={{ padding: '1rem', color: 'var(--gray-800)' }}>{item.description}</td>
                  <td style={{ padding: '1rem', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                    {item.calcType === 'area' ? (
                      <>
                        <div>L: {item.l_ft}' {item.l_in}" × W: {item.w_ft}' {item.w_in}"</div>
                        <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginTop: '0.25rem' }}>{item.sqft} Sq.Ft</div>
                      </>
                    ) : (
                      <>{item.unit} Units</>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--gray-600)' }}>{item.rate}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--gray-900)' }}>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
            <div style={{ width: '350px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--gray-600)' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>₹{currentInvoice.subtotal}</span>
              </div>
              {currentInvoice.labour_charges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--gray-600)' }}>
                  <span>Labour Charges:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>₹{currentInvoice.labour_charges}</span>
                </div>
              )}
              {currentInvoice.other_charges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--gray-600)' }}>
                  <span>{currentInvoice.other_charges_label || 'Other Charges'}:</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>₹{currentInvoice.other_charges}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', borderTop: '2px solid var(--gray-300)', borderBottom: '2px solid var(--gray-300)', padding: '0.75rem 0', margin: '0.5rem 0' }}>
                <span>Grand Total:</span>
                <span>₹{currentInvoice.grand_total}</span>
              </div>
              {((currentInvoice.amount_paid > 0) || (currentInvoice.advance_deposit > 0)) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: 'var(--success-600)', fontWeight: 600 }}>
                  <span>Amount Paid / Advance:</span>
                  <span>- ₹{currentInvoice.amount_paid > 0 ? currentInvoice.amount_paid : currentInvoice.advance_deposit}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: currentInvoice.balance_due > 0 ? 'var(--error-600)' : 'var(--success-600)', background: 'var(--gray-50)', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '4px' }}>
                <span>Balance Due:</span>
                <span>₹{currentInvoice.balance_due}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--gray-200)', paddingTop: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>Payment Status & Policy</h4>
              <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase',
                background: currentInvoice.payment_status === 'Unpaid' ? 'var(--error-50)' : currentInvoice.payment_status === 'Paid' ? 'var(--success-50)' : 'var(--warning-50)',
                color: currentInvoice.payment_status === 'Unpaid' ? 'var(--error-700)' : currentInvoice.payment_status === 'Paid' ? 'var(--success-700)' : 'var(--warning-700)',
              }}>
                {currentInvoice.payment_status}
              </div>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                {currentInvoice.payment_policy}
              </p>
              {currentInvoice.notes && (
                <p style={{ color: 'var(--gray-600)', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Note: {currentInvoice.notes}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', marginTop: '2rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                <strong>Generated by:</strong> {currentInvoice.billed_by_name || 'Admin'}
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '60px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/images/signature.jpg" alt="Signature" style={{ maxHeight: '100%' }} />
                </div>
                <div style={{ width: '200px', borderTop: '1px solid var(--gray-400)', paddingTop: '0.5rem', margin: '0 auto' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-900)' }}>Munesh Kumar Sharma</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{settings.company_name || 'Shilpvatika Interiors'}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <style>{`
          @page { margin: 0; }
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; padding: 2cm !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // Payment Modal handling
  if (viewState === 'payment' && currentInvoice) {
    return (
      <div className="page-container">
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Record Payment</h2>
              <button onClick={() => setViewState('list')} style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }}>&times;</button>
            </div>
            
            <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Invoice Total:</span>
                <span style={{ fontWeight: 600 }}>₹{currentInvoice.grand_total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Previously Paid:</span>
                <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>₹{currentInvoice.amount_paid > 0 ? currentInvoice.amount_paid : currentInvoice.advance_deposit}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
                <span style={{ fontWeight: 600 }}>Balance Due:</span>
                <span style={{ fontWeight: 800, color: 'var(--error-600)' }}>₹{currentInvoice.balance_due}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label>Amount Being Paid (₹)</label>
                <input required type="number" max={currentInvoice.balance_due} value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
              </div>
              <div className="form-field">
                <label>Payment Method</label>
                <select 
                  value={paymentForm.method} 
                  onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer / UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              
              {paymentForm.method === 'Bank Transfer' && (
                <div className="form-field">
                  <label>Transaction ID / Ref Number</label>
                  <input required value={paymentForm.bank_transaction_id} onChange={e => setPaymentForm({...paymentForm, bank_transaction_id: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
                </div>
              )}
              
              {paymentForm.method === 'Cheque' && (
                <div className="form-field">
                  <label>Cheque Number</label>
                  <input required value={paymentForm.cheque_number} onChange={e => setPaymentForm({...paymentForm, cheque_number: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-300)' }} />
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setViewState('list')} style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'var(--success-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Billing System</h1>
          <p>Create professional client invoices and track payments</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', background: 'var(--brand-600)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
        >
          + Create Invoice
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            No invoices found. Create one to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Invoice #</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Client</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Amount</th>
                <th style={{ padding: '0.75rem 1.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                    {inv.id}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 400 }}>Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{inv.client_name || 'Unnamed Client'}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>₹{inv.grand_total}</div>
                    {inv.balance_due > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--error-600)' }}>Due: ₹{inv.balance_due}</div>}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: inv.payment_status === 'Unpaid' ? 'var(--error-50)' : inv.payment_status === 'Paid' ? 'var(--success-50)' : 'var(--warning-50)',
                      color: inv.payment_status === 'Unpaid' ? 'var(--error-700)' : inv.payment_status === 'Paid' ? 'var(--success-700)' : 'var(--warning-700)',
                    }}>
                      {inv.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {inv.payment_status !== 'Paid' && (
                        <button 
                          onClick={() => { setCurrentInvoice(inv); setPaymentForm({ amount: inv.balance_due, method: 'Cash', bank_transaction_id: '', cheque_number: '', notes: '' }); setViewState('payment'); }}
                          style={{ color: 'var(--success-700)', fontWeight: 600, fontSize: '0.8125rem' }}
                        >+ Record Pay</button>
                      )}
                      <button 
                        onClick={() => { setCurrentInvoice(inv); setViewState('view'); }}
                        style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '0.8125rem' }}
                      >View</button>
                      {inv.payment_status === 'Unpaid' && (
                        <button 
                          onClick={() => { setCurrentInvoice(inv); setViewState('edit'); }}
                          style={{ color: 'var(--gray-600)', fontWeight: 600, fontSize: '0.8125rem' }}
                        >Edit</button>
                      )}
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id)}
                        style={{ color: 'var(--error-600)', fontWeight: 600, fontSize: '0.8125rem' }}
                      >Delete</button>
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
