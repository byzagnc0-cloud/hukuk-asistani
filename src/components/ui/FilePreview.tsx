'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { FileAttachment } from '@/lib/types'
import { getFileIcon } from '@/lib/utils'

function isPdf(file: FileAttachment) {
  return file.mime_type === 'application/pdf' || file.file_name.toLowerCase().endsWith('.pdf')
}

function isImage(file: FileAttachment) {
  return !!file.mime_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.file_name)
}

export function useFilePreview() {
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const openPreview = async (file: FileAttachment) => {
    setPreviewError(null)
    setPreviewFile(file)
    setPreviewUrl(null)
    setPreviewLoading(true)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 3600)
    setPreviewLoading(false)
    if (error || !data?.signedUrl) {
      setPreviewError('Dosya açılamadı')
      setPreviewFile(null)
      return
    }
    setPreviewUrl(data.signedUrl)
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  return { previewFile, previewUrl, previewLoading, previewError, openPreview, closePreview }
}

interface FilePreviewModalProps {
  file: FileAttachment | null
  url: string | null
  loading: boolean
  onClose: () => void
}

export function FilePreviewModal({ file, url, loading, onClose }: FilePreviewModalProps) {
  if (!file) return null

  return (
    <Modal isOpen onClose={onClose} title={file.file_name} size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : url && isPdf(file) ? (
        <iframe src={url} title={file.file_name} className="w-full h-[75vh] rounded-lg border border-gray-200" />
      ) : url && isImage(file) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.file_name} className="max-w-full max-h-[75vh] mx-auto rounded-lg" />
      ) : url ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">{getFileIcon(file.mime_type, file.file_name)}</p>
          <p className="text-sm text-gray-500 mb-4">
            Bu dosya türü tarayıcıda önizlenemiyor
            {file.file_name.toLowerCase().endsWith('.udf') && ' (UDF dosyaları UYAP veya Word ile açılır)'}.
          </p>
          <a href={url} target="_blank" rel="noopener noreferrer" download={file.file_name} className="btn-primary inline-flex">
            <Download className="w-4 h-4" /> İndir
          </a>
        </div>
      ) : null}
    </Modal>
  )
}
