import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    // Extra bottom space on phones so the floating "Ask Finn" button doesn't cover the card.
    <div className="flex min-h-[calc(100vh-10rem)] items-center px-4 pt-12 pb-28 sm:pb-12">
      <LoginScreen />
    </div>
  );
}
