import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, CircleHelp } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-0 bg-card/90 shadow-xl">
        <CardContent className="px-7 py-9 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/70 text-primary">
            <CircleHelp className="h-7 w-7" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Erreur 404</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Cette page est introuvable</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Le lien a peut-être changé ou la page n’est plus disponible. Retournez à votre espace.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
