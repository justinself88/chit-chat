export default function LegalDocumentShell({ title, effectiveDate, children, onBack }) {
  return (
    <div className="legal-doc">
      <div className="legal-doc-inner">
        <button type="button" className="btn btn-ghost legal-doc-back" onClick={onBack}>
          ← Back
        </button>
        <article className="legal-doc-article">
          <header className="legal-doc-header">
            <h1 className="legal-doc-title">{title}</h1>
            {effectiveDate && <p className="legal-doc-meta">Effective date: {effectiveDate}</p>}
          </header>
          {children}
        </article>
      </div>
    </div>
  );
}
