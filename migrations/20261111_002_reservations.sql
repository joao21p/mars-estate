-- Additive; apply explicitly after 20261111_001_auth.sql. Never run at startup.
BEGIN;
CREATE TABLE plot_reservations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE RESTRICT,
  plot_id varchar(50) NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
  status varchar(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT reservation_cancellation_check CHECK (
    (status = 'active' AND cancelled_at IS NULL) OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at >= created_at)
  )
);
CREATE UNIQUE INDEX plot_reservations_active_plot_idx
  ON plot_reservations(plot_id) WHERE status = 'active';
CREATE INDEX plot_reservations_user_created_idx
  ON plot_reservations(user_id, created_at DESC, id);
COMMIT;
