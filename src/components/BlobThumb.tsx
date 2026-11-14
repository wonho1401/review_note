import { useEffect, useState } from "react";

interface BlobThumbProps {
  blob: Blob;
  alt: string;
  className?: string;
}

/** A plain, non-interactive image of a Blob (safe to put inside a link). */
export default function BlobThumb({ blob, alt, className }: BlobThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  // Same StrictMode reasoning as BlobImage: create the URL in the effect.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return <div className={`bg-neutral-soft ${className ?? ""}`} />;
  return <img src={url} alt={alt} className={className} />;
}
