import { Routes, Route } from 'react-router-dom';
import QuoteForm from './pages/QuoteForm.jsx';
import QuoteSuccess from './pages/QuoteSuccess.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import Header from './components/Header.jsx';

function App() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<QuoteForm />} />
          <Route path="/success/:slug" element={<QuoteSuccess />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container">
          &copy; {new Date().getFullYear()} Shilpvatika. All rights reserved. <br />
          <a href="/showcase.html">Visit Main Site</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
