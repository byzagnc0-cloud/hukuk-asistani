// PDF / Excel dosyalarından duruşma tarihi tespiti.
// pdfjs-dist ve xlsx tarayıcı tarafında çalıştığı için dinamik olarak import edilir.

export interface DetectedDate {
  date: string // ISO yyyy-MM-dd
  context: string
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const TURKISH_MONTHS: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5,
  haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9,
  ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
}

export function findDatesInText(text: string): DetectedDate[] {
  const results: DetectedDate[] = []
  const seen = new Set<string>()

  const addMatch = (iso: string, index: number, length: number) => {
    if (seen.has(iso)) return
    seen.add(iso)
    const start = Math.max(0, index - 40)
    const end = Math.min(text.length, index + length + 40)
    results.push({ date: iso, context: text.slice(start, end).replace(/\s+/g, ' ').trim() })
  }

  const numericRegex = /\b(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})\b/g
  let match: RegExpExecArray | null
  while ((match = numericRegex.exec(text))) {
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    if (month < 1 || month > 12 || day < 1 || day > 31) continue
    addMatch(`${year}-${pad2(month)}-${pad2(day)}`, match.index, match[0].length)
  }

  const monthNamesPattern = Object.keys(TURKISH_MONTHS).join('|')
  const namedRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthNamesPattern})\\s+(\\d{4})\\b`, 'gi')
  while ((match = namedRegex.exec(text))) {
    const day = parseInt(match[1], 10)
    const month = TURKISH_MONTHS[match[2].toLowerCase()]
    const year = parseInt(match[3], 10)
    if (!month) continue
    addMatch(`${year}-${pad2(month)}-${pad2(day)}`, match.index, match[0].length)
  }

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

export async function extractDatesFromPdf(file: File): Promise<DetectedDate[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }
  return findDatesInText(fullText)
}

export async function extractDatesFromExcel(file: File): Promise<DetectedDate[]> {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const results: DetectedDate[] = []
  const seen = new Set<string>()

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
    rows.forEach(row => {
      const rowText = row.map(c => (c == null ? '' : c instanceof Date ? toISO(c) : String(c))).join(' | ')
      row.forEach(cell => {
        if (cell instanceof Date && !isNaN(cell.getTime())) {
          const iso = toISO(cell)
          if (!seen.has(iso)) {
            seen.add(iso)
            results.push({ date: iso, context: rowText.slice(0, 150) })
          }
        } else if (typeof cell === 'string') {
          findDatesInText(cell).forEach(d => {
            if (!seen.has(d.date)) {
              seen.add(d.date)
              results.push({ date: d.date, context: rowText.slice(0, 150) })
            }
          })
        }
      })
    })
  })

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

export async function extractDatesFromFile(file: File): Promise<DetectedDate[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractDatesFromPdf(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return extractDatesFromExcel(file)
  return []
}
