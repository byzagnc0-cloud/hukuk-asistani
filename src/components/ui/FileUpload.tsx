'use client'

import { useState, useRef } from 'react'
import { Upload, X, File } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { FileAttachment, EntityType } from '@/lib/types'
import { formatFileSize, getFileIcon, ACCEPTED_FILE_TYPES } from '@/lib/utils'

interface FileUploadProps {
  entityType: EntityType
  entityId: string
  userId: string
  existingFiles?: FileAttachment[]
  onFilesChange?: (files: FileAttachment[]) => void
}

export default function FileUpload({ entityType, entityId, userId, existingFiles = [], onFilesChange }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileAttachment[]>(existingFiles)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/${entityType}/${entityId}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: attachment, error: dbError } = await supabase
        .from('file_attachments')
        .insert({
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single()

      if (dbError) throw dbError

      const updatedFiles = [...files, attachment]
      setFiles(updatedFiles)
      onFilesChange?.(updatedFiles)
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
      const updatedFiles = files.filter(f => f.id !== fileId)
      setFiles(updatedFiles)
      onFilesChange?.(updatedFiles)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dosya silinemedi')
    }
  }

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data } = await supabase.storage.from('documents').getPublicUrl(filePath)
      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600)
      if (signedData?.signedUrl) {
        window.open(signedData.signedUrl, '_blank')
      }
    } catch {
      setError('Dosya indirilemedi')
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
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-lg">{getFileIcon(file.mime_type, file.file_name)}</span>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => downloadFile(file.file_path, file.file_name)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block text-left"
                >
                  {file.file_name}
                </button>
                {file.file_size && (
                  <p className="text-xs text-gray-400">{formatFileSize(file.file_size)}</p>
                )}
              </div>
              <button
                onClick={() => deleteFile(file.id, file.file_path)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
    </div>
  )
}
