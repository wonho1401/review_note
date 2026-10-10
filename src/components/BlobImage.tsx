import { useEffect, useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
}

export default function BlobImage({ blob, alt, className }: BlobImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Creating the object URL here (not in useMemo) matters: React StrictMode's
  // dev-only mount->cleanup->mount would otherwise revoke the URL with
  // nothing left to recreate it.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    // Syncing an effect-owned resource (the object URL) into render is the
    // point here; there's no way to surface it without a state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 크게 보기`}
        className="block cursor-zoom-in border-0 bg-transparent p-0"
      >
        <img src={url} alt={alt} className={className} />
      </button>
      {open && <ImageLightbox src={url} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
