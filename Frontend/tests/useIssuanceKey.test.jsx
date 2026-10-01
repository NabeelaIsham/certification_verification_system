import { renderHook } from '@testing-library/react';
import useIssuanceKey from '../src/hooks/useIssuanceKey';

it('retains the request key across retries and rerenders but changes it for new details', () => {
  const { result, rerender } = renderHook(() => useIssuanceKey());
  const payload = { studentId: 'student', courseId: 'course', awardDate: '2026-09-29' };
  const first = result.current(payload);
  rerender();
  expect(result.current({ ...payload })).toBe(first);
  expect(result.current({ ...payload, awardDate: '2026-09-30' })).not.toBe(first);
});
