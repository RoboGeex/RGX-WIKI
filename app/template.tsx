// Root template: re-mounts on every route change, giving each page a fast
// opacity-only entrance (.page-enter in globals.css). Keep this free of
// transforms so fixed navbars/modals keep the viewport as containing block.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
