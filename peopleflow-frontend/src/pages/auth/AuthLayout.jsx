import React from 'react';
import { ShieldCheck } from 'lucide-react';

/** Split-screen shell for auth pages; the branding panel hides on small screens. */
export function AuthLayout({ heroTitle, heroText, highlights, children }) {
  return (
    <div className="auth-page">
      <aside className="auth-branding">
        <div className="auth-brand">
          <div className="brand-icon-bg" style={{ width: 44, height: 44 }}>
            <ShieldCheck size={26} />
          </div>
          PeopleFlow HRMS
        </div>

        <div className="auth-hero">
          <h1>{heroTitle}</h1>
          <p>{heroText}</p>
          <div className="auth-highlights">
            {highlights.map(({ title, text }) => (
              <div key={title}>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-copyright">© {new Date().getFullYear()} PeopleFlow Enterprise HRMS. All rights reserved.</div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-brand auth-mobile-brand">
          <div className="brand-icon-bg">
            <ShieldCheck size={20} />
          </div>
          PeopleFlow HRMS
        </div>
        {children}
      </main>
    </div>
  );
}
