import React, { useRef } from 'react';
import { createPhotoUrls, revokePhotoUrls } from '../lib/fileUtils';

interface PhotoUploaderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  multiple?: boolean;
  accept?: string;
  maxPhotos?: number;
  className?: string;
  uploadAreaClassName?: string;
  gridClassName?: string;
  showAddButton?: boolean;
  children?: React.ReactNode;
}

/**
 * Reusable photo uploader component
 * Handles file selection, preview, and removal
 * 
 * NOTE: We do NOT revoke blob URLs on unmount because the parent component
 * may still need them (e.g., for uploading to server). The parent is responsible
 * for calling revokePhotoUrls when completely done with the photos.
 */
export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onPhotosChange,
  multiple = true,
  accept = 'image/*',
  maxPhotos,
  className = '',
  uploadAreaClassName = '',
  gridClassName = '',
  showAddButton = true,
  children,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NOTE: We intentionally do NOT revoke URLs on unmount here.
  // The File objects are stored in fileStore (see fileUtils.ts) and can be
  // retrieved later for upload. URLs should only be revoked after successful
  // upload or when the user explicitly cancels/navigates away.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files) as File[];
    const remainingSlots = maxPhotos ? maxPhotos - photos.length : newFiles.length;
    const filesToAdd = remainingSlots > 0 ? newFiles.slice(0, remainingSlots) : [];

    if (filesToAdd.length > 0) {
      const newPhotoUrls = createPhotoUrls(filesToAdd);
      onPhotosChange([...photos, ...newPhotoUrls]);
    }

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const photoToRemove = photos[index];
    // Only revoke the specific photo being removed
    revokePhotoUrls([photoToRemove]);
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const canAddMore = !maxPhotos || photos.length < maxPhotos;

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple={multiple}
        className="hidden"
        accept={accept}
        disabled={!canAddMore}
      />
      
      {children ? (
        <div onClick={() => canAddMore && fileInputRef.current?.click()}>
          {children}
        </div>
      ) : (
        <div
          onClick={() => canAddMore && fileInputRef.current?.click()}
          className={`group border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[48px] p-24 text-center cursor-pointer hover:border-primary/40 transition-all bg-white dark:bg-surface-dark shadow-sm ${
            !canAddMore ? 'opacity-50 cursor-not-allowed' : ''
          } ${uploadAreaClassName}`}
        >
          <div className="size-24 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-inner">
            <span className="material-symbols-outlined !text-4xl">add_a_photo</span>
          </div>
          <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Capture Your Find</h3>
          <p className="text-slate-500 font-medium">
            {maxPhotos
              ? `Add up to ${maxPhotos} photos (${photos.length}/${maxPhotos})`
              : 'Clear photos from multiple angles help showcase your item.'}
          </p>
        </div>
      )}

      {photos.length > 0 && (
        <div className={`grid ${gridClassName || 'grid-cols-3 sm:grid-cols-4'} gap-6 animate-fadeIn mt-8`}>
          {photos.map((src, i) => (
            <div
              key={i}
              className="relative group aspect-square rounded-xl overflow-hidden"
            >
              <img src={src} className="w-full h-full object-cover" alt={`Upload ${i + 1}`} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          {showAddButton && canAddMore && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-4xl">add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
