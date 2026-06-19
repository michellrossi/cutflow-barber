// lib/env.ts
import * as dotenv from "dotenv";
dotenv.config();
console.log("[Env] Vari\xE1veis de ambiente carregadas.");

// app.ts
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import rateLimit2 from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import dayjs4 from "dayjs";
import utc4 from "dayjs/plugin/utc.js";
import timezone4 from "dayjs/plugin/timezone.js";

// routes/asaas.ts
import { Router } from "express";

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv2 from "dotenv";
dotenv2.config();
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!supabaseUrl) {
  console.error("\u274C ERRO CR\xCDTICO: supabaseUrl faltando!");
}
var supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder"
);

// utils/asaas.ts
var getApiUrl = () => process.env.ASAAS_ENV === "sandbox" ? "https://sandbox.asaas.com/api/v3" : process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3";
console.log(`[Asaas] Usando ambiente: ${process.env.ASAAS_ENV === "sandbox" ? "SANDBOX" : "PRODU\xC7\xC3O"}`);
var getHeaders = () => ({
  "Content-Type": "application/json",
  "access_token": process.env.ASAAS_API_KEY || "",
  "User-Agent": "InsightBarber/1.0"
});
async function createAsaasCustomer(data) {
  const response = await fetch(`${getApiUrl()}/customers`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.errors?.[0]?.description || "Erro ao criar cliente no Asaas");
  }
  return result;
}
async function createAsaasSubscription(data) {
  const response = await fetch(`${getApiUrl()}/subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.errors?.[0]?.description || "Erro ao criar assinatura no Asaas");
  }
  return result;
}
async function createAsaasPayment(data) {
  const response = await fetch(`${getApiUrl()}/payments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.errors?.[0]?.description || "Erro ao criar pagamento no Asaas");
  }
  return result;
}
async function getAsaasPixQrCode(paymentId) {
  const response = await fetch(`${getApiUrl()}/payments/${paymentId}/pixQrCode`, {
    method: "GET",
    headers: getHeaders()
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.errors?.[0]?.description || "Erro ao obter QR Code PIX no Asaas");
  }
  return result;
}

// controllers/asaasController.ts
import crypto from "crypto";
var createCustomer = async (req, res) => {
  try {
    const { name, phone, email, cpfCnpj } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "User not authenticated" });
    const customer = await createAsaasCustomer({ name, phone, email, cpfCnpj });
    await supabaseAdmin.from("shops").update({ asaas_customer_id: customer.id }).eq("owner_id", user.id);
    res.json(customer);
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var createSubscription = async (req, res) => {
  try {
    const { customerId, value, cycle, description, billingType, nextDueDate, planTier, shopId } = req.body;
    let externalReference = void 0;
    if (planTier || shopId) {
      externalReference = JSON.stringify({ planTier, shopId });
    }
    const sub = await createAsaasSubscription({
      customer: customerId,
      value,
      cycle,
      description,
      billingType: billingType || "PIX",
      nextDueDate: nextDueDate || (/* @__PURE__ */ new Date()).toISOString(),
      externalReference
    });
    res.json(sub);
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var checkout = async (req, res) => {
  try {
    const { value, description, customerId, planTier, shopId } = req.body;
    let externalReference = void 0;
    if (planTier || shopId) {
      externalReference = JSON.stringify({ planTier, shopId });
    }
    const payment = await createAsaasPayment({
      value,
      description,
      customerId,
      externalReference
    });
    if (payment.billingType === "PIX") {
      const qrCode = await getAsaasPixQrCode(payment.id);
      return res.json({ payment, qrCode });
    }
    res.json(payment);
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var handleWebhook = async (req, res) => {
  try {
    const receivedToken = req.headers["asaas-access-token"];
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!receivedToken || !expectedToken) return res.status(401).json({ error: "Unauthorized" });
    const receivedBuffer = Buffer.from(receivedToken);
    const expectedBuffer = Buffer.from(expectedToken);
    if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const event = req.body.event;
    const payment = req.body.payment;
    const eventId = req.body.id || payment?.id;
    if (!eventId) {
      return res.status(400).json({ error: "ID de evento do webhook n\xE3o fornecido" });
    }
    try {
      const { error: insertError } = await supabaseAdmin.from("webhook_events").insert({
        provider: "asaas",
        event_type: event,
        external_id: eventId,
        payload: req.body
      });
      if (insertError) {
        if (insertError.code === "23505") {
          console.log(`[Asaas Webhook] Evento duplicado detectado via restri\xE7\xE3o UNIQUE: ${eventId}`);
          return res.status(200).send("OK (duplicate)");
        }
        throw insertError;
      }
    } catch (dbError) {
      console.error("[Asaas Webhook] Erro ao registrar idempot\xEAncia do evento:", dbError);
      return res.status(500).json({ error: "Erro ao processar verifica\xE7\xE3o de duplicidade de webhook" });
    }
    const paymentDate = payment?.dateCreated ? new Date(payment.dateCreated) : null;
    if (paymentDate) {
      const ageMs = Date.now() - paymentDate.getTime();
      const ONE_DAY = 24 * 60 * 60 * 1e3;
      if (ageMs > ONE_DAY) {
        console.warn(`[Asaas Webhook] Recebido webhook para pagamento antigo (mais de 24 horas): ${payment.id}, idade: ${Math.round(ageMs / 36e5)}h`);
      }
    }
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const { data: shop } = await supabaseAdmin.from("shops").select("id, name").eq("asaas_customer_id", payment.customer).maybeSingle();
      if (shop) {
        let planTier = "essencial";
        try {
          const ref = JSON.parse(payment?.externalReference || "{}");
          const validTiers = ["essencial", "profissional", "premium"];
          if (ref.planTier && validTiers.includes(ref.planTier)) {
            planTier = ref.planTier;
          } else {
            const description = (payment?.description || "").toLowerCase().trim();
            if (description.includes("premium")) planTier = "premium";
            else if (description.includes("profissional")) planTier = "profissional";
            else if (description.includes("basico") || description.includes("essencial")) planTier = "essencial";
            else {
              console.warn(`[Asaas Webhook] planTier n\xE3o reconhecido na descri\xE7\xE3o: "${payment?.description}", usando 'essencial'`);
            }
          }
        } catch {
          const description = (payment?.description || "").toLowerCase().trim();
          if (description.includes("premium")) planTier = "premium";
          else if (description.includes("profissional")) planTier = "profissional";
          else if (description.includes("basico") || description.includes("essencial")) planTier = "essencial";
          else {
            console.warn(`[Asaas Webhook] Falha ao parsear externalReference, fallback para descri\xE7\xE3o falhou. Usando 'essencial'`);
          }
        }
        await supabaseAdmin.from("shops").update({
          plan: "active",
          plan_tier: planTier,
          payment_confirmed_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", shop.id);
        console.log(`[Asaas] Plano ${planTier} da barbearia ${shop.name} ATIVADO.`);
      }
    } else if (event === "PAYMENT_OVERDUE" || event === "SUBSCRIPTION_DELETED") {
      const customerId = payment?.customer || req.body.subscription?.customer;
      if (customerId) {
        const { data: shop } = await supabaseAdmin.from("shops").select("id, name").eq("asaas_customer_id", customerId).maybeSingle();
        if (shop) {
          await supabaseAdmin.from("shops").update({ plan: "suspended" }).eq("id", shop.id);
          console.warn(`[Asaas] Plano da barbearia ${shop.name} SUSPENSO por inadimpl\xEAncia/cancelamento.`);
        }
      }
    }
    res.status(200).send("OK");
  } catch (e) {
    console.error("[Asaas Webhook Error]", e);
    const error = e instanceof Error ? e.message : "Erro interno";
    res.status(500).json({ error });
  }
};

// middlewares/auth.ts
var authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  const { data: isRevoked } = await supabaseAdmin.from("revoked_tokens").select("token").eq("token", token).maybeSingle();
  if (isRevoked) return res.status(401).json({ error: "Token revogado. Fa\xE7a login novamente." });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
};
var requirePlan = (minTier) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { data: shop } = await supabaseAdmin.from("shops").select("plan, plan_tier, trial_ends_at").eq("owner_id", user.id).single();
      if (!shop) {
        return res.status(403).json({ error: "Assinatura inativa ou n\xE3o encontrada.", code: "PLAN_REQUIRED" });
      }
      if (shop.plan === "trial") {
        if (shop.trial_ends_at) {
          const trialEnd = new Date(shop.trial_ends_at);
          if (trialEnd < /* @__PURE__ */ new Date()) {
            return res.status(403).json({ error: "Per\xEDodo de teste expirado.", code: "TRIAL_EXPIRED" });
          }
        }
      } else if (shop.plan !== "active") {
        return res.status(403).json({ error: "Assinatura inativa ou n\xE3o encontrada.", code: "PLAN_REQUIRED" });
      }
      const tiers = ["essencial", "profissional", "premium"];
      if (tiers.indexOf(shop.plan_tier) < tiers.indexOf(minTier)) {
        return res.status(403).json({ error: `Este recurso requer o plano ${minTier}.`, code: "UPGRADE_REQUIRED" });
      }
      next();
    } catch (e) {
      res.status(500).json({ error: "Erro ao verificar plano." });
    }
  };
};

// routes/asaas.ts
var router = Router();
router.post("/customers", authenticate, createCustomer);
router.post("/subscriptions", authenticate, createSubscription);
router.post("/checkout", authenticate, checkout);
router.post("/webhook", handleWebhook);
var asaas_default = router;

// routes/whatsapp.ts
import { Router as Router2 } from "express";

// controllers/chatbotController.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dayjs2 from "dayjs";
import timezone2 from "dayjs/plugin/timezone.js";
import utc2 from "dayjs/plugin/utc.js";

