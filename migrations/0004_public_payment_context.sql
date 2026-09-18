ALTER TABLE payment_requests
ADD COLUMN requester_name TEXT NOT NULL DEFAULT '';

ALTER TABLE payment_requests
ADD COLUMN public_reference TEXT NOT NULL DEFAULT '';

ALTER TABLE payment_requests
ADD COLUMN due_date TEXT;
