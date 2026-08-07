import React from 'react';
import { FileText, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTS = [
  { id: 'ucits_kiid', name: 'UCITS KIID', desc: 'Key Investor Information Document for UCITS funds.', enabled: true },
  { id: 'priips_kid', name: 'PRIIPs KID', desc: 'Key Information Document for PRIIPs.', enabled: false },
  { id: 'factsheet', name: 'Factsheet', desc: 'Marketing factsheet for the share class.', enabled: false },
];

export default function ProductPicker({ value, onChange }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Choose a document type</h2>
      <p className="text-xs text-muted-foreground mb-5">
        UCITS KIID is available now. Other products are coming soon.
      </p>
      <div className="grid gap-3">
        {PRODUCTS.map((p) => {
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!p.enabled}
              onClick={() => p.enabled && onChange(p.id)}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4 text-left transition',
                !p.enabled && 'opacity-50 cursor-not-allowed bg-muted/30',
                p.enabled && selected && 'border-primary ring-2 ring-primary/30 bg-primary/5',
                p.enabled && !selected && 'hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              <div
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                  p.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {p.enabled ? <FileText className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  {!p.enabled && (
                    <span className="text-[10px] uppercase font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                  {p.enabled && selected && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}