import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";

const getSmtpPort = () => Number(process.env.SMTP_PORT ?? 587);

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

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
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
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
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.toEmail,
        subject: email.subject,
        text: email.body,
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
