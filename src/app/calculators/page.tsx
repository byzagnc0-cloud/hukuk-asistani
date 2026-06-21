'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calculator, Car, Percent, Receipt, Briefcase, Gavel, HardHat, CalendarClock, Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import {
  calculateVehicleValueLoss, calculateVehicleDeprivation, calculateSimpleInterest,
  calculateCourtFee, calculateAttorneyFee, calculateEnforcementTotal,
  calculateSeverancePay, calculateNoticePay, calculateNoticeWeeks,
  calculateDeadline, calculateDaysBetween, DurationUnit,
} from '@/lib/calculators'

function ResultBox({ label, value, accent = 'blue' }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`bg-${accent}-50 border border-${accent}-200 rounded-xl p-4`}>
      <p className={`text-xs text-${accent}-500 uppercase tracking-wide font-medium`}>{label}</p>
      <p className={`text-2xl font-bold text-${accent}-700 mt-1`}>{value}</p>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">{children}</p>
}

function VehicleValueLossCalc() {
  const [preValue, setPreValue] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [lossRate, setLossRate] = useState('10')
  const repair = parseFloat(repairCost)
  const rate = parseFloat(lossRate)
  const result = !isNaN(repair) && !isNaN(rate) ? calculateVehicleValueLoss({ preAccidentValue: parseFloat(preValue) || 0, repairCost: repair, lossRatePercent: rate }) : null

  return (
    <div className="space-y-4">
      <Note>Değer kaybı oranı dosyaya göre değişir; kesin tutar bilirkişi raporu ile belirlenir. Oranı kendi değerlendirmenize göre güncelleyebilirsiniz.</Note>
      <div className="form-row">
        <div><label className="label">Kaza Öncesi Araç Değeri (TL)</label><input type="number" value={preValue} onChange={e => setPreValue(e.target.value)} className="input-field" /></div>
        <div><label className="label">Onarım / Hasar Bedeli (TL)</label><input type="number" value={repairCost} onChange={e => setRepairCost(e.target.value)} className="input-field" /></div>
      </div>
      <div><label className="label">Değer Kaybı Oranı (%)</label><input type="number" value={lossRate} onChange={e => setLossRate(e.target.value)} className="input-field" /></div>
      {result !== null && <ResultBox label="Tahmini Değer Kaybı" value={formatCurrency(result)} />}
    </div>
  )
}

function VehicleDeprivationCalc() {
  const [dailyRate, setDailyRate] = useState('')
  const [days, setDays] = useState('')
  const rate = parseFloat(dailyRate)
  const d = parseFloat(days)
  const result = !isNaN(rate) && !isNaN(d) ? calculateVehicleDeprivation({ dailyRate: rate, days: d }) : null

  return (
    <div className="space-y-4">
      <Note>Günlük mahrumiyet bedeli; aracın bulunduğu bölgedeki muadil kiralama bedeline göre belirlenir.</Note>
      <div className="form-row">
        <div><label className="label">Günlük Mahrumiyet Bedeli (TL)</label><input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} className="input-field" /></div>
        <div><label className="label">Mahrumiyet Süresi (Gün)</label><input type="number" value={days} onChange={e => setDays(e.target.value)} className="input-field" /></div>
      </div>
      {result !== null && <ResultBox label="Toplam Mahrumiyet Bedeli" value={formatCurrency(result)} />}
    </div>
  )
}

