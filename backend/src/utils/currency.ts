export function centsToBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function validateSplits(totalCents: number, splits: { amountCents: number }[]): void {
  const sum = splits.reduce((acc, s) => acc + s.amountCents, 0);
  if (sum !== totalCents) {
    throw new Error(`Split amounts (${sum}) do not match total (${totalCents})`);
  }
}
