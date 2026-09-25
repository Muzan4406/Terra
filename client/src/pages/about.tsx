import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Users, Globe, Award, Heart, Wallet } from "lucide-react";

export default function AboutPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">À propos de Terra oil</h1>
        </header>

        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold">Terra oil</h2>
            <p className="text-muted-foreground">Votre espace de suivi</p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Un espace centralisé</h3>
                  <p className="text-sm text-muted-foreground">
                    Terra oil rassemble les principales fonctions de votre compte dans une interface simple à consulter.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Suivi des opérations</h3>
                  <p className="text-sm text-muted-foreground">
                    Retrouvez les informations liées à vos dépôts, retraits et produits depuis votre espace personnel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Produits et assistance</h3>
                  <p className="text-sm text-muted-foreground">
                    Consultez les produits disponibles et les moyens de contacter le service client dans l'application.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Présence en Afrique</h3>
                  <p className="text-sm text-muted-foreground">
                    Nous opérons dans 5 pays africains francophones: Cameroun, Burkina Faso, Togo, 
                    Bénin et Côte d'Ivoire, offrant des opportunités d'investissement uniques.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre mission</h3>
                  <p className="text-sm text-muted-foreground">
                    Donner accès aux informations de compte et aux services disponibles depuis un même espace.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre équipe</h3>
                  <p className="text-sm text-muted-foreground">
                    Les options de contact du service client sont accessibles depuis votre compte.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
