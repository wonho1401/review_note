import { useEffect, useMemo, useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
}

export default function BlobImage({ blob, alt, className }: BlobImageProps) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  const [open, setOpen] = useState(false);

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
