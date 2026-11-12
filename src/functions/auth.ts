import { createServerFn } from "@tanstack/react-start";

export const signup = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const { mutateAuth } = await import("@/server/auth");
    return mutateAuth("signup", data);
  });
export const login = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const { mutateAuth } = await import("@/server/auth");
    return mutateAuth("login", data);
  });
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { mutateAuth } = await import("@/server/auth");
  return mutateAuth("logout");
});
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUser } = await import("@/server/auth");
  return currentUser();
});
export const getAccount = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUser } = await import("@/server/auth");
  const user = await currentUser(true);
  if (!user) {
    const { redirect } = await import("@tanstack/react-router");
    throw redirect({ to: "/entrar", search: { returnTo: '/conta' } });
  }
  return user;
});
