-- Remindly — store list items inline on the list row.
--
-- Lists are always loaded and saved as a whole in the app, so keeping their
-- items in a JSONB column avoids a second round-trip and lets the generic
-- collection sync treat a list as a single record. The relational
-- `public.list_items` table from 0002 is left in place (unused by the client)
-- for future per-item querying or reporting.

alter table public.lists add column if not exists items jsonb not null default '[]'::jsonb;

-- Backfill anything already written to the relational table.
update public.lists l
   set items = coalesce((
         select jsonb_agg(jsonb_build_object('id', li.id, 'text', li.text, 'done', li.done)
                          order by li.position, li.created_at)
           from public.list_items li
          where li.list_id = l.id
       ), '[]'::jsonb)
 where l.items = '[]'::jsonb;
