export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function parseCentsFromString(value: string): number {
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10);
}

export function formatInputBRL(cents: number): string {
  if (cents === 0) return '';
  const str = String(cents).padStart(3, '0');
  const integer = str.slice(0, -2);
  const decimal = str.slice(-2);
  const formatted = parseInt(integer).toLocaleString('pt-BR');
  return `${formatted},${decimal}`;
}
