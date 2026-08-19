import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECT_TYPES, CITIES } from '../lib/constants.js';
import { validateQuoteForm } from '../lib/validation.js';
import { createQuote } from '../lib/api.js';
import LineItemEditor from '../components/LineItemEditor.jsx';

const INITIAL_STATE = {
  clientName: '',
  company: '',
  email: '',
  phone: '',
  city: 'Gurugram',
  projectType: PROJECT_TYPES[0],
  scopeSummary: '',
  lineItems: [{ description: '', qty: 1, unit: 'Sq.ft', rate: '', amount: 0 }],
  expiryDays: '30',
  password: '',
};

export default function QuoteForm() {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleLineItemsChange = (items) => {
    setFormData((prev) => ({ ...prev, lineItems: items }));
    if (errors.lineItems) {
      setErrors((prev) => ({ ...prev, lineItems: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const validation = validateQuoteForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createQuote(formData);
      // ✅ FIX: navigate to /quote/success/:slug
      navigate(`/quote/success/${response.slug}`);
    } catch (err) {
      setApiError(err.message || 'Failed to create quote. Please try again.');
      setIsSubmitting(false);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="container-narrow">
      <div className="page-header">
        <h1>Create New Quotation</h1>
        <p>Fill out the details below to generate a branded PDF quotation.</p>
      </div>

      {apiError && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            borderColor: 'var(--clr-error)',
            background: 'var(--clr-error-bg)',
          }}
        >
          <p style={{ color: 'var(--clr-error)', fontWeight: 600 }}>
            Error: {apiError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card card-elevated">
        {/* Step 1: Client Info */}
        <div className="form-section">
          <div className="form-section-title">
            <span className="step-num">1</span>
            Client Information
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Client Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                className={errors.clientName ? 'error' : ''}
                placeholder="e.g. John Doe"
              />
              {errors.clientName && (
                <div className="form-error">{errors.clientName}</div>
              )}
            </div>
            <div className="form-group">
              <label>
                Company / Society{' '}
                <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="e.g. DLF Phase 1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="client@example.com"
              />
              {errors.email && (
                <div className="form-error">{errors.email}</div>
              )}
              <div className="form-hint">PDF will be sent to this email.</div>
            </div>
            <div className="form-group">
              <label>
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'error' : ''}
                placeholder="+91 98765 43210"
              />
              {errors.phone && (
                <div className="form-error">{errors.phone}</div>
              )}
            </div>
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group" style={{ maxWidth: '50%' }}>
              <label>City</label>
              <select name="city" value={formData.city} onChange={handleChange}>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Project Details */}
        <div className="form-section">
          <div className="form-section-title">
            <span className="step-num">2</span>
            Project Details
          </div>

          <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group" style={{ maxWidth: '50%' }}>
              <label>
                Project Type <span className="required">*</span>
              </label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
              >
                {PROJECT_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              Scope Summary <span className="required">*</span>
            </label>
            <textarea
              name="scopeSummary"
              value={formData.scopeSummary}
              onChange={handleChange}
              className={errors.scopeSummary ? 'error' : ''}
              placeholder="Brief description of the work to be done..."
            />
            {errors.scopeSummary && (
              <div className="form-error">{errors.scopeSummary}</div>
            )}
          </div>
        </div>

        {/* Step 3: Line Items */}
        <div className="form-section">
          <div className="form-section-title">
            <span className="step-num">3</span>
            Itemized Cost
          </div>
          <LineItemEditor
            items={formData.lineItems}
            onChange={handleLineItemsChange}
            errors={errors.lineItems}
          />
        </div>

        {/* Step 4: Settings */}
        <div className="form-section">
          <div className="form-section-title">
            <span className="step-num">4</span>
            Quote Settings
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Validity (Days)</label>
              <select
                name="expiryDays"
                value={formData.expiryDays}
                onChange={handleChange}
              >
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Password Protect Link{' '}
                <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank for open link"
              />
              <div className="form-hint">
                Client will need this to view the web preview.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '3rem',
            textAlign: 'right',
            borderTop: '1px solid var(--clr-border)',
            paddingTop: '1.5rem'
          }}
        >
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generating Quote...' : 'Generate Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
