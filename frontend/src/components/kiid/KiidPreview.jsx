import React from 'react';
import SrriScale from './SrriScale';
import PerformanceChart from './PerformanceChart';
import './kiid-document.css';

function filterBullets(arr) {
  return (arr || []).filter((s) => String(s).trim() !== '');
}

function Bullets({ items, columns = 1, size = '11' }) {
  const list = filterBullets(items);
  const sizeClass = size === '10' ? 'kiid-bullets--10' : 'kiid-bullets--11';
  if (list.length === 0) {
    return <p className={`kiid-bullets--empty ${sizeClass}`}>(empty)</p>;
  }
  return (
    <ul className={`kiid-bullets ${sizeClass}${columns === 2 ? ' kiid-bullets--cols-2' : ''}`}>
      {list.map((b, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
      ))}
    </ul>
  );
}

function ChargeTable({ rows }) {
  return (
    <table className="kiid-charges">
      <tbody>
        {rows.map((r, i) =>
          r.header ? (
            <tr key={i} className="kiid-charges__header">
              <td colSpan={2}>{r.label}</td>
            </tr>
          ) : (
            <tr key={i} className="kiid-charges__row">
              <td>{r.label}</td>
              <td className="kiid-charges__value">
                {r.raw ? r.value : `${r.value}%`}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function Page({ children }) {
  return <div className="kiid-page">{children}</div>;
}

export default function KiidPreview({ data }) {
  const d = data || {};
  const additional = filterBullets(d.additionalInfoBullets);

  return (
    <div className="kiid-doc">
      {/* ---------- PAGE 1 ---------- */}
      <Page>
        <div className="kiid-header">
          <div className="kiid-brand">
            <span className="kiid-brand-name">EPIC</span>
            <div className="kiid-brand-sub">
              Investment<br />Partners
            </div>
          </div>
          <div className="kiid-fund-meta">
            <div className="kiid-fund-name">
              {d.subFundName || '\u00A0'} (the "Fund")
            </div>
            <div className="kiid-fund-line">
              {d.shareClassFullName || '\u00A0'} (ISIN: {d.isin || '\u00A0'})
            </div>
            <div className="kiid-fund-line">
              A sub-fund of {d.companyName || '\u00A0'} (the "Company")
            </div>
          </div>
        </div>

        <div className="kiid-doc-title">Key Investor Information</div>
        <p className="kiid-doc-intro">
          This document provides you with key investor information about this Fund. It is not
          marketing material. The information is required by law to help you understand the nature
          and the risks of investing in this Fund. You are advised to read it so you can make an
          informed decision about whether to invest.
        </p>

        <div className="kiid-section">
          <div className="kiid-section-title">OBJECTIVES AND INVESTMENT POLICY</div>
          <Bullets items={d.objectivesBullets} columns={2} />
          {d.showRecommendation && (
            <p className="kiid-p kiid-p--italic">
              Recommendation: This Fund may not be appropriate for investors who plan to withdraw
              their money in the short term (within {d.minInvestmentYears ?? 3} years). The Fund
              should be viewed as a medium or longer term investment.
            </p>
          )}
          <p className="kiid-p">
            <strong>Futures contracts:</strong> standardised contracts between two parties to buy
            or sell a specified asset of standardised quantity and quality for a price agreed today
            with delivery and payment occurring at a specified future delivery date.
          </p>
        </div>

        {/* Section: Risk and Reward Profile */}
        <div className="kiid-section">
          <div className="kiid-section-title">
            RISK AND REWARD PROFILE
          </div>
          <div className="kiid-split">
            <div className="kiid-split__left">
              <div className="kiid-risk-labels">
                <span>Lower risk</span>
                <span>Higher risk</span>
              </div>
              <div className="kiid-risk-labels">
                <span>Potentially lower reward</span>
                <span>Potentially higher reward</span>
              </div>
              <SrriScale srriCategory={d.srriCategory} />
              <p className="kiid-p kiid-p--sm kiid-p--tight">
                The Fund is in category {d.srriCategory || '\u00A0'} as assets it holds have
                historically been subject to higher levels of price fluctuation. The category shown
                is not guaranteed and may change over time. It is based on historical data and may
                not be a reliable indication of future circumstances. The lowest category does not
                mean a risk free investment.
              </p>
              <p className="kiid-p kiid-p--sm kiid-p--spaced">
                The Fund is exposed to additional risks not captured by the risk indicator
                including, without limitation:
              </p>
            </div>
            <div className="kiid-split__right">
              <Bullets items={d.riskBullets} />
            </div>
          </div>
        </div>
      </Page>

      {/* ---------- PAGE 2 ---------- */}
      <Page>

        {/* Section: Charges for this fund */}
        <div className="kiid-section">
          <div className="kiid-section-title">
            CHARGES FOR THIS FUND
          </div>
          <div className="kiid-split">
            <div className="kiid-split__left">
              <ChargeTable
                rows={[
                  { header: true, label: 'ONE-OFF CHARGES TAKEN BEFORE OR AFTER YOU INVEST' },
                  { label: 'Entry charge', value: d.entryCost },
                  { label: 'Exit charge', value: d.exitCost },
                ]}
              />
              <p className="kiid-p--xs">
                This is the maximum that might be taken out of your money before it is invested or
                before the proceeds of your investment are paid out.
              </p>
              <ChargeTable
                rows={[
                  { header: true, label: 'CHARGES TAKEN FROM THE SHARE CLASS OVER A YEAR' },
                  { label: 'Ongoing charges', value: d.ongoingCost },
                  { label: 'Transaction costs', value: d.transactionCost },
                ]}
              />
              {d.performanceFeeRequired && (
                <ChargeTable
                  rows={[
                    {
                      header: true,
                      label: 'CHARGES TAKEN FROM THE FUND UNDER CERTAIN SPECIFIC CONDITIONS',
                    },
                    {
                      label: 'Performance fee',
                      raw: true,
                      value: `${d.performanceFeeValue}% of the Net New Profits (as defined in the Supplement).`,
                    },
                    {
                      label: 'Anti-Dilution Levy',
                      raw: true,
                      value: `${d.antiDilutionLevy}% amount reflecting specific dealing costs.`,
                    },
                  ]}
                />
              )}
            </div>
            <div className="kiid-split__right">
              <Bullets items={d.feesBullets} size="10" />
            </div>
          </div>
        </div>

        {/* Section: Past performance */}
				<div className="kiid-section">
					<div className="kiid-section-title">
						PAST PERFORMANCE
					</div>
					<div className="kiid-split">
						<div className="kiid-split__left--wide">
							<PerformanceChart years={d.performanceYears} />
						</div>
						<div className="kiid-split__right--narrow">
							<Bullets items={d.performanceBullets} />
						</div>
					</div>
				</div>

        {/* Section: Practical information */}
        <div className="kiid-section">
          <div className="kiid-section-title ">PRACTICAL INFORMATION</div>
          <Bullets items={d.practicalBullets} columns={2} size="10" />
        </div>

        {additional.length > 0 && (
          <div className="kiid-section">
            {/* <div className="kiid-section-title">
              ADDITIONAL INFORMATION
            </div> */}
            <Bullets items={additional} columns={2} size="10" />
          </div>
        )}

        <div className="kiid-regulatory">
          <p>
            The Company and the Fund are authorised and regulated by {d.regulatorName}.{' '}
            {d.managementCompanyName} is authorised in {d.regulatorJurisdiction} and regulated by{' '}
            {d.regulatorName} as an Undertaking for Collective Investment in Transferable
            Securities Fund Manager.
          </p>
          <p>
            This key investor information is accurate as at {d.accurateAsOfDate}.
          </p>
        </div>
      </Page>
    </div>
  );
}
