import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Lock } from 'lucide-react';
import RichTextBullets from './RichTextBullets';
import SrriScale from './SrriScale';
import { sectionHelperText } from '@/lib/kiidData';

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function HelperText({ text }) {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/50 rounded-md p-2.5 mb-3 border-l-2 border-primary/30">
      {text}
    </p>
  );
}

// Editor form: fees + narrative sections I–VI with rich-text bullets. The fund
// header and regulatory footer are collected on the validation step instead.
// SRRI is a read-only, computed badge (no dropdown) fed by data.srriCategory.
export default function KiidForm({ data, update }) {
  return (
    <div className="space-y-5">
      {/* ---------- CHARGES ---------- */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-3 text-primary">Fees & Charges</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Entry Cost (%)">
            <Input type="number" step="0.01" value={data.entryCost} onChange={(e) => update('entryCost', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Exit Cost (%)">
            <Input type="number" step="0.01" value={data.exitCost} onChange={(e) => update('exitCost', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Ongoing Cost (%)">
            <Input type="number" step="0.01" value={data.ongoingCost} onChange={(e) => update('ongoingCost', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <Field label="Transaction Cost (%)">
            <Input type="number" step="0.01" value={data.transactionCost} onChange={(e) => update('transactionCost', e.target.value === '' ? 0 : Number(e.target.value))} />
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={data.performanceFeeRequired} onCheckedChange={(v) => update('performanceFeeRequired', v)} id="pfr" />
            <Label htmlFor="pfr" className="text-xs">Performance Fee</Label>
          </div>
          {data.performanceFeeRequired && (
            <Field label="Performance Fee Value (%)">
              <Input type="number" step="0.01" value={data.performanceFeeValue} onChange={(e) => update('performanceFeeValue', e.target.value === '' ? 0 : Number(e.target.value))} />
            </Field>
          )}
          {data.performanceFeeRequired && (
            <Field label="Anti-Dilution Levy (%)">
              <Input type="number" step="0.01" value={data.antiDilutionLevy} onChange={(e) => update('antiDilutionLevy', e.target.value === '' ? 0 : Number(e.target.value))} />
            </Field>
          )}
        </div>
      </section>

      {/* ---------- NARRATIVE SECTIONS I–VI ---------- */}
      <Accordion type="multiple" defaultValue={['section-1']} className="space-y-3">
        <AccordionItem value="section-1" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">I — Fund Overview (Objectives & Investment Policy)</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.objectives} />
            <RichTextBullets value={data.objectivesBullets} onChange={(v) => update('objectivesBullets', v)} />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={data.showRecommendation} onCheckedChange={(v) => update('showRecommendation', v)} id="rec" />
                <Label htmlFor="rec" className="text-xs">Show Recommendation</Label>
              </div>
              <Field label="Min Investment Years">
                <Input
                  type="number"
                  value={data.minInvestmentYears}
                  onChange={(e) => update('minInvestmentYears', e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-24"
                />
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-2" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">II — Risk Profile</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.risk} />
            {/* Read-only computed SRRI badge — replaces the former dropdown. */}
            <div className="mb-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Computed SRRI (read-only)
              </Label>
              <div className="mt-1.5 flex items-center gap-3">
                <SrriScale srriCategory={data.srriCategory} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Category {data.srriCategory || '—'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                Computed from the NAV file during validation.
              </p>
            </div>
            <Label className="text-xs font-medium text-muted-foreground">Risk Bullets</Label>
            <div className="mt-1">
              <RichTextBullets value={data.riskBullets} onChange={(v) => update('riskBullets', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-3" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">III — Fees & Charges (Narrative)</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.fees} />
            <RichTextBullets value={data.feesBullets} onChange={(v) => update('feesBullets', v)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-4" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">IV — Past Performance</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.performance} />
            <p className="mb-4 text-xs text-muted-foreground rounded-md border border-dashed bg-muted/40 px-3 py-2">
              Performance figures are calculated by the engine from the uploaded NAV file and
              cannot be typed here. Write the surrounding narrative below.
            </p>
            <Label className="text-xs font-medium text-muted-foreground">Performance Bullets</Label>
            <div className="mt-1">
              <RichTextBullets value={data.performanceBullets} onChange={(v) => update('performanceBullets', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-5" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">V — Practical Details</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.practical} />
            <RichTextBullets value={data.practicalBullets} onChange={(v) => update('practicalBullets', v)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-6" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-sm font-semibold text-primary">VI — Additional Information (optional)</span>
          </AccordionTrigger>
          <AccordionContent>
            <HelperText text={sectionHelperText.additional} />
            <RichTextBullets
              value={data.additionalInfoBullets}
              onChange={(v) => update('additionalInfoBullets', v)}
              placeholder="Leave empty to omit this section from the document…"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}