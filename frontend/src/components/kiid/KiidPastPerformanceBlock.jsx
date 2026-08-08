import React from 'react';
import PerformanceChart from './PerformanceChart';
import { pastPerformanceCurrencyLine } from '@/lib/kiidData';

/**
 * The past-performance block — chart plus the standard currency line.
 *
 * Shared by KiidPreview and the validation step so both render the same thing
 * (rule 1). The chart figures are engine-computed, so before a NAV file has
 * been validated this renders its unresolved state rather than an empty chart
 * that could be mistaken for "no past performance".
 */
export default function KiidPastPerformanceBlock({ data }) {
  const d = data || {};
  return (
    <>
      <PerformanceChart years={d.performanceYears} />
      <p className="kiid-p kiid-p--sm kiid-p--tight">
        {pastPerformanceCurrencyLine(d.subFundBaseCurrency)}
      </p>
    </>
  );
}
