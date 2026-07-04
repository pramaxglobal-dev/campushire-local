"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button, ProgressBar } from "@/components/ui";

interface FileUploadProps {
  accept?: string;
  maxSizeMB: number;
  onUpload: (file: File) => Promise<void>;
}

export const FileUpload = ({ accept, maxSizeMB, onUpload }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File must be under ${maxSizeMB}MB.`);
      return;
    }

    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    setProgress(30);

    try {
      await onUpload(file);
      setProgress(100);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setError(message);
    } finally {
      setUploading(false);
      window.setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-accent bg-accent-50" : "border-slate-300 bg-white"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void processFile(file);
        }}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-slate-500" />
        <p className="text-sm text-slate-700">Drag file here or pick from your device</p>
        <Button className="mt-3" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose File
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void processFile(file);
          }}
        />
      </div>

      {preview ? <img src={preview} alt="Selected upload" className="h-24 w-24 rounded-lg object-cover" /> : null}
      {uploading || progress > 0 ? <ProgressBar value={progress} max={100} /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
};