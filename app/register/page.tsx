import { AuthShell } from "@/components/shared/AuthShell";
import { RegisterForm } from "@/components/shared/RegisterForm";

const RegisterPage = () => (
  <AuthShell
    title="สร้างบัญชีสมาชิก"
    description="สมัครเป็นสมาชิกทั่วไปก่อน เพื่อซื้อสินค้า เข้าร่วมประมูล และส่งคำขอเปิดร้านค้าภายหลังจากหน้าโปรไฟล์"
  >
    <RegisterForm />
  </AuthShell>
);

export default RegisterPage;
