import { compare, hash } from "bcryptjs";

const passwordSaltRounds = 12;

export const hashPassword = async (password: string) => hash(password, passwordSaltRounds);

export const verifyPassword = async (password: string, passwordHash: string) =>
  compare(password, passwordHash);
