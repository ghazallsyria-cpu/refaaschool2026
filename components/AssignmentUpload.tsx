'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface Props {
  studentId: string;
  assignmentId: string;
  initialImageUrl?: string;
  onUploadSuccess: (url: string | null) => void;
}

export default function AssignmentUpload({ studentId, assignmentId, initialImageUrl, onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);

  useEffect(() => {
    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 1 ميجابايت');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        fileType: 'image/webp',
        initialQuality: 0.7,
      });

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'فشل الرفع');

      setImageUrl(data.secure_url);
      onUploadSuccess(data.secure_url);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!imageUrl ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
          {uploading ? (
            <Loader2 className="animate-spin text-indigo-600" />
          ) : (
            <>
              <Upload className="text-slate-400" />
              <span className="text-sm text-slate-500 mt-2">اختر صورة الواجب</span>
            </>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="relative w-full h-48">
          <img src={imageUrl} alt="Assignment" className="w-full h-full object-cover rounded-lg" />
          <button onClick={() => { setImageUrl(null); onUploadSuccess(null); }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full">
            <X size={16} />
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
