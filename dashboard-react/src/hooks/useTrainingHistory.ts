import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";

export interface HistoryRecord {
  epoch: number;
  train_loss: number;
  val_loss: number;
  lr: number | null;
}

export interface TrainingHistory {
  task: "clf" | "reg";
  records: HistoryRecord[];
  best_epoch: number;
  n_epochs: number;
  final_train_loss: number;
  final_val_loss: number;
  min_val_loss: number;
  train_val_gap_pct: number;
}

export function useTrainingHistory(task: "clf" | "reg") {
  const { model, ticker } = useDashboard();
  return useFetchJson<TrainingHistory>(
    `/data/${model}/${ticker}_${task}_history.json`
  );
}
