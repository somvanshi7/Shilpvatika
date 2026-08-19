import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container">
      <div className="not-found">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary">Return Home</Link>
      </div>
    </div>
  );
}
