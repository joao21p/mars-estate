import { createServerFn } from "@tanstack/react-start";

export const reservePlot = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const { mutateReservation } = await import("@/server/reservations");
    return mutateReservation("reserve", data);
  });
export const cancelReservation = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    const { mutateReservation } = await import("@/server/reservations");
    return mutateReservation("cancel", data);
  });
export const getReservations = createServerFn({ method: "GET" }).handler(async () => {
  const { listReservations } = await import("@/server/reservations");
  return listReservations();
});
