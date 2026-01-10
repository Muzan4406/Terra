import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { REFERRAL_TASKS, PRODUCT_TASK } from "@shared/schema";
import heroImage from "@assets/Img_2026_01_09_18_57_15_1768064264987.jpeg";

interface TaskStatus {
  referralTasks: { taskId: number; completed: boolean; claimed: boolean; currentCount: number }[];
  productTask: { completed: boolean; claimed: boolean; hasVip5: boolean };
  totalReferrals: number;
  totalRewards: number;
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
      <div className="min-h-screen bg-gray-100 pb-24">
        <div className="max-w-md mx-auto">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const totalReferrals = taskStatus?.totalReferrals || 0;
  const totalRewards = taskStatus?.totalRewards || 0;

  const allTasks = [
    ...REFERRAL_TASKS.map((task, index) => ({
      id: task.id,
      number: index + 1,
      description: task.description,
      reward: task.reward,
      objective: task.requiredInvestors,
      current: taskStatus?.referralTasks.find(t => t.taskId === task.id)?.currentCount || 0,
      completed: taskStatus?.referralTasks.find(t => t.taskId === task.id)?.completed || false,
      claimed: taskStatus?.referralTasks.find(t => t.taskId === task.id)?.claimed || false,
      type: "referral" as const,
    })),
    {
      id: 0,
      number: REFERRAL_TASKS.length + 1,
      description: PRODUCT_TASK.description,
      reward: PRODUCT_TASK.reward,
      objective: 1,
      current: taskStatus?.productTask.hasVip5 ? 1 : 0,
      completed: taskStatus?.productTask.completed || false,
      claimed: taskStatus?.productTask.claimed || false,
      type: "product" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-md mx-auto">
        <div className="relative">
          <img 
            src={heroImage} 
            alt="Tâches" 
            className="w-full h-48 object-cover"
          />
        </div>

        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <div className="flex-1 py-4 text-center border-r border-gray-200">
              <p className="text-3xl font-bold text-gray-800">{totalReferrals}</p>
              <p className="text-sm text-gray-500">Total des personnes</p>
            </div>
            <div className="flex-1 py-4 text-center">
              <p className="text-3xl font-bold text-gray-800">FCFA {totalRewards.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total des récompenses</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {allTasks.map((task) => (
            <div 
              key={`${task.type}-${task.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-lg font-bold text-gray-800">Tâche {task.number}</span>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{task.description.replace(` pour recevoir ${task.reward}F`, '')} :</p>
                    <p className="text-orange-500 font-semibold">FCFA {task.reward.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-between text-center mb-4">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-gray-800">{task.current}</p>
                    <p className="text-sm text-gray-500">Actuel</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-gray-800">{task.objective}</p>
                    <p className="text-sm text-gray-500">Objectif</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-gray-800">{task.current}/{task.objective}</p>
                    <p className="text-sm text-gray-500">Progression</p>
                  </div>
                </div>

                {task.claimed ? (
                  <button 
                    className="w-full py-3 bg-green-100 text-green-600 rounded-lg font-medium"
                    disabled
                  >
                    Réclamé
                  </button>
                ) : task.completed ? (
                  <button 
                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    onClick={() => claimMutation.mutate({ taskId: task.id, taskType: task.type })}
                    disabled={claimMutation.isPending}
                    data-testid={`button-claim-${task.type}-${task.id}`}
                  >
                    Recevoir la récompense
                  </button>
                ) : (
                  <button 
                    className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-medium"
                    disabled
                  >
                    En cours
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
