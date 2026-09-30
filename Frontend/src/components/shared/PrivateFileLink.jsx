import usePrivateImage from '../../hooks/usePrivateImage';

export default function PrivateFileLink({ href, children, ...props }) {
  const url = usePrivateImage(href);
  return url ? <a {...props} href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <span>File unavailable</span>;
}
