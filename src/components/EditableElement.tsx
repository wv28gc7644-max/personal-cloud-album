import React, { ReactNode, CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { EditableElement as EditableElementType, ElementProperties } from '@/hooks/useGlobalEditor';
import { cn } from '@/lib/utils';

interface EditableElementProps {
  id: string;
  type: EditableElementType['type'];
  name: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function EditableElement({ 
  id, 
  type, 
  name, 
  children, 
  className,
  style 
}: EditableElementProps) {
  const { isEditMode, selectedElement, selectElement, getElementProperties } = useGlobalEditorContext();
  
  const props = getElementProperties(id);
  const isSelected = selectedElement?.id === id;

  // If not in edit mode, just render with applied properties
  if (!isEditMode) {
    const appliedStyle: CSSProperties = {
      ...style,
      ...(props.visible === false ? { display: 'none' } : {}),
      ...(props.fontSize ? { fontSize: props.fontSize } : {}),
      ...(props.color ? { color: props.color } : {}),
      ...(props.backgroundColor && props.backgroundColor !== 'transparent' ? { backgroundColor: props.backgroundColor } : {}),
      ...(props.padding ? { padding: props.padding } : {}),
      ...(props.margin ? { margin: props.margin } : {}),
      ...(props.borderRadius ? { borderRadius: props.borderRadius } : {}),
      ...(props.gap ? { gap: props.gap } : {}),
      ...(props.order !== undefined ? { order: props.order } : {}),
    };

    return (
      <div className={className} style={appliedStyle}>
        {children}
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement({
      id,
      type,
      name,
      selector: `#${id}`,
      properties: props,
    });
  };

  const appliedStyle: CSSProperties = {
    ...style,
    ...(props.visible === false ? { opacity: 0.3 } : {}),
    ...(props.fontSize ? { fontSize: props.fontSize } : {}),
    ...(props.color ? { color: props.color } : {}),
    ...(props.backgroundColor && props.backgroundColor !== 'transparent' ? { backgroundColor: props.backgroundColor } : {}),
    ...(props.padding ? { padding: props.padding } : {}),
    ...(props.margin ? { margin: props.margin } : {}),
    ...(props.borderRadius ? { borderRadius: props.borderRadius } : {}),
    ...(props.gap ? { gap: props.gap } : {}),
    ...(props.order !== undefined ? { order: props.order } : {}),
  };

  return (
    <motion.div
      id={id}
      onClick={handleClick}
      className={cn(
        className,
        "cursor-pointer transition-all relative",
        "hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2",
        isSelected && "outline outline-2 outline-primary outline-offset-2"
      )}
      style={appliedStyle}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.1 }}
    >
      {children}
      {isSelected && (
        <div className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
          {name}
        </div>
      )}
    </motion.div>
  );
}
