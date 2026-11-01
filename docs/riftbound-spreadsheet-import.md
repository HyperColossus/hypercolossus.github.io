# Import ownership from Excel

Edit **Normal owned** and **Foil owned** in your set-by-set workbook. Save and close Excel before importing. Keep Card ID intact and keep each card on the tab matching its set code or exact database set name.

Preview from the project terminal:

```powershell
node scripts/riftbound-ownership-import.mjs "outputs/riftbound-20261006/Riftbound cards by set.xlsx"
```

The preview lists every changed finish with its previous and new quantity. It does not write to the database. To save, rerun the same command with `--apply` followed by the preview token printed at the end:

```powershell
node scripts/riftbound-ownership-import.mjs "outputs/riftbound-20261006/Riftbound cards by set.xlsx" --apply <preview-token>
```

Replace `<preview-token>` with the actual token, without angle brackets. If the workbook or database changes after preview, the import refuses to save until you preview again.

- Whole counts from 0 to 999999 are accepted. Formulas, negatives, decimals, duplicate IDs, unknown IDs and cards on the wrong set tab are rejected.
- Blank ownership cells leave that finish unchanged. An explicit zero removes that finish. Rows or sets omitted from the workbook remain untouched.
- Counts replace existing quantities rather than adding to them. Both normal and foil copies are handled separately.
- Only Binder ownership changes. Card metadata, prices, decks and event records remain unchanged.
- Before saving changes, the importer backs up all existing Binder rows to an ignored JSON file in `backups/riftbound/`. If backup creation fails, nothing is saved. All quantity changes commit together in a database transaction.
- Refresh the collection after importing. This workbook is a snapshot; editing it does not automatically sync to the app.

The importer uses the existing local owner credentials internally. It does not access or transmit the TCG API key. The app and public API remain read-only. Docker PostgreSQL must be running.
