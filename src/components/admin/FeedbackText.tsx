import { cn } from "@/lib/utils";

/** Mensagem curta de sucesso/erro ao lado de uma ação. */
export function FeedbackText({ message, isError }: { message: string | null; isError: boolean }) {
  if (!message) return null;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn("animate-rise-in text-sm", isError ? "text-destructive" : "text-primary")}
    >
      {message}
    </p>
  );
}
