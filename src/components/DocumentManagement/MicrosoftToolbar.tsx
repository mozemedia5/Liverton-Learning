/**
 * Microsoft Office-Style Toolbar Component
 * Comprehensive formatting and editing tools for documents, spreadsheets, and presentations
 */

import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Highlighter,
  Palette,
  Type,
  ChevronDown,
  Copy,
  Clipboard,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MicrosoftToolbarProps {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onStrikethrough?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignJustify?: () => void;
  onBulletList?: () => void;
  onNumberedList?: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  onHighlight?: (color: string) => void;
  onFontColor?: (color: string) => void;
  onFontSize?: (size: number) => void;
  onFontFamily?: (family: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onAIAssist?: () => void;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  currentFontSize?: number;
  currentFontFamily?: string;
  currentAlignment?: 'left' | 'center' | 'right' | 'justify';
  disabled?: boolean;
}

export const MicrosoftToolbar: React.FC<MicrosoftToolbarProps> = ({
  onBold,
  onItalic,
  onUnderline,
  onStrikethrough,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignJustify,
  onBulletList,
  onNumberedList,
  onIndent,
  onOutdent,
  onHighlight,
  onFontColor,
  onFontSize,
  onFontFamily,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onDownload,
  onShare,
  onAIAssist,
  isBold,
  isItalic,
  isUnderline,
  isStrikethrough,
  currentFontSize = 12,
  currentFontFamily = 'Calibri',
  currentAlignment = 'left',
  disabled = false,
}) => {
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48];
  const fontFamilies = ['Calibri', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
  const highlightColors = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FF0000'];
  const fontColors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'];

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 p-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 rounded-t-lg shadow-sm">
        {/* Undo/Redo Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        {/* Font Selection Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="h-8 px-2 text-xs font-medium"
                  >
                    {currentFontFamily}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Font Family</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel>Font Family</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {fontFamilies.map((font) => (
                <DropdownMenuItem
                  key={font}
                  onClick={() => onFontFamily?.(font)}
                  className={currentFontFamily === font ? 'bg-blue-100' : ''}
                >
                  <span style={{ fontFamily: font }}>{font}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="h-8 px-2 text-xs font-medium"
                  >
                    {currentFontSize}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Font Size</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuLabel>Font Size</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {fontSizes.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => onFontSize?.(size)}
                  className={currentFontSize === size ? 'bg-blue-100' : ''}
                >
                  {size}pt
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Text Formatting Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isBold ? 'default' : 'ghost'}
                size="sm"
                onClick={onBold}
                disabled={disabled}
                className="h-8 w-8 p-0 font-bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (Ctrl+B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isItalic ? 'default' : 'ghost'}
                size="sm"
                onClick={onItalic}
                disabled={disabled}
                className="h-8 w-8 p-0 italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (Ctrl+I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isUnderline ? 'default' : 'ghost'}
                size="sm"
                onClick={onUnderline}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline (Ctrl+U)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isStrikethrough ? 'default' : 'ghost'}
                size="sm"
                onClick={onStrikethrough}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Strikethrough</TooltipContent>
          </Tooltip>
        </div>

        {/* Color Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Font Color</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel>Font Color</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-6 gap-2 p-2">
                {fontColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onFontColor?.(color)}
                    className="w-6 h-6 rounded border-2 border-slate-300 hover:border-slate-500"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-yellow-100"
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Highlight Color</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel>Highlight Color</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-6 gap-2 p-2">
                {highlightColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onHighlight?.(color)}
                    className="w-6 h-6 rounded border-2 border-slate-300 hover:border-slate-500"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Alignment Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'left' ? 'default' : 'ghost'}
                size="sm"
                onClick={onAlignLeft}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Left (Ctrl+L)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'center' ? 'default' : 'ghost'}
                size="sm"
                onClick={onAlignCenter}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Center (Ctrl+E)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'right' ? 'default' : 'ghost'}
                size="sm"
                onClick={onAlignRight}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Right (Ctrl+R)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentAlignment === 'justify' ? 'default' : 'ghost'}
                size="sm"
                onClick={onAlignJustify}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Justify (Ctrl+J)</TooltipContent>
          </Tooltip>
        </div>

        {/* List Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulletList}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNumberedList}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onIndent}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Indent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Increase Indent</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOutdent}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Outdent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Decrease Indent</TooltipContent>
          </Tooltip>
        </div>

        {/* Clipboard Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy (Ctrl+C)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPaste}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste (Ctrl+V)</TooltipContent>
          </Tooltip>
        </div>

        {/* AI & Advanced Group */}
        <div className="flex gap-1 border-r border-slate-300 pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAIAssist}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-purple-100"
              >
                <Sparkles className="h-4 w-4 text-purple-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI Assistant</TooltipContent>
          </Tooltip>
        </div>

        {/* File Operations Group */}
        <div className="flex gap-1 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-green-100"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-blue-100"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MicrosoftToolbar;
