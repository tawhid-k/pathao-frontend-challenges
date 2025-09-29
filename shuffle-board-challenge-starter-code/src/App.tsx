import React, { useState, useRef, useEffect } from 'react';

interface Card {
  id: number;
  height: number;
  color: string;
}

interface DragState {
  isDragging: boolean;
  draggedCard: Card | null;
  draggedFrom: { columnId: number; index: number } | null;
  dropTarget: { columnId: number; index: number } | null;
  mousePosition: { x: number; y: number };
}

const KanbanBoard: React.FC = () => {
  const [leftColumn, setLeftColumn] = useState<Card[]>([
    { id: 1, height: 120, color: 'bg-purple-200' },
    { id: 2, height: 80, color: 'bg-blue-200' },
    { id: 3, height: 100, color: 'bg-amber-100' },
    { id: 4, height: 140, color: 'bg-green-200' }
  ]);

  const [rightColumn, setRightColumn] = useState<Card[]>([
    { id: 5, height: 70, color: 'bg-green-200' },
    { id: 6, height: 160, color: 'bg-purple-200' },
    { id: 7, height: 130, color: 'bg-green-200' },
    { id: 8, height: 110, color: 'bg-amber-100' }
  ]);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    draggedFrom: null,
    dropTarget: null,
    mousePosition: { x: 0, y: 0 }
  });

  const dragOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        setDragState(prev => ({
          ...prev,
          mousePosition: { x: e.clientX, y: e.clientY }
        }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragState.isDragging]);

  const handleDragStart = (e: React.DragEvent, card: Card, columnId: number, index: number) => {
    setDragState({
      isDragging: true,
      draggedCard: card,
      draggedFrom: { columnId, index },
      dropTarget: null,
      mousePosition: { x: e.clientX, y: e.clientY }
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    setTimeout(() => {
      const draggedElement = e.target as HTMLElement;
      draggedElement.style.opacity = '0.3';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const draggedElement = e.target as HTMLElement;
    draggedElement.style.opacity = '1';

    if (dragState.dropTarget && dragState.draggedCard && dragState.draggedFrom) {
      const { columnId: targetColumnId, index: targetIndex } = dragState.dropTarget;
      const { columnId: sourceColumnId, index: sourceIndex } = dragState.draggedFrom;
      
      if (sourceColumnId === targetColumnId && sourceIndex === targetIndex) {
        setDragState({
          isDragging: false,
          draggedCard: null,
          draggedFrom: null,
          dropTarget: null,
          mousePosition: { x: 0, y: 0 }
        });
        return;
      }

      if (sourceColumnId === targetColumnId) {
        const sourceColumn = sourceColumnId === 0 ? leftColumn : rightColumn;
        const newColumn = [...sourceColumn];
        const [movedCard] = newColumn.splice(sourceIndex, 1);
        const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newColumn.splice(adjustedIndex, 0, movedCard);
        if (sourceColumnId === 0) {
          setLeftColumn(newColumn);
        } else {
          setRightColumn(newColumn);
        }
      } else {
        const sourceColumn = sourceColumnId === 0 ? leftColumn : rightColumn;
        const targetColumn = targetColumnId === 0 ? leftColumn : rightColumn;
        
        const newSourceColumn = [...sourceColumn];
        const newTargetColumn = [...targetColumn];
        const [movedCard] = newSourceColumn.splice(sourceIndex, 1);
        newTargetColumn.splice(targetIndex, 0, movedCard);
        if (sourceColumnId === 0) {
          setLeftColumn(newSourceColumn);
        } else {
          setRightColumn(newSourceColumn);
        }
        
        if (targetColumnId === 0) {
          setLeftColumn(newTargetColumn);
        } else {
          setRightColumn(newTargetColumn);
        }
      }
    }

    setDragState({
      isDragging: false,
      draggedCard: null,
      draggedFrom: null,
      dropTarget: null,
      mousePosition: { x: 0, y: 0 }
    });
  };

  const handleDragOver = (e: React.DragEvent, columnId: number, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragState.isDragging) {
      setDragState(prev => ({
        ...prev,
        dropTarget: { columnId, index },
        mousePosition: { x: e.clientX, y: e.clientY }
      }));
    }
  };


  const isDropTarget = (columnId: number, index: number): boolean => {
    return dragState.isDragging && 
           dragState.dropTarget?.columnId === columnId && 
           dragState.dropTarget?.index === index;
  };

  const isBeingDragged = (card: Card): boolean => {
    return dragState.isDragging && dragState.draggedCard?.id === card.id;
  };

  const renderColumn = (cards: Card[], columnId: number) => {
    const items: React.ReactElement[] = [];
    
    // For empty columns, only show drop zone if it's the target and at index 0
    if (cards.length === 0) {
      if (isDropTarget(columnId, 0) && dragState.isDragging) {
        items.push(
          <div 
            key="empty-drop-zone"
            className="w-full bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg transition-all duration-200 ease-in-out mb-3 flex items-center justify-center opacity-80"
            style={{ height: `${dragState.draggedCard?.height || 100}px` }}
          >
          </div>
        );
      }
      return (
        <div 
          className="flex-1 bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 min-h-96 transition-all duration-200"
          onDragOver={(e) => {
            e.preventDefault();
            handleDragOver(e, columnId, 0);
          }}
        >
          {items}
        </div>
      );
    }

    if (isDropTarget(columnId, 0)) {
      items.push(
        <div 
          key="drop-zone-0"
          className="w-full bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg transition-all duration-200 ease-in-out mb-3 flex items-center justify-center opacity-80"
          style={{ height: `${dragState.draggedCard?.height || 100}px` }}
        >
          <span className="text-blue-600 font-medium">Drop here</span>
        </div>
      );
    }

    cards.forEach((card, index) => {
      items.push(
        <div
          key={`card-${card.id}`}
          draggable
          onDragStart={(e) => handleDragStart(e, card, columnId, index)}
          onDragEnd={handleDragEnd}
          className={`${card.color} rounded-lg border border-gray-300 flex items-center justify-center text-xl font-semibold cursor-move hover:shadow-md transition-all duration-200 mb-3 ${
            isBeingDragged(card) ? 'opacity-30 transform scale-95' : ''
          }`}
          style={{ height: `${card.height}px` }}
        >
          {card.id}
        </div>
      );

      if (isDropTarget(columnId, index + 1)) {
        items.push(
          <div 
            key={`drop-zone-${index + 1}`}
            className="w-full bg-blue-200 border-2 border-dashed border-blue-400 rounded-lg transition-all duration-200 ease-in-out mb-3 flex items-center justify-center opacity-80"
            style={{ height: `${dragState.draggedCard?.height || 100}px` }}
          >
            <span className="text-blue-600 font-medium">Drop here</span>
          </div>
        );
      }
    });

    return (
      <div 
        className="flex-1 bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 min-h-96 transition-all duration-200"
        onDragOver={(e) => {
          e.preventDefault();
          
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const cardElements = e.currentTarget.querySelectorAll('[draggable="true"]');
          
          let targetIndex = cards.length; 
          
          cardElements.forEach((element, index) => {
            const cardRect = element.getBoundingClientRect();
            const cardY = cardRect.top - rect.top + cardRect.height / 2;
            
            if (y < cardY && targetIndex === cards.length) {
              targetIndex = index;
            }
          });
          
          handleDragOver(e, columnId, targetIndex);
        }}
      >
        {items}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-6">
          {renderColumn(leftColumn, 0)}
          {renderColumn(rightColumn, 1)}
        </div>
      </div>
      
      {dragState.isDragging && (
        <div 
          ref={dragOverlayRef}
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            background: `radial-gradient(circle 500px at ${dragState.mousePosition.x}px ${dragState.mousePosition.y}px, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.3) 70%)`,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;