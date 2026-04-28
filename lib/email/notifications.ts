import { prisma } from "@/lib/db/prisma";

interface QueueEmailInput {
  recipientId: string;
  toEmail: string;
  subject: string;
  body: string;
}

export const queueEmailNotification = async ({ recipientId, toEmail, subject, body }: QueueEmailInput) =>
  prisma.emailNotification.create({
    data: {
      recipientId,
      toEmail,
      subject,
      body,
      status: "PENDING",
    },
  });

export const queueEmailNotifications = async (emails: QueueEmailInput[]) => {
  if (emails.length === 0) {
    return { count: 0 };
  }

  return prisma.emailNotification.createMany({
    data: emails.map((email) => ({
      ...email,
      status: "PENDING" as const,
    })),
  });
};
