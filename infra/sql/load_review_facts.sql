-- Nightly load: raw landing -> review fact table.
--
-- Runs once per tenant at 23:00 WIB, before the theme rollup. MERGE rather than
-- INSERT because a review can be edited or replied to after we first saw it,
-- and a reload must never duplicate a row.
--
-- @tenantId and @extractedAt are always bound parameters. The tenant predicate
-- is on both sides of the MERGE so a bug in the source can never write a row
-- into another tenant's partitions (constitution IV).

MERGE `${project_id}.${marts_dataset}.review` AS target
USING (
  SELECT
    JSON_VALUE(review, '$.id')                              AS id,
    @tenantId                                               AS tenant_id,
    JSON_VALUE(review, '$.outletId')                        AS outlet_id,
    CAST(JSON_VALUE(review, '$.rating') AS INT64)           AS rating,
    JSON_VALUE(review, '$.text')                            AS text,
    JSON_VALUE(review, '$.author')                          AS author,
    TIMESTAMP(JSON_VALUE(review, '$.publishedAt'))          AS published_at,
    JSON_VALUE(review, '$.replyState')                      AS reply_state,
    JSON_VALUE(review, '$.replyText')                       AS reply_text,
    JSON_VALUE(review, '$.approvedBy')                      AS approved_by,
    SAFE.TIMESTAMP(JSON_VALUE(review, '$.approvedAt'))      AS approved_at,
    SAFE.TIMESTAMP(JSON_VALUE(review, '$.sentAt'))          AS sent_at,
    JSON_VALUE(review, '$.sourceUri')                       AS source_uri,
    CURRENT_TIMESTAMP()                                     AS loaded_at
  FROM `${project_id}.${raw_dataset}.review_landing` AS landing,
    UNNEST(JSON_QUERY_ARRAY(landing.payload, '$.reviews')) AS review
  WHERE landing.tenant_id = @tenantId
    AND landing.extracted_at = @extractedAt
) AS source
ON  target.id = source.id
AND target.tenant_id = source.tenant_id

WHEN MATCHED THEN UPDATE SET
  rating       = source.rating,
  text         = source.text,
  reply_state  = source.reply_state,
  reply_text   = source.reply_text,
  approved_by  = source.approved_by,
  approved_at  = source.approved_at,
  sent_at      = source.sent_at,
  loaded_at    = source.loaded_at

WHEN NOT MATCHED THEN INSERT (
  id, tenant_id, outlet_id, rating, text, author, published_at,
  reply_state, reply_text, approved_by, approved_at, sent_at,
  source_uri, loaded_at, themes
) VALUES (
  source.id, source.tenant_id, source.outlet_id, source.rating, source.text,
  source.author, source.published_at, source.reply_state, source.reply_text,
  source.approved_by, source.approved_at, source.sent_at, source.source_uri,
  source.loaded_at,
  -- Themes are written by the clustering step, not by the load. A review
  -- arrives unlabelled (AC-2.1).
  []
);
