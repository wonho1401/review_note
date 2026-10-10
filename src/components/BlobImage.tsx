import { useEffect, useMemo } from "react";

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
  return <img src={url} alt={alt} className={className} />;
}
