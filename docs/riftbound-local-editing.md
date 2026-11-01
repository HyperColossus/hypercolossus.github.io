# Local collection editing

You can now [import ownership from the Excel workbook](riftbound-spreadsheet-import.md) with a read-only preview, explicit apply token and backup. SQL editing remains available below.

The app has no admin console or write API. Edit the local PostgreSQL database using your database editor with the existing owner connection. Credentials stay in the ignored `.env.riftbound.local` file.

Find the exact printing ID:

```sql
SELECT id, name, set_id FROM riftbound.cards
WHERE name ILIKE '%Jinx%' ORDER BY name, id;
```

Set the number of normal copies (replace `exact-card-id` with an ID from the query):

```sql
INSERT INTO riftbound.binder (card_id, is_foil, quantity)
VALUES ('exact-card-id', false, 3)
ON CONFLICT (card_id, is_foil) DO UPDATE SET quantity = EXCLUDED.quantity;
```

Use `true` for foil copies. To set a finish to zero, delete its holding:

```sql
DELETE FROM riftbound.binder WHERE card_id = 'exact-card-id' AND is_foil = false;
```

Refresh the collection after editing. Owned quantities aggregate normal and foil copies; Show unowned includes missing printings with faded artwork. App database access is read-only. Existing session tables are retained to preserve database structure, but the login/session endpoints are removed.
