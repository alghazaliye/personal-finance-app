import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForgotPassword } from "@workspace/api-client-react";
import { WalletCards, Mail, Loader2, ArrowRight } from "lucide-react";
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

const forgotSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { mutate: forgotMutate, isPending } = useForgotPassword();

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotFormValues) => {
    forgotMutate(
      { data },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني");
        },
        onError: (err: any) => {
          toast.error(err.data?.message || "حدث خطأ. حاول مرة أخرى.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <WalletCards className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">استعادة كلمة المرور</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-secondary text-secondary-foreground rounded-2xl text-sm leading-relaxed">
              تحقق من بريدك الإلكتروني. لقد أرسلنا رابط إعادة التعيين إذا كان مسجلاً لدينا.
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full gap-2">
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
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

              <Button type="submit" className="w-full h-12 rounded-xl" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال رابط الاستعادة"}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm font-medium text-primary hover:underline flex items-center justify-center gap-1">
                  <ArrowRight className="w-4 h-4" /> العودة لتسجيل الدخول
                </Link>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
