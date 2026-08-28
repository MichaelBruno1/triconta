import { useState, useRef } from 'react';
import { formatInputBRL } from '../utils/currency';

interface Props {
  value: number; // in cents
  onChange: (cents: number) => void;
  placeholder?: string;
  id?: string;
}

export default function CurrencyInput({ value, onChange, placeholder = '0,00', id }: Props) {
  const [displayValue, setDisplayValue] = useState(() => formatInputBRL(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const cents = parseInt(raw || '0', 10);
    onChange(cents);
    setDisplayValue(formatInputBRL(cents));
  };

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        pointerEvents: 'none',
      }}>R$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ paddingLeft: '40px', textAlign: 'right' }}
      />
    </div>
  );
}
