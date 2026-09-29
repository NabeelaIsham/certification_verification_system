import { useRef } from 'react';

// Retain the key across retries, including lost responses. A changed payload is a new request.
export default function useIssuanceKey() {
  const pending = useRef(null);
  return payload => {
    const fingerprint = JSON.stringify(payload);
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, key: crypto.randomUUID() };
    }
    return pending.current.key;
  };
}
