/** Medianoche UTC del primer día del mes actual: el corte usado para los límites mensuales de plan. */
export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
