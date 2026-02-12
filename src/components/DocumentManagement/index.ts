/**
 * Document Management Components Export
 * Central export point for all document management UI components
 */

export { MicrosoftToolbar } from './MicrosoftToolbar';
export { DocumentPropertiesPanel } from './DocumentPropertiesPanel';
export { CollaborationPanel } from './CollaborationPanel';
export { TextEditor } from './TextEditor';
export { SpreadsheetEditor } from './SpreadsheetEditor';
export { PresentationEditor } from './PresentationEditor';
export { DocumentManager } from './DocumentManager';

// Re-export types for convenience
export type { EnhancedDocumentMeta, DocumentAccess, DocumentComment } from '@/types/documentManagement';
