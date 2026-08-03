import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister, useGetCurrencies } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { WalletCards, Mail, Lock, User as UserIcon, Globe, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z.object({
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }),
  currencyCode: z.string().min(1, { message: "يرجى اختيار العملة الأساسية" }),
  country: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { mutate: registerMutate, isPending } = useRegister();
  const { data: currenciesData, isLoading: isCurrenciesLoading } = useGetCurrencies();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      currencyCode: "USD",
      country: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutate(
      { data },
      {
        onSuccess: (res) => {
          login(res);
          toast.success("تم إنشاء الحساب بنجاح!");
          setLocation("/");
        },
        onError: (err: any) => {
          toast.error(err.data?.message || "فشل إنشاء الحساب. جرب مرة أخرى.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 text-primary mb-6">
              <WalletCards className="w-10 h-10" />
              <span className="text-3xl font-bold">حسابي</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">إنشاء حساب جديد</h1>
            <p className="text-muted-foreground">ابدأ رحلتك نحو الاستقرار المالي</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserIcon className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="أحمد محمد" className="pr-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>كلمة المرور</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العملة الأساسية</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العملة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isCurrenciesLoading ? (
                            <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                          ) : (
                            currenciesData?.currencies?.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} - {currency.code}
                              </SelectItem>
                            )) || (
                              <>
                                <SelectItem value="USD">$ - USD</SelectItem>
                                <SelectItem value="SAR">ر.س - SAR</SelectItem>
                                <SelectItem value="EUR">€ - EUR</SelectItem>
                              </>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البلد (اختياري)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="السعودية" className="pr-10" {...field} value={field.value || ""} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full text-lg h-12 rounded-xl mt-4" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء حساب"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="relative z-10 text-primary-foreground max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
            <WalletCards className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-bold leading-tight">ابدأ إدارتك المالية اليوم</h2>
          <p className="text-lg text-primary-foreground/80">
            انضم إلى آلاف المستخدمين الذين يثقون في حسابي لإدارة أموالهم وتحقيق أهدافهم.
          </p>
        </div>
      </div>
    </div>
  );
}
