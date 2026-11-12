import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { newSessionToken, tokenDigest, isSessionToken } from "../_shared/photo-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-photo-session",
};

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hexToBuffer(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Secure password hashing using PBKDF2 with Web Crypto API
async function hashPasswordPBKDF2(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);
  
  // Format: pbkdf2$iterations$salt$hash
  return `pbkdf2$100000$${saltHex}$${hashHex}`;
}

async function verifyPasswordPBKDF2(password: string, storedHash: string): Promise<boolean> {
  // Handle legacy plaintext passwords
  if (!storedHash.startsWith("pbkdf2$") && !storedHash.startsWith("$2")) {
    return password === storedHash;
  }
  
  // Handle legacy bcrypt hashes - can't verify with Web Crypto
  if (storedHash.startsWith("$2")) {
    console.log("Legacy bcrypt hash detected - cannot verify");
    return false;
  }
  
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }
  
  const iterations = parseInt(parts[1], 10);
  const saltHex = parts[2];
  const expectedHashHex = parts[3];
  
  const salt = hexToBuffer(saltHex);
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  const computedHashHex = bufferToHex(derivedBits);
  
  return computedHashHex === expectedHashHex;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  nome: string;
  tipo: "paciente" | "clinica";
  telefone?: string;
  cpf?: string;
  // Clinica fields
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  async function issuePhotoSession(id: string, origem: "usuarios" | "usuarios_clinica", senhaHash: string) {
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("prontuario_foto_sessoes").insert({
      token_hash: await tokenDigest(token), usuario_id: id, origem,
      senha_fingerprint: await tokenDigest(senhaHash), expires_at: expiresAt,
    });
    if (error) {
      // Photo access fails closed during a staged backend rollout.
      console.error("Unable to create photo session");
      return null;
    }
    return { token, expiresAt };
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "login") {
      const { email, password }: LoginRequest = await req.json();

      if (!email?.trim() || !password?.trim()) {
        return new Response(
          JSON.stringify({ error: "E-mail e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sanitize email
      const sanitizedEmail = email.trim().toLowerCase();

      // Try usuarios table first
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("id, nome, email, tipo, papel, senha_hash, deve_trocar_senha, ativo")
        .eq("email", sanitizedEmail)
        .eq("ativo", true)
        .maybeSingle();

      if (userError) {
        console.error("Database error:", userError);
        return new Response(
          JSON.stringify({ error: "Erro ao consultar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (usuario) {
        // Verify password
        const isValid = await verifyPasswordPBKDF2(password, usuario.senha_hash);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "E-mail ou senha inválidos" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch related IDs
        let pacienteId: string | undefined;
        let medicoId: string | undefined;
        let clinicaId: string | undefined;

        if (usuario.tipo === "paciente") {
          const { data } = await supabase
            .from("pacientes")
            .select("id")
            .eq("usuario_id", usuario.id)
            .maybeSingle();
          pacienteId = data?.id;
        } else if (usuario.tipo === "medico") {
          const { data } = await supabase
            .from("medicos")
            .select("id")
            .eq("usuario_id", usuario.id)
            .maybeSingle();
          medicoId = data?.id;
        } else if (usuario.tipo === "clinica") {
          const { data } = await supabase
            .from("clinicas")
            .select("id")
            .eq("usuario_id", usuario.id)
            .maybeSingle();
          clinicaId = data?.id;
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: usuario.id,
              nome: usuario.nome,
              email: usuario.email,
              tipo: usuario.tipo,
              papel: usuario.papel,
              pacienteId,
              medicoId,
              clinicaId,
              deveTrocarSenha: usuario.deve_trocar_senha,
              photoSession: await issuePhotoSession(usuario.id, "usuarios", usuario.senha_hash),
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try usuarios_clinica table
      const { data: clinicaUser, error: clinicaError } = await supabase
        .from("usuarios_clinica")
        .select("id, nome, email, papel, medico_id, clinica_id, todos_medicos, ativo, permissoes, senha_hash, deve_trocar_senha")
        .eq("email", sanitizedEmail)
        .eq("ativo", true)
        .maybeSingle();

      if (clinicaError) {
        console.error("Database error:", clinicaError);
        return new Response(
          JSON.stringify({ error: "Erro ao consultar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (clinicaUser) {
        const isValid = await verifyPasswordPBKDF2(password, clinicaUser.senha_hash);
        
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "E-mail ou senha inválidos" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: clinicaUser.id,
              nome: clinicaUser.nome,
              email: clinicaUser.email,
              tipo: clinicaUser.clinica_id ? "clinica" : "medico",
              papel: clinicaUser.papel || "atendente",
              clinicaId: clinicaUser.clinica_id,
              medicoId: clinicaUser.medico_id,
              todosMedicos: clinicaUser.todos_medicos,
              permissoes: clinicaUser.permissoes,
              deveTrocarSenha: clinicaUser.deve_trocar_senha,
              isClinicaUser: true,
              photoSession: await issuePhotoSession(clinicaUser.id, "usuarios_clinica", clinicaUser.senha_hash),
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "E-mail ou senha inválidos" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "register") {
      const body: RegisterRequest = await req.json();

      // Validate required fields
      if (!body.email?.trim() || !body.password?.trim() || !body.nome?.trim()) {
        return new Response(
          JSON.stringify({ error: "E-mail, senha e nome são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate password strength
      if (body.password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sanitizedEmail = body.email.trim().toLowerCase();

      // Check if email exists
      const { data: existingUser } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", sanitizedEmail)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está cadastrado" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash password with PBKDF2
      const hashedPassword = await hashPasswordPBKDF2(body.password);

      // Create user
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: body.nome.trim(),
          email: sanitizedEmail,
          tipo: body.tipo,
          papel: body.tipo,
          senha_hash: hashedPassword,
        })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create related record based on type
      if (body.tipo === "paciente") {
        await supabase.from("pacientes").insert({
          nome: body.nome.trim(),
          usuario_id: usuario.id,
          telefone: body.telefone || null,
          cpf: body.cpf || null,
        });
      } else if (body.tipo === "clinica") {
        await supabase.from("clinicas").insert({
          nome_fantasia: body.nomeFantasia || body.nome.trim(),
          razao_social: body.razaoSocial || null,
          cnpj: body.cnpj || null,
          email_contato: sanitizedEmail,
          telefone: body.telefone || null,
          cidade: body.cidade || null,
          estado: body.estado || null,
          usuario_id: usuario.id,
        });
      }

      // Fetch related ID
      let relatedId: string | undefined;
      if (body.tipo === "paciente") {
        const { data } = await supabase
          .from("pacientes")
          .select("id")
          .eq("usuario_id", usuario.id)
          .maybeSingle();
        relatedId = data?.id;
      } else if (body.tipo === "clinica") {
        const { data } = await supabase
          .from("clinicas")
          .select("id")
          .eq("usuario_id", usuario.id)
          .maybeSingle();
        relatedId = data?.id;
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo,
            ...(body.tipo === "paciente" ? { pacienteId: relatedId } : { clinicaId: relatedId }),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "change-password") {
      const { userId, userTable, newPassword } = await req.json();

      const token = req.headers.get("x-photo-session") || "";
      if (!isSessionToken(token) || !["usuarios", "usuarios_clinica"].includes(userTable)) {
        return new Response(JSON.stringify({ error: "Entre novamente para alterar sua senha." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: session, error: sessionError } = await supabase.from("prontuario_foto_sessoes")
        .select("usuario_id, origem, senha_fingerprint").eq("token_hash", await tokenDigest(token))
        .gt("expires_at", new Date().toISOString()).maybeSingle();
      const { data: account, error: accountError } = await supabase.from(userTable)
        .select("senha_hash, ativo").eq("id", userId).maybeSingle();
      if (sessionError || accountError || !session || session.usuario_id !== userId || session.origem !== userTable || !account?.ativo || await tokenDigest(account.senha_hash) !== session.senha_fingerprint) {
        return new Response(JSON.stringify({ error: "Sessão inválida para alterar esta senha." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!userId || !newPassword || !userTable) {
        return new Response(
          JSON.stringify({ error: "Parâmetros inválidos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hashedPassword = await hashPasswordPBKDF2(newPassword);

      const table = userTable === "usuarios_clinica" ? "usuarios_clinica" : "usuarios";
      
      const { error } = await supabase
        .from(table)
        .update({
          senha_hash: hashedPassword,
          deve_trocar_senha: false,
        })
        .eq("id", userId);

      if (error) {
        console.error("Error updating password:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao alterar senha" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, photoSession: await issuePhotoSession(userId, table, hashedPassword) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação não encontrada" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