function InterestCalc() {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(todayISO())
  const p = parseFloat(principal)
  const r = parseFloat(rate)
  const result = !isNaN(p) && !isNaN(r) && startDate && endDate ? calculateSimpleInterest(p, r, startDate, endDate) : null

  return (
    <div className="space-y-4">
      <Note>Yasal faiz, ticari faiz ve temerrüt faizi oranları zaman içinde değişir; güncel oranı girerek hesaplayın.</Note>
      <div className="form-row">
        <div><label className="label">Anapara (TL)</label><input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="input-field" /></div>
        <div><label className="label">Yıllık Faiz Oranı (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">Başlangıç Tarihi</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
        <div><label className="label">Bitiş Tarihi</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
      </div>
      {result !== null && (
        <div className="grid sm:grid-cols-3 gap-3">
          <ResultBox label="Gün Sayısı" value={`${result.days}`} accent="gray" />
          <ResultBox label="İşlemiş Faiz" value={formatCurrency(result.interest)} />
          <ResultBox label="Toplam" value={formatCurrency(result.total)} accent="green" />
        </div>
      )}
    </div>
  )
}

function CourtFeeCalc() {
  const [value, setValue] = useState('')
  const [rate, setRate] = useState('')
  const v = parseFloat(value)
  const r = parseFloat(rate)
  const result = !isNaN(v) && !isNaN(r) ? calculateCourtFee(v, r) : null

  return (
    <div className="space-y-4">
      <Note>Harç oranları (binde) her yıl güncellenir; hesaplama yapmadan önce güncel oranı kontrol ediniz.</Note>
      <div className="form-row">
        <div><label className="label">Dava Değeri (TL)</label><input type="number" value={value} onChange={e => setValue(e.target.value)} className="input-field" /></div>
        <div><label className="label">Harç Oranı (‰ Binde)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" /></div>
      </div>
      {result !== null && (
        <div className="grid sm:grid-cols-3 gap-3">
          <ResultBox label="Toplam Harç" value={formatCurrency(result.fullFee)} />
          <ResultBox label="Peşin Harç (1/4)" value={formatCurrency(result.advanceFee)} accent="gray" />
          <ResultBox label="Tahsil Harcı (3/4)" value={formatCurrency(result.remainingFee)} accent="gray" />
        </div>
      )}
    </div>
  )
}

function AttorneyFeeCalc() {
  const [value, setValue] = useState('')
  const [rate, setRate] = useState('')
  const [fixed, setFixed] = useState('0')
  const v = parseFloat(value)
  const r = parseFloat(rate)
  const f = parseFloat(fixed) || 0
  const result = !isNaN(v) && !isNaN(r) ? calculateAttorneyFee(v, r, f) : null

  return (
    <div className="space-y-4">
      <Note>AAÜT'deki güncel oran ve asgari ücretleri girerek hesaplayın; tarife yıllık olarak değişir.</Note>
      <div className="form-row">
        <div><label className="label">Dava / İcra Değeri (TL)</label><input type="number" value={value} onChange={e => setValue(e.target.value)} className="input-field" /></div>
        <div><label className="label">Vekalet Ücreti Oranı (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" /></div>
      </div>
      <div><label className="label">Sabit Ek Ücret (TL, opsiyonel)</label><input type="number" value={fixed} onChange={e => setFixed(e.target.value)} className="input-field" /></div>
      {result !== null && <ResultBox label="Vekalet Ücreti" value={formatCurrency(result)} accent="green" />}
    </div>
  )
}

function EnforcementCalc() {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(todayISO())
  const [expenses, setExpenses] = useState('0')
  const [feeRate, setFeeRate] = useState('')
  const p = parseFloat(principal)
  const r = parseFloat(rate)
  const fr = parseFloat(feeRate)
  const exp = parseFloat(expenses) || 0
  const result = !isNaN(p) && !isNaN(r) && !isNaN(fr) && startDate && endDate
    ? calculateEnforcementTotal({ principal: p, annualRatePercent: r, startDate, endDate, expenses: exp, attorneyFeeRatePercent: fr })
    : null

  return (
    <div className="space-y-4">
      <Note>İcra takip faizi, masraflar ve vekalet ücreti oranlarını güncel tarifeye göre giriniz.</Note>
      <div className="form-row">
        <div><label className="label">Anapara (TL)</label><input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="input-field" /></div>
        <div><label className="label">Yıllık Faiz Oranı (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">Takip Başlangıç Tarihi</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
        <div><label className="label">Hesaplama Tarihi</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">İcra Masrafları (TL)</label><input type="number" value={expenses} onChange={e => setExpenses(e.target.value)} className="input-field" /></div>
        <div><label className="label">Vekalet Ücreti Oranı (%)</label><input type="number" value={feeRate} onChange={e => setFeeRate(e.target.value)} className="input-field" /></div>
      </div>
      {result !== null && (
        <div className="grid sm:grid-cols-2 gap-3">
          <ResultBox label="Faiz" value={formatCurrency(result.interest)} accent="gray" />
          <ResultBox label="Anapara + Faiz" value={formatCurrency(result.principalWithInterest)} accent="gray" />
          <ResultBox label="Vekalet Ücreti" value={formatCurrency(result.attorneyFee)} accent="gray" />
          <ResultBox label="Genel Toplam" value={formatCurrency(result.total)} accent="green" />
        </div>
      )}
    </div>
  )
}

function LaborClaimsCalc() {
  const [dailyWage, setDailyWage] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(todayISO())
  const [ceiling, setCeiling] = useState('')
  const wage = parseFloat(dailyWage)
  const ceil = parseFloat(ceiling)
  const days = startDate && endDate ? calculateDaysBetween(startDate, endDate) : null
  const years = days !== null ? days / 365 : null
  const severance = !isNaN(wage) && years !== null ? calculateSeverancePay({ dailyGrossWage: wage, serviceYears: years, ceiling: !isNaN(ceil) ? ceil : undefined }) : null
  const notice = !isNaN(wage) && years !== null ? calculateNoticePay({ dailyGrossWage: wage, serviceYears: years }) : null
  const noticeWeeks = years !== null ? calculateNoticeWeeks(years) : null

  return (
    <div className="space-y-4">
      <Note>Kıdem tazminatı tavanı her yıl güncellenir (boş bırakılırsa tavan uygulanmaz); ihbar süreleri İş Kanunu m.17&apos;ye göre sabittir.</Note>
      <div className="form-row">
        <div><label className="label">Günlük Brüt Ücret (TL)</label><input type="number" value={dailyWage} onChange={e => setDailyWage(e.target.value)} className="input-field" /></div>
        <div><label className="label">Kıdem Tazminatı Tavanı (TL, opsiyonel)</label><input type="number" value={ceiling} onChange={e => setCeiling(e.target.value)} className="input-field" /></div>
      </div>
      <div className="form-row">
        <div><label className="label">İşe Başlama Tarihi</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
        <div><label className="label">İşten Çıkış Tarihi</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
      </div>
      {years !== null && (
        <p className="text-xs text-gray-400">Kıdem süresi: {years.toFixed(2)} yıl ({days} gün) — İhbar süresi: {noticeWeeks} hafta</p>
      )}
      {(severance !== null || notice !== null) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {severance !== null && <ResultBox label="Kıdem Tazminatı" value={formatCurrency(severance)} />}
          {notice !== null && <ResultBox label="İhbar Tazminatı" value={formatCurrency(notice)} accent="gray" />}
        </div>
      )}
    </div>
  )
}

function DeadlineCalc() {
  const [mode, setMode] = useState<'add' | 'between'>('add')
  const [startDate, setStartDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<DurationUnit>('day')
  const [endDate, setEndDate] = useState('')

  const amt = parseFloat(amount)
  const deadlineResult = mode === 'add' && startDate && !isNaN(amt) ? calculateDeadline(startDate, amt, unit) : null
  const betweenResult = mode === 'between' && startDate && endDate ? calculateDaysBetween(startDate, endDate) : null

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode('add')} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === 'add' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Süre Ekle</button>
        <button onClick={() => setMode('between')} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === 'between' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>İki Tarih Arası</button>
      </div>

      {mode === 'add' ? (
        <>
          <div className="form-row">
            <div><label className="label">Başlangıç Tarihi</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
            <div><label className="label">Süre</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-field" /></div>
          </div>
          <div>
            <label className="label">Birim</label>
            <select value={unit} onChange={e => setUnit(e.target.value as DurationUnit)} className="input-field">
              <option value="day">Gün</option>
              <option value="week">Hafta</option>
              <option value="month">Ay</option>
              <option value="year">Yıl</option>
            </select>
          </div>
          {deadlineResult && <ResultBox label="Son Tarih" value={formatDate(deadlineResult)} accent="green" />}
        </>
      ) : (
        <>
          <div className="form-row">
            <div><label className="label">Başlangıç Tarihi</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" /></div>
            <div><label className="label">Bitiş Tarihi</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" /></div>
          </div>
          {betweenResult !== null && <ResultBox label="Gün Sayısı" value={`${betweenResult} gün`} accent="green" />}
        </>
      )}
    </div>
  )
}

const CALCULATORS = [
  { key: 'deger_kaybi', label: 'Araç Değer Kaybı', icon: Car, component: VehicleValueLossCalc },
  { key: 'mahrumiyet', label: 'Araç Mahrumiyet', icon: Car, component: VehicleDeprivationCalc },
  { key: 'faiz', label: 'Faiz Hesabı', icon: Percent, component: InterestCalc },
  { key: 'harc', label: 'Harç Hesabı', icon: Receipt, component: CourtFeeCalc },
  { key: 'vekalet', label: 'Vekalet Ücreti Hesabı', icon: Briefcase, component: AttorneyFeeCalc },
  { key: 'icra', label: 'İcra Hesabı', icon: Gavel, component: EnforcementCalc },
  { key: 'iscilik', label: 'İşçilik Alacağı Hesabı', icon: HardHat, component: LaborClaimsCalc },
  { key: 'sure', label: 'Süre Hesaplama', icon: CalendarClock, component: DeadlineCalc },
] as const

export default function CalculatorsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [active, setActive] = useState<typeof CALCULATORS[number]['key']>('deger_kaybi')

  useEffect(() => {
    if (!loading && !user) router.push('/auth')
  }, [user, loading, router])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const activeCalc = CALCULATORS.find(c => c.key === active)!
  const ActiveComponent = activeCalc.component

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="page-header">
          <div>
            <h1 className="page-title">Hesaplama Araçları</h1>
            <p className="text-sm text-gray-500 mt-0.5">Oranları kendi tarifenize göre girerek hesaplayın</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CALCULATORS.map(c => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                active === c.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-gray-900">{activeCalc.label}</h2>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </AppLayout>
  )
}
