import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeReturnTo } from '@/data/reservations';
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeReturnTo(search['returnTo']) }),
  head: () => ({ meta: [...siteMetadata('Criar conta | Mars Estate', 'Crie uma conta no Mars Estate e experimente uma plataforma fictícia de exploração de Marte.', '/cadastro'), { name: 'robots', content: 'noindex, follow' }] }),
  component: () => <AuthForm mode="signup" returnTo={Route.useSearch().returnTo} />,
});
