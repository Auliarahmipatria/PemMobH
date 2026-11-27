import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const tokenStoreDirectory = path.join(serverDirectory, "data");
const tokenStorePath = path.join(tokenStoreDirectory, "push-tokens.json");
const port = Number(process.env.PUSH_SERVER_PORT || 4100);
const host = process.env.PUSH_SERVER_HOST || "0.0.0.0";
const maxRequestBytes = 64 * 1024;
const expoPushUrl = "https://exp.host/--/api/v2/push/send";

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxRequestBytes) {
      throw new HttpError(413, "Ukuran permintaan terlalu besar.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Isi permintaan harus berupa JSON yang valid.");
  }
}

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : "";
}

function isExpoPushToken(value) {
  return (
    typeof value === "string" &&
    /^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/.test(value)
  );
}

async function readTokenStore() {
  try {
    const content = await readFile(tokenStorePath, "utf8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error("Store token bukan array.");
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function saveTokenStore(registrations) {
  await mkdir(tokenStoreDirectory, { recursive: true });
  const temporaryPath = `${tokenStorePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(registrations, null, 2)}\n`, "utf8");
  await rename(temporaryPath, tokenStorePath);
}

async function registerPushToken(request, response) {
  const body = await readJsonBody(request);
  const email = normalizeEmail(body.userEmail);

  if (!email) throw new HttpError(400, "Email akun demo tidak valid.");
  if (!isExpoPushToken(body.token)) throw new HttpError(400, "Expo Push Token tidak valid.");
  if (body.platform !== "android" && body.platform !== "ios") {
    throw new HttpError(400, "Platform perangkat harus Android atau iOS.");
  }

  const registrations = await readTokenStore();
  const existingIndex = registrations.findIndex((entry) => entry.token === body.token);
  const registration = {
    token: body.token,
    userEmail: email,
    platform: body.platform,
    topics: Array.isArray(body.topics)
      ? body.topics.filter((topic) => typeof topic === "string").slice(0, 10)
      : [],
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) registrations[existingIndex] = registration;
  else registrations.push(registration);

  await saveTokenStore(registrations);
  sendJson(response, existingIndex >= 0 ? 200 : 201, {
    ok: true,
    message: "Token perangkat berhasil disimpan.",
  });
}

function createProductPayload(product) {
  if (!product || (typeof product.id !== "string" && typeof product.id !== "number")) {
    throw new HttpError(400, "Produk demo harus memiliki id.");
  }
  if (typeof product.name !== "string" || product.name.trim().length === 0) {
    throw new HttpError(400, "Produk demo harus memiliki nama.");
  }

  const data = {
    productId: String(product.id),
    source: product.source === "api" ? "api" : "bidly",
    name: product.name.trim().slice(0, 120),
  };

  for (const key of ["price", "image", "category", "seller", "condition"]) {
    if (typeof product[key] === "string" && product[key].length > 0) {
      data[key] = product[key].slice(0, key === "image" ? 1000 : 120);
    }
  }

  return data;
}

async function sendExpoMessages(messages) {
  const headers = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const tickets = [];
  for (let start = 0; start < messages.length; start += 100) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(expoPushUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(messages.slice(start, start + 100)),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new HttpError(502, `Expo Push Service menolak permintaan (${response.status}).`);
      }
      if (!result || !Array.isArray(result.data)) {
        throw new HttpError(502, "Respons Expo Push Service tidak dikenali.");
      }
      tickets.push(...result.data);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error?.name === "AbortError") {
        throw new HttpError(504, "Expo Push Service tidak merespons tepat waktu.");
      }
      throw new HttpError(502, "Tidak dapat terhubung ke Expo Push Service.");
    } finally {
      clearTimeout(timeout);
    }
  }

  return tickets;
}

async function sendDemoPush(request, response) {
  const body = await readJsonBody(request);
  const email = normalizeEmail(body.userEmail);
  if (!email) throw new HttpError(400, "Email akun demo tidak valid.");

  const registrations = await readTokenStore();
  const targets = registrations.filter((entry) => entry.userEmail === email);
  if (targets.length === 0) {
    throw new HttpError(404, "Belum ada token terdaftar untuk akun ini. Tekan AKTIFKAN PUSH dulu.");
  }

  const data = createProductPayload(body.product);
  const messages = targets.map((target) => ({
    to: target.token,
    title: "🔔 Ada aktivitas lelang di Bidly",
    body: `Ada bid baru untuk ${data.name}. Ketuk untuk melihat detail.`,
    sound: "default",
    priority: "high",
    data,
    ...(target.platform === "android" ? { channelId: "auction-updates" } : {}),
  }));
  const tickets = await sendExpoMessages(messages);
  const accepted = tickets.filter((ticket) => ticket?.status === "ok").length;
  const errors = tickets
    .filter((ticket) => ticket?.status === "error")
    .map((ticket) => ticket.message || ticket.details?.error || "Push ditolak.");

  sendJson(response, 200, {
    ok: accepted > 0,
    accepted,
    registered: targets.length,
    errors,
    message:
      accepted > 0
        ? `Expo menerima ${accepted} dari ${targets.length} push.`
        : errors[0] || "Expo Push Service belum menerima push.",
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204);
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  try {
    if (request.method === "GET" && requestUrl.pathname === "/health") {
      const registrations = await readTokenStore();
      sendJson(response, 200, { ok: true, registeredTokens: registrations.length });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/push/register") {
      await registerPushToken(request, response);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/push/send-demo") {
      await sendDemoPush(request, response);
      return;
    }

    sendJson(response, 404, { ok: false, message: "Endpoint tidak ditemukan." });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server push.";
    if (statusCode === 500) console.error(error);
    sendJson(response, statusCode, { ok: false, message });
  }
});

server.listen(port, host, () => {
  console.log(`Bidly push demo server aktif pada ${host}:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log("Atur EXPO_PUBLIC_PUSH_API_URL ke alamat IPv4 laptop pada jaringan Wi-Fi yang sama.");
});
