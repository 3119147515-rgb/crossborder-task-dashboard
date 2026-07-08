"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { Input, Label } from "@/components/ui/form";
import { getSupabase } from "@/lib/supabase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    const supabase = getSupabase();
    try {
      const normalizedEmail = email.trim();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage("登录成功");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }
      setMode("login");
      setMessage("注册成功，请返回登录。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-950">跨境电商多平台任务推进表</h1>
          <p className="mt-2 text-sm text-zinc-500">使用 Supabase Auth 登录后进入团队任务看板。</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label>邮箱</Label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team@example.com" type="email" />
          </div>
          <div>
            <Label>密码</Label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" type="password" />
          </div>
          {message ? <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{message}</p> : null}
          <Button className="w-full" onClick={submit} disabled={loading || !email || password.length < 6}>
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </Button>
          <Button className="w-full" variant="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "没有账号，注册团队成员" : "已有账号，返回登录"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
