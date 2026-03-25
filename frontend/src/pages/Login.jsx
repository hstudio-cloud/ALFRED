import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo ao Alfred'
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Erro no login',
        description: result.error,
        variant: 'destructive'
      });
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-slate-800/30 border-slate-700/50 backdrop-blur-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Alfred
          </h1>
          <p className="text-slate-400">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="bg-slate-900/50 border-slate-700 text-white"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="bg-slate-900/50 border-slate-700 text-white"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-6"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-cyan-400 hover:text-cyan-300">
            Registre-se
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-400">
            ← Voltar para home
          </Link>
        </div>

        {/* Demo credentials */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400 font-semibold mb-2">Conta Admin de Teste:</p>
          <p className="text-xs text-slate-400">Email: admin@alfred.com</p>
          <p className="text-xs text-slate-400">Senha: Admin@123456</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
