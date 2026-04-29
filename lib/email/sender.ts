import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";

const getSmtpPort = () => Number(process.env.SMTP_PORT ?? 587);

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

const isHtmlBody = (body: string) => /<\/?[a-z][\s\S]*>/i.test(body);

const stripHtml = (body: string) =>
  body
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const flushPendingEmailNotifications = async (limit = 20) => {
  if (!hasSmtpConfig()) {
    const skipped = await prisma.emailNotification.updateMany({
      where: { status: "PENDING" },
      data: { status: "SKIPPED", reason: "ยังไม่ได้ตั้งค่า SMTP ใน .env" },
    });

    return { sent: 0, failed: 0, skipped: skipped.count };
  }

  const emails = await prisma.emailNotification.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: getSmtpPort(),
    secure: getSmtpPort() === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      const html = isHtmlBody(email.body) ? email.body : undefined;
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.toEmail,
        subject: email.subject,
        text: html ? stripHtml(email.body) : email.body,
        html,
      });

      await prisma.emailNotification.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date(), reason: null },
      });
      sent += 1;
    } catch (error: unknown) {
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: {
          status: "FAILED",
          reason: error instanceof Error ? error.message.slice(0, 255) : "ส่งอีเมลไม่สำเร็จ",
        },
      });
      failed += 1;
    }
  }

  return { sent, failed, skipped: 0 };
};
