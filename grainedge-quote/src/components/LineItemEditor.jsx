import { UNIT_OPTIONS, formatCurrency, GST_RATE } from '../lib/constants.js';

export default function LineItemEditor({ items, onChange, errors = [] }) {
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount if qty or rate changes
    if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(newItems[index].qty) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }
    
    onChange(newItems);
  };

  const addRow = () => {
    onChange([...items, { description: '', qty: 1, unit: 'Sq.ft', rate: 0, amount: 0 }]);
  };

  const removeRow = (index) => {
    if (items.length === 1) return; // Keep at least one row
    
    // Optional: confirm if row has data
    if (items[index].description && !window.confirm('Remove this item?')) {
      return;
    }
    
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const gstAmount = subtotal * GST_RATE;
  const grandTotal = subtotal + gstAmount;

  return (
    <div className="line-item-editor">
      <div className="table-wrap">
        <table className="line-items-table">
          <thead>
            <tr>
              <th className="col-desc">Description <span className="required">*</span></th>
              <th className="col-qty">Qty <span className="required">*</span></th>
              <th className="col-unit">Unit</th>
              <th className="col-rate">Rate (₹) <span className="required">*</span></th>
              <th className="col-amount">Amount</th>
              <th className="col-action"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const err = typeof errors === 'string' && errors.includes(`Item ${index + 1}`) ? 'error' : '';
              return (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g. Master Bedroom Wardrobe"
                      className={err && !item.description ? 'error' : ''}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      className={err && (!item.qty || item.qty <= 0) ? 'error' : ''}
                    />
                  </td>
                  <td>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className={err && (!item.rate || item.rate <= 0) ? 'error' : ''}
                    />
                  </td>
                  <td className="amount-cell">
                    {formatCurrency(item.amount || 0)}
                  </td>
                  <td>
                    <button 
                      type="button" 
                      className="btn-delete-row"
                      onClick={() => removeRow(index)}
                      disabled={items.length === 1}
                      title="Remove row"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="line-items-total">
          <div className="line-items-total-inner">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="total-row">
              <span>GST ({(GST_RATE * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {typeof errors === 'string' && errors.includes('Item') && (
        <div className="form-error" style={{ marginTop: '0.5rem' }}>{errors}</div>
      )}

      <button type="button" className="btn-add-item" onClick={addRow}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Line Item
      </button>
    </div>
  );
}
