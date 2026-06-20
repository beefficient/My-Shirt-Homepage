/* ============================================================
   SUPABASE CONFIG  —  fill in your own project values
   ------------------------------------------------------------
   1. Copy this file to:  supabase-config.js  (keep it next to
      group-order.html so the page can load it).
   2. Replace the two values below with your project's URL and
      anon (public) key. Find them in the Supabase dashboard:
        Project Settings  →  API
          • Project URL      -> url
          • anon public key  -> anonKey
   3. DO NOT put the service_role key here. The anon key is the
      only key that belongs in frontend code. It is safe to
      expose in the browser because Row Level Security (RLS)
      controls what it can actually do.
   4. Add this file to .gitignore so your keys are not committed:
        echo "supabase-config.js" >> .gitignore
   ------------------------------------------------------------
   If this file is missing or left as the placeholder, the app
   still runs — it just falls back to local (browser) storage.
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: "https://tvtyjmeedapbsaopeebh.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2dHlqbWVlZGFwYnNhb3BlZWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzQ3MzUsImV4cCI6MjA4NzIxMDczNX0.VKNQc9G18OgJndoN3eiv5wcLWaAmqOcQ9qA4ve2tNsQ"
};
