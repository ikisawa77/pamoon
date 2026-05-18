import { AuthShell } from "@/components/shared/AuthShell";
import { LoginForm } from "@/components/shared/LoginForm";

const LoginPage = () => (
  <AuthShell
    title="เข้าสู่ระบบ"
    description="เข้าสู่ระบบด้วยบัญชี Admin, Reseller หรือ Member แล้วระบบจะพาไปยังพื้นที่ทำงานที่ถูกต้องอัตโนมัติ"
  >
    <LoginForm />
  </AuthShell>
);

export default LoginPage;
