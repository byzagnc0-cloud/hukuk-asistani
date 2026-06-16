import { format, isToday, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: tr })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm', { locale: tr })
  } catch {
    return dateStr
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function isDateToday(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false
  try {
    return isToday(parseISO(dateStr))
  } catch {
    return false
  }
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileIcon(mimeType: string | undefined | null, fileName?: string | null): string {
  if (fileName?.toLowerCase().endsWith('.udf')) return '⚖️'
  if (!mimeType) return '📄'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
  if (mimeType.includes('image')) return '🖼️'
  return '📄'
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.udf,.txt,.jpg,.jpeg,.png'

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}
