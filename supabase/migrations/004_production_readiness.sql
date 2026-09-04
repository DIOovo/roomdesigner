-- Phase 4: all user and generated assets are private and service-managed.

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png']
where id = 'generation-inputs';

update storage.buckets
set public = false,
    file_size_limit = 67108864,
    allowed_mime_types = array['image/jpeg', 'image/png', 'video/mp4']
where id = 'generation-results';

-- No storage.objects policies are added intentionally. Browser clients cannot list,
-- upload, or read these buckets; server-side service-role code issues short-lived URLs.
