import React from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Container, Badge } from "@jaama/ui";

export default function WebHomePage() {
  return (
    <Container size="lg" className="py-16">
      <Card className="max-w-2xl mx-auto border-slate-200 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="brand">Engineering Foundation</Badge>
            <span className="text-xs text-slate-400 font-mono">@jaama/web</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            JAAMA Web Application Foundation
          </CardTitle>
          <CardDescription>
            La fondation SaaS d&apos;ingénierie et du système de design est initialisée et fonctionnelle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-600 text-sm">
          <p>
            Cette application constitue le socle Web officiel de JAAMA, consommant les primitives d&apos;ingénierie et le système de tokens sémantiques <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-[#002B9A] font-semibold">@jaama/ui</code>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-slate-50/50">
          <Link href="/design-system">
            <Button variant="primary">
              Voir le Design System QA →
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </Container>
  );
}
