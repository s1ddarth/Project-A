import React from 'react';
import SrriScale from './SrriScale';
import PerformanceChart from './PerformanceChart';

const NAVY = '#1E2A56';
const RED = '#C81E1E';
const BLUE = '#005AB4';
const LIGHTGREY = '#E1E1E1';

function filterBullets(arr) {
  return (arr || []).filter((s) => String(s).trim() !== '');
}

// Visual primitives matching the tcolorbox redbox / bluebox in the template.
function RedBox({ children }) {
  return (
    <div
      className="bg-white"
      style={{ border: `1px solid ${RED}`, padding: '8px 7px 7px 7px', marginBottom: 10 }}
    >
      {children}
    </div>
  );
}
function BlueBox({ children }) {
  return (
    <div
      className="bg-white"
      style={{ border: `1px solid ${BLUE}`, padding: '7px 6px', height: '100%' }}
    >
      {children}
    </div>
  );
}

function Bullets({ items, columns = 1, fontSize = '11px' }) {
  const list = filterBullets(items);
  if (list.length === 0) return <p style={{ fontSize, color: '#9aa0a6', fontStyle: 'italic' }}>(empty)</p>;
  return (
    <ul
      style={{
        fontSize,
        lineHeight: 1.4,
        margin: 0,
        paddingLeft: '1.1em',
        columnCount: columns,
        columnGap: '12px',
      }}
    >
      {list.map((b, i) => (
        <li
          key={i}
          style={{ breakInside: 'avoid', marginBottom: 2 }}
          dangerouslySetInnerHTML={{ __html: b }}
        />
      ))}
    </ul>
  );
}

function ChargeTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
      <tbody>
        {rows.map((r, i) =>
          r.header ? (
            <tr key={i}>
              <td
                colSpan={2}
                style={{
                  background: LIGHTGREY,
                  fontWeight: 700,
                  padding: '3px 4px',
                  fontSize: '9.5px',
                }}
              >
                {r.label}
              </td>
            </tr>
          ) : (
            <tr key={i}>
              <td style={{ padding: '2px 4px' }}>{r.label}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>{r.value}%</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function Page({ children }) {
  return (
    <div
      className="bg-white shadow-xl"
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '14px 16px',
        boxSizing: 'border-box',
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: '#000',
        fontSize: '12px',
        lineHeight: 1.35,
      }}
    >
      {children}
    </div>
  );
}

export default function KiidPreview({ data }) {
  const d = data || {};
  const additional = filterBullets(d.additionalInfoBullets);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* ---------- PAGE 1 ---------- */}
      <Page>
        {/* Header */}
        <div className="flex items-center" style={{ marginBottom: 6 }}>
          <div style={{ width: '28%' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: NAVY, lineHeight: 1 }}>EPIC</span>
            <div style={{ fontSize: '10px', lineHeight: 1.15, marginTop: 2 }}>
              Investment<br />Partners
            </div>
          </div>
          <div style={{ width: '72%', textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              {d.subFundName || '\u00A0'} (the "Fund")
            </div>
            <div style={{ fontSize: '11px' }}>
              {d.shareClassFullName || '\u00A0'} (ISIN: {d.isin || '\u00A0'})
            </div>
            <div style={{ fontSize: '11px' }}>
              A sub-fund of {d.companyName || '\u00A0'} (the "Company")
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 700 }}>Key Investor Information</div>
        <p style={{ fontSize: '11px', marginTop: 2, marginBottom: 8 }}>
          This document provides you with key investor information about this Fund. It is not
          marketing material. The information is required by law to help you understand the nature
          and the risks of investing in this Fund. You are advised to read it so you can make an
          informed decision about whether to invest.
        </p>

        {/* Section I */}
        <RedBox>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 4 }}>
            OBJECTIVES AND INVESTMENT POLICY
          </div>
          <Bullets items={d.objectivesBullets} columns={2} />
          {d.showRecommendation && (
            <p style={{ fontSize: '11px', fontStyle: 'italic', marginTop: 6 }}>
              Recommendation: This Fund may not be appropriate for investors who plan to withdraw
              their money in the short term (within {d.minInvestmentYears ?? 3} years). The Fund
              should be viewed as a medium or longer term investment.
            </p>
          )}
          <p style={{ fontSize: '11px', marginTop: 6 }}>
            <strong>Futures contracts:</strong> standardised contracts between two parties to buy
            or sell a specified asset of standardised quantity and quality for a price agreed today
            with delivery and payment occurring at a specified future delivery date.
          </p>
        </RedBox>

        {/* Section II */}
        <RedBox>
          <div className="flex" style={{ gap: 10 }}>
            <div style={{ width: '47%' }}>
              <BlueBox>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>RISK AND REWARD PROFILE</div>
                <div className="flex justify-between" style={{ fontSize: '10px', marginBottom: 6 }}>
                  <span>Lower risk</span>
                  <span>Higher risk</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '10px', marginBottom: 6 }}>
                  <span>Potentially lower reward</span>
                  <span>Potentially higher reward</span>
                </div>
                <SrriScale srriCategory={d.srriCategory} />
                <p style={{ fontSize: '10px', marginTop: 8 }}>
                  The Fund is in category {d.srriCategory || '\u00A0'} as assets it holds have
                  historically been subject to higher levels of price fluctuation. The category shown
                  is not guaranteed and may change over time. It is based on historical data and may
                  not be a reliable indication of future circumstances. The lowest category does not
                  mean a risk free investment.
                </p>
                <p style={{ fontSize: '10px', marginTop: 6 }}>
                  The Fund is exposed to additional risks not captured by the risk indicator
                  including, without limitation:
                </p>
              </BlueBox>
            </div>
            <div style={{ width: '51%' }}>
              <Bullets items={d.riskBullets} />
            </div>
          </div>
        </RedBox>
      </Page>

      {/* ---------- PAGE 2 ---------- */}
      <Page>
        {/* Section III */}
        <RedBox>
          <div className="flex" style={{ gap: 10 }}>
            <div style={{ width: '47%' }}>
              <BlueBox>
                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>
                  CHARGES FOR THIS FUND
                </div>
                <ChargeTable
                  rows={[
                    { header: true, label: 'ONE-OFF CHARGES TAKEN BEFORE OR AFTER YOU INVEST' },
                    { label: 'Entry charge', value: d.entryCost },
                    { label: 'Exit charge', value: d.exitCost },
                  ]}
                />
                <p style={{ fontSize: '9px', marginTop: 5 }}>
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
                      { header: true, label: 'CHARGES TAKEN FROM THE FUND UNDER CERTAIN SPECIFIC CONDITIONS' },
                      { label: 'Performance fee', value: `${d.performanceFeeValue}% of the Net New Profits (as defined in the Supplement).` },
                      { label: 'Anti-Dilution Levy', value: `${d.antiDilutionLevy}% amount reflecting specific dealing costs.` },
                    ]}
                  />
                )}
              </BlueBox>
            </div>
            <div style={{ width: '51%' }}>
              <Bullets items={d.feesBullets} fontSize="10px" />
            </div>
          </div>
        </RedBox>

        {/* Section IV */}
        <RedBox>
          <div className="flex" style={{ gap: 10 }}>
            <div style={{ width: '51%' }}>
              <BlueBox>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>PAST PERFORMANCE</div>
                <PerformanceChart years={d.performanceYears} />
              </BlueBox>
            </div>
            <div style={{ width: '47%' }}>
              <Bullets items={d.performanceBullets} />
            </div>
          </div>
        </RedBox>

        {/* Section V */}
        <RedBox>
          <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>PRACTICAL INFORMATION</div>
          <Bullets items={d.practicalBullets} columns={2} fontSize="10px" />
        </RedBox>

        {/* Section VI (only if non-empty) */}
        {additional.length > 0 && (
          <RedBox>
            <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: 4 }}>
              ADDITIONAL INFORMATION
            </div>
            <Bullets items={additional} columns={2} fontSize="10px" />
          </RedBox>
        )}

        {/* Regulatory statement */}
        <RedBox>
          <div style={{ background: LIGHTGREY, padding: '6px 8px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700 }}>
              The Company and the Fund are authorised and regulated by {d.regulatorName}.{' '}
              {d.managementCompanyName} is authorised in {d.regulatorJurisdiction} and regulated by{' '}
              {d.regulatorName} as an Undertaking for Collective Investment in Transferable
              Securities Fund Manager.
            </p>
            <p style={{ fontSize: '10px', fontWeight: 700, marginTop: 6 }}>
              This key investor information is accurate as at {d.accurateAsOfDate}.
            </p>
          </div>
        </RedBox>
      </Page>
    </div>
  );
}