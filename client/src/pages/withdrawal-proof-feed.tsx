import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileCheck2, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PublicProof = {
  id: string;
  fullName: string;
  submittedDay: string;
  commission: number;
  createdAt: string;
};

function formatDay(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function WithdrawalProofFeedPage() {
  const { data: proofs = [], isLoading, isError } = useQuery<PublicProof[]>({
    queryKey: ["/api/withdrawal-proofs/public"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  return (
    <div className="site-page min-h-screen bg-background">
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              aria-label="Retour au compte"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Communauté Beko</p>
              <h1 className="text-2xl font-bold">Preuves de retrait</h1>
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto" data-testid="button-publish-withdrawal-proof">
            <Link href="/withdrawal-proofs/submit">
              <Upload className="mr-2 h-4 w-4" />
              Publier ma preuve
            </Link>
          </Button>
        </header>

        <p className="text-sm text-muted-foreground">
          Consultez les preuves validées et les gains attribués par l’administration.
        </p>

        {isError && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Impossible de charger les preuves validées. Actualisez la page et réessayez.
          </p>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Chargement des preuves validées…</CardContent>
          </Card>
        ) : proofs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <FileCheck2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-semibold">Aucune preuve validée pour le moment</h2>
              <p className="text-sm text-muted-foreground">
                Les preuves apparaîtront ici après leur validation par l’administration.
              </p>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4" aria-label="Preuves de retrait validées">
            {proofs.map((proof) => (
              <Card key={proof.id}>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{proof.fullName}</h2>
                      <p className="text-sm text-muted-foreground">
                        Validée · {formatDay(proof.submittedDay)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-primary/10 px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Gain attribué</p>
                      <p className="font-bold text-primary">
                        {proof.commission.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProofImage proofId={proof.id} kind="website" title="Capture du site" />
                    <ProofImage proofId={proof.id} kind="sms" title="Capture du SMS" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function ProofImage({
  proofId,
  kind,
  title,
}: {
  proofId: string;
  kind: "website" | "sms";
  title: string;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center gap-2 text-sm font-medium">
        <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </figcaption>
      <a
        href={`/api/withdrawal-proofs/${proofId}/image/${kind}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-32 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30"
      >
        <img
          src={`/api/withdrawal-proofs/${proofId}/image/${kind}`}
          alt={`${title} — ${proofId}`}
          className="max-h-80 w-full object-contain"
          loading="lazy"
        />
      </a>
    </figure>
  );
}