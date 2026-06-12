import type { Provider } from "./xtream";

// TEST setup — hardcoded so there's nothing to type. Direct mode (browser ->
// provider over HTTPS, no proxy).
export const TEST_PROVIDER: Provider = {
  id: "kakito",
  name: "Teste",
  host: "https://kakito.xyz",
  username: "clovisteste2",
  password: "b6mstb14",
  direct: true,
};

// Shared "now playing" state lives in Supabase (publishable anon key — safe to
// ship in the frontend; row-level security limits it to this one tiny table).
export const SUPABASE_URL = "https://qemzkppbmauzovniljnl.supabase.co";
export const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbXprcHBibWF1em92bmlsam5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODYxNjQsImV4cCI6MjA5NDQ2MjE2NH0.eWl_l-9R3Y-QyzCv6oteFHKVQSYXePUXnkVwG-jbRx0";
