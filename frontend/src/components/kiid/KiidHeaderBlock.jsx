import React from 'react';

/**
 * The KIID document header — brand block plus fund identification.
 *
 * Extracted from KiidPreview so the validation step can preview the *real*
 * header rather than a second copy of it. One definition, two callers: rule 1
 * (one render path) means a change here shows up identically on the validation
 * page, in the editor preview and in the exported PDF.
 *
 * The brand is currently hardcoded to EPIC. When client onboarding lands it
 * becomes a per-organisation logo; keeping it in one component is what makes
 * that a single edit.
 */
export default function KiidHeaderBlock({ data }) {
  const d = data || {};
  return (
    <div className="kiid-header">
      <div className="kiid-brand">
        <span className="kiid-brand-name">EPIC</span>
        <div className="kiid-brand-sub">
          Investment<br />Partners
        </div>
      </div>
      <div className="kiid-fund-meta">
        <div className="kiid-fund-name">
          {d.subFundName || ' '} (the "Fund")
        </div>
        <div className="kiid-fund-line">
          {d.shareClassFullName || ' '} (ISIN: {d.isin || ' '})
        </div>
        <div className="kiid-fund-line">
          A sub-fund of {d.companyName || ' '} (the "Company")
        </div>
      </div>
    </div>
  );
}
