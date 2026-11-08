import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center px-4 py-12">
      <LoginScreen />
    </div>
  );
}
