import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileCheck2, Loader2, Upload, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type ProofRecord = {
  id: string;
  submittedDay: string;
  status: "pending" | "approved" | "rejected" | string;
  commission: number;
  adminNotes: string | null;
  createdAt: string;
  processedAt: string | null;
};

type ProofOverview = {
  eligible: boolean;
  approvedWithdrawals: number;
  submittedToday: boolean;
  proofs: ProofRecord[];
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

export default function WithdrawalProofsPage() {
  const { toast } = useToast();
  const [websiteProof, setWebsiteProof] = useState<File | null>(null);
  const [smsProof, setSmsProof] = useState<File | null>(null);
  const [websitePreview, setWebsitePreview] = useState("");
  const [smsPreview, setSmsPreview] = useState("");

  const { data, isLoading, isError } = useQuery<ProofOverview>({
    queryKey: ["/api/withdrawal-proofs"],
  });

  useEffect(() => {
    if (!websiteProof) {
      setWebsitePreview("");
      return;
    }
    const url = URL.createObjectURL(websiteProof);
    setWebsitePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [websiteProof]);

  useEffect(() => {
    if (!smsProof) {
      setSmsPreview("");
      return;
    }
    const url = URL.createObjectURL(smsProof);
    setSmsPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [smsProof]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!websiteProof || !smsProof) {
        throw new Error("Ajoutez les deux captures demandées.");
      }
      const formData = new FormData();
      formData.append("websiteProof", websiteProof);
      formData.append("smsProof", smsProof);
      const response = await fetch("/api/withdrawal-proofs", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "La preuve n’a pas pu être envoyée.");
      return result;
    },
    onSuccess: () => {
      setWebsiteProof(null);
      setSmsProof(null);
      toast({ title: "Preuve envoyée", description: "L’équipe va vérifier les deux captures." });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawal-proofs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Envoi impossible", description: error.message, variant: "destructive" });
    },
  });

  const validateFile = (file: File | undefined, setFile: (file: File | null) => void) => {
    if (!file) {
      setFile(null);
      return;
    }
    if (!acceptedImageTypes.includes(file.type) || file.size > maxFileSize) {
      setFile(null);
      toast({
        title: "Image non valide",
        description: "Utilisez un fichier JPG, PNG ou WebP de 5 Mo maximum.",
        variant: "destructive",
      });
      return;
    }
    setFile(file);
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Approuvée";
    if (status === "rejected") return "Refusée";
    return "En attente";
  };

  return (
    <div className="site-page min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 sm:px-6">
        <header className="flex items-center gap-3">
          <Link href="/withdrawal-proofs" className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Retour aux preuves de retrait">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Vérification quotidienne</p>
            <h1 className="text-2xl font-bold">Publier ma preuve</h1>
          </div>
        </header>

        <Card className="border-primary/15 bg-card shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <h2 className="font-semibold">Soumettez vos deux captures</h2>
                <p className="text-sm text-muted-foreground">
                  Vous devez avoir au moins un retrait approuvé. Une seule soumission est autorisée par jour, selon l’heure GMT.
                </p>
              </div>
            </div>
            {data && (
              <p className="text-sm text-muted-foreground">
                Retraits approuvés : <span className="font-semibold text-foreground">{data.approvedWithdrawals}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {isError && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Impossible de charger vos soumissions. Actualisez la page et réessayez.
          </p>
        )}

        {!isLoading && data?.eligible && !data.submittedToday && (
          <Card>
            <CardContent className="space-y-5 p-5">
              <ProofPicker
                title="Capture du site"
                description="Montrez le retrait effectué sur le site concerné."
                preview={websitePreview}
                file={websiteProof}
                onChange={(file) => validateFile(file, setWebsiteProof)}
                inputId="website-proof"
              />
              <ProofPicker
                title="Capture du SMS"
                description="Montrez le SMS de confirmation correspondant."
                preview={smsPreview}
                file={smsProof}
                onChange={(file) => validateFile(file, setSmsProof)}
                inputId="sms-proof"
              />
              <Button
                className="w-full"
                disabled={!websiteProof || !smsProof || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</>
                  : "Envoyer pour vérification"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !data?.eligible && (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              La soumission sera disponible après l’approbation de votre premier retrait.
            </CardContent>
          </Card>
        )}

        {data?.submittedToday && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
            <Clock3 className="h-5 w-5 shrink-0" />
            Votre preuve du jour a été reçue. Vous pourrez envoyer la suivante demain.
          </div>
        )}

        <section className="space-y-3" aria-labelledby="proof-history-title">
          <h2 id="proof-history-title" className="text-lg font-bold">Historique des soumissions</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : data?.proofs.length ? (
            data.proofs.map((proof) => (
              <Card key={proof.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">
                      {new Date(`${proof.submittedDay}T00:00:00Z`).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    {proof.adminNotes && <p className="mt-1 text-sm text-muted-foreground">{proof.adminNotes}</p>}
                    {proof.status === "approved" && (
                      <p className="mt-1 text-sm font-medium text-primary">
                        Commission : {proof.commission.toLocaleString("fr-FR")} FCFA
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    proof.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : proof.status === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-900"
                  }`}>
                    {statusLabel(proof.status)}
                  </span>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Aucune preuve envoyée.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function ProofPicker({
  title,
  description,
  preview,
  file,
  onChange,
  inputId,
}: {
  title: string;
  description: string;
  preview: string;
  file: File | null;
  onChange: (file: File | undefined) => void;
  inputId: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold">{title}</label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <label
        htmlFor={inputId}
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground hover:bg-muted/60"
      >
        <Upload className="h-5 w-5 text-primary" />
        <span>{file?.name ?? "Choisir une capture (JPG, PNG, WebP)"}</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => onChange(event.currentTarget.files?.[0])}
      />
      {preview && (
        <img src={preview} alt={`Aperçu — ${title}`} className="max-h-64 w-full rounded-xl border object-contain" />
      )}
    </div>
  );
}