import type { NextPageContext } from "next";

type ErrorProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorProps) {
  const code = statusCode ?? 500;
  const message =
    code === 404
      ? "The page could not be found."
      : "An unexpected error occurred while loading this page.";

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "40px", color: "#111827" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>Error {code}</h1>
      <p style={{ fontSize: "16px" }}>{message}</p>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
