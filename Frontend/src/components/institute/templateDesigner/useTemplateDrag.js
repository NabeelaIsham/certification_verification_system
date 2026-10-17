import { useRef } from 'react';
import { clamp } from './templateDefinitions';
export default function useTemplateDrag({
  getTemplatePoint,
  qrCodePosition,
  imageFields,
  fields,
  imageSize,
  setSelectedElement,
  setQrCodePosition,
  setImageFields,
  setFields
}) {
  const dragRef = useRef(null);
  const startDrag = (event, element) => {
    event.preventDefault();
    event.stopPropagation();
    const point = getTemplatePoint(event);
    if (!point) return;
    const origin =
      element.type === 'qr'
        ? qrCodePosition
        : element.type === 'image'
          ? imageFields[element.index]
          : fields[element.index];
    dragRef.current = {
      element,
      offsetX: point.x - origin.x,
      offsetY: point.y - origin.y
    };
    setSelectedElement(element);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleDrag = (event) => {
    if (!dragRef.current) return;
    const point = getTemplatePoint(event);
    if (!point) return;
    const nextX = Math.round(point.x - dragRef.current.offsetX);
    const nextY = Math.round(point.y - dragRef.current.offsetY);
    const { element } = dragRef.current;
    if (element.type === 'qr') {
      setQrCodePosition((prev) => ({
        ...prev,
        x: clamp(nextX, 0, imageSize.naturalWidth),
        y: clamp(nextY, 0, imageSize.naturalHeight)
      }));
      return;
    }
    if (element.type === 'image') {
      setImageFields((prev) =>
        prev.map((field, index) =>
          index === element.index
            ? {
                ...field,
                x: clamp(nextX, 0, imageSize.naturalWidth),
                y: clamp(nextY, 0, imageSize.naturalHeight)
              }
            : field
        )
      );
      return;
    }
    setFields((prev) =>
      prev.map((field, index) =>
        index === element.index
          ? {
              ...field,
              x: clamp(nextX, 0, imageSize.naturalWidth),
              y: clamp(nextY, 0, imageSize.naturalHeight)
            }
          : field
      )
    );
  };
  const stopDrag = () => {
    dragRef.current = null;
  };
  return { startDrag, handleDrag, stopDrag };
}
