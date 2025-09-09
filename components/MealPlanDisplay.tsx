import React, { useState, useMemo } from 'react';

// Helper function to convert the plan's markdown to an HTML string.
// This allows for rich text copying that preserves formatting.
const markdownToHtml = (markdown: string): string => {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inTableBody = false;

  const parseInlineHtml = (text: string): string => {
    // Converts **bold** to <strong>bold</strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // End any open block-level elements if the new line doesn't continue them
    if (inList && !line.trim().startsWith('- ')) {
      html += '</ul>\n';
      inList = false;
    }
    if (inTableBody && !line.trim().startsWith('|')) {
      html += '</tbody></table>\n';
      inTableBody = false;
    }
    
    if (line.trim() === '') {
        continue; // Skip empty lines, let CSS/Word Processor handle spacing
    }

    if (line.startsWith('# ')) {
      html += `<h1>${parseInlineHtml(line.substring(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${parseInlineHtml(line.substring(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${parseInlineHtml(line.substring(4))}</h3>\n`;
    } else if (line.trim().startsWith('- ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `<li>${parseInlineHtml(line.trim().substring(2))}</li>\n`;
    } else if (line.trim().startsWith('|')) {
      const isHeaderSeparator = lines[i + 1]?.trim().startsWith('|---');
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);

      if (!inTableBody) {
          html += '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">\n';
      }

      if (isHeaderSeparator) {
        html += '<thead style="background-color: #f2f2f2;"><tr>';
        cells.forEach(cell => { html += `<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">${parseInlineHtml(cell)}</th>`; });
        html += '</tr></thead>\n';
        html += '<tbody>\n';
        inTableBody = true;
        i++; // Skip the '---|---' separator line
      } else if (!line.includes('---')) {
        if (!inTableBody) {
            html += '<tbody>\n';
            inTableBody = true;
        }
        html += '<tr>';
        cells.forEach(cell => { html += `<td style="padding: 8px; border: 1px solid #ddd;">${parseInlineHtml(cell)}</td>`; });
        html += '</tr>\n';
      }
    } else {
      html += `<p>${parseInlineHtml(line)}</p>\n`;
    }
  }

  // Close any remaining open tags
  if (inList) html += '</ul>\n';
  if (inTableBody) html += '</tbody></table>\n';

  return html;
};


