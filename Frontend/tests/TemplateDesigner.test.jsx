import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';
import useTemplateDrag from '../src/components/institute/templateDesigner/useTemplateDrag';
import { buildTemplatePayload } from '../src/components/institute/templateDesigner/templatePayload';
import { extractCertificateCode } from '../src/pages/verification/verificationData';

it('preserves the grab offset, clamps dragging, and stops updating after release', () => {
  const { result } = renderHook(() => {
    const [fields, setFields] = useState([{ x: 20, y: 30 }]);
    const drag = useTemplateDrag({
      fields, setFields, getTemplatePoint: event => ({ x: event.clientX, y: event.clientY }),
      imageSize: { naturalWidth: 100, naturalHeight: 80 }, setSelectedElement: vi.fn()
    });
    return { fields, ...drag };
  });
  act(() => result.current.startDrag({ clientX: 25, clientY: 40, pointerId: 1,
    preventDefault: vi.fn(), stopPropagation: vi.fn(), currentTarget: { setPointerCapture: vi.fn() }
  }, { type: 'field', index: 0 }));
  act(() => result.current.handleDrag({ clientX: 50, clientY: 60 }));
  expect(result.current.fields[0]).toEqual({ x: 45, y: 50 });
  act(() => result.current.handleDrag({ clientX: 500, clientY: -50 }));
  expect(result.current.fields[0]).toEqual({ x: 100, y: 0 });
  act(() => result.current.stopDrag());
  act(() => result.current.handleDrag({ clientX: 20, clientY: 20 }));
  expect(result.current.fields[0]).toEqual({ x: 100, y: 0 });
});

it('uploads binary assets in metadata order without serializing browser preview URLs', () => {
  const file = new File(['signature'], 'signature.png', { type: 'image/png' });
  const payload = buildTemplatePayload({ templateName: 'Completion', selectedCourse: 'course-1',
    templateImage: new File(['template'], 'template.png'), fields: [{ fieldName: 'studentName', x: 40, y: 50 }],
    imageFields: [{ file, previewUrl: 'blob:private-preview', imageType: 'signature', label: 'Signature', x: 10, y: 20, width: 90, height: 30 }],
    qrCodePosition: { x: 100, y: 200, size: 50 }
  });
  expect(payload.get('courseId')).toBe('course-1');
  expect(payload.getAll('assetImages')).toEqual([file]);
  expect(JSON.parse(payload.get('imageFields'))).toEqual([{ imageType: 'signature', label: 'Signature', x: 10, y: 20, width: 90, height: 30 }]);
  expect(JSON.parse(payload.get('qrCodePosition'))).toEqual({ x: 100, y: 200, size: 50 });
});

it('accepts certificate links and safely rejects malformed percent encoding', () => {
  expect(extractCertificateCode('https://certiverxia.com/verify/abc-123')).toBe('ABC-123');
  expect(extractCertificateCode('%E0%A4%A')).toBe('');
});
