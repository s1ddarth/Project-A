import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Repeatable Year + Return(%) row editor for Section IV performance data.
export default function PerformanceEditor({ years, onChange }) {
  const update = (i, field, value) => {
    const next = years.map((y, idx) =>
      idx === i ? { ...y, [field]: value === '' ? '' : Number(value) } : y
    );
    onChange(next);
  };

  const addRow = () => onChange([...years, { year: '', value: '' }]);
  const removeRow = (i) => onChange(years.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Year</span>
        <span>Return (%)</span>
        <span />
      </div>
      {years.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          No rows — the chart will render blank.
        </p>
      )}
      {years.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            type="number"
            value={row.year}
            placeholder="2024"
            onChange={(e) => update(i, 'year', e.target.value)}
          />
          <Input
            type="number"
            step="0.1"
            value={row.value}
            placeholder="7.3"
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRow(i)}
            aria-label="Remove row"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-1" /> Add row
      </Button>
    </div>
  );
}