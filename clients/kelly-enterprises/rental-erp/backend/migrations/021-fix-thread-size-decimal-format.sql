-- Migration 021: Fix thread_size decimal format constraint
-- Allow both .XXX-YY and X.XXX-YY formats (e.g., .500-13 and 1.000-8)
--
-- Current constraint only allows: .500-13 (under 1 inch)
-- Updated constraint allows: .500-13, 1.000-8, 1.250-7, etc.

-- Drop the old constraint
ALTER TABLE gauge_thread_specifications
DROP CONSTRAINT chk_decimal_format;

-- Add the updated constraint
-- Pattern: ^[0-9]*\.[0-9]{3}-[0-9]+(\.[0-9]+)?$
-- Matches:
--   .500-13      (under 1 inch, no leading digit)
--   0.500-13     (under 1 inch, with leading zero)
--   1.000-8      (1 inch and over)
--   1.250-11.5   (with decimal TPI)
--   M10x1.5      (metric format)
ALTER TABLE gauge_thread_specifications
ADD CONSTRAINT chk_decimal_format CHECK (
  regexp_like(thread_size, '^[0-9]*\\.[0-9]{3}-[0-9]+(\\.[0-9]+)?$')
  OR regexp_like(thread_size, '^M[0-9]+x[0-9.]+$')
);
