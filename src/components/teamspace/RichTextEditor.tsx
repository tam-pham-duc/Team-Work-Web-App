import { useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Minus
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

interface ToolbarButtonProps {
  icon: typeof Bold;
  title: string;
  onClick: () => void;
  active?: boolean;
}

function ToolbarButton({ icon: Icon, title, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = '300px'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const formatBlock = useCallback((tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertCodeBlock = useCallback(() => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'code';

    const pre = document.createElement('pre');
    pre.className = 'bg-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto my-2';
    const code = document.createElement('code');
    code.textContent = selectedText;
    pre.appendChild(code);

    range.deleteContents();
    range.insertNode(pre);

    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;

    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const img = document.createElement('img');
            img.src = base64;
            img.className = 'max-w-full h-auto rounded my-2';
            img.style.maxHeight = '400px';

            const selection = window.getSelection();
            if (selection?.rangeCount) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              range.setStartAfter(img);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }

            if (editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    const html = clipboardData.getData('text/html');
    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const tables = doc.querySelectorAll('table');
      tables.forEach(table => {
        table.className = 'border-collapse border border-gray-300 my-2 w-full';
        table.querySelectorAll('th, td').forEach(cell => {
          (cell as HTMLElement).className = 'border border-gray-300 px-3 py-2 text-left';
        });
        table.querySelectorAll('th').forEach(th => {
          (th as HTMLElement).className += ' bg-gray-100 font-medium';
        });
      });

      const lists = doc.querySelectorAll('ul, ol');
      lists.forEach(list => {
        if (list.tagName === 'UL') {
          list.className = 'list-disc pl-6 my-2';
        } else {
          list.className = 'list-decimal pl-6 my-2';
        }
      });

      const cleanHtml = doc.body.innerHTML;
      document.execCommand('insertHTML', false, cleanHtml);

      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      return;
    }

    const text = clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
  }, [onChange]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
      <div className="flex items-center gap-0.5 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <ToolbarButton icon={Heading1} title="Heading 1" onClick={() => formatBlock('h1')} />
        <ToolbarButton icon={Heading2} title="Heading 2" onClick={() => formatBlock('h2')} />
        <ToolbarButton icon={Heading3} title="Heading 3" onClick={() => formatBlock('h3')} />

        <ToolbarDivider />

        <ToolbarButton icon={Bold} title="Bold (Ctrl+B)" onClick={() => execCommand('bold')} />
        <ToolbarButton icon={Italic} title="Italic (Ctrl+I)" onClick={() => execCommand('italic')} />
        <ToolbarButton icon={Underline} title="Underline (Ctrl+U)" onClick={() => execCommand('underline')} />
        <ToolbarButton icon={Strikethrough} title="Strikethrough" onClick={() => execCommand('strikeThrough')} />

        <ToolbarDivider />

        <ToolbarButton icon={List} title="Bullet List" onClick={() => execCommand('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} title="Numbered List" onClick={() => execCommand('insertOrderedList')} />

        <ToolbarDivider />

        <ToolbarButton icon={Quote} title="Quote" onClick={() => formatBlock('blockquote')} />
        <ToolbarButton icon={Code} title="Code Block" onClick={insertCodeBlock} />
        <ToolbarButton icon={Minus} title="Horizontal Rule" onClick={() => execCommand('insertHorizontalRule')} />

        <ToolbarDivider />

        <ToolbarButton icon={LinkIcon} title="Insert Link" onClick={insertLink} />
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="prose prose-sm max-w-none p-4 focus:outline-none"
        style={{ minHeight }}
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
          display: list-item;
        }
        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
        [contenteditable] hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
          border: 1px solid #d1d5db;
        }
        [contenteditable] th,
        [contenteditable] td {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        [contenteditable] th {
          background-color: #f3f4f6;
          font-weight: 500;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}

interface ReadOnlyContentProps {
  content: string;
}

export function ReadOnlyContent({ content }: ReadOnlyContentProps) {
  return (
    <>
      <div
        className="rich-content prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          ['--tw-prose-headings' as string]: '#111827',
          ['--tw-prose-body' as string]: '#374151'
        }}
      />
      <style>{`
        .rich-content h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .rich-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .rich-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .rich-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .rich-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-content li {
          margin: 0.25rem 0;
          display: list-item;
          color: #374151;
        }
        .rich-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rich-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .rich-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5rem 0;
          border: 1px solid #d1d5db;
        }
        .rich-content th,
        .rich-content td {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .rich-content th {
          background-color: #f3f4f6;
          font-weight: 500;
        }
        .rich-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
        .rich-content pre {
          background-color: #f3f4f6;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .rich-content code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
        }
        .rich-content p {
          margin: 0.5rem 0;
          color: #374151;
        }
      `}</style>
    </>
  );
}
