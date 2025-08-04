import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Markdown.scss';

interface MarkdownProps {
  children: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ children }) => {
  const processedContent = children.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n');

  return (
    <div className="markdown-renderer">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{processedContent}</ReactMarkdown>
    </div>
  );
};
