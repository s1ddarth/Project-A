export const sectionHelperText = {
  objectives: "Briefly outline the fund's management company and regulatory authorization. Summarize the fund's main investment objective and policy, including the primary asset types and geographic focus. Mention any use of derivatives and how income or dividends are treated. Also specify the recommended minimum investment duration and details on dealing days and cut-off times for transactions.",
  risk: "Explain the main risks identified (e.g., currency, liquidity, emerging markets, derivatives). Highlight any additional risks or warnings provided beyond the risk indicator. Describe how the risk information is presented (e.g., graphical scale or descriptive text).",
  fees: "Provide a clear summary of all charges related to the fund, including any initial entry or exit charges, ongoing annual fees, and any other applicable levies such as anti-dilution charges. Indicate whether performance fees apply. Explain if these charges are expressed as percentages, fixed amounts, or both.",
  performance: "Outline the historical performance figures provided for the fund, including the time period covered and whether these figures reflect charges. Note if benchmark data is included for comparison and any disclaimers about the reliability of past performance. Mention if there were any structural changes, such as mergers, that impact historical data.",
  practical: "Describe the fund's depositary or custodian, and where investors can find up-to-date share prices. Explain how investors can buy, sell, or switch shares, including any conditions or restrictions. Provide information about where full regulatory documents, such as the prospectus and financial reports, can be accessed. Include any relevant tax information or legal disclaimers. Confirm whether the fund is part of an umbrella structure with segregated liability. Also, mention if a remuneration policy disclosure is available and where.",
  additional: "Note any specific terms regarding switching between share classes or other funds. Include references to related documents or regulatory compliance notes. Highlight any risks or factors not covered in earlier sections. Mention any significant fund events such as mergers or structural changes. If the fund includes ESG or sustainability considerations, please describe briefly. Add any other investor-relevant information or disclaimers.",
};

/**
 * Standard line printed under the past-performance chart.
 *
 * Kept as a single function so the wording can be changed in one place — it is
 * expected to change. The currency is user-entered master data, not an
 * engine-computed figure, so it is interpolated rather than placeholder-filled.
 */
export const pastPerformanceCurrencyLine = (currency) =>
  `Past performance has been calculated in ${currency || '—'}.`;

/** Permitted values for the Acc/Dis share-class field (Field Schema Spec §2). */
export const ACC_DIS_OPTIONS = ['Accumulating', 'Distributing'];

export const defaultData = {
  subFundName: '',
  companyName: '',
  shareClassFullName: '',
  isin: '',
  subFundBaseCurrency: 'USD',
  shareClassBaseCurrency: 'USD',
  hedged: false,
  accDis: '',
  scLetter: '',
  objectivesBullets: [],
  showRecommendation: true,
  minInvestmentYears: 3,
  // Engine-computed. Empty until validation runs — never type a risk number.
  srriCategory: '',
  // Derived by the engine alongside the category (##SRRI_LABEL##), never mapped
  // in the frontend — the wording must match the number the engine returned.
  srriLabel: '',
  riskBullets: [],
  entryCost: 0,
  exitCost: 0,
  ongoingCost: 0,
  transactionCost: 0,
  performanceFeeRequired: false,
  performanceFeeValue: 0,
  antiDilutionLevy: 0,
  feesBullets: [],
  performanceYears: [],
  performanceBullets: [],
  practicalBullets: [],
  additionalInfoBullets: [],
  regulatorName: 'the Central Bank of Ireland',
  regulatorJurisdiction: 'Ireland',
  managementCompanyName: 'EPIC Investment Partners (Ireland) Limited',
  accurateAsOfDate: '31 December 2024',
};

export const sampleData = {
  subFundName: 'EPIC Financial Trends',
  companyName: 'EPIC Funds p.l.c.',
  shareClassFullName: 'Class X USD Shares',
  isin: 'IE00BDBB9Q16',
  subFundBaseCurrency: 'USD',
  shareClassBaseCurrency: 'USD',
  hedged: false,
  accDis: 'Accumulating',
  scLetter: 'X',
  objectivesBullets: [
    "EPIC Financial Trends is a sub-fund of EPIC Funds p.l.c., an open-ended investment company with variable capital incorporated in Ireland and authorised by the Central Bank of Ireland as a UCITS.",
    "The Fund's investment objective is to achieve long-term capital growth by investing primarily in a globally diversified portfolio of equity and equity-related securities.",
    "The Fund invests at least 70% of its net assets in equities of companies that, in the Investment Manager's view, demonstrate sustainable financial trends and growth characteristics.",
    "The Fund may use derivatives for efficient portfolio management and hedging purposes.",
    "Income is reinvested in the Fund. Shares may be redeemed on each Dealing Day (generally each Business Day).",
  ],
  showRecommendation: true,
  minInvestmentYears: 3,
  // Engine-computed — see defaultData. Filled by validation, not by the user.
  srriCategory: '',
  srriLabel: '',
  riskBullets: [
    "Currency risk: the Fund's base currency is USD and investments may be denominated in other currencies, exposing investors to exchange-rate movements.",
    "Liquidity risk: some securities may become difficult to sell in adverse market conditions.",
    "Emerging markets risk: investments in emerging markets may carry higher volatility and lower liquidity.",
    "Derivatives risk: the use of derivatives may amplify losses beyond the initial investment.",
  ],
  entryCost: 0,
  exitCost: 0,
  ongoingCost: 1.5,
  transactionCost: 0.2,
  performanceFeeRequired: false,
  performanceFeeValue: 0,
  antiDilutionLevy: 0,
  feesBullets: [
    "The charges shown are the maximum that may apply. Entry and exit charges are taken from your investment before it is applied or before proceeds are paid out.",
    "Ongoing charges are taken from the share class over a year and include management fees and administrative costs.",
    "Transaction costs are incurred when the Fund buys and sells investments.",
  ],
  // Engine-computed from the NAV file. Empty until validation runs; the demo
  // figures now live in KiidWorkflow as the stubbed engine response.
  performanceYears: [],
  performanceBullets: [
    "Performance figures are shown net of ongoing charges and transaction costs.",
    "Past performance is not a reliable indicator of future results.",
    "Data for the year 2024 is to the last valuation date shown.",
  ],
  practicalBullets: [
    "The depositary of the Fund is [Depositary Name]. Up-to-date share prices are available at www.epicfunds.com or from your financial adviser.",
    "Investors may buy, sell or switch shares through authorised distributors on each Dealing Day. The cut-off time for orders is normally 16:00 (Irish time).",
    "The Fund's Prospectus, Key Investor Information Document and annual/semi-annual reports are available free of charge at www.epicfunds.com or from the registered office.",
    "The Fund is a sub-fund of EPIC Funds p.l.c., an umbrella fund with segregated liability between sub-funds.",
  ],
  additionalInfoBullets: [
    "Investors may switch between share classes of the Fund subject to the conditions set out in the Prospectus.",
    "The remuneration policy of the Investment Manager is available on request and on the Company's website.",
  ],
  regulatorName: 'the Central Bank of Ireland',
  regulatorJurisdiction: 'Ireland',
  managementCompanyName: 'EPIC Investment Partners (Ireland) Limited',
  accurateAsOfDate: '31 December 2024',
};