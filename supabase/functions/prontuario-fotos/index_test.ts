import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { createPhotoHandler } from "./index.ts";
import { canReadPhotos, canDeletePhotos, photoPath, tokenDigest, newSessionToken, matchesImageType } from "../_shared/photo-session.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value { if (!value) throw new Error(message); }
const clinic = "11111111-1111-4111-8111-111111111111";
const doctor = "22222222-2222-4222-8222-222222222222";
const consultation = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const projectUrl = "https://test.supabase.co";

Deno.test("clinic staff can access every doctor in their clinic, including legacy locations, but cannot delete", () => {
  const staff = { source: "usuarios_clinica" as const, userId: "staff", tipo: "clinica", clinicaId: clinic, medicoId: doctor };
  assert(canReadPhotos(staff, { medico_id: other, clinica_id: clinic }));
  assert(canReadPhotos(staff, { medico_id: other, clinica_id: null, local: { clinica_id: clinic } }));
  assert(!canReadPhotos(staff, { medico_id: doctor, clinica_id: other }));
  assert(!canDeletePhotos(staff, { medico_id: doctor, clinica_id: clinic }));
});

Deno.test("only the responsible physician can delete; patients have no photo access", () => {
  const physician = { source: "usuarios" as const, userId: "doctor", tipo: "medico", clinicaId: null, medicoId: doctor };
  assert(canDeletePhotos(physician, { medico_id: doctor, clinica_id: clinic }));
  assert(!canReadPhotos(physician, { medico_id: other, clinica_id: clinic }));
  assert(!canDeletePhotos(physician, { medico_id: other, clinica_id: clinic }));
  assert(!canReadPhotos({ ...physician, tipo: "paciente", medicoId: null }, { medico_id: doctor, clinica_id: clinic }));
});

Deno.test("legacy image URLs are accepted only for this project's bucket and consultation", () => {
  const path = `${doctor}/${consultation}/image.jpg`;
  assert(photoPath(path, projectUrl, doctor, consultation) === path);
  assert(photoPath(`${projectUrl}/storage/v1/object/public/prontuario-imagens/${path}`, projectUrl, doctor, consultation) === path);
  for (const invalid of [path.replace(consultation, other), `${doctor}/${consultation}/../image.jpg`, `https://attacker.example/storage/v1/object/public/prontuario-imagens/${path}`, `${doctor}/${consultation}/image.jpg?token=123`]) {
    let rejected = false;
    try { photoPath(invalid, projectUrl, doctor, consultation); } catch { rejected = true; }
    assert(rejected);
  }
});

Deno.test("image validation rejects renamed HTML and SVG", () => {
  assert(matchesImageType(new Uint8Array([255, 216, 255, 224]), "image/jpeg"));
  assert(!matchesImageType(new TextEncoder().encode("<html>"), "image/jpeg"));
  assert(!matchesImageType(new TextEncoder().encode("<svg/>"), "image/svg+xml"));
});

interface Scenario { revoked?: boolean; changedPassword?: boolean; inactive?: boolean; foreign?: boolean; uploadFail?: boolean; recordFail?: boolean; physician?: boolean }
function setup(scenario: Scenario = {}) {
  const calls: { path: string; method: string; body: string }[] = [];
  const db = createClient(projectUrl, "test-service-key", { auth: { persistSession: false }, global: {
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method || "GET";
      calls.push({ path: url.pathname, method, body: typeof init?.body === "string" ? init.body : "" });
      let data: unknown = [];
      let status = 200;
      if (url.pathname.endsWith("/prontuario_foto_sessoes")) {
        assert(url.searchParams.has("token_hash"));
        data = scenario.revoked ? [] : [{ usuario_id: "user", origem: scenario.physician ? "usuarios" : "usuarios_clinica", senha_fingerprint: await tokenDigest(scenario.changedPassword ? "old-password-hash" : "password-hash"), expires_at: "2099-01-01" }];
      } else if (url.pathname.endsWith("/usuarios_clinica") || url.pathname.endsWith("/usuarios")) {
        data = [{ id: "user", ativo: !scenario.inactive, deve_trocar_senha: false, senha_hash: "password-hash", clinica_id: clinic, tipo: "medico" }];
      } else if (url.pathname.endsWith("/medicos")) data = [{ id: doctor }];
      else if (url.pathname.endsWith("/consultas")) data = [{ id: consultation, medico_id: doctor, paciente_id: other, clinica_id: scenario.foreign ? other : clinic, local: null }];
      else if (url.pathname.includes("/storage/v1/object/") && method === "POST") {
        data = scenario.uploadFail ? { message: "upload error" } : { Key: "key" }; status = scenario.uploadFail ? 500 : 200;
      } else if (url.pathname.endsWith("/prontuario_imagens") && method === "POST" && scenario.recordFail) { data = { message: "insert error" }; status = 400; }
      return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    },
  } });
  const handler = createPhotoHandler(db, projectUrl);
  function request(body: Record<string, unknown> | FormData, token = "a".repeat(64)) {
    const isForm = body instanceof FormData;
    return handler(new Request(`${projectUrl}/functions/v1/prontuario-fotos`, {
      method: "POST", headers: { "x-photo-session": token, ...(!isForm ? { "Content-Type": "application/json" } : {}) },
      body: isForm ? body : JSON.stringify(body),
    }));
  }
  return { request, calls };
}

Deno.test("missing/forged/revoked sessions cannot read data", async () => {
  for (const token of ["", "fake", "not-a-session"]) {
    const { request, calls } = setup();
    assert((await request({ action: "list", consultaId: consultation }, token)).status === 401);
    assert(calls.length === 0);
  }
  const { request, calls } = setup({ revoked: true });
  assert((await request({ action: "list", consultaId: consultation })).status === 401);
  assert(calls.length === 1);
});

Deno.test("deactivation and password changes invalidate existing sessions", async () => {
  for (const scenario of [{ inactive: true }, { changedPassword: true }]) {
    const { request, calls } = setup(scenario);
    assert((await request({ action: "list", consultaId: consultation })).status === 401);
    assert(!calls.some((call) => call.path.endsWith("/consultas")));
  }
});

Deno.test("foreign consultation and forged staff delete are denied before storage access", async () => {
  const foreign = setup({ foreign: true });
  assert((await foreign.request({ action: "list", consultaId: consultation })).status === 403);
  assert(!foreign.calls.some((call) => call.path.includes("/storage/")));
  const staff = setup();
  assert((await staff.request({ action: "delete", consultaId: consultation, imageId: other })).status === 403);
  assert(!staff.calls.some((call) => call.method === "DELETE"));
});

Deno.test("upload derives doctor and patient from the consultation; failed metadata insert cleans up", async () => {
  for (const recordFail of [false, true]) {
    const { request, calls } = setup({ recordFail });
    const form = new FormData();
    form.set("action", "upload"); form.set("consultaId", consultation);
    form.set("medico_id", "forged-doctor"); form.set("paciente_id", "forged-patient");
    form.set("file", new File([new Uint8Array([255, 216, 255, 224])], "image.jpg", { type: "image/jpeg" }));
    const response = await request(form);
    await response.text();
    assert(response.status === (recordFail ? 500 : 200));
    const insert = calls.find((call) => call.path.endsWith("/prontuario_imagens") && call.method === "POST");
    assert(insert);
    const row = JSON.parse(insert.body);
    assert(row.medico_id === doctor && row.paciente_id === other && row.consulta_id === consultation);
    assert(calls.some((call) => call.path.includes("/storage/") && call.method === "DELETE") === recordFail);
  }
});

Deno.test("session tokens are random and stored by digest", async () => {
  const first = newSessionToken(); const second = newSessionToken();
  assert(first.length === 64 && first !== second);
  assert(await tokenDigest(first) !== first);
});
