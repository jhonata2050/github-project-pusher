import { DeployState, DeploymentSession, DeploymentStepLog, DeploymentDiagnostic } from "./types";

/**
 * Matriz de transições permitidas da Máquina de Estados
 */
const VALID_TRANSITIONS: Record<DeployState, DeployState[]> = {
  QUEUED: ["VALIDATING", "FAILED"],
  VALIDATING: ["BUILDING", "STARTING", "FAILED"],
  BUILDING: ["STARTING", "FAILED"],
  STARTING: ["HEALTH_CHECKING", "VERIFYING_DOMAIN", "READY", "FAILED"],
  HEALTH_CHECKING: ["VERIFYING_DOMAIN", "READY", "FAILED"],
  VERIFYING_DOMAIN: ["READY", "FAILED"],
  READY: ["QUEUED", "VALIDATING", "BUILDING", "STARTING", "RESTARTING", "STOPPED"],
  FAILED: ["QUEUED", "VALIDATING", "BUILDING", "STARTING"],
  RESTARTING: ["HEALTH_CHECKING", "VERIFYING_DOMAIN", "READY", "FAILED"],
  STOPPED: ["QUEUED", "STARTING", "VALIDATING"],
  ROLLING_BACK: ["READY", "FAILED"],
};

export class DeploymentStateMachine {
  private session: DeploymentSession;
  private stateStartTime: number;

  constructor(session: DeploymentSession) {
    this.session = session;
    this.stateStartTime = Date.now();
  }

  public getState(): DeployState {
    return this.session.currentState;
  }

  public getSession(): DeploymentSession {
    return this.session;
  }

  public canTransition(targetState: DeployState): boolean {
    const current = this.session.currentState;
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(targetState);
  }

  public transition(targetState: DeployState, message: string): DeploymentSession {
    if (!this.canTransition(targetState)) {
      const errorMsg = `Transição de estado inválida: de '${this.session.currentState}' para '${targetState}'.`;
      console.warn(`[DeploymentStateMachine] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const now = Date.now();
    const durationMs = now - this.stateStartTime;

    const stepLog: DeploymentStepLog = {
      state: targetState,
      timestamp: new Date().toISOString(),
      message,
      isSuccess: targetState !== "FAILED",
      durationMs,
    };

    this.session.previousState = this.session.currentState;
    this.session.currentState = targetState;
    this.session.steps.push(stepLog);
    this.stateStartTime = now;

    if (targetState === "READY" || targetState === "FAILED") {
      this.session.completedAt = new Date().toISOString();
    }

    return this.session;
  }

  public fail(diagnostic: DeploymentDiagnostic, message?: string): DeploymentSession {
    this.session.diagnostic = diagnostic;
    const failMessage = message || diagnostic.description || "Ocorreu uma falha durante o processo de deploy.";
    return this.transition("FAILED", failMessage);
  }

  public isFinished(): boolean {
    return this.session.currentState === "READY" || this.session.currentState === "FAILED";
  }

  public isSuccessful(): boolean {
    return this.session.currentState === "READY";
  }
}
