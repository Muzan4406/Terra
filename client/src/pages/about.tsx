import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Users, Globe, Award } from "lucide-react";
import logoImage from "@assets/cigna-healthcare-logo_1768031545630.png";
import buildingImage from "@assets/NORTH-ENTRANCE-R_0011-v4-500x333-1707773313063_1768031545563.png";
import teamImage from "@assets/Img_2026_01_09_18_57_41_1768031521248.jpeg";

export default function AboutPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">À propos de nous</h1>
        </header>

        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <img src={logoImage} alt="Cigna Group" className="h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Cigna Group</h2>
            <p className="text-muted-foreground">Investissez dans votre avenir</p>
          </div>

          <img 
            src={buildingImage} 
            alt="Cigna Headquarters" 
            className="w-full rounded-lg object-cover h-48"
          />

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre entreprise</h3>
                  <p className="text-sm text-muted-foreground">
                    Cigna Group est une plateforme d'investissement de premier plan, 
                    offrant des opportunités de croissance financière à travers l'Afrique de l'Ouest.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Présence internationale</h3>
                  <p className="text-sm text-muted-foreground">
                    Nous opérons dans 5 pays: Cameroun, Burkina Faso, Togo, Bénin et Côte d'Ivoire, 
                    servant des milliers d'investisseurs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre mission</h3>
                  <p className="text-sm text-muted-foreground">
                    Permettre à chacun de construire un avenir financier stable grâce à des 
                    investissements accessibles et transparents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <img 
            src={teamImage} 
            alt="Notre équipe" 
            className="w-full rounded-lg object-cover h-48"
          />

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre équipe</h3>
                  <p className="text-sm text-muted-foreground">
                    Une équipe dédiée de professionnels travaille 24/7 pour assurer 
                    la meilleure expérience d'investissement possible.
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
