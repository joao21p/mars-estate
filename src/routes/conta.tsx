import { createFileRoute, Link } from "@tanstack/react-router";
import { getAccount } from "@/functions/auth";
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/conta")({
  loader: () => getAccount(),
  staleTime: 0,
  gcTime: 0,
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({
    meta: [...siteMetadata('Minha conta | Mars Estate', 'Área pessoal da plataforma fictícia Mars Estate.', '/conta'), { name: "robots", content: "noindex" }],
  }),
  component: Account,
});

function Account() {
  const user = Route.useLoaderData();
  return (
    <section className="mx-auto max-w-xl px-5 pb-24 pt-32">
      <p className="eyebrow">Minha conta</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Olá, {user.name}</h1>
      <p className="mt-5 text-muted-foreground">{user.email}</p>
      <Link to="/minhas-reservas" className="mt-5 inline-block text-primary underline">Minhas reservas</Link>
      <p className="mt-3 text-sm text-muted-foreground">
        Sua conta está pronta para explorar o Mars Estate.
      </p>
    </section>
  );
}
