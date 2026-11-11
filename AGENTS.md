- Keep all Jarvis workspace screens under the `_authenticated` route layout; `/auth` remains the public entrance so access control stays centralized.
- Store user-facing Google identity fields in `public.profiles`; authentication identity is managed by Supabase.

- Chat history lives in a server-written per-user table readable only by its owner via RLS; the chat route writes it so clients cannot forge entries.
- Shared responsive dock sizing lives in global layout variables; navigation, composer, and page clearance use those variables to avoid overlapping on any screen.
