import type { LiveSnapshot, LiveStep, LiveWorkflow } from '@/lib/live-types';

export function findWorkflow(snapshot: LiveSnapshot, workflowId: string): LiveWorkflow | undefined {
  return snapshot.workflows.find((workflow) => workflow.id === workflowId);
}

export function findStep(
  snapshot: LiveSnapshot,
  workflowId: string,
  stepId: string
): { workflow: LiveWorkflow; step: LiveStep } | undefined {
  const workflow = findWorkflow(snapshot, workflowId);
  if (!workflow) {
    return undefined;
  }

  const step = workflow.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    return undefined;
  }

  return { workflow, step };
}
