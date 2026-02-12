/**
 * Microsoft Office-style Toolbar Component
 * Provides formatting and editing controls for document editors
 */

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MicrosoftToolbarProps {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onBulletList?: () => void;
  onNumberedList?: () => void;
  onDownload?: () => void;
  readOnly?: boolean;
}

/**
 * Microsoft Office-style toolbar with formatting controls
 * Provides common text formatting and alignment options
 */
export const MicrosoftToolbar: React.FC<MicrosoftToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onBulletList,
  onNumberedList,
  onDownload,
  readOnly = false,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 p-3 flex items-center gap-2 flex-wrap">
      {/* Font Selection */}
      <Select defaultValue="arial">
        <SelectTrigger className="w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="arial">Arial</SelectItem>
          <SelectItem value="times">Times New Roman</SelectItem>
          <SelectItem value="courier">Courier New</SelectItem>
          <SelectItem value="georgia">Georgia</SelectItem>
          <SelectItem value="verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>

      {/* Font Size Selection */}
      <Select defaultValue="12">
        <SelectTrigger className="w-20 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="8">8</SelectItem>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="12">12</SelectItem>
          <SelectItem value="14">14</SelectItem>
          <SelectItem value="16">16</SelectItem>
          <SelectItem value="18">18</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="24">24</SelectItem>
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200" />

      {/* Text Formatting Buttons */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onBold}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onItalic}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onUnderline}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200" />

      {/* Alignment Buttons */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onAlignLeft}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onAlignCenter}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onAlignRight}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200" />

      {/* List Buttons */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onBulletList}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onNumberedList}
        disabled={readOnly}
        className="h-9 w-9 p-0"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Download Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onDownload}
        className="h-9 gap-1"
      >
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
};

export default MicrosoftToolbar;