// lib/helpers.ts
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
dayjs.extend(timezone);
var CHAT_RATE_LIMIT_MS = 3e3;
var chatRateLimitMap = /* @__PURE__ */ new Map();
function isRateLimited(remoteJid) {
  const now = Date.now();
  const last = chatRateLimitMap.get(remoteJid);
  if (last && now - last < CHAT_RATE_LIMIT_MS) {
    return true;
  }
  chatRateLimitMap.set(remoteJid, now);
  if (chatRateLimitMap.size > 1e4) {
    const cutoff = now - 6e4;
    for (const [jid, ts] of chatRateLimitMap.entries()) {
      if (ts < cutoff) chatRateLimitMap.delete(jid);
    }
  }
  return false;
}
var HANDOFF_PHRASES = [
  "falar com humano",
  "falar com atendente",
  "falar com respons\xE1vel",
  "falar com o respons\xE1vel",
  "quero um atendente",
  "preciso de um atendente",
  "atendimento humano",
  "quero falar com algu\xE9m",
  "me coloca com algu\xE9m",
  "chama o dono",
  "fala com o dono",
  "falar com o dono",
  "falar com pessoa",
  "atendente por favor",
  "respons\xE1vel",
  "gerente"
];
function detectsHandoff(message) {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return HANDOFF_PHRASES.some((phrase) => {
    const normalizedPhrase = phrase.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lower.includes(normalizedPhrase);
  });
}
async function generateWhatsAppMessage(triggerId, data, shopId, target = "client") {
  let effectiveTriggerId = triggerId;
  if (triggerId.length < 30) {
    const { data: relatedTriggers } = await supabaseAdmin.from("automation_triggers").select("id, name").eq("shop_id", shopId).eq("active", true);
    if (relatedTriggers) {
      const match = relatedTriggers.find((t) => {
        const name = t.name.toLowerCase();
        if (triggerId === "appointment_reminder_24h") return name.includes("lembrete") && (name.includes("24h") || name.includes("24 h") || name.includes("dia"));
        if (triggerId === "appointment_reminder_1h") return name.includes("lembrete") && (name.includes("1h") || name.includes("1 h") || name.includes("hora"));
        if (triggerId === "appointment_reminder" || triggerId === "lembrete") return name.includes("lembrete");
        if (triggerId === "immediate_confirmation") return name.includes("confirma\xE7\xE3o");
        if (triggerId === "post_sale") return name.includes("p\xF3s-venda") || name.includes("avalia\xE7\xE3o");
        if (triggerId === "rescheduling_request") return name.includes("reagendamento");
        if (triggerId === "retention_30d") return name.includes("reten\xE7\xE3o") || name.includes("30 dias");
        if (triggerId === "birthday") return name.includes("anivers\xE1rio") || name.includes("birthday");
        if (triggerId === "loyalty_reward") return name.includes("fidelidade") || name.includes("recompensa");
        return false;
      });
      if (match) effectiveTriggerId = match.id;
    }
  }
  let query = supabaseAdmin.from("message_templates").select("content, title").eq("shop_id", shopId).eq("target", target).eq("active", true);
  if (effectiveTriggerId.length > 30) {
    query = query.eq("trigger_id", effectiveTriggerId);
  } else {
    query = query.eq("trigger", effectiveTriggerId);
  }
  const { data: templateData } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  let content = templateData?.content;
  if (!content) {
    let triggerName = triggerId.toLowerCase();
    if (effectiveTriggerId.length > 30) {
      const { data: triggerObj } = await supabaseAdmin.from("automation_triggers").select("name").eq("id", effectiveTriggerId).maybeSingle();
      if (triggerObj) triggerName = triggerObj.name.toLowerCase();
    }
    if (triggerName.includes("confirma\xE7\xE3o") || triggerId === "immediate_confirmation" || triggerId === "link de acesso") {
      if (triggerId === "link de acesso") {
        content = `Ol\xE1 [CLIENTE]!
Aqui est\xE1 seu link de acesso \xFAnico para a barbearia: [URL].
Ele expira em 15 minutos e n\xE3o deve ser compartilhado.
\u{1F510}\u{1F488}`;
      } else {
        content = `Ol\xE1 [CLIENTE]!
Seu hor\xE1rio de [SERVICO] com [BARBEIRO] no dia [DATA] \xE0s [HORA] foi pr\xE9-agendado na [BARBEARIA].
At\xE9 logo! \u2702\uFE0F\u{1F488}`;
      }
    } else if (triggerName.includes("lembrete") || triggerId.startsWith("appointment_reminder")) {
      if (triggerId.includes("1h")) {
        content = `Ol\xE1 [CLIENTE]!
Falta apenas 1 HORA para seu hor\xE1rio de [SERVICO] com [BARBEIRO] na [BARBEARIA].
Nos vemos \xE0s [HORA]! \u2702\uFE0F\u{1F488}`;
      } else {
        content = `Ol\xE1 [CLIENTE]!
Passando para lembrar do seu hor\xE1rio de [SERVICO] com [BARBEIRO] em [DATA] \xE0s [HORA] na [BARBEARIA].
Nos vemos l\xE1! \u2702\uFE0F\u{1F488}`;
      }
    } else if (triggerName.includes("p\xF3s-venda") || triggerName.includes("avalia\xE7\xE3o") || triggerId === "post_sale") {
      content = `Ol\xE1 [CLIENTE]!
O que achou do seu atendimento hoje com [BARBEIRO]?
Sua opini\xE3o \xE9 muito importante para n\xF3s da [BARBEARIA].`;
    } else if (triggerName.includes("reagendamento") || triggerId === "rescheduling_request") {
      content = `Ol\xE1 [CLIENTE], notamos que voc\xEA n\xE3o conseguiu comparecer ao seu hor\xE1rio de [SERVICO].
Gostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?`;
    } else if (triggerId === "retention_30d") {
      content = `Ol\xE1 [CLIENTE]!
Faz um tempo que n\xE3o nos vemos na [BARBEARIA].
Que tal agendar um novo hor\xE1rio para manter o visual em dia?
\u2702\uFE0F\u{1F488}`;
    } else if (triggerId === "loyalty_reward") {
      content = `Ol\xE1 [CLIENTE], parab\xE9ns!
Voc\xEA atingiu a meta de fidelidade e ganhou um cupom de [DESCONTO]!
Use o c\xF3digo: [CODIGO]. Validade: [VALIDADE] dias.`;
    } else if (triggerId === "birthday") {
      content = `Parab\xE9ns, [CLIENTE]!
\u{1F388}
A equipe da [BARBEARIA] deseja a voc\xEA um feliz anivers\xE1rio e muito sucesso!
Que tal vir dar um trato no visual hoje? \u2702\uFE0F\u{1F488}`;
    } else {
      if (target === "professional") {
        content = `\u{1F487}\u200D\u2642\uFE0F *Novo Agendamento!*
Ol\xE1 [BARBEIRO], voc\xEA tem um novo hor\xE1rio com [CLIENTE] para [SERVICO] no dia [DATA] \xE0s [HORA].`;
      } else {
        content = `Ol\xE1 [CLIENTE]!
Seu hor\xE1rio de [SERVICO] com [BARBEIRO] no dia [DATA] \xE0s [HORA] foi pr\xE9-agendado.
At\xE9 logo! \u2702\uFE0F\u{1F488}`;
      }
    }
  }
  if (!content) return "";
  return content.replace(/\[CLIENTE\]/g, data.clientName || "Cliente").replace(/\[SERVICO\]/g, data.services || "servi\xE7o").replace(/\[DATA\]/g, data.date || "").replace(/\[HORA\]/g, data.time || "").replace(/\[BARBEIRO\]/g, data.proName || "um de nossos profissionais").replace(/\[BARBEARIA\]/g, data.shopName || "nossa barbearia").replace(/\[URL\]/g, data.url || "").replace(/\[DESCONTO\]/g, data.discount || "").replace(/\[CODIGO\]/g, data.code || "").replace(/\[VALIDADE\]/g, data.validity || "");
}
async function sendWhatsApp(phone, message, instanceName) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const instance = instanceName || process.env.WHATSAPP_INSTANCE || "insightbarber";
  if (!apiUrl || !apiKey) {
    console.error("[WhatsApp] API URL ou Key n\xE3o configurada!");
    return false;
  }
  let cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone.startsWith("55")) cleanPhone = `55${cleanPhone}`;
  try {
    let baseUrl = apiUrl.trim();
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
    baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${baseUrl}/message/sendText/${instance}`;
    const payload = {
      number: cleanPhone,
      textMessage: { text: message },
      // Evolution API usually prefers this structure in newer versions
      text: message,
      // keeping for backwards compatibility
      options: {
        delay: 1200,
        linkPreview: false
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": apiKey },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WhatsApp] Evolution API Error: Status ${response.status} - ${errText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[WhatsApp] Erro de rede ou ao conectar na Evolution API:", error);
    return false;
  }
}
async function logAutomatedMessage(shopId, clientName, clientPhone, triggerType, status = "sent") {
  try {
    const tenSecondsAgo = new Date(Date.now() - 1e4).toISOString();
    const { data: existing } = await supabaseAdmin.from("automated_messages_log").select("id").eq("shop_id", shopId).eq("client_phone", clientPhone).eq("trigger_type", triggerType).gte("sent_at", tenSecondsAgo).maybeSingle();
    if (existing) {
      console.log("[Log] Mensagem j\xE1 registrada recentemente, pulando duplicata.");
      return;
    }
    await supabaseAdmin.from("automated_messages_log").insert({
      shop_id: shopId,
      client_name: clientName,
      client_phone: clientPhone,
      trigger_type: triggerType,
      status
    });
  } catch (error) {
    console.error("Erro ao registrar log de mensagem:", error);
  }
}
var isInstanceConnected = async (shopId, instanceName) => {
  if (!instanceName) return false;
  const now = Date.now();
  const { data: cached } = await supabaseAdmin.from("instance_status_cache").select("connected, expires_at").eq("instance_name", instanceName).maybeSingle();
  if (cached && Number(cached.expires_at) > now) {
    return cached.connected;
  }
  try {
    const r = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, { headers: { apikey: process.env.WHATSAPP_API_KEY || "" } });
    const d = await r.json();
    const connected = d.instance?.state === "open";
    await supabaseAdmin.from("instance_status_cache").upsert({
      instance_name: instanceName,
      connected,
      expires_at: now + 5 * 60 * 1e3
    });
    return connected;
  } catch (e) {
    await supabaseAdmin.from("instance_status_cache").upsert({
      instance_name: instanceName,
      connected: false,
      expires_at: now + 60 * 1e3
    });
    return false;
  }
};

// controllers/chatbotController.ts
dayjs2.extend(utc2);
dayjs2.extend(timezone2);
async function handleChatbotAI(shopId, remoteJid, clientName, message, instance) {
  console.log(`[Chatbot] Processando para ${clientName} (${remoteJid}) na loja ${shopId}`);
  {
    const { data: npsSession } = await supabaseAdmin.from("whatsapp_chat_sessions").select("context").eq("shop_id", shopId).eq("remote_jid", remoteJid).maybeSingle();
    const ctx = npsSession?.context;
    if (ctx?.nps_pending && ctx.nps_appointment_id) {
      const score = parseInt(message.trim(), 10);
      if (score >= 1 && score <= 5) {
        await supabaseAdmin.from("appointments").update({ nps_score: score }).eq("id", ctx.nps_appointment_id);
        await supabaseAdmin.from("whatsapp_chat_sessions").update({ context: {}, last_message_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("shop_id", shopId).eq("remote_jid", remoteJid);
        const emojis = ["", "\u{1F61E}", "\u{1F615}", "\u{1F610}", "\u{1F60A}", "\u{1F929}"];
        const ackMsg = score >= 4 ? `Obrigado pela nota *${score}/5* ${emojis[score]}! Fico feliz que tenha gostado! Te esperamos em breve. \u2702\uFE0F\u{1F488}` : `Obrigado pelo feedback! Nota *${score}/5* ${emojis[score]}. Vamos trabalhar para melhorar sempre. Qualquer d\xFAvida, \xE9 s\xF3 chamar! \u{1F64F}`;
        await sendWhatsApp(remoteJid.split("@")[0], ackMsg, instance);
        return;
      } else {
        await sendWhatsApp(remoteJid.split("@")[0], "Por favor, responda apenas com um n\xFAmero de *1 a 5* para avaliar seu atendimento. \u{1F60A}", instance);
        return;
      }
    }
  }
  if (detectsHandoff(message)) {
    await supabaseAdmin.from("whatsapp_chat_sessions").upsert({ shop_id: shopId, remote_jid: remoteJid, bot_paused: true, last_message_at: (/* @__PURE__ */ new Date()).toISOString() }, { onConflict: "shop_id,remote_jid" });
    await sendWhatsApp(remoteJid.split("@")[0], "\u2705 Entendido! Vou chamar um de nossos atendentes. Aguarde um momento, por favor.", instance);
    try {
      const { data: shop2 } = await supabaseAdmin.from("shops").select("name, whatsapp_instance").eq("id", shopId).single();
      const { data: ownerSettings } = await supabaseAdmin.from("settings").select("phone").eq("shop_id", shopId).single();
      if (ownerSettings?.phone) {
        const ownerMsg = `\u{1F514} *Atendimento Humano Solicitado*

Cliente: *${clientName}*
N\xFAmero: *${remoteJid.split("@")[0]}*
\xDAltima mensagem: "${message}"

Acesse o WhatsApp para retomar o atendimento.`;
        await sendWhatsApp(ownerSettings.phone, ownerMsg, shop2?.whatsapp_instance || instance);
      }
    } catch (e) {
      console.error("[Chatbot] Erro no handoff:", e);
    }
    return;
  }
  let { data: session } = await supabaseAdmin.from("whatsapp_chat_sessions").select("*").eq("shop_id", shopId).eq("remote_jid", remoteJid).maybeSingle();
  if (!session) {
    const { data: newSession } = await supabaseAdmin.from("whatsapp_chat_sessions").insert({ shop_id: shopId, remote_jid: remoteJid, context: {}, messages: [], message_count: 0 }).select("*").single();
    session = newSession;
  }
  if (session?.bot_paused) {
    const lastMsg = session.last_message_at ? dayjs2(session.last_message_at) : null;
    if (lastMsg && dayjs2().diff(lastMsg, "hour", true) >= 24) {
      await supabaseAdmin.from("whatsapp_chat_sessions").update({ bot_paused: false, last_message_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", session.id);
      session = { ...session, bot_paused: false };
    } else return;
  }
  const SESSION_EXPIRY_HOURS = 2;
  if (session?.last_message_at && dayjs2().diff(dayjs2(session.last_message_at), "hour", true) >= SESSION_EXPIRY_HOURS) {
    await supabaseAdmin.from("whatsapp_chat_sessions").update({ messages: [], context: {}, message_count: 0, last_message_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", session.id);
    session = { ...session, messages: [], context: {}, message_count: 0 };
  }
  const MSG_LIMIT_PER_HOUR = 20;
  if ((session?.message_count || 0) >= MSG_LIMIT_PER_HOUR) {
    const lastMsgAt = session?.last_message_at ? dayjs2(session.last_message_at) : null;
    if (lastMsgAt && dayjs2().diff(lastMsgAt, "hour") < 1) {
      await sendWhatsApp(remoteJid.split("@")[0], "\u23F3 Voc\xEA atingiu o limite de mensagens por hora. Por favor, aguarde um momento para continuar seu agendamento.", instance);
      return;
    }
  }
  const { data: shop } = await supabaseAdmin.from("shops").select("name").eq("id", shopId).single();
  const { data: professionals } = await supabaseAdmin.from("professionals").select("id, name, role").eq("shop_id", shopId).eq("active", true);
  const { data: services } = await supabaseAdmin.from("services").select("id, name, price, duration").eq("shop_id", shopId).eq("active", true);
  const { data: settings } = await supabaseAdmin.from("settings").select("business_hours").eq("shop_id", shopId).single();
  const professionalsText = professionals?.map((p) => `- ${p.name} (ID: ${p.id})`).join("\n") || "(nenhum)";
  const servicesText = services?.map((s) => `- ${s.name} | R$${Number(s.price).toFixed(2)} | ${s.duration}min (ID: ${s.id})`).join("\n") || "(nenhum)";
  const daysMap = { sunday: "Domingo", monday: "Segunda", tuesday: "Ter\xE7a", wednesday: "Quarta", thursday: "Quinta", friday: "Sexta", saturday: "S\xE1bado" };
  const businessHoursText = settings?.business_hours ? Object.entries(settings.business_hours).map(([day, h]) => `- ${daysMap[day] || day}: ${h.active ? `${h.start} \xE0s ${h.end}` : "FECHADO"}`).join("\n") : "(n\xE3o configurado)";
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const tools = [{
    functionDeclarations: [
      { name: "list_services", description: "Retorna a lista de servi\xE7os" },
      { name: "list_professionals", description: "Retorna a lista de barbeiros" },
      { name: "check_availability", description: "Verifica hor\xE1rios livres", parameters: { type: SchemaType.OBJECT, properties: { professional_id: { type: SchemaType.STRING }, date: { type: SchemaType.STRING }, service_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["professional_id", "date"] } },
      { name: "book_appointment", description: "Efetiva o agendamento", parameters: { type: SchemaType.OBJECT, properties: { service_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, professional_id: { type: SchemaType.STRING }, date: { type: SchemaType.STRING }, time: { type: SchemaType.STRING } }, required: ["service_ids", "professional_id", "date", "time"] } }
    ]
  }];
  const systemInstruction = `Voc\xEA \xE9 o assistente virtual da barbearia "${shop?.name}". Hoje \xE9: ${dayjs2().tz("America/Sao_Paulo").format("dddd, DD/MM/YYYY")}

PROFISSIONAIS:
${professionalsText}

SERVI\xC7OS:
${servicesText}

HOR\xC1RIOS:
${businessHoursText}`;
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools, systemInstruction });
  const chat = model.startChat({ history: (session.messages || []).slice(-20).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) });
  const MAX_RETRIES = 3;
  const RETRY_DELAYS_MS = [1e3, 3e3, 7e3];
  let reply = "", lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      let result = await chat.sendMessage(message);
      let response = result.response;
      let call = response.functionCalls();
      while (call && call.length > 0) {
        const toolResults = [];
        for (const fn of call) {
          let data;
          if (fn.name === "list_services") data = services;
          else if (fn.name === "list_professionals") data = professionals;
          else if (fn.name === "check_availability") {
            const args = fn.args;
            data = await getAvailableSlotsForAI(shopId, args.professional_id, args.date, args.service_ids);
          } else if (fn.name === "book_appointment") {
            const args = fn.args;
            const phone = remoteJid.split("@")[0];
            let { data: client } = await supabaseAdmin.from("clients").select("id").eq("shop_id", shopId).eq("phone", phone).maybeSingle();
            if (!client) {
              const { data: nc } = await supabaseAdmin.from("clients").insert({ shop_id: shopId, name: clientName, phone }).select("id").single();
              client = nc;
            }
            let totalValue = 0;
            if (args.service_ids?.length) {
              const { data: sd } = await supabaseAdmin.from("services").select("id, price").in("id", args.service_ids).eq("shop_id", shopId);
              totalValue = sd?.reduce((s, x) => s + Number(x.price), 0) || 0;
            }
            const { data: rpcR, error: rpcE } = await supabaseAdmin.rpc("book_appointment", { p_shop_id: shopId, p_client_name: clientName, p_client_phone: phone, p_service_ids: args.service_ids, p_professional_id: args.professional_id, p_date: args.date, p_time: args.time, p_total_value: totalValue });
            data = rpcE ? { success: false, error: rpcE.message } : rpcR.status === "success" ? { success: true, appointmentId: rpcR.id } : { success: false, error: rpcR.message };
          }
          toolResults.push({ functionResponse: { name: fn.name, response: { content: data } } });
        }
        result = await chat.sendMessage(toolResults);
        response = result.response;
        call = response.functionCalls();
      }
      reply = response.text();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  if (lastError || !reply) {
    await sendWhatsApp(remoteJid.split("@")[0], "\u26A0\uFE0F Tive uma dificuldade t\xE9cnica. Tente novamente em instantes.", instance);
    return;
  }
  const updatedMessages = [...session.messages || [], { role: "user", content: message }, { role: "assistant", content: reply }];
  await supabaseAdmin.from("whatsapp_chat_sessions").update({ messages: updatedMessages, last_message_at: (/* @__PURE__ */ new Date()).toISOString(), message_count: (session.message_count || 0) + 1 }).eq("id", session.id);
  await sendWhatsApp(remoteJid.split("@")[0], reply, instance);
}
async function getAvailableSlotsForAI(shopId, proId, date, serviceIds) {
  const { data: proValidation } = await supabaseAdmin.from("professionals").select("id").eq("id", proId).eq("shop_id", shopId).maybeSingle();
  if (!proValidation) return { error: "Profissional n\xE3o encontrado." };
  const { data: settings } = await supabaseAdmin.from("settings").select("business_hours").eq("shop_id", shopId).single();
  const dayOfWeek = dayjs2(date).locale("en").format("dddd").toLowerCase();
  const hours = settings?.business_hours?.[dayOfWeek];
  if (!hours || !hours.active) return { error: "A barbearia n\xE3o abre nesta data." };
  let totalDuration = 30;
  if (serviceIds && serviceIds.length > 0) {
    const { data: svcs } = await supabaseAdmin.from("services").select("duration").in("id", serviceIds);
    totalDuration = svcs?.reduce((acc, s) => acc + (s.duration || 30), 0) || 30;
  }
  const { data: appointments } = await supabaseAdmin.from("appointments").select("time, service_ids").eq("professional_id", proId).eq("date", date).not("status", "eq", "cancelled");
  const { data: blocks } = await supabaseAdmin.from("blocked_slots").select("start_time, end_time").eq("professional_id", proId).eq("date", date);
  const { data: allServices } = await supabaseAdmin.from("services").select("id, duration").eq("shop_id", shopId);
  const serviceDurationMap = new Map(allServices?.map((s) => [s.id, s.duration]) || []);
  const slots = [];
  let current = dayjs2(`${date}T${hours.start}`);
  const endLimit = dayjs2(`${date}T${hours.end}`);
  while (current.isBefore(endLimit)) {
    const timeStr = current.format("HH:mm");
    const slotEnd = current.add(totalDuration, "minute");
    if (slotEnd.isAfter(endLimit)) {
      current = current.add(30, "minute");
      continue;
    }
    let isFree = true;
    for (const apt of appointments || []) {
      const aptStart = dayjs2(`${date}T${apt.time.substring(0, 5)}`);
      const aptDur = apt.service_ids?.reduce((acc, sid) => acc + (serviceDurationMap.get(sid) || 30), 0) || 30;
      const aptEnd = aptStart.add(aptDur, "minute");
      if (current.isBefore(aptEnd) && slotEnd.isAfter(aptStart)) {
        isFree = false;
        break;
      }
    }
    if (isFree) {
      for (const block of blocks || []) {
        const blockStart = dayjs2(`${date}T${block.start_time.substring(0, 5)}`);
        const blockEnd = dayjs2(`${date}T${block.end_time.substring(0, 5)}`);
        if (current.isBefore(blockEnd) && slotEnd.isAfter(blockStart)) {
          isFree = false;
          break;
        }
      }
    }
    if (isFree) slots.push(timeStr);
    current = current.add(30, "minute");
  }
  return { available_slots: slots };
}

// controllers/whatsappController.ts
var getQRCode = async (req, res) => {
  try {
    const { shopId } = req.body;
    const { data: shop } = await supabaseAdmin.from("shops").select("whatsapp_instance").eq("id", shopId).single();
    const instanceName = shop?.whatsapp_instance;
    if (!instanceName) return res.status(404).json({ error: "Inst\xE2ncia n\xE3o encontrada para esta loja" });
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connect/${instanceName}`, {
      headers: { "apikey": process.env.WHATSAPP_API_KEY || "" }
    });
    const data = await response.json();
    const qrcode = data.base64 || data.qrcode?.base64 || data.instance?.qrcode?.base64;
    const connected = data.instance?.state === "open" || data.status === "open";
    res.json({ qrcode, connected, ...data });
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var getStatus = async (req, res) => {
  try {
    const { shopId } = req.body;
    const { data: shop } = await supabaseAdmin.from("shops").select("whatsapp_instance").eq("id", shopId).single();
    const instanceName = shop?.whatsapp_instance;
    if (!instanceName) return res.status(404).json({ error: "Inst\xE2ncia n\xE3o encontrada" });
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, {
      headers: { "apikey": process.env.WHATSAPP_API_KEY || "" }
    });
    const data = await response.json();
    const connected = data.instance?.state === "open" || data.state === "open";
    res.json({ connected, ...data });
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var disconnect = async (req, res) => {
  try {
    const { shopId } = req.body;
    const { data: shop } = await supabaseAdmin.from("shops").select("whatsapp_instance").eq("id", shopId).single();
    const instanceName = shop?.whatsapp_instance;
    if (!instanceName) return res.status(404).json({ error: "Inst\xE2ncia n\xE3o encontrada" });
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { "apikey": process.env.WHATSAPP_API_KEY || "" }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    const error = e;
    res.status(500).json({ error: error.message });
  }
};
var handleWebhook2 = async (req, res) => {
  const secret = req.headers["x-evolution-webhook-secret"];
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (expected && secret !== expected) {
    return res.status(401).send("Unauthorized");
  }
  const { event, data, instance } = req.body;
  if (event === "MESSAGES_UPSERT") {
    const message = data.message;
    if (!message || message.fromMe) return res.status(200).send("OK");
    const remoteJid = message.key.remoteJid;
    const content = message.message?.conversation || message.message?.extendedTextMessage?.text;
    if (!content || isRateLimited(remoteJid)) return res.status(200).send("OK");
    const { data: shop } = await supabaseAdmin.from("shops").select("id").eq("whatsapp_instance", instance).single();
    if (shop) {
      await handleChatbotAI(shop.id, remoteJid, data.pushName || "Cliente", content, instance);
    }
  }
  res.status(200).send("OK");
};

// routes/whatsapp.ts
var router2 = Router2();
router2.post("/qrcode", authenticate, getQRCode);
router2.post("/status", authenticate, getStatus);
router2.post("/disconnect", authenticate, disconnect);
router2.post("/webhook", handleWebhook2);
var whatsapp_default = router2;

// routes/saas-admin.ts
import { Router as Router3 } from "express";

// controllers/saasController.ts
var auth = async (req, res) => {
  res.json({ success: true, message: "Autenticado com sucesso" });
};
var getStats = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_saas_stats");
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var getShops = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("shops").select(`
                id,
                name,
                plan,
                monthly_price,
                whatsapp_connected,
                created_at,
                owner_id,
                users:owner_id ( email )
            `).order("created_at", { ascending: false });
    if (error) throw error;
    const shops = data?.map((shop) => ({
      id: shop.id,
      name: shop.name,
      owner_email: shop.users?.email || void 0,
      plan: shop.plan,
      monthly_price: shop.monthly_price,
      whatsapp_connected: shop.whatsapp_connected,
      created_at: shop.created_at
    })) || [];
    res.json({ shops });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var getShopById = async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from("shops").select("*").eq("id", req.params.id).single();
    res.json(data);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var updateShopStatus = async (req, res) => {
  try {
    const { plan, plan_tier } = req.body;
    const { data } = await supabaseAdmin.from("shops").update({ plan, plan_tier }).eq("id", req.params.id).select();
    res.json(data);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};

// routes/saas-admin.ts
var router3 = Router3();
router3.get("/stats", getStats);
router3.get("/shops", getShops);
router3.get("/shops/:id", getShopById);
router3.post("/shops/:id/status", updateShopStatus);
router3.post("/auth", auth);
var saas_admin_default = router3;

// routes/cron.ts
import { Router as Router4 } from "express";

// controllers/cronController.ts
import dayjs3 from "dayjs";
import timezone3 from "dayjs/plugin/timezone.js";
import utc3 from "dayjs/plugin/utc.js";
import { GoogleGenerativeAI as GoogleGenerativeAI2 } from "@google/generative-ai";
dayjs3.extend(utc3);
dayjs3.extend(timezone3);
async function runCronLogic() {
  console.log("[Cron] Iniciando verifica\xE7\xE3o de lembretes (Timezone SP - GMT-3)...");
  const now = dayjs3().tz("America/Sao_Paulo");
  const todayStr = now.format("YYYY-MM-DD");
  const tomorrowStr = now.add(1, "day").format("YYYY-MM-DD");
  const thirtyDaysAgoStr = now.subtract(30, "day").format("YYYY-MM-DD");
  const thirtyThreeDaysAgoStr = now.subtract(33, "day").format("YYYY-MM-DD");
  const maxRetries = 3;
  const serviceCache = /* @__PURE__ */ new Map();
  const getServicesNamesForApt = async (shopId, serviceIds) => {
    if (!serviceIds || serviceIds.length === 0) return "servi\xE7os";
    if (!serviceCache.has(shopId)) {
      const { data } = await supabaseAdmin.from("services").select("id, name").eq("shop_id", shopId);
      const map = /* @__PURE__ */ new Map();
      data?.forEach((s) => map.set(s.id, s.name));
      serviceCache.set(shopId, map);
    }
    const shopMap = serviceCache.get(shopId);
    return serviceIds.map((id) => shopMap.get(id) || "servi\xE7o").join(", ");
  };
  const { data: apts24h } = await supabaseAdmin.from("appointments").select("*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)").in("status", ["confirmed", "scheduled"]).eq("reminder_24h_sent", false).lte("send_attempts_24h", maxRetries - 1).gte("date", todayStr).lte("date", tomorrowStr).limit(200);
  if (apts24h) {
    for (const apt of apts24h) {
      const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
      if (!shop?.whatsapp_connected) {
        console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 24h.`);
        continue;
      }
      if (!await isInstanceConnected(apt.shop_id, shop.whatsapp_instance)) continue;
      const aptDateTime = dayjs3.tz(`${apt.date}T${apt.time}`, "America/Sao_Paulo");
      const diffHours = aptDateTime.diff(now, "hour", true);
      if (diffHours <= 25 && diffHours >= 23) {
        const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
        const formattedDate = (/* @__PURE__ */ new Date(apt.date + "T12:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
        const formattedTime = apt.time.substring(0, 5);
        const msg = await generateWhatsAppMessage("appointment_reminder_24h", {
          clientName: apt.client_name,
          services: servicesNames,
          date: formattedDate,
          time: formattedTime,
          proName: apt.professionals?.name || "seu barbeiro",
          shopName: shop.name
        }, apt.shop_id);
        if (!msg) continue;
        const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
        if (ok) {
          await supabaseAdmin.from("appointments").update({ reminder_24h_sent: true }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Lembrete 24h", "sent");
        } else {
          const attempts = (apt.send_attempts_24h || 0) + 1;
          await supabaseAdmin.from("appointments").update({ send_attempts_24h: attempts }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Lembrete 24h", "failed");
        }
      }
    }
  }
  const { data: apts1h } = await supabaseAdmin.from("appointments").select("*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)").in("status", ["confirmed", "scheduled"]).eq("reminder_1h_sent", false).lte("send_attempts_1h", maxRetries - 1).eq("date", todayStr).limit(200);
  if (apts1h) {
    for (const apt of apts1h) {
      const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
      if (!shop?.whatsapp_connected) {
        console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 1h.`);
        continue;
      }
      if (!await isInstanceConnected(apt.shop_id, shop.whatsapp_instance)) continue;
      const aptDateTime = dayjs3.tz(`${apt.date}T${apt.time}`, "America/Sao_Paulo");
      const diffMinutes = aptDateTime.diff(now, "minute", true);
      if (diffMinutes <= 70 && diffMinutes >= 50) {
        const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
        const formattedDate = (/* @__PURE__ */ new Date(apt.date + "T12:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
        const formattedTime = apt.time.substring(0, 5);
        const msg = await generateWhatsAppMessage("appointment_reminder_1h", {
          clientName: apt.client_name,
          services: servicesNames,
          date: formattedDate,
          time: formattedTime,
          proName: apt.professionals?.name || "seu barbeiro",
          shopName: shop.name
        }, apt.shop_id);
        if (!msg) continue;
        const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
        if (ok) {
          await supabaseAdmin.from("appointments").update({ reminder_1h_sent: true }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Lembrete 1h", "sent");
        } else {
          const attempts = (apt.send_attempts_1h || 0) + 1;
          await supabaseAdmin.from("appointments").update({ send_attempts_1h: attempts }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Lembrete 1h", "failed");
        }
      }
    }
  }
  const twoDaysAgoStr = now.subtract(2, "day").format("YYYY-MM-DD");
  const { data: aptsReschedule } = await supabaseAdmin.from("appointments").select("*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)").in("status", ["cancelled", "noshow"]).eq("rescheduling_sent", false).lte("send_attempts_reschedule", maxRetries - 1).gte("date", twoDaysAgoStr).limit(200);
  if (aptsReschedule) {
    for (const apt of aptsReschedule) {
      const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
      if (!shop?.whatsapp_connected) {
        console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando reagendamento.`);
        continue;
      }
      if (!await isInstanceConnected(apt.shop_id, shop.whatsapp_instance)) continue;
      const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
      const formattedDate = (/* @__PURE__ */ new Date(apt.date + "T12:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
      const formattedTime = apt.time.substring(0, 5);
      const msg = await generateWhatsAppMessage("rescheduling_request", {
        clientName: apt.client_name,
        services: servicesNames,
        date: formattedDate,
        time: formattedTime,
        proName: apt.professionals?.name || "seu barbeiro",
        shopName: shop.name
      }, apt.shop_id);
      if (!msg) continue;
      const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
      if (ok) {
        await supabaseAdmin.from("appointments").update({ rescheduling_sent: true }).eq("id", apt.id);
        await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Reagendamento", "sent");
      } else {
        const attempts = (apt.send_attempts_reschedule || 0) + 1;
        await supabaseAdmin.from("appointments").update({ send_attempts_reschedule: attempts }).eq("id", apt.id);
        await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Reagendamento", "failed");
      }
    }
  }
  const { data: aptsPostSale } = await supabaseAdmin.from("appointments").select("*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)").eq("status", "completed").eq("post_sale_sent", false).lte("send_attempts_postsale", maxRetries - 1).eq("date", todayStr).limit(200);
  if (aptsPostSale) {
    for (const apt of aptsPostSale) {
      const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
      if (!shop?.whatsapp_connected) {
        console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando p\xF3s-venda.`);
        continue;
      }
      if (!await isInstanceConnected(apt.shop_id, shop.whatsapp_instance)) continue;
      const aptDateTime = dayjs3.tz(`${apt.date}T${apt.time}`, "America/Sao_Paulo");
      const diffMinutes = now.diff(aptDateTime, "minute", true);
      if (diffMinutes >= 120 && diffMinutes < 1440) {
        const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
        const formattedDate = (/* @__PURE__ */ new Date(apt.date + "T12:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
        const formattedTime = apt.time.substring(0, 5);
        const msg = await generateWhatsAppMessage("post_sale", {
          clientName: apt.client_name,
          services: servicesNames,
          date: formattedDate,
          time: formattedTime,
          proName: apt.professionals?.name || "seu barbeiro",
          shopName: shop.name
        }, apt.shop_id);
        if (!msg) continue;
        const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
        if (ok) {
          await supabaseAdmin.from("appointments").update({ post_sale_sent: true }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "P\xF3s-venda", "sent");
          const npsMsg = `\u2B50 Muito obrigado pelo seu feedback, ${apt.client_name || "cliente"}!

De *1 a 5*, qual nota voc\xEA daria para o seu atendimento de hoje?

1\uFE0F\u20E3 P\xE9ssimo
2\uFE0F\u20E3 Ruim
3\uFE0F\u20E3 Regular
4\uFE0F\u20E3 Bom
5\uFE0F\u20E3 \xD3timo

_Responda apenas com o n\xFAmero. Sua opini\xE3o nos ajuda a melhorar!_ \u270F\uFE0F`;
          const npsOk = await sendWhatsApp(apt.client_phone, npsMsg, shop.whatsapp_instance);
          if (npsOk) {
            const remoteJid = `${apt.client_phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}@s.whatsapp.net`;
            await supabaseAdmin.from("whatsapp_chat_sessions").upsert({
              shop_id: apt.shop_id,
              remote_jid: remoteJid,
              context: { nps_pending: true, nps_appointment_id: apt.id },
              last_message_at: (/* @__PURE__ */ new Date()).toISOString()
            }, { onConflict: "shop_id,remote_jid", ignoreDuplicates: false });
          }
        } else {
          const attempts = (apt.send_attempts_postsale || 0) + 1;
          await supabaseAdmin.from("appointments").update({ send_attempts_postsale: attempts }).eq("id", apt.id);
          await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "P\xF3s-venda", "failed");
        }
      }
    }
  }
  const { data: apts30d } = await supabaseAdmin.from("appointments").select("*, shops(id, name, whatsapp_instance, whatsapp_connected)").eq("status", "completed").eq("reminder_30d_sent", false).lte("send_attempts_30d", maxRetries - 1).lte("date", thirtyDaysAgoStr).gte("date", thirtyThreeDaysAgoStr).limit(200);
  if (apts30d) {
    for (const apt of apts30d) {
      const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
      if (!shop?.whatsapp_connected) continue;
      if (!await isInstanceConnected(apt.shop_id, shop.whatsapp_instance)) continue;
      const msg = await generateWhatsAppMessage("retention_30d", {
        clientName: apt.client_name,
        shopName: shop.name
      }, apt.shop_id);
      if (!msg) continue;
      const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
      if (ok) {
        await supabaseAdmin.from("appointments").update({ reminder_30d_sent: true }).eq("id", apt.id);
        await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Reten\xE7\xE3o 30 dias", "sent");
      } else {
        const attempts = (apt.send_attempts_30d || 0) + 1;
        await supabaseAdmin.from("appointments").update({ send_attempts_30d: attempts }).eq("id", apt.id);
        await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, "Reten\xE7\xE3o 30 dias", "failed");
      }
    }
  }
  const currentHourSP = now.hour();
  if (currentHourSP >= 9) {
    const { data: bdayClients, error: bdayError } = await supabaseAdmin.rpc("get_birthday_clients_today").limit(100);
    if (bdayError) console.error("[Cron] Erro bday RPC:", bdayError.message);
    if (bdayClients && bdayClients.length > 0) {
      const clients = bdayClients;
      const shopIds = [...new Set(clients.map((c) => c.shop_id))];
      const { data: shopList } = await supabaseAdmin.from("shops").select("id, name, whatsapp_instance, whatsapp_connected").in("id", shopIds);
      const shopMap = new Map((shopList || []).map((s) => [s.id, s]));
      for (const client of clients) {
        const shop = shopMap.get(client.shop_id);
        if (!shop?.whatsapp_connected) continue;
        if (!await isInstanceConnected(client.shop_id, shop.whatsapp_instance)) continue;
        const msg = await generateWhatsAppMessage("birthday", {
          clientName: client.name,
          shopName: shop.name
        }, client.shop_id);
        const sentOk = await sendWhatsApp(client.phone, msg, shop.whatsapp_instance);
        if (msg && sentOk) {
          await supabaseAdmin.from("clients").update({ birthday_last_sent_year: now.year() }).eq("id", client.id);
          await logAutomatedMessage(client.shop_id, client.name, client.phone, "Anivers\xE1rio", "sent");
        } else if (msg) {
          await logAutomatedMessage(client.shop_id, client.name, client.phone, "Anivers\xE1rio", "failed");
        }
      }
    }
  }
  if (now.day() === 1) {
    const sevenDaysAgo = now.subtract(7, "day").toISOString();
    await supabaseAdmin.from("whatsapp_chat_sessions").delete().lt("last_message_at", sevenDaysAgo);
    const thirtyDaysAgoIso = now.subtract(30, "day").toISOString();
    await supabaseAdmin.from("webhook_events").delete().lt("created_at", thirtyDaysAgoIso);
    if (now.hour() === 7 && now.minute() < 11) {
      const sevenDaysAgo2 = now.subtract(7, "day").format("YYYY-MM-DD");
      const fourteenDaysAgo = now.subtract(14, "day").format("YYYY-MM-DD");
      const { data: allApts } = await supabaseAdmin.from("appointments").select(`id, shop_id, total_value, date, status, service_ids, shops (id, name, whatsapp_instance, whatsapp_connected)`).gte("date", fourteenDaysAgo).lte("date", todayStr).limit(2e3);
      if (allApts && allApts.length > 0) {
        const appointments = allApts;
        const shopsData = /* @__PURE__ */ new Map();
        appointments.forEach((apt) => {
          if (!shopsData.has(apt.shop_id)) {
            const shopRow = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            shopsData.set(apt.shop_id, {
              name: shopRow?.name,
              instance: shopRow?.whatsapp_instance,
              connected: shopRow?.whatsapp_connected,
              currentWeek: [],
              prevWeek: []
            });
          }
          const shop = shopsData.get(apt.shop_id);
          if (apt.date >= sevenDaysAgo2) shop.currentWeek.push(apt);
          else shop.prevWeek.push(apt);
        });
        const allShopIds = Array.from(shopsData.keys());
        const { data: allSettings } = await supabaseAdmin.from("settings").select("shop_id, phone").in("shop_id", allShopIds);
        const settingsMap = new Map(allSettings?.map((s) => [s.shop_id, s.phone]) || []);
        for (const [sId, data] of shopsData.entries()) {
          if (!data.connected) continue;
          const phone = settingsMap.get(sId);
          if (!phone) continue;
          const curRev = data.currentWeek.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.total_value || 0), 0);
          const preRev = data.prevWeek.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.total_value || 0), 0);
          const curCount = data.currentWeek.length;
          const preCount = data.prevWeek.length;
          const svcCounts = {};
          data.currentWeek.forEach((a) => a.service_ids?.forEach((id) => svcCounts[id] = (svcCounts[id] || 0) + 1));
          const topSvcIds = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
          const { data: svcsNames } = topSvcIds.length ? await supabaseAdmin.from("services").select("name").in("id", topSvcIds) : { data: [] };
          const topSvcStr = svcsNames?.map((s) => s.name).join(", ") || "N/A";
          const genAI = new GoogleGenerativeAI2(process.env.GEMINI_API_KEY || "");
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const prompt = `Voc\xEA \xE9 um Consultor de Neg\xF3cios especializado em barbearias de alto padr\xE3o. Analise os dados e escreva um par\xE1grafo motivador (m\xE1x 400 caracteres).

Barbearia: ${data.name}
Faturamento esta semana: R$${curRev.toFixed(2)} (Semana passada: R$${preRev.toFixed(2)})
Agendamentos: ${curCount} (Semana passada: ${preCount})
Servi\xE7os populares: ${topSvcStr}`;
          const result = await model.generateContent(prompt);
          const fullMsg = `\u{1F4CA} *Resumo Semanal - CutFlow Insights*

${result.response.text()}

_Para ver detalhes, acesse seu painel administrativo._`;
          await sendWhatsApp(phone, fullMsg, data.instance);
        }
      }
    }
  }
}

// routes/cron.ts
import crypto2 from "crypto";
import rateLimit from "express-rate-limit";
var router4 = Router4();
var cronLimiter = rateLimit({
  windowMs: 6e4,
  // 1 minuto
  max: 2,
  // Máximo de 2 requisições por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisi\xE7\xF5es no endpoint de cron. Aguarde 1 minuto." }
});
var cronGuard = (req, res, next) => {
  const secret = req.headers["x-cron-secret"];
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const secretBuffer = Buffer.from(secret);
  const expectedBuffer = Buffer.from(expected);
  if (secretBuffer.length !== expectedBuffer.length) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!crypto2.timingSafeEqual(secretBuffer, expectedBuffer)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
router4.get("/run", cronLimiter, cronGuard, async (req, res) => {
  try {
    await runCronLogic();
    res.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    res.status(500).json({ error: message });
  }
});
var cron_default = router4;

// routes/notify.ts
import { Router as Router5 } from "express";

// controllers/notifyController.ts
var sendAppointmentConfirmation = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { data: apt, error } = await supabaseAdmin.from("appointments").select("*, professionals(name, phone), shops(id, name, whatsapp_instance, whatsapp_connected)").eq("id", appointmentId).single();
    if (error || !apt) return res.status(404).json({ error: "Agendamento n\xE3o encontrado" });
    const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
    if (!shop?.whatsapp_connected) return res.status(400).json({ error: "WhatsApp da loja n\xE3o conectado" });
    const pro = Array.isArray(apt.professionals) ? apt.professionals[0] : apt.professionals;
    const { data: svcs } = await supabaseAdmin.from("services").select("name").in("id", apt.service_ids || []);
    const servicesNames = svcs?.map((s) => s.name).join(", ") || "servi\xE7os";
    const formattedDate = (/* @__PURE__ */ new Date(apt.date + "T12:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const formattedTime = apt.time.substring(0, 5);
    const dataForMessage = {
      clientName: apt.client_name,
      services: servicesNames,
      date: formattedDate,
      time: formattedTime,
      proName: pro?.name || "seu barbeiro",
      shopName: shop.name
    };
    const msgClient = await generateWhatsAppMessage("immediate_confirmation", dataForMessage, shop.id, "client");
    let clientOk = false;
    if (msgClient) {
      clientOk = await sendWhatsApp(apt.client_phone, msgClient, shop.whatsapp_instance);
      if (clientOk) {
        await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, "Confirma\xE7\xE3o Imediata (Cliente)", "sent");
      } else {
        await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, "Confirma\xE7\xE3o Imediata (Cliente)", "failed");
      }
    }
    if (pro?.phone) {
      const msgPro = await generateWhatsAppMessage("immediate_confirmation", dataForMessage, shop.id, "professional");
      if (msgPro) {
        const proOk = await sendWhatsApp(pro.phone, msgPro, shop.whatsapp_instance);
        if (proOk) {
          await logAutomatedMessage(shop.id, pro.name, pro.phone, "Notifica\xE7\xE3o Profissional", "sent");
        } else {
          await logAutomatedMessage(shop.id, pro.name, pro.phone, "Notifica\xE7\xE3o Profissional", "failed");
        }
      }
    }
    res.json({ success: clientOk });
  } catch (e) {
    console.error("Erro em sendAppointmentConfirmation:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var testTemplate = async (req, res) => {
  try {
    const { phone, templateId } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "N\xE3o autorizado" });
    const { data: template, error } = await supabaseAdmin.from("message_templates").select("*").eq("id", templateId).single();
    if (error || !template) return res.status(404).json({ error: "Template n\xE3o encontrado" });
    const { data: shop } = await supabaseAdmin.from("shops").select("name, owner_id, whatsapp_instance").eq("id", template.shop_id).single();
    if (!shop || shop.owner_id !== user.id) {
      return res.status(403).json({ error: "Sem permiss\xE3o para testar este template." });
    }
    let content = template.content;
    content = content.replace(/\[CLIENTE\]/g, "Cliente Teste").replace(/\[SERVICO\]/g, "Corte de Teste").replace(/\[DATA\]/g, "01/01/26").replace(/\[HORA\]/g, "14:00").replace(/\[BARBEIRO\]/g, "Barbeiro Teste").replace(/\[BARBEARIA\]/g, shop?.name || "Nossa Barbearia");
    const ok = await sendWhatsApp(phone, content, shop?.whatsapp_instance);
    if (ok) {
      res.json({ success: true, message: "Teste enviado com sucesso!" });
    } else {
      res.status(500).json({ error: "Falha ao enviar WhatsApp" });
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};

// routes/notify.ts
var router5 = Router5();
var cronGuard2 = (req, res, next) => {
  const secret = req.headers["x-cron-secret"];
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    console.warn("[Cron] Tentativa de acesso n\xE3o autorizado ao trigger.");
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
router5.get("/cron", cronGuard2, async (req, res) => {
  try {
    console.log("[API] Trigger manual do Cron via /api/notify/cron");
    await runCronLogic();
    res.json({ success: true, message: "Cron executado com sucesso" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    res.status(500).json({ error: message });
  }
});
router5.post("/confirmation-client", authenticate, sendAppointmentConfirmation);
router5.post("/confirmation", sendAppointmentConfirmation);
router5.post("/test", authenticate, testTemplate);
var notify_default = router5;

// routes/auth.ts
import { Router as Router6 } from "express";

// lib/email.ts
import { Resend } from "resend";
var resend = null;
var getResendClient = () => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[Email] RESEND_API_KEY n\xE3o configurada. E-mails n\xE3o ser\xE3o enviados.");
      return null;
    }
    resend = new Resend(apiKey);
  }
  return resend;
};
var sendWelcomeEmail = async (email, name) => {
  try {
    const client = getResendClient();
    if (!client) return false;
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    await client.emails.send({
      from,
      to: email,
      subject: "Bem-vindo ao CutFlow! \u{1F488}",
      html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #f97316;">Ol\xE1, ${name}!</h1>
                    <p>Estamos muito felizes em ter voc\xEA no <strong>CutFlow</strong>.</p>
                    <p>Sua conta foi confirmada com sucesso. Agora voc\xEA j\xE1 pode configurar sua barbearia, adicionar servi\xE7os e come\xE7ar a receber agendamentos automatizados.</p>
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Pr\xF3ximos passos:</h3>
                        <ol>
                            <li>Acesse seu painel administrativo.</li>
                            <li>Conecte seu WhatsApp na aba "Configura\xE7\xF5es".</li>
                            <li>Configure seus hor\xE1rios e servi\xE7os.</li>
                        </ol>
                    </div>
                    <p>Se tiver qualquer d\xFAvida, basta responder a este e-mail.</p>
                    <p>Boas vendas!<br>Equipe CutFlow</p>
                </div>
            `
    });
    console.log(`[Email] Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error);
    return false;
  }
};

// controllers/authController.ts
import jwt from "jsonwebtoken";
import crypto3 from "crypto";
var getJwtSecret = () => {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.error("FATAL: SUPABASE_JWT_SECRET ou JWT_SECRET n\xE3o configurado no .env");
    return null;
  }
  return secret;
};
var generateShortCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto3.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};
var requestClientLogin = async (req, res) => {
  try {
    const { shopId, phone, name, birthDate, justCheck } = req.body;
    if (!shopId || !phone) return res.status(400).json({ error: "ShopId e Telefone s\xE3o obrigat\xF3rios" });
    const secret = getJwtSecret();
    if (!secret) return res.status(500).json({ error: "Erro de configura\xE7\xE3o no servidor (JWT_SECRET)" });
    const cleanPhone = phone.replace(/\D/g, "");
    let { data: client } = await supabaseAdmin.from("clients").select("*").eq("shop_id", shopId).eq("phone", cleanPhone).maybeSingle();
    if (!client) {
      if (justCheck && cleanPhone !== "11999999999") return res.json({ success: false, needsRegistration: true });
      const clientName = name || (cleanPhone === "11999999999" ? "Cliente de Teste E2E" : "");
      const clientBirthDate = birthDate || (cleanPhone === "11999999999" ? "1990-01-01" : null);
      if (!clientName) return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio para novo cadastro" });
      const { data: newClient, error } = await supabaseAdmin.from("clients").insert({ shop_id: shopId, name: clientName, phone: cleanPhone, birth_date: clientBirthDate }).select("*").single();
      if (error) {
        if (error.code === "23505") {
          const { data: existingClient } = await supabaseAdmin.from("clients").select("*").eq("shop_id", shopId).eq("phone", cleanPhone).single();
          client = existingClient;
        } else {
          throw error;
        }
      } else {
        client = newClient;
      }
    }
    const token = jwt.sign(
      {
        role: "authenticated",
        clientId: client.id,
        shopId,
        phone: cleanPhone
      },
      secret,
      { expiresIn: "15m" }
    );
    const { data: shop, error: shopError } = await supabaseAdmin.from("shops").select("name, slug, whatsapp_instance").eq("id", shopId).single();
    if (shopError || !shop) {
      console.error("[Auth] Erro ao buscar dados da loja:", shopError);
      return res.status(404).json({ error: "Dados da loja n\xE3o encontrados" });
    }
    const testOtp = process.env.TEST_CLIENT_OTP || "TESTCODE";
    const code = cleanPhone === "11999999999" ? testOtp : generateShortCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const { error: codeError } = await supabaseAdmin.from("access_codes").upsert({
      code,
      token,
      expires_at: expiresAt
    }, { onConflict: "code" });
    if (codeError) {
      console.error("[Auth] Erro ao salvar access_code:", codeError);
      throw codeError;
    }
    const serverUrl = process.env.SERVER_URL || "https://www.insightbarber.com.br";
    const loginUrl = `${serverUrl}/acesso/${code}`;
    const msg = `Ol\xE1 ${client.name}!
Acesse sua conta na ${shop.name} clicando no link abaixo:

${loginUrl}

Este link expira em 15 minutos. \u{1F510}\u{1F488}`;
    console.log(`[Auth] Enviando link de login para ${cleanPhone} (Loja: ${shop.name})`);
    const ok = await sendWhatsApp(cleanPhone, msg, shop.whatsapp_instance);
    if (ok || cleanPhone === "11999999999") {
      res.json({ success: true, url: loginUrl });
    } else {
      console.error("[Auth] Falha ao enviar WhatsApp via Evolution API");
      res.status(500).json({ error: "Falha ao enviar mensagem de WhatsApp. Verifique a conex\xE3o." });
    }
  } catch (e) {
    console.error("[Auth] Error in requestClientLogin:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var validateClientToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token \xE9 obrigat\xF3rio" });
    const secret = getJwtSecret();
    if (!secret) return res.status(500).json({ error: "Erro de configura\xE7\xE3o no servidor (JWT_SECRET)" });
    let jwtToken = token;
    if (!token.startsWith("eyJ")) {
      const { data: accessCode, error: lookupError } = await supabaseAdmin.from("access_codes").select("token, expires_at").eq("code", token).maybeSingle();
      if (lookupError || !accessCode) {
        return res.status(401).json({ error: "C\xF3digo de acesso inv\xE1lido ou expirado" });
      }
      if (new Date(accessCode.expires_at) < /* @__PURE__ */ new Date()) {
        await supabaseAdmin.from("access_codes").delete().eq("code", token);
        return res.status(401).json({ error: "C\xF3digo de acesso expirado. Solicite um novo link." });
      }
      jwtToken = accessCode.token;
      const testOtp = process.env.TEST_CLIENT_OTP || "TESTCODE";
      if (token !== testOtp) {
        await supabaseAdmin.from("access_codes").delete().eq("code", token);
      }
    }
    const decoded = jwt.verify(jwtToken, secret);
    const { data: client } = await supabaseAdmin.from("clients").select("*").eq("id", decoded.clientId).single();
    if (!client) return res.status(404).json({ error: "Cliente n\xE3o encontrado" });
    const { data: shop } = await supabaseAdmin.from("shops").select("slug").eq("id", decoded.shopId).single();
    res.json({ success: true, client, slug: shop?.slug, session: { token: jwtToken } });
  } catch (e) {
    res.status(401).json({ error: "Token inv\xE1lido ou expirado" });
  }
};
var triggerWelcomeEmail = async (req, res) => {
  try {
    const { email, name, shopId } = req.body;
    if (!email || !name || !shopId) return res.status(400).json({ error: "Dados incompletos" });
    const { data: shop } = await supabaseAdmin.from("shops").select("welcome_email_sent").eq("id", shopId).single();
    if (shop?.welcome_email_sent) return res.json({ success: true, alreadySent: true });
    const sent = await sendWelcomeEmail(email, name);
    if (sent) {
      await supabaseAdmin.from("shops").update({ welcome_email_sent: true }).eq("id", shopId);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Falha ao enviar e-mail" });
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ error: "Token n\xE3o fornecido" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1e3).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    const { error } = await supabaseAdmin.from("revoked_tokens").insert({
      token,
      expires_at: expiresAt
    });
    if (error && error.code !== "23505") {
      throw error;
    }
    res.json({ success: true, message: "Sess\xE3o encerrada com sucesso" });
  } catch (e) {
    console.error("[Auth] Erro no logout:", e);
    const error = e instanceof Error ? e.message : "Erro interno";
    res.status(500).json({ error });
  }
};

// routes/auth.ts
var router6 = Router6();
router6.post("/client-request", requestClientLogin);
router6.post("/client-validate", validateClientToken);
router6.post("/welcome", triggerWelcomeEmail);
router6.post("/logout", authenticate, logout);
var auth_default = router6;

// routes/loyalty.ts
import { Router as Router7 } from "express";

// controllers/loyaltyController.ts
var generateReward = async (req, res) => {
  try {
    const { clientId, shopId } = req.body;
    if (!clientId || !shopId) return res.status(400).json({ error: "ClientId e ShopId s\xE3o obrigat\xF3rios" });
    const { data: client } = await supabaseAdmin.from("clients").select("*").eq("id", clientId).eq("shop_id", shopId).single();
    if (!client) return res.status(404).json({ error: "Cliente n\xE3o encontrado" });
    const { data: settings } = await supabaseAdmin.from("settings").select("*").eq("shop_id", shopId).single();
    if (!settings?.loyaltyEnabled) return res.status(400).json({ error: "Programa de fidelidade desativado nesta loja" });
    await supabaseAdmin.from("clients").update({
      loyalty_points: 0,
      loyalty_card_count: 0
    }).eq("id", clientId);
    const code = `PREMIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryDays = settings.loyaltyRewardExpiryDays || 30;
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    const { error: couponError } = await supabaseAdmin.from("coupons").insert({
      shop_id: shopId,
      client_id: clientId,
      code,
      type: "fixed",
      value: settings.loyaltyRewardValue || 10,
      active: true,
      expires_at: expiresAt.toISOString(),
      max_uses: 1,
      usage_count: 0,
      is_loyalty_reward: true
    });
    if (couponError) throw couponError;
    try {
      const { data: shop } = await supabaseAdmin.from("shops").select("name, whatsapp_instance, whatsapp_connected").eq("id", shopId).single();
      if (shop?.whatsapp_connected && client.phone) {
        const msg = await generateWhatsAppMessage("loyalty_reward", {
          clientName: client.name,
          shopName: shop.name,
          discount: `${settings.loyaltyRewardValue}${settings.loyaltyRewardType === "percentage" ? "%" : " reais"}`,
          code,
          validity: String(expiryDays)
        }, shopId);
        if (msg) {
          const sent = await sendWhatsApp(client.phone, msg, shop.whatsapp_instance);
          await logAutomatedMessage(shopId, client.name, client.phone, "Recompensa Fidelidade", sent ? "sent" : "failed");
        }
      }
    } catch (wsErr) {
      console.error("[Loyalty] Erro ao enviar WhatsApp:", wsErr);
    }
    res.json({ success: true, code });
  } catch (e) {
    console.error("[Loyalty] Error in generateReward:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};

// routes/loyalty.ts
var router7 = Router7();
router7.post("/reward", generateReward);
var loyalty_default = router7;

// routes/ai.ts
import { Router as Router8 } from "express";

// controllers/aiController.ts
import { GoogleGenerativeAI as GoogleGenerativeAI3 } from "@google/generative-ai";
var genAIInstance = null;
var getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n\xE3o configurada");
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI3(apiKey);
  }
  return genAIInstance;
};
var generateTemplate = async (req, res) => {
  try {
    const { trigger, shopName, tone } = req.body;
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Voc\xEA \xE9 um copywriter especializado em marketing para barbearias. 
        Crie uma mensagem de WhatsApp para o gatilho de automa\xE7\xE3o "${trigger}" de uma barbearia chamada "${shopName}". 
        O tom de voz deve ser ${tone || "amig\xE1vel e profissional"}. 
        Use obrigatoriamente as vari\xE1veis entre colchetes quando apropriado: [CLIENTE], [SERVICO], [DATA], [HORA], [BARBEIRO], [BARBEARIA]. 
        Retorne APENAS o texto final da mensagem, sem explica\xE7\xF5es ou aspas.`;
    const ac = new AbortController();
    if (typeof req.on === "function") {
      req.on("close", () => ac.abort());
    }
    const result = await model.generateContent(prompt, {
      timeout: 15e3,
      signal: ac.signal
    });
    if (!res.headersSent) {
      res.json({ success: true, text: result.response.text().trim() });
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.log("[AI] Chamada generateTemplate cancelada devido \xE0 desconex\xE3o do cliente.");
      return;
    }
    console.error("[AI] Error in generateTemplate:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    if (!res.headersSent) {
      res.status(500).json({ error });
    }
  }
};
var generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt \xE9 obrigat\xF3rio" });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    const imageResponse = await fetch(url, { signal: AbortSignal.timeout(1e4) });
    if (!imageResponse.ok) {
      return res.status(502).json({ error: "Falha ao gerar imagem com o servi\xE7o externo" });
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    res.json({ success: true, image: `data:${contentType};base64,${base64}` });
  } catch (e) {
    console.error("[AI] Error in generateImage:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    res.status(500).json({ error });
  }
};
var getInsights = async (req, res) => {
  try {
    const { prompt, context, history } = req.body;
    const genAI = getGenAI();
    const contextStr = JSON.stringify(context).slice(0, 12e3);
    const systemInstruction = `Voc\xEA \xE9 o "CutFlow Analytics AI", um consultor de intelig\xEAncia de neg\xF3cios especializado em barbearias.
        Analise os dados reais fornecidos abaixo e responda \xE0s perguntas do dono da barbearia de forma estrat\xE9gica, objetiva e motivadora.
        
        DADOS DA BARBEARIA:
        ${contextStr}
        
        REGRAS:
        - Nunca invente dados. Use apenas o que foi fornecido no contexto.
        - Se o usu\xE1rio pedir para gerar insights, destaque faturamento, convers\xE3o e performance dos barbeiros.
        - Seja direto ao ponto.`;
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction
    });
    const limitedHistory = (history || []).slice(-10);
    const formattedHistory = limitedHistory.filter((m) => m.content && m.content.trim()).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const safeHistory = formattedHistory.length > 0 && formattedHistory[0].role === "model" ? formattedHistory.slice(1) : formattedHistory;
    const chat = model.startChat({
      history: safeHistory
    });
    const ac = new AbortController();
    if (typeof req.on === "function") {
      req.on("close", () => ac.abort());
    }
    const result = await chat.sendMessage(prompt, {
      timeout: 15e3,
      signal: ac.signal
    });
    if (!res.headersSent) {
      res.json({ success: true, answer: result.response.text().trim() });
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.log("[AI] Chamada getInsights cancelada devido \xE0 desconex\xE3o do cliente.");
      return;
    }
    console.error("[AI] Error in getInsights:", e);
    const error = e instanceof Error ? e.message : "Erro desconhecido";
    const statusCode = e?.status === 429 ? 429 : 500;
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: statusCode === 429 ? "Limite de IA atingido. Aguarde alguns minutos." : error
      });
    }
  }
};

// routes/ai.ts
var router8 = Router8();
router8.post("/generate-template", generateTemplate);
router8.post("/generate-image", generateImage);
var ai_default = router8;

// routes/insights.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.post("/insights", getInsights);
var insights_default = router9;

// middlewares/requireAdmin.ts
import crypto4 from "crypto";
var requireAdmin = (req, res, next) => {
  const adminKey = req.headers["x-saas-admin-key"];
  const masterKey = process.env.SAAS_ADMIN_KEY;
  if (!masterKey) {
    console.error("CR\xCDTICO: SAAS_ADMIN_KEY n\xE3o configurada no .env");
    return res.status(500).json({ error: "Erro interno de configura\xE7\xE3o" });
  }
  if (!adminKey) {
    return res.status(401).json({ error: "Acesso negado" });
  }
  try {
    const keyBuffer = Buffer.from(adminKey);
    const masterBuffer = Buffer.from(masterKey);
    if (keyBuffer.length === masterBuffer.length && crypto4.timingSafeEqual(keyBuffer, masterBuffer)) {
      return next();
    }
  } catch (e) {
  }
  return res.status(401).json({ error: "Chave administrativa inv\xE1lida" });
};

// app.ts
dayjs4.extend(utc4);
dayjs4.extend(timezone4);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  const allowedOrigins = [
    "https://www.insightbarber.com.br",
    "https://insightbarber.com.br",
    process.env.SERVER_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ].filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) return callback(null, true);
      return callback(new Error("Bloqueado pela pol\xEDtica de CORS"), false);
    },
    credentials: true
  }));
  app.use(express.json());
  const notifyLimiter = rateLimit2({
    windowMs: 6e4,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisi\xE7\xF5es. Aguarde 1 minuto." }
  });
  const aiLimiter = rateLimit2({
    windowMs: 5 * 60 * 1e3,
    // 5 minutos
    max: 15,
    // máximo de 15 chamadas a cada 5 minutos por IP/usuário
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisi\xE7\xF5es de IA. Tente novamente em 5 minutos." }
  });
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/asaas", asaas_default);
  app.use("/api/whatsapp", whatsapp_default);
  app.use("/api/saas", requireAdmin, saas_admin_default);
  app.use("/api/cron", cron_default);
  app.use("/api/notify", notifyLimiter, notify_default);
  app.use("/api/auth", notifyLimiter, auth_default);
  app.use("/api/loyalty", authenticate, loyalty_default);
  app.use("/api/ai", authenticate, requirePlan("profissional"), aiLimiter, ai_default);
  app.use("/api/admin", authenticate, requirePlan("profissional"), insights_default);
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.accepts("html")) res.sendFile(path.join(distPath, "index.html"));
      else next();
    });
  } else if (process.env.NODE_ENV !== "test") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  app.use((err, req, res, next) => {
    console.error("[Global Error Handler]", err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: err.message || "Erro interno no servidor"
    });
  });
  return app;
}

// server.ts
var PORT = process.env.PORT || 3e3;
async function startServer() {
  try {
    const app = await createApp();
    const server = app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`\u{1F680} Servidor ativo na porta ${PORT}`);
      console.log("\u{1F4C5} Servidor pronto para receber triggers externos via /api/cron/run.");
    });
    process.on("unhandledRejection", (reason) => {
      console.error("[FATAL] Unhandled Rejection n\xE3o tratada:", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("[FATAL] Uncaught Exception s\xEDncrona fatal:", err);
      server.close(() => process.exit(1));
    });
    process.on("SIGTERM", () => {
      console.log("[SIGTERM] Sinal de encerramento recebido. Fechando conex\xF5es do servidor de forma gradual...");
      server.close(() => {
        console.log("\u{1F4A4} Servidor encerrado de forma limpa.");
        process.exit(0);
      });
    });
    process.on("SIGINT", () => {
      console.log("[SIGINT] Sinal de interrup\xE7\xE3o recebido (Ctrl+C). Fechando conex\xF5es do servidor...");
      server.close(() => {
        console.log("\u{1F4A4} Servidor encerrado de forma limpa.");
        process.exit(0);
      });
    });
  } catch (err) {
    console.error("\u274C Erro fatal ao iniciar o servidor:", err);
    process.exit(1);
  }
}
startServer();
