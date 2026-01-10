import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Users, Globe, Award, Heart, Stethoscope } from "lucide-react";
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
            <h2 className="text-2xl font-bold">The Cigna Group</h2>
            <p className="text-muted-foreground">Leader mondial des services de santé</p>
          </div>

          <img 
            src={buildingImage} 
            alt="Cigna Headquarters" 
            className="w-full rounded-lg object-cover h-48"
          />

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Leader mondial</h3>
                  <p className="text-sm text-muted-foreground">
                    The Cigna Group est l'une des plus grandes entreprises mondiales de services de santé. 
                    Basé à Bloomfield, Connecticut (États-Unis), le groupe dessert plus de 190 millions 
                    de clients dans une trentaine de pays, avec une forte présence en Europe et en Asie.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Fortune 500</h3>
                  <p className="text-sm text-muted-foreground">
                    Il figure régulièrement parmi les 15 premières entreprises du classement Fortune 500, 
                    soulignant sa puissance financière et son rôle majeur dans le système de santé mondial.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Nos services</h3>
                  <p className="text-sm text-muted-foreground">
                    Cigna offre une large gamme de services : assurance santé, vie, dentaire et vision, 
                    ainsi que des solutions de bien-être mental, de gestion de soins complexes et de 
                    pharmacie spécialisée.
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

          <img 
            src={teamImage} 
            alt="Notre équipe" 
            className="w-full rounded-lg object-cover h-48"
          />

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Notre mission</h3>
                  <p className="text-sm text-muted-foreground">
                    Améliorer la santé et le bien-être de ceux que nous servons, tout en offrant 
                    des opportunités d'investissement accessibles et transparentes pour construire 
                    un avenir financier stable.
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
