import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ACC_DIS_OPTIONS } from '@/lib/kiidData';

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// Fund identification + regulatory fields. Used on the validation step so the
// header can be validated against the uploaded NAV file before editing begins.
export default function HeaderForm({ data, update }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Identification
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sub-Fund Name">
            <Input value={data.subFundName} onChange={(e) => update('subFundName', e.target.value)} />
          </Field>
          <Field label="Sub Fund Umbrella">
            <Input value={data.companyName} onChange={(e) => update('companyName', e.target.value)} />
          </Field>
          <Field label="Share Class Full Name">
            <Input value={data.shareClassFullName} onChange={(e) => update('shareClassFullName', e.target.value)} />
          </Field>
          <Field label="ISIN">
            <Input value={data.isin} onChange={(e) => update('isin', e.target.value)} />
          </Field>
          <Field label="Sub-Fund Base Currency">
            <Input value={data.subFundBaseCurrency} onChange={(e) => update('subFundBaseCurrency', e.target.value)} />
          </Field>
          <Field label="Share Class Base Currency">
            <Input value={data.shareClassBaseCurrency} onChange={(e) => update('shareClassBaseCurrency', e.target.value)} />
          </Field>
          <Field label="SC Letter">
            <Input value={data.scLetter} onChange={(e) => update('scLetter', e.target.value)} />
          </Field>
          <Field label="Acc / Dis">
            <ToggleGroup
              type="single"
              value={data.accDis || ''}
              onValueChange={(v) => v && update('accDis', v)}
              size="sm"
              variant="outline"
              className="justify-start"
            >
              {ACC_DIS_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt} value={opt} aria-label={opt} className="px-3">
                  {opt}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={data.hedged} onCheckedChange={(v) => update('hedged', v)} id="hdr-hedged" />
            <Label htmlFor="hdr-hedged" className="text-xs">Hedged</Label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Regulatory
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Regulator Name">
            <Input value={data.regulatorName} onChange={(e) => update('regulatorName', e.target.value)} />
          </Field>
          <Field label="Regulator Jurisdiction">
            <Input value={data.regulatorJurisdiction} onChange={(e) => update('regulatorJurisdiction', e.target.value)} />
          </Field>
          <Field label="Management Company Name">
            <Input value={data.managementCompanyName} onChange={(e) => update('managementCompanyName', e.target.value)} />
          </Field>
          <Field label="Accurate As Of Date">
            <Input value={data.accurateAsOfDate} onChange={(e) => update('accurateAsOfDate', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}