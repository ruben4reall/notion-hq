-- Add iCal feed URL to presence table for external calendar import
ALTER TABLE presence ADD COLUMN IF NOT EXISTS ical_feed_url TEXT;
