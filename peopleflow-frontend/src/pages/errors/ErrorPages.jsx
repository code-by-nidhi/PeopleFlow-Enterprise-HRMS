import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';

function ErrorPage({ code, title, description }) {
  const navigate = useNavigate();
  return (
    <div className="error-page">
      <div className="error-code">{code}</div>
      <h1 style={{ fontSize: '1.375rem', fontWeight: 800 }}>{title}</h1>
      <p className="text-muted text-sm" style={{ maxWidth: 420 }}>{description}</p>
      <div className="row" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Go Back</Button>
        <Button icon={Home} onClick={() => navigate('/dashboard')}>Dashboard</Button>
      </div>
    </div>
  );
}

export function NotFound() {
  return <ErrorPage code="404" title="Page not found" description="The page you are looking for does not exist or has been moved." />;
}

export function Forbidden() {
  return <ErrorPage code="403" title="Access denied" description="Your role does not have permission to view this page. Contact your administrator if you need access." />;
}
