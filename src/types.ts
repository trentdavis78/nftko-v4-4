export interface Point {
    x: number;
    y: number;
  }
  
  export interface Shape {
    id: number;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    visible: boolean;
    name: string;
    isImported?: boolean;
    d?: string; // For path type
  }
  
  export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';