import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Emails the student their plan PDF. Any SMTP account works (e.g. Gmail with an app password):
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM. Without them the client falls back to
// downloading the PDF and opening the student's own email app.

const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// This endpoint sends mail to any address, so keep it from becoming a spam relay.
const PER_IP = 3, PER_IP_WINDOW = 10 * 60_000, GLOBAL_PER_HOUR = 40, MAX_PDF_BYTES = 4 * 1024 * 1024;
const hits = new Map<string, number[]>();
let globalHits: number[] = [];

function limited(ip: string) {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < 3_600_000);
  const mine = (hits.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW);
  if (mine.length >= PER_IP || globalHits.length >= GLOBAL_PER_HOUR) return true;
  mine.push(now);
  hits.set(ip, mine);
  globalHits.push(now);
  return false;
}

const oneLine = (s: unknown, max = 120) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET() {
  return NextResponse.json({ configured: configured() });
}

export async function POST(req: Request) {
  if (!configured()) return NextResponse.json({ configured: false, error: "Email isn't set up on this server." }, { status: 501 });

  const body = (await req.json().catch(() => null)) as { to?: string; pdf?: string; career?: string; routeTitle?: string; fileName?: string } | null;
  const to = oneLine(body?.to, 254);
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(to)) return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });

  const pdf = Buffer.from(String(body?.pdf ?? ""), "base64");
  if (!pdf.length || pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "The plan PDF is missing or too large." }, { status: 400 });
  }

  const ip = oneLine(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "local", 64);
  if (limited(ip)) return NextResponse.json({ error: "Too many emails from here. Download the PDF instead, or try again in a few minutes." }, { status: 429 });

  const career = oneLine(body?.career) || "your career";
  const routeTitle = oneLine(body?.routeTitle, 160);
  const fileName = oneLine(body?.fileName, 80).replace(/[^\w.-]/g, "-") || "SharkPath-plan.pdf";

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || `SharkPath <${process.env.SMTP_USER}>`,
      to,
      subject: `Your SharkPath plan: ${career}`,
      text: `Here's your SharkPath plan for becoming a ${career}${routeTitle ? `: ${routeTitle}` : ""}.\n\nYour full plan is attached as a PDF: timeline, costs and aid, requirements, and your next steps.\n\nGood luck. Sonar & Tide`,
      html: `<p>Here's your SharkPath plan for becoming a <b>${esc(career)}</b>${routeTitle ? `: ${esc(routeTitle)}` : ""}.</p><p>Your full plan is attached as a PDF: timeline, costs and aid, requirements, and your next steps.</p><p>Good luck.<br>Sonar &amp; Tide</p>`,
      attachments: [{ filename: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    return NextResponse.json({ sent: true });
  } catch (e) {
    console.warn("email failed —", (e as Error).message);
    return NextResponse.json({ error: "Couldn't send the email right now. Download the PDF instead." }, { status: 502 });
  }
}
