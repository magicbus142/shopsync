import React, { useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Props:
// - initialImage (string, optional)
// - onUpload (function, required): returns url
// - folder (string, default 'images')
// - bucket (string, default 'images')
export default function ImageUploader({ 
    initialImage, 
    onUpload, 
    folder = 'misc', 
    bucket = 'images',
    placeholder = "Upload Image"
}) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState(initialImage)

    const handleUpload = async (e) => {
        try {
            const file = e.target.files[0]
            if (!file) return

            setUploading(true)
            
            const fileExt = file.name.split('.').pop()
            const fileName = `${folder}/${Math.random()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName)

            if (data) {
                setPreview(data.publicUrl)
                onUpload(data.publicUrl)
            }

        } catch (error) {
            console.error('Upload error:', error)
            alert('Error uploading image')
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreview(null)
        onUpload('')
    }

    return (
        <div className="relative">
            {preview ? (
                <div className="relative w-full h-32 rounded-lg border border-border overflow-hidden group bg-gray-50">
                    <img src={preview} alt="Uploaded" className="w-full h-full object-contain" />
                    <button 
                        onClick={handleRemove}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                        ) : (
                            <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        )}
                        <p className="text-xs text-gray-500">{uploading ? 'Uploading...' : placeholder}</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            )}
        </div>
    )
}
