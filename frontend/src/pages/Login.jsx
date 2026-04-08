import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import { Building2, CreditCard, Loader2, Sparkles, Wallet } from "lucide-react";
import NanoMark from "../components/NanoMark";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao Nano IA.",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Erro no login",
        description: result.error,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(127,29,29,0.24),_transparent_35%),linear-gradient(180deg,_#090203_0%,_#160405_55%,_#090203_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <NanoMark className="h-14 w-14" />
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-red-300/80">
                  Nano IA
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Sistema financeiro inteligente
                </p>
              </div>
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-6xl">
              Entre para controlar pagamentos, receitas e rotina financeira em
              um só lugar.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              O painel foi pensado para acompanhar operação pessoal e
              empresarial com organização, lembretes e IA no mesmo fluxo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-red-500/10 bg-slate-950/40 p-5 backdrop-blur">
              <Wallet className="mb-4 h-6 w-6 text-red-300" />
              <h2 className="text-base font-semibold text-white">
                Saldo consolidado
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Veja entradas, saídas e caixa em tempo real.
              </p>
            </Card>

            <Card className="border-red-500/10 bg-slate-950/40 p-5 backdrop-blur">
              <Building2 className="mb-4 h-6 w-6 text-red-200" />
              <h2 className="text-base font-semibold text-white">
                Pessoal e empresa
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Separe os contextos sem perder a visão geral.
              </p>
            </Card>

            <Card className="border-red-500/10 bg-slate-950/40 p-5 backdrop-blur">
              <CreditCard className="mb-4 h-6 w-6 text-amber-300" />
              <h2 className="text-base font-semibold text-white">
                Pix, cartão e mais
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Registre e classifique pagamentos com linguagem natural.
              </p>
            </Card>
          </div>
        </div>

        <Card className="w-full border-red-500/15 bg-slate-950/40 p-8 shadow-2xl shadow-red-950/30 backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              <Sparkles className="mr-2 h-4 w-4" />
              Acesso ao painel
            </div>
            <h2 className="text-3xl font-semibold text-white">
              Entrar na sua conta
            </h2>
            <p className="mt-2 text-slate-400">
              Continue de onde parou no Nano.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
                placeholder="Digite sua senha"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 py-6 text-white hover:bg-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Não tem uma conta?{" "}
            <Link to="/register" className="text-red-300 hover:text-red-200">
              Crie agora
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Voltar para a home
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
              Conta demo
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Email: admin@alfred.com
            </p>
            <p className="text-sm text-slate-300">Senha: Admin@123456</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
