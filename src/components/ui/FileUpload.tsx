'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, X, Eye, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useFilePreview, FilePreviewModal } from '@/components/ui/FilePreview'
import { FileAttachment, EntityType } from '@/lib/types'
import { formatFileSize, getFileIcon, sanitizeFileName, ACCEPTED_FILE_TYPES } from '@/lib/utils'

interface FileUploadProps {
  entityType: EntityType
  entityId: string
  userId: string
  onChange?: (files: FileAttachment[]) => void
}

export default function FileUpload({ entityType, entityId, userId, onChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { previewFile, previewUrl, previewLoading, previewError, openPreview, closePreview } = useFilePreview()
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
    return data ?? []
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

      const updated = await fetchFiles()
      onChange?.(updated)
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
      const updated = files.filter(f => f.id !== fileId)
      setFiles(updated)
      onChange?.(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dosya silinemedi')
    }
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
      {(error || previewError) && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error || previewError}</p>
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

      <FilePreviewModal file={previewFile} url={previewUrl} loading={previewLoading} onClose={closePreview} />
    </div>
  )
}
