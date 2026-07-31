-- Adds 'project_status_changed' to the notifications event_type allow-list.
--
-- The six original event types were all decision points (a quotation arriving,
-- a payment being verified or rejected, a request accepted or declined, a
-- project delivered). That left the most routine admin action of all --
-- PATCH /admin/projects/:id/status, which moves a project into development,
-- testing, client review, and so on -- completely silent to the client, who
-- had to go look to find out anything had happened.
--
-- The CHECK constraint has to be dropped and recreated rather than extended in
-- place: Postgres has no ALTER ... ADD VALUE for a CHECK, unlike an enum type.
-- Recreating it revalidates existing rows, which is correct here -- every
-- stored value is already in the new, strictly larger set.
ALTER TABLE notifications DROP CONSTRAINT notifications_event_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_event_type_check CHECK (event_type IN (
  'quotation_sent',
  'payment_verified',
  'payment_rejected',
  'project_accepted',
  'project_declined',
  'project_delivered',
  'project_status_changed'
));
