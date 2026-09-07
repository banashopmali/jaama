"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@jaama/ui";
import { LogIn, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function LoginPage() {
  const router = useRouter();
  const { refreshContext } = useWorkspace();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error?.message || "Identifiants invalides.");
      }

      await refreshContext();
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Impossible de se connecter à JAAMA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
              J
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
              JAAMA
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Plateforme Tout-en-un de Gestion d&apos;Entreprise
          </p>
        </div>

        <Card className="shadow-xl border-slate-200 bg-white rounded-2xl p-2">
          <CardHeader className="space-y-1 text-center pb-4">
            <Badge variant="brand" size="sm" className="mx-auto mb-1">
              ACCÈS SÉCURISÉ
            </Badge>
            <CardTitle className="text-xl font-bold text-slate-900">
              Connexion à votre espace
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Saisissez vos identifiants pour gérer votre entreprise
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Adresse Email</label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="votre.email@entreprise.ml"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Mot de Passe</label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button
                id="login-submit-button"
                variant="primary"
                size="md"
                className="w-full justify-center mt-2 font-semibold"
                disabled={isSubmitting}
                type="submit"
                leftIcon={<LogIn className="w-4 h-4" />}
                rightIcon={!isSubmitting ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                {isSubmitting ? "Connexion en cours..." : "Se connecter à JAAMA"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span>Session chiffrée SSL / HttpOnly Cookie (Zero-Trust Security)</span>
        </div>
      </div>
    </div>
  );
}
