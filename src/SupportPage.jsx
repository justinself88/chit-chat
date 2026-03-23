import LegalDocumentShell from './legal/LegalDocumentShell.jsx';
import { contactEmailLabel, contactEmailMailto } from './legal/contactEmail.js';

export default function SupportPage({ onBack }) {
  const mailto = contactEmailMailto();
  const label = contactEmailLabel();

  return (
    <LegalDocumentShell title="Support" onBack={onBack}>
      <section className="legal-section">
        <h3 className="legal-subhead">Contact</h3>
        <p>
          For account, privacy, or general questions, reach us at{' '}
          {mailto ? (
            <a href={mailto} className="legal-contact-link">
              {label}
            </a>
          ) : (
            <span className="legal-contact-placeholder">{label}</span>
          )}
          .
        </p>
        <h3 className="legal-subhead">Safety during a debate</h3>
        <p>
          If something goes wrong while you are matched with someone, use <strong>Report issue</strong>{' '}
          on the debate screen. That helps us review what happened and keep the community safer.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
