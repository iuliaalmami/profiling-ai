import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Markdown.scss';

interface MarkdownProps {
  children: string;
}

// Memoize the custom components to prevent recreation on every render
const TableComponent = memo(({ children, ...props }: any) => (
  <div className="table-wrapper">
    <table {...props}>{children}</table>
  </div>
));

const TdComponent = memo(({ children, ...props }: any) => (
  <td {...props} className="table-cell">
    {children}
  </td>
));

const ThComponent = memo(({ children, ...props }: any) => (
  <th {...props} className="table-header">
    {children}
  </th>
));

// Memoize the components object to prevent recreation
const markdownComponents = {
  table: TableComponent,
  td: TdComponent,
  th: ThComponent,
};

export const Markdown: React.FC<MarkdownProps> = memo(({ children }) => {
  // Memoize content processing to avoid re-processing on every render
  const processedContent = useMemo(() => {
    return children
      .replace(/\\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }, [children]);

  return (
    <div className="markdown-renderer">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
