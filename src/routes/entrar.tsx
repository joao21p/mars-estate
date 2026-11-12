import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeReturnTo } from '@/data/reservations';
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeReturnTo(search['returnTo']) }),
  head: () => ({ meta: [...siteMetadata('Entrar | Mars Estate', 'Entre na sua conta para explorar e organizar suas reservas fictícias no Mars Estate.', '/entrar'), { name: 'robots', content: 'noindex, follow' }] }),
  component: () => <AuthForm mode="login" returnTo={Route.useSearch().returnTo} />,
});
