import { differenceInCalendarDays, addDays, addMonths, addYears, parseISO, format } from 'date-fns'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ============================================================
// Süre Hesaplama
// ============================================================
export type DurationUnit = 'day' | 'week' | 'month' | 'year'

export function calculateDeadline(startDate: string, amount: number, unit: DurationUnit): string {
  const start = parseISO(startDate)
  let result: Date
  switch (unit) {
    case 'day': result = addDays(start, amount); break
    case 'week': result = addDays(start, amount * 7); break
    case 'month': result = addMonths(start, amount); break
    case 'year': result = addYears(start, amount); break
  }
  return format(result, 'yyyy-MM-dd')
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
}

// ============================================================
// Faiz Hesabı (basit faiz, gün esaslı)
// ============================================================
export interface InterestResult {
  days: number
  interest: number
  total: number
}

export function calculateSimpleInterest(principal: number, annualRatePercent: number, startDate: string, endDate: string): InterestResult {
  const days = Math.max(0, calculateDaysBetween(startDate, endDate))
  const interest = round2((principal * (annualRatePercent / 100) * days) / 365)
  return { days, interest, total: round2(principal + interest) }
}

// ============================================================
// Harç Hesabı (binde oran üzerinden, oran kullanıcı tarafından girilir)
// ============================================================
export interface CourtFeeResult {
  fullFee: number
  advanceFee: number // peşin harç (1/4)
  remainingFee: number // tahsil harcı (3/4)
}

export function calculateCourtFee(value: number, perMilleRate: number): CourtFeeResult {
  const fullFee = round2(value * (perMilleRate / 1000))
  const advanceFee = round2(fullFee / 4)
  return { fullFee, advanceFee, remainingFee: round2(fullFee - advanceFee) }
}

// ============================================================
// Vekalet Ücreti Hesabı (oran ve sabit ek ücret kullanıcı tarafından girilir)
// ============================================================
export function calculateAttorneyFee(value: number, ratePercent: number, fixedAddition: number = 0): number {
  return round2(value * (ratePercent / 100) + fixedAddition)
}

// ============================================================
// İcra Hesabı
// ============================================================
export interface EnforcementResult {
  days: number
  interest: number
  principalWithInterest: number
  attorneyFee: number
  expenses: number
  total: number
}

export function calculateEnforcementTotal(params: {
  principal: number
  annualRatePercent: number
  startDate: string
  endDate: string
  expenses: number
  attorneyFeeRatePercent: number
}): EnforcementResult {
  const { principal, annualRatePercent, startDate, endDate, expenses, attorneyFeeRatePercent } = params
  const { days, interest, total: principalWithInterest } = calculateSimpleInterest(principal, annualRatePercent, startDate, endDate)
  const attorneyFee = round2(principalWithInterest * (attorneyFeeRatePercent / 100))
  return {
    days,
    interest,
    principalWithInterest,
    attorneyFee,
    expenses: round2(expenses),
    total: round2(principalWithInterest + attorneyFee + expenses),
  }
}

// ============================================================
// İşçilik Alacağı Hesabı (kıdem / ihbar tazminatı)
// ============================================================
export function calculateServiceDuration(startDate: string, endDate: string): { years: number; fullYears: number; remainderDays: number } {
  const days = calculateDaysBetween(startDate, endDate)
  const years = days / 365
  return { years, fullYears: Math.floor(years), remainderDays: days % 365 }
}

export function calculateSeverancePay(params: { dailyGrossWage: number; serviceYears: number; ceiling?: number }): number {
  const { dailyGrossWage, serviceYears, ceiling } = params
  const raw = round2(dailyGrossWage * 30 * serviceYears)
  if (ceiling && ceiling > 0) return Math.min(raw, round2(ceiling * serviceYears))
  return raw
}

// İş Kanunu m.17 - ihbar süreleri (kanunda sabit, ücret tavanı değil)
export function calculateNoticeWeeks(serviceYears: number): number {
  if (serviceYears < 0.5) return 2
  if (serviceYears < 1.5) return 4
  if (serviceYears < 3) return 6
  return 8
}

export function calculateNoticePay(params: { dailyGrossWage: number; serviceYears: number }): number {
  const weeks = calculateNoticeWeeks(params.serviceYears)
  return round2(params.dailyGrossWage * weeks * 7)
}

// ============================================================
// Araç Değer Kaybı (tahmini - kesin tutar bilirkişi raporu ile belirlenir)
// ============================================================
export function calculateVehicleValueLoss(params: { preAccidentValue: number; repairCost: number; lossRatePercent: number }): number {
  const { repairCost, lossRatePercent } = params
  return round2(repairCost * (lossRatePercent / 100))
}

// ============================================================
// Araç Mahrumiyet (kullanım kaybı)
// ============================================================
export function calculateVehicleDeprivation(params: { dailyRate: number; days: number }): number {
  return round2(params.dailyRate * params.days)
}
