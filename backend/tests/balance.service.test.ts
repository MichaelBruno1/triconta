import { simplifyDebts } from '../src/services/balance.service.js';

describe('simplifyDebts', () => {
  it('should return empty for balanced group', () => {
    const result = simplifyDebts([
      { memberId: '1', memberName: 'Alice', balanceCents: 0 },
      { memberId: '2', memberName: 'Bob', balanceCents: 0 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('should suggest single transfer for two people', () => {
    const result = simplifyDebts([
      { memberId: '1', memberName: 'Alice', balanceCents: 5000 },
      { memberId: '2', memberName: 'Bob', balanceCents: -5000 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].amountCents).toBe(5000);
    expect(result[0].fromMemberName).toBe('Bob');
    expect(result[0].toMemberName).toBe('Alice');
  });

  it('should simplify three-person debt', () => {
    // A paid 300, B paid 0, C paid 0. Total 300, each owes 100.
    // A: +200, B: -100, C: -100
    const result = simplifyDebts([
      { memberId: 'a', memberName: 'Alice', balanceCents: 20000 },
      { memberId: 'b', memberName: 'Bob', balanceCents: -10000 },
      { memberId: 'c', memberName: 'Carol', balanceCents: -10000 },
    ]);
    expect(result).toHaveLength(2);
    const total = result.reduce((acc, s) => acc + s.amountCents, 0);
    expect(total).toBe(20000);
  });
});
