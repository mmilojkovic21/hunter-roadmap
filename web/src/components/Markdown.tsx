import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Poseban fajl, ne common.tsx: react-markdown + remark-gfm su najteži deo bundle-a, a trebaju samo
// stranici poglavlja. Tako idu u njen lazy deo, ne u početni bundle (vodič, pogl. 28).
export function Markdown({ text }: { text: string }) {
  // react-markdown ne izvršava HTML iz sadržaja, pa je bezbedno i za tuđe pakete (dodatak P3).
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
