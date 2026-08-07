import React from 'react';
import { FileText, Layers, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODES = [
  { id: 'single', name: 'Single Production', desc: 'Produce one KIID for a single share class.', enabled: true, Icon: FileText },
  { id: 'batch', name: 'Batch Production', desc: 'Produce KIIDs for multiple share classes at once.', enabled: false, Icon: Layers },
];

export default function ProductionMode({ value, onChange }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Production mode</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Single production is available now. Batch mode is coming soon.
      </p>
      <div className="grid gap-3">
        {MODES.map((m) => {
          const selected = value === m.id;
          const Icon = m.enabled ? m.Icon : Lock;
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.enabled}
              onClick={() => m.enabled && onChange(m.id)}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4 text-left transition',
                !m.enabled && 'opacity-50 cursor-not-allowed bg-muted/30',
                m.enabled && selected && 'border-primary ring-2 ring-primary/30 bg-primary/5',
                m.enabled && !selected && 'hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              <div
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                  m.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{m.name}</span>
                  {!m.enabled && (
                    <span className="text-[10px] uppercase font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                  {m.enabled && selected && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}