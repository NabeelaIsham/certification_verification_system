import usePrivateImage from '../../hooks/usePrivateImage';

export default function PrivateImage({ src, alt, ref, ...props }) {
  const url = usePrivateImage(src);
  return <img {...props} ref={ref} src={url || undefined} alt={alt || 'Image unavailable'} />;
}