// Helper function to parse simple inline markdown like **bold**
const parseInline = (text: string): React.ReactNode => {
  if (!text) return text;
  // Split by bold markdown, keeping the delimiter
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// A lightweight markdown-to-JSX converter to avoid heavy dependencies
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const elements = useMemo(() => {
    // Return an array of React elements from markdown string
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-3xl font-bold text-slate-800 mt-6 mb-4">{parseInline(line.substring(2))}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-semibold text-slate-700 mt-5 mb-3">{parseInline(line.substring(3))}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-semibold text-slate-600 mt-4 mb-2">{parseInline(line.substring(4))}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-5 list-disc">{parseInline(line.substring(2))}</li>;
      }
      if (line.startsWith('|')) { // Table
        const isHeader = content.split('\n')[i+1]?.startsWith('|---');
        const cells = line.split('|').filter(c => c.trim() !== '');
        if (isHeader) {
          return (
            <thead key={i} className="bg-slate-100">
              <tr>
                {cells.map((cell, cellIndex) => <th key={cellIndex} className="p-3 text-left text-sm font-semibold text-slate-600">{cell.trim()}</th>)}
              </tr>
            </thead>
          );
        }
        if (line.includes('---')) return null; // Skip separator line
        
        return (
          <tbody key={i} className="divide-y divide-slate-200">
            <tr>
              {cells.map((cell, cellIndex) => <td key={cellIndex} className="p-3 text-sm text-slate-700">{cell.trim()}</td>)}
            </tr>
          </tbody>
        );
      }
      if (line.trim() === '') {
        return <p key={i} className="h-2"></p>; // Render a small paragraph for spacing
      }
      return <p key={i} className="mb-2 text-slate-600">{parseInline(line)}</p>;
    });
  }, [content]);

  // Group table rows and list items into proper parent elements
  const groupedElements = useMemo(() => {
    const result: React.ReactElement[] = [];
    let currentTable: { head: React.ReactElement | null, body: React.ReactElement[] } | null = null;
    let currentList: React.ReactElement[] | null = null;

    const endCurrentGroup = (type: 'all' | 'table' | 'list' = 'all') => {
      if ((type === 'all' || type === 'table') && currentTable) {
        result.push(<table key={`table-${result.length}`} className="min-w-full divide-y divide-slate-300 border border-slate-200 rounded-lg overflow-hidden my-4">{currentTable.head}{currentTable.body}</table>);
        currentTable = null;
      }
      if ((type === 'all' || type === 'list') && currentList) {
        result.push(<ul key={`list-${result.length}`} className="space-y-1 mb-4">{currentList}</ul>);
        currentList = null;
      }
    };

    elements.forEach((el) => {
      if (!el) return;

      if (el.type === 'thead' || el.type === 'tbody') {
        endCurrentGroup('list'); // End list if we start a table
        if (!currentTable) {
          currentTable = { head: null, body: [] };
        }
        if (el.type === 'thead') {
          currentTable.head = el;
        } else { // tbody
          currentTable.body.push(el);
        }
      } else if (el.type === 'li') {
        endCurrentGroup('table'); // End table if we start a list
        if (!currentList) {
          currentList = [];
        }
        currentList.push(el);
      } else {
        endCurrentGroup('all'); // End any group if we get a different element type
        result.push(el);
      }
    });

    endCurrentGroup('all'); // Add any remaining groups at the end
    
    return result;
  }, [elements]);


  return <div className="prose prose-slate max-w-none">{groupedElements}</div>;
};

interface MealPlanDisplayProps {
  plan: string;
  onReset: () => void;
  onUpdate: (feedback: string) => void;
  isLoading: boolean;
  onFinalize: (plan: string) => void;
}

type Tab = 'plan' | 'recipes' | 'shopping' | 'nutrition';

