import { useState, useEffect } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface Rectangle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export default function CursorCrosshairs(): React.ReactElement {
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<MousePosition>({ x: 0, y: 0 });
  const [draggedRect, setDraggedRect] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<MousePosition>({ x: 0, y: 0 });

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];

  const divideCrosshairRectangles = (clickX: number, clickY: number): void => {
    const minSize = 30; 
    const newRectangles: Rectangle[] = [];
    let rectanglesChanged = false;

    rectangles.forEach(rectangle => {
      const horizontalIntersects = clickY > rectangle.y && clickY < rectangle.y + rectangle.height;
      const verticalIntersects = clickX > rectangle.x && clickX < rectangle.x + rectangle.width;

      if (horizontalIntersects || verticalIntersects) {
        const canDivideHorizontally = horizontalIntersects && rectangle.height >= minSize * 2;
        const canDivideVertically = verticalIntersects && rectangle.width >= minSize * 2;

        if (canDivideHorizontally || canDivideVertically) {
          rectanglesChanged = true;
          
          if (canDivideHorizontally && canDivideVertically) {
            const relativeY = clickY - rectangle.y;
            const relativeX = clickX - rectangle.x;
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random(),
              width: relativeX,
              height: relativeY
            });
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random() + 1,
              x: rectangle.x + relativeX,
              width: rectangle.width - relativeX,
              height: relativeY
            });
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random() + 2,
              y: rectangle.y + relativeY,
              width: relativeX,
              height: rectangle.height - relativeY
            });
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random() + 3,
              x: rectangle.x + relativeX,
              y: rectangle.y + relativeY,
              width: rectangle.width - relativeX,
              height: rectangle.height - relativeY
            });
            
          } else if (canDivideHorizontally) {
            const relativeY = clickY - rectangle.y;
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random(),
              height: relativeY
            });
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random() + 1,
              y: rectangle.y + relativeY,
              height: rectangle.height - relativeY
            });
            
          } else if (canDivideVertically) {
            const relativeX = clickX - rectangle.x;

            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random(),
              width: relativeX
            });
            
            newRectangles.push({
              ...rectangle,
              id: Date.now() + Math.random() + 1,
              x: rectangle.x + relativeX,
              width: rectangle.width - relativeX
            });
          }
        } else {
          newRectangles.push(rectangle);
        }
      } else {
        newRectangles.push(rectangle);
      }
    });

    if (rectanglesChanged) {
      setRectangles(newRectangles);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedRect = rectangles.findIndex(rectangle => 
      x >= rectangle.x && x <= rectangle.x + rectangle.width &&
      y >= rectangle.y && y <= rectangle.y + rectangle.height
    );

    if (clickedRect !== -1) {
      setDraggedRect(clickedRect);
      setDragOffset({
        x: x - rectangles[clickedRect].x,
        y: y - rectangles[clickedRect].y
      });
    } else {
      divideCrosshairRectangles(x, y);
      
      setIsDrawing(true);
      setStartPos({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedRect !== null) {
      setRectangles(prev => prev.map((rectangle, index) => 
        index === draggedRect 
          ? { ...rectangle, x: x - dragOffset.x, y: y - dragOffset.y }
          : rectangle
      ));
    }
  };

  const handleMouseUp = (e: React.MouseEvent): void => {
    if (isDrawing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const x = Math.min(startPos.x, endX);
      const y = Math.min(startPos.y, endY);
      const width = Math.abs(endX - startPos.x);
      const height = Math.abs(endY - startPos.y);

      if (width > 5 && height > 5) {
        const newRect: Rectangle = {
          id: Date.now(),
          x,
          y,
          width,
          height,
          color: colors[rectangles.length % colors.length]
        };

        setRectangles(prev => [...prev, newRect]);
      }

      setIsDrawing(false);
    }

    if (draggedRect !== null) {
      setDraggedRect(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const previewRect = isDrawing ? {
    x: Math.min(startPos.x, mousePos.x),
    y: Math.min(startPos.y, mousePos.y),
    width: Math.abs(mousePos.x - startPos.x),
    height: Math.abs(mousePos.y - startPos.y)
  } : null;

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      <div 
        className="absolute top-0 w-0.5 h-full bg-black pointer-events-none z-20"
        style={{ left: `${mousePos.x}px` }}
      />
      
      <div 
        className="absolute left-0 h-0.5 w-full bg-black pointer-events-none z-20"
        style={{ top: `${mousePos.y}px` }}
      />

      <div 
        className="absolute inset-0 z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {rectangles.map((rectangle, index) => (
          <div
            key={rectangle.id}
            className="absolute border-2 border-opacity-80 cursor-move rounded-lg"
            style={{
              left: `${rectangle.x}px`,
              top: `${rectangle.y}px`,
              width: `${rectangle.width}px`,
              height: `${rectangle.height}px`,
              backgroundColor: rectangle.color,
              borderColor: rectangle.color,
              opacity: draggedRect === index ? 0.7 : 0.6
            }}
          />
        ))}

        {previewRect && previewRect.width > 0 && previewRect.height > 0 && (
          <div
            className="absolute border-2 border-dashed border-gray-600 rounded-lg"
            style={{
              left: `${previewRect.x}px`,
              top: `${previewRect.y}px`,
              width: `${previewRect.width}px`,
              height: `${previewRect.height}px`,
              backgroundColor: colors[rectangles.length % colors.length],
              opacity: 0.3
            }}
          />
        )}
      </div>
    </div>
  );
}