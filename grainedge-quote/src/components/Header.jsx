import { Link, useLocation } from 'react-router-dom';
import { BRAND } from '../lib/constants.js';

export default function Header() {
  const location = useLocation();

  return (
    <header className="site-header no-print">
      <div className="header-inner">
        <Link to="/" className="logo">
          <img 
            src={BRAND.logoUrl} 
            alt={BRAND.name} 
            style={{ height: '54px', width: 'auto', mixBlendMode: 'multiply', marginTop: '-6px' }}
          />
        </Link>
        
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Create Quote
          </Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            Admin
          </Link>
          <a href="/showcase.html">Main Site</a>
        </nav>
      </div>
    </header>
  );
}
