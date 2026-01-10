import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { MoneyDisplay } from "@/components/money-display";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Gift, Users, Check, Lock, ShoppingBag } from "lucide-react";
import { REFERRAL_TASKS, PRODUCT_TASK } from "@shared/schema";

interface TaskStatus {
  referralTasks: { taskId: number; completed: boolean; claimed: boolean; currentCount: number }[];
  productTask: { completed: boolean; claimed: boolean; hasVip3: boolean };
}

export default function TasksPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const { data: taskStatus, isLoading } = useQuery<TaskStatus>({
    queryKey: ["/api/tasks/status"],
  });

  const claimMutation = useMutation({
    mutationFn: async ({ taskId, taskType }: { taskId: number; taskType: string }) => {
      const res = await apiRequest("POST", "/api/tasks/claim", { taskId, taskType });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Récompense reçue!", 
        description: `${data.reward} FCFA ont été crédités sur votre compte.` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/status"] });
      refetchUser();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <header className="p-4 bg-card border-b border-card-border">
          <h1 className="text-xl font-bold">Tâches</h1>
          <p className="text-sm text-muted-foreground">Complétez des tâches pour gagner des récompenses</p>
        </header>

        <div className="p-4 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{PRODUCT_TASK.description}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Récompense: <MoneyDisplay amount={PRODUCT_TASK.reward} className="text-primary font-semibold" />
                  </p>
                </div>
                <div>
                  {taskStatus?.productTask.claimed ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" /> Réclamé
                    </Badge>
                  ) : taskStatus?.productTask.completed ? (
                    <Button
                      size="sm"
                      onClick={() => claimMutation.mutate({ taskId: 0, taskType: "product" })}
                      disabled={claimMutation.isPending}
                      data-testid="button-claim-product"
                    >
                      <Gift className="h-4 w-4 mr-1" />
                      Recevoir
                    </Button>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" /> Non complété
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="font-semibold text-lg flex items-center gap-2 mt-6">
            <Users className="h-5 w-5 text-primary" />
            Tâches de parrainage
          </h2>

          <div className="space-y-3">
            {REFERRAL_TASKS.map((task) => {
              const status = taskStatus?.referralTasks.find((t) => t.taskId === task.id);
              const currentCount = status?.currentCount || 0;
              const isCompleted = status?.completed || false;
              const isClaimed = status?.claimed || false;

              return (
                <Card key={task.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{task.description}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Progression: {currentCount}/{task.requiredInvestors}
                          </span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${Math.min((currentCount / task.requiredInvestors) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-primary font-medium mt-1">
                          +<MoneyDisplay amount={task.reward} />
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {isClaimed ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" /> Réclamé
                          </Badge>
                        ) : isCompleted ? (
                          <Button
                            size="sm"
                            onClick={() => claimMutation.mutate({ taskId: task.id, taskType: "referral" })}
                            disabled={claimMutation.isPending}
                            data-testid={`button-claim-${task.id}`}
                          >
                            <Gift className="h-4 w-4 mr-1" />
                            Recevoir
                          </Button>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Lock className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
