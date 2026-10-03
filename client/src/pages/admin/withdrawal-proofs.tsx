import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, FileCheck2, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

type ProofReview = {
  id: string;
  userId: string;
  submittedDay: string;
  status: string;
  commission: number;
  adminNotes: string | null;
  createdAt: string;
  processedAt: string | null;
  user: { id: string; fullName: string; phone: string; country: string };
};

const statusLabels: Record<StatusFilter, string> = {
  pending: "En attente",
  approved: "Approuvées",
  rejected: "Refusées",
  all: "Toutes",
};

export default function AdminWithdrawalProofsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [commissions, setCommissions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: proofs = [], isLoading, isError } = useQuery<ProofReview[]>({
    queryKey: ["/api/admin/withdrawal-proofs", status],
    queryFn: async () => {
      const response = await fetch(`/api/admin/withdrawal-proofs?status=${status}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Impossible de charger les preuves.");
      return response.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      proofId,
      decision,
    }: {
      proofId: string;
      decision: "approve" | "reject";
    }) => {
      const endpoint = `/api/admin/withdrawal-proofs/${proofId}/${decision}`;
      const body = decision === "approve"
        ? { commission: Number(commissions[proofId] ?? 0) }
        : { adminNotes: notes[proofId] ?? "" };
      const response = await apiRequest("POST", endpoint, body);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "La décision n’a pas été enregistrée.");
      }
      return response.json();
    },
    onSuccess: (_result, variables) => {
      toast({
        title: variables.decision === "approve" ? "Preuve approuvée" : "Preuve refusée",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawal-proofs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawal-proofs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="site-page min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Retour à l’administration">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Administration</p>
            <h1 className="text-2xl font-bold">Preuves de retrait</h1>
          </div>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les preuves">
          {(Object.keys(statusLabels) as StatusFilter[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={status === item ? "default" : "outline"}
              aria-pressed={status === item}
              onClick={() => setStatus(item)}
            >
              {statusLabels[item]}
            </Button>
          ))}
        </div>

        {isError && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Impossible de charger les preuves. Actualisez la page et réessayez.
          </p>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Chargement des preuves…</p>
        ) : proofs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
              <FileCheck2 className="h-9 w-9" />
              Aucune preuve dans cette liste.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {proofs.map((proof) => (
              <Card key={proof.id}>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{proof.user.fullName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {proof.user.phone} · {proof.user.country}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Soumise le {new Date(`${proof.submittedDay}T00:00:00Z`).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>
                    <Badge variant={
                      proof.status === "approved"
                        ? "default"
                        : proof.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }>
                      {proof.status === "approved" ? "Approuvée" : proof.status === "rejected" ? "Refusée" : "En attente"}
                    </Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProofImage proofId={proof.id} kind="website" title="Capture du site" />
                    <ProofImage proofId={proof.id} kind="sms" title="Capture du SMS" />
                  </div>

                  {proof.status === "pending" ? (
                    <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor={`commission-${proof.id}`} className="text-sm font-medium">
                          Commission à créditer (FCFA)
                        </label>
                        <Input
                          id={`commission-${proof.id}`}
                          type="number"
                          min="0"
                          step="1"
                          value={commissions[proof.id] ?? ""}
                          onChange={(event) => setCommissions({
                            ...commissions,
                            [proof.id]: event.currentTarget.value,
                          })}
                          placeholder="0"
                          data-testid={`input-proof-commission-${proof.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`notes-${proof.id}`} className="text-sm font-medium">
                          Motif de refus (facultatif)
                        </label>
                        <Textarea
                          id={`notes-${proof.id}`}
                          value={notes[proof.id] ?? ""}
                          onChange={(event) => setNotes({
                            ...notes,
                            [proof.id]: event.currentTarget.value,
                          })}
                          maxLength={1000}
                          rows={2}
                          placeholder="Indiquez la raison si vous refusez la preuve."
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button
                          onClick={() => reviewMutation.mutate({ proofId: proof.id, decision: "approve" })}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-approve-proof-${proof.id}`}
                        >
                          {reviewMutation.isPending
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <Check className="mr-2 h-4 w-4" />}
                          Approuver et créditer
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => reviewMutation.mutate({ proofId: proof.id, decision: "reject" })}
                          disabled={reviewMutation.isPending}
                          data-testid={`button-reject-proof-${proof.id}`}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                      {proof.status === "approved"
                        ? `Commission créditée : ${proof.commission.toLocaleString("fr-FR")} FCFA`
                        : proof.adminNotes || "Aucun motif communiqué."}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProofImage({ proofId, kind, title }: { proofId: string; kind: "website" | "sms"; title: string }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <a
        href={`/api/withdrawal-proofs/${proofId}/image/${kind}`}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl border border-border bg-muted/30"
      >
        <img
          src={`/api/withdrawal-proofs/${proofId}/image/${kind}`}
          alt={title}
          className="max-h-96 w-full object-contain"
          loading="lazy"
        />
      </a>
    </figure>
  );
}