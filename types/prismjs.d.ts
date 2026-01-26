declare module 'prismjs/components/prism-core' {
  export function highlight(code: string, grammar: any, language: string): string;
  export const languages: Record<string, any>;
}

declare module 'prismjs/components/prism-clike';
declare module 'prismjs/components/prism-javascript';
declare module 'prismjs/components/prism-typescript';
declare module 'prismjs/components/prism-css';
declare module 'prismjs/components/prism-json';
declare module 'prismjs/components/prism-bash';
declare module 'prismjs/components/prism-python';
declare module 'prismjs/components/prism-sql';
