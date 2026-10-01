import { useEffect, useState } from 'react';
import axios from 'axios';

export default function usePrivateImage(src) {
  const [loaded, setLoaded] = useState(null);
  const api = new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin);
  let privateUrl = false;
  let requestUrl = src;
  try {
    const url = new URL(src, window.location.origin);
    privateUrl = url.pathname.startsWith('/api/private-files/');
    if (privateUrl) requestUrl = `${api.href.replace(/\/$/, '')}${url.pathname.slice(4)}${url.search}`;
  } catch { /* A missing image needs no request. */ }
  useEffect(() => {
    if (!privateUrl || !src) return undefined;
    const controller = new AbortController();
    let objectUrl;
    axios.get(requestUrl, { responseType: 'blob', signal: controller.signal,
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
      .then(response => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(response.data);
        setLoaded({ src, url: objectUrl });
      }).catch(() => { if (!controller.signal.aborted) setLoaded({ src, url: null }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, privateUrl, requestUrl]);
  return privateUrl ? (loaded?.src === src ? loaded.url : null) : src;
}
