import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getQuote, getQuotePreviewUrl, getPdfDownloadUrl, getWhatsAppShareUrl } from '../lib/api.js';
import { QUOTE_STATUSES, formatDate } from '../lib/constants.js';

export default function QuoteSuccess() {
  const { slug } = useParams();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  const pollTimer = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getQuote(slug);
        setQuote(data);

        // If processing, poll again in 2 seconds
        if (data.status === QUOTE_STATUSES.PROCESSING) {
          pollTimer.current = setTimeout(fetchStatus, 2000);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch quote status');
      }
    };

    fetchStatus();

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [slug]);

  const copyLink = async () => {
    const url = window.location.origin + getQuotePreviewUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg('Link copied to clipboard!');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      setToastMsg('Failed to copy link');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  if (error) {
    return (
      <div className="container-narrow">
        <div className="card" style={{ borderColor: 'var(--clr-error)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--clr-error)', marginBottom: '1rem' }}>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading quote details...</p>
      </div>
    );
  }

  const isReady = quote.status === QUOTE_STATUSES.READY;
  const isError = quote.status === QUOTE_STATUSES.ERROR;
  const validityDate = formatDate(quote.expires_at);

  return (
    <div className="container-narrow">
      <div className="card card-elevated" style={{ padding: '3rem 2rem' }}>
        
        {isReady ? (
          <div className="success-icon">
            <svg viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : isError ? (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--clr-error)' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        ) : (
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '56px', height: '56px', borderWidth: '4px' }}></div>
        )}

        <div className="success-content">
          <h1>{isReady ? 'Quotation Ready' : isError ? 'Generation Failed' : 'Generating Quotation...'}</h1>
          <div className="quote-id">{slug}</div>
          
          {isReady && (
            <>
              <p style={{ color: 'var(--clr-text-secondary)', marginBottom: '2.5rem' }}>
                The quotation for <strong>{quote.clientName}</strong> has been generated successfully and emailed to the client.
              </p>
              
              <div className="share-grid">
                <a 
                  href={getPdfDownloadUrl(slug)} 
                  className="share-btn download"
                  download
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Download PDF
                </a>
                
                <button onClick={copyLink} className="share-btn copy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  Copy Web Link
                </button>
                
                <a 
                  href={getWhatsAppShareUrl(slug, validityDate)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="share-btn whatsapp"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  WhatsApp
                </a>
                
                <a 
                  href={getQuotePreviewUrl(slug)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="share-btn email-share"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  View Preview
                </a>
              </div>
            </>
          )}

          {!isReady && !isError && (
            <p style={{ color: 'var(--clr-text-secondary)', marginTop: '1rem' }}>
              We are compiling your document into a high-quality PDF. This usually takes about 5-10 seconds.
            </p>
          )}
          
          {isError && (
             <p style={{ color: 'var(--clr-text-secondary)', marginTop: '1rem' }}>
              An error occurred during PDF generation. Please check the admin logs or try creating the quote again.
           </p>
          )}
        </div>
      </div>

      <div className={`toast ${toastMsg ? 'visible' : ''}`}>
        {toastMsg}
      </div>
    </div>
  );
}