export const MealPlanDisplay: React.FC<MealPlanDisplayProps> = ({ plan, onReset, onUpdate, isLoading, onFinalize }) => {
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const [updateFeedback, setUpdateFeedback] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsedSections = useMemo(() => {
    const sections: Record<Tab, string> = {
      plan: 'Kunne ikke finde måltidsplanen.',
      recipes: 'Kunne ikke finde opskrifter.',
      shopping: 'Kunne ikke finde indkøbslisten.',
      nutrition: 'Kunne ikke finde ernæringstabeller.',
    };

    const sectionTitles: Record<Tab, RegExp> = {
      plan: /måltidsplan/i,
      recipes: /opskrifter/i,
      shopping: /indkøbsliste/i,
      nutrition: /ernæring/i,
    };
    
    // Split by markdown headings like "## 1. ..."
    const parts = plan.split(/^## \d+\. /m).filter(p => p.trim() !== '');
    
    // The first part is the main title, e.g., "# Uge 35..."
    const mainTitleMatch = plan.match(/^# .*/m);
    const mainTitle = mainTitleMatch ? mainTitleMatch[0] : '';

    parts.forEach(partContent => {
      const titleLine = partContent.split('\n')[0] || '';
      // Re-add the heading for parsing in SimpleMarkdown
      const fullSectionContent = `## ${titleLine}\n${partContent.substring(titleLine.length).trim()}`;

      if (sectionTitles.plan.test(titleLine)) {
          sections.plan = `${mainTitle}\n\n${fullSectionContent}`;
      } else if (sectionTitles.recipes.test(titleLine)) {
          sections.recipes = fullSectionContent;
      } else if (sectionTitles.shopping.test(titleLine)) {
          sections.shopping = fullSectionContent;
      } else if (sectionTitles.nutrition.test(titleLine)) {
          sections.nutrition = fullSectionContent;
      }
    });
    
    // Handle cases where splitting might fail
    if (sections.plan === 'Kunne ikke finde måltidsplanen.' && mainTitle) {
      sections.plan = plan; // Show the whole plan if parsing fails
    }

    return sections;
  }, [plan]);

  const handleUpdate = () => {
    if (updateFeedback.trim()) {
      onUpdate(updateFeedback);
      setUpdateFeedback('');
    }
  };
  
  const handleCopyToClipboard = async () => {
    try {
      const html = markdownToHtml(plan);
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plan], { type: 'text/plain' });

      // The Clipboard API allows writing multiple formats.
      // Apps like Google Docs will prefer the 'text/html' version.
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
    } catch (err) {
      console.error('Could not copy rich text, falling back to plain text.', err);
      // Fallback for older browsers or if the API fails
      navigator.clipboard.writeText(plan);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = () => {
    const blob = new Blob([plan], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'madplan.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleApprovePlan = () => {
    onFinalize(plan);
    setIsFinalized(true);
  };

  if (isFinalized) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
        <h1 className="text-3xl font-bold text-slate-800">Madplan Godkendt!</h1>
        <p className="text-slate-500 mt-2 mb-6">Du kan nu kopiere eller downloade din plan.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleCopyToClipboard}
            className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 shadow transition"
          >
            {copied ? 'Kopieret!' : 'Kopier til Udklipsholder'}
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 shadow transition"
          >
            Download som .md
          </button>
        </div>
        <button
          onClick={onReset}
          className="mt-8 text-sm text-slate-500 hover:text-slate-700"
        >
          Start en ny plan
        </button>
      </div>
    );
  }

  const TabButton: React.FC<{ tab: Tab, label: string }> = ({ tab, label }) => (
     <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm md:text-base font-semibold rounded-t-lg transition-colors duration-200 border-b-2 ${
          activeTab === tab
            ? 'border-emerald-500 text-emerald-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
      </button>
  );

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
              <h1 className="text-3xl font-bold text-slate-800">Din madplan er klar!</h1>
              <p className="text-slate-500 mt-1">Her er din skræddersyede plan for ugen.</p>
          </div>
          <button
            onClick={onReset}
            className="px-5 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition"
          >
            Start Forfra
          </button>
        </div>

        <div className="border-b border-slate-200 mb-6">
          <nav className="-mb-px flex space-x-2 md:space-x-4" aria-label="Tabs">
            <TabButton tab="plan" label="Madplan" />
            <TabButton tab="recipes" label="Opskrifter" />
            <TabButton tab="shopping" label="Indkøbsliste" />
            <TabButton tab="nutrition" label="Ernæring" />
          </nav>
        </div>
        
        <div className="min-h-[300px]">
          {activeTab === 'plan' && <SimpleMarkdown content={parsedSections.plan} />}
          {activeTab === 'recipes' && <SimpleMarkdown content={parsedSections.recipes} />}
          {activeTab === 'shopping' && <SimpleMarkdown content={parsedSections.shopping} />}
          {activeTab === 'nutrition' && <SimpleMarkdown content={parsedSections.nutrition} />}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200 bg-slate-50 px-6 md:px-8 py-6">
        <h3 className="text-xl font-semibold text-slate-700 mb-2">Er der noget, der skal ændres?</h3>
        <p className="text-slate-500 mb-4 text-sm">Giv feedback for at justere planen, eller godkend den for at afslutte.</p>
        <textarea
          value={updateFeedback}
          onChange={(e) => setUpdateFeedback(e.target.value)}
          rows={3}
          placeholder="F.eks. 'Udskift venligst lasagnen med en fiskeret'..."
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          disabled={isLoading}
        />
        <div className="flex justify-end gap-4 mt-4">
           <button
            onClick={handleUpdate}
            disabled={isLoading || !updateFeedback.trim()}
            className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-blue-300 shadow transition flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Opdaterer...' : 'Opdater Plan'}
          </button>
          <button
            onClick={handleApprovePlan}
            disabled={isLoading}
            className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 shadow transition"
          >
            Godkend Madplan
          </button>
        </div>
      </div>
    </div>
  );
};
