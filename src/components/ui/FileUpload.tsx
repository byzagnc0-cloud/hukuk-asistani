'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, X, Eye, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { FileAttachment, EntityType } from '@/lib/types'
import { formatFileSize, getFileIcon, sanitizeFileName, ACCEPTED_FILE_TYPES } from '@/lib/utils'

interface FileUploadProps {
  entityType: EntityType
  entityId: string
  userId: string
}

function isPdf(file: FileAttachment) {
  return file.mime_type === 'application/pdf' || file.file_name.toLowerCase().endsWith('.pdf')
}

function isImage(file: FileAttachment) {
  return !!file.mime_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.file_name)
}

export default function FileUpload({ entityType, entityId, userId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true)
    const { data } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })
    setFiles(data ?? [])
    setLoadingFiles(false)
  }, [entityType, entityId, userId])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const safeName = sanitizeFileName(file.name)
      const filePath = `${userId}/${entityType}/${entityId}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from('file_attachments').insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })

      if (dbError) throw dbError

      await fetchFiles()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileId: string, filePath: string) => {
    try {
      await supabase.storage.from('documents').remove([filePath])
      await supabase.from('file_attachments').delete().eq('id', fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dosya silinemedi')
    }
  }

  const openPreview = async (file: FileAttachment) => {
    setError(null)
    setPreviewFile(file)
    setPreviewUrl(null)
    setPreviewLoading(true)
    const { data, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 3600)
    setPreviewLoading(false)
    if (urlError || !data?.signedUrl) {
      setError('Dosya açılamadı')
      setPreviewFile(null)
      return
    }
    setPreviewUrl(data.signedUrl)
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    for (const file of selectedFiles) {
      await uploadFile(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {loadingFiles ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
          <Loader2 className="w-4 h-4 animate-spin" /> Dosyalar yükleniyor...
        </div>
      ) : files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-lg">{getFileIcon(file.mime_type, file.file_name)}</span>
              <button
                onClick={() => openPreview(file)}
                className="flex-1 min-w-0 text-left"
              >
                <span className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block">
                  {file.file_name}
                </span>
                {file.file_size && (
                  <span className="text-xs text-gray-400">{formatFileSize(file.file_size)}</span>
                )}
              </button>
              <button
                onClick={() => openPreview(file)}
                title="Önizle / Aç"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteFile(file.id, file.file_path)}
                title="Sil"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload className="w-5 h-5 text-gray-400" />
        )}
        <span className="text-sm text-gray-500">
          {uploading ? 'Yükleniyor...' : 'Dosya ekle (PDF, Word, Excel, UDF)'}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {previewFile && (
        <Modal isOpen onClose={closePreview} title={previewFile.file_name} size="xl">
          {previewLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : previewUrl && isPdf(previewFile) ? (
            <iframe src={previewUrl} title={previewFile.file_name} className="w-full h-[75vh] rounded-lg border border-gray-200" />
          ) : previewUrl && isImage(previewFile) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={previewFile.file_name} className="max-w-full max-h-[75vh] mx-auto rounded-lg" />
          ) : previewUrl ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">{getFileIcon(previewFile.mime_type, previewFile.file_name)}</p>
              <p className="text-sm text-gray-500 mb-4">
                Bu dosya türü tarayıcıda önizlenemiyor
                {previewFile.file_name.toLowerCase().endsWith('.udf') && ' (UDF dosyaları UYAP veya Word ile açılır)'}.
              </p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" download={previewFile.file_name} className="btn-primary inline-flex">
                <Download className="w-4 h-4" /> İndir
              </a>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  )
}
