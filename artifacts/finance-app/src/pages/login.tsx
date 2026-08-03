import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useGoogleAuth } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { WalletCards, Mail, Lock, ArrowRight, Loader2, PieChart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { mutate: loginMutate, isPending } = useLogin();
  const { mutate: googleMutate, isPending: isGooglePending } = useGoogleAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutate(
      { data },
      {
        onSuccess: (res) => {
          login(res);
          toast.success("تم تسجيل الدخول بنجاح");
          setLocation("/");
        },
        onError: (err: any) => {
          toast.error(err.data?.message || "فشل تسجيل الدخول. تأكد من بياناتك.");
        },
      }
    );
  };

  const handleGoogleLogin = () => {
    // In a real app, this would trigger the Google OAuth flow and get an idToken
    // For now we simulate an error since we don't have the real Google SDK
    toast.error("تسجيل الدخول عبر جوجل غير متوفر حالياً");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 text-primary mb-6">
              <WalletCards className="w-10 h-10" />
              <span className="text-3xl font-bold">حسابي</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">أهلاً بعودتك</h1>
            <p className="text-muted-foreground">قم بتسجيل الدخول للوصول إلى حسابك المالي</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="name@example.com" className="pr-10 text-left" dir="ltr" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>كلمة المرور</FormLabel>
                      <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                        نسيت كلمة المرور؟
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" className="pr-10 text-left" dir="ltr" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full text-lg h-12 rounded-xl" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">أو الاستمرار بواسطة</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl" 
            onClick={handleGoogleLogin}
            disabled={isGooglePending}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-2" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
            تسجيل الدخول بحساب جوجل
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              سجل الآن
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Branding / Image */}
      <div className="hidden md:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="relative z-10 text-primary-foreground max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
            <PieChart className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-bold leading-tight">تحكم في أموالك بذكاء وسهولة</h2>
          <p className="text-lg text-primary-foreground/80">
            تتبع نفقاتك، خطط لميزانيتك، وحقق أهدافك المالية مع حسابي - رفيقك المالي الشخصي.
          </p>
        </div>
      </div>
    </div>
  );
}
