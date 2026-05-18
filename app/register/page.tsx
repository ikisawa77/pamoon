import { AuthShell } from "@/components/shared/AuthShell";
import { RegisterForm } from "@/components/shared/RegisterForm";

const RegisterPage = () => (
  <AuthShell
    title="สร้างบัญชีใหม่"
    description="สมัครเป็น Member เพื่อซื้อและประมูล หรือเปิดบัญชี Reseller เพื่อขายสินค้าและเปิดประมูลได้ทันที"
  >
    <RegisterForm />
  </AuthShell>
);

export default RegisterPage;
