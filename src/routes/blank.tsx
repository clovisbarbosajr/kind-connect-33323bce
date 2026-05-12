import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blank")({
  head: () => ({
    meta: [
      { title: "Página em branco" },
      { name: "description", content: "Página em branco." },
    ],
  }),
  component: BlankPage,
});

function BlankPage() {
  return (
    <main className="min-h-screen bg-background">
      <h1 className="sr-only">Página em branco</h1>
    </main>
  );
}
