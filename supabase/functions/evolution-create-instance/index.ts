import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

app.options("*", (c) => c.text("ok", 200, corsHeaders));

// Redirect to Z-API - Evolution API has been discontinued
app.post("*", async (c) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const body = await c.req.json();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/zapi-create-instance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return c.json(data, response.status as any, corsHeaders);
});

Deno.serve(app.fetch);
