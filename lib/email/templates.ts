import { prisma } from "@/lib/db/prisma";

export type EmailTemplateKind = "AUCTION_INTEREST" | "BID_OUTBID" | "AUCTION_WON" | "PAYMENT_DUE";

interface TemplateRecord {
  type: EmailTemplateKind;
  name: string;
  subject: string;
  preheader: string | null;
  headline: string;
  body: string;
  accentColor: string;
  ctaLabel: string;
  isActive: boolean;
}

interface RenderVariables {
  recipientName?: string;
  productTitle?: string;
  productHref?: string;
  currentPrice?: string;
  openingPrice?: string;
  shippingPrice?: string;
  totalPrice?: string;
  timeLeft?: string;
  paymentDue?: string;
  sellerName?: string;
  appUrl?: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

interface EmailTemplateClient {
  emailTemplate: {
    findUnique: (args: { where: { type: EmailTemplateKind } }) => Promise<TemplateRecord | null>;
  };
}

const fallbackTemplates: Record<EmailTemplateKind, TemplateRecord> = {
  AUCTION_INTEREST: {
    type: "AUCTION_INTEREST",
    name: "มีการประมูลสินค้าที่สนใจ",
    subject: "มีการประมูลสินค้าที่คุณสนใจ!",
    preheader: "รายการที่คุณติดตามกำลังเปิดประมูลแล้ว",
    headline: "มีผู้เปิดประมูลสินค้าที่คุณสนใจ",
    body: "รายการ {{productTitle}} ที่คุณติดตามกำลังเปิดรับบิดแล้ว ตรวจรายละเอียดและเข้าร่วมก่อนหมดเวลา",
    accentColor: "#facc15",
    ctaLabel: "เข้าร่วมประมูลเลย",
    isActive: true,
  },
  BID_OUTBID: {
    type: "BID_OUTBID",
    name: "มีผู้บิดสูงกว่า",
    subject: "มีผู้บิดสูงกว่าคุณ!",
    preheader: "รีบกลับไปบิดเพิ่ม ถ้ายังต้องการชนะรายการนี้",
    headline: "มีการบิดใหม่",
    body: "ขณะนี้มีผู้เสนอราคาสูงกว่าคุณในรายการ {{productTitle}} ราคาปัจจุบันคือ {{currentPrice}}",
    accentColor: "#f05252",
    ctaLabel: "บิดต่อเลย",
    isActive: true,
  },
  AUCTION_WON: {
    type: "AUCTION_WON",
    name: "ชนะการประมูล",
    subject: "ยินดีด้วย คุณชนะการประมูล",
    preheader: "กรุณาชำระเงินภายใน 24 ชั่วโมงเพื่อยืนยันสิทธิ์",
    headline: "ยินดีด้วย! คุณชนะแล้ว",
    body: "คุณชนะการประมูล {{productTitle}} ยอดสุทธิ {{totalPrice}} กรุณาชำระเงินภายใน {{paymentDue}}",
    accentColor: "#22c55e",
    ctaLabel: "ชำระเงินเดี๋ยวนี้",
    isActive: true,
  },
  PAYMENT_DUE: {
    type: "PAYMENT_DUE",
    name: "แจ้งเตือนชำระเงิน",
    subject: "ชำระเงินภายใน 24 ชั่วโมง",
    preheader: "รายการประมูลที่ชนะกำลังรอชำระเงิน",
    headline: "เหลือเวลาชำระเงิน",
    body: "รายการ {{productTitle}} ต้องชำระเงินภายใน {{paymentDue}} หากพ้นกำหนดระบบจะส่งเข้าแอดมินตรวจสอบ",
    accentColor: "#dc2626",
    ctaLabel: "ไปหน้าคำสั่งซื้อ",
    isActive: true,
  },
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const applyVariables = (template: string, variables: RenderVariables) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => escapeHtml(String(variables[key as keyof RenderVariables] ?? "")));

const getTemplate = async (type: EmailTemplateKind, client: EmailTemplateClient = prisma) => {
  const template = await client.emailTemplate.findUnique({ where: { type } });
  return template?.isActive ? template : fallbackTemplates[type];
};

export const renderEmailTemplate = async (
  type: EmailTemplateKind,
  variables: RenderVariables,
  client?: EmailTemplateClient,
): Promise<RenderedEmail> => {
  const template = await getTemplate(type, client);
  const appUrl = variables.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const href = variables.productHref?.startsWith("http") ? variables.productHref : `${appUrl}${variables.productHref ?? "/"}`;
  const subject = applyVariables(template.subject, variables);
  const headline = applyVariables(template.headline, variables);
  const body = applyVariables(template.body, variables).replace(/\n/g, "<br />");
  const preheader = template.preheader ? applyVariables(template.preheader, variables) : "";
  const productTitle = escapeHtml(variables.productTitle ?? "รายการสินค้า");

  const html = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,'Tahoma',sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.12);">
            <tr>
              <td align="center" style="background:${template.accentColor};padding:28px 28px 24px;">
                <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:10px 16px;font-weight:900;color:#24416f;font-size:26px;letter-spacing:.4px;">TCG</div>
                <h1 style="margin:22px 0 0;font-size:24px;line-height:1.35;color:#ffffff;">${headline}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">สวัสดี คุณ${escapeHtml(variables.recipientName ?? "สมาชิก")}</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#374151;">${body}</p>
                <div style="border:1px solid ${template.accentColor};background:#fff7df;border-radius:12px;padding:18px;margin:0 0 20px;">
                  <div style="font-size:17px;font-weight:800;color:#111827;">${productTitle}</div>
                  <a href="${escapeHtml(href)}" style="display:inline-block;margin-top:10px;color:#2563eb;text-decoration:none;font-weight:700;">ดูรายละเอียดรายการ</a>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:12px;padding:12px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:10px 12px;color:#6b7280;">ราคาปัจจุบัน</td>
                    <td align="right" style="padding:10px 12px;font-weight:800;color:#16a34a;">${escapeHtml(variables.currentPrice ?? "-")}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;color:#6b7280;border-top:1px solid #e5e7eb;">เวลาคงเหลือ/กำหนดชำระ</td>
                    <td align="right" style="padding:10px 12px;border-top:1px solid #e5e7eb;font-weight:800;color:#dc2626;">${escapeHtml(variables.timeLeft ?? variables.paymentDue ?? "-")}</td>
                  </tr>
                </table>
                <div style="text-align:center;margin:26px 0;">
                  <a href="${escapeHtml(href)}" style="display:inline-block;background:${template.accentColor};color:#ffffff;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 26px;">${escapeHtml(template.ctaLabel)}</a>
                </div>
                <div style="background:#fff7df;border:1px solid #f59e0b;border-radius:12px;padding:14px;text-align:center;color:#92400e;font-size:14px;line-height:1.6;">
                  ระบบแจ้งเตือนนี้ทำงานจาก BidCard TH และสามารถตั้งค่าได้จากหลังบ้านผู้ดูแล
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
};

export const seedEmailTemplates = () => Object.values(fallbackTemplates);
