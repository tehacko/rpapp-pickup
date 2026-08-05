/** Typed conflict diagnostics from checkup apply (Part 4 / Part 6). */

export interface CheckupMovedLineDiagnostic {
  readonly lineId: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly expectedQuantity: number;
  readonly expectedStockOnHold: number;
  readonly liveQuantityInStock: number;
  readonly liveStockOnHold: number;
}

export interface CheckupHoldFloorDiagnostic {
  readonly lineId: string;
  readonly countedQuantity: number;
  readonly stockOnHold: number;
}

/** Live BE code is CHECKUP_MOVED_CONFLICT; CHECKUP_STOCK_MOVED accepted as legacy alias. */
export type InventoryConflictCode =
  | 'CHECKUP_MOVED_CONFLICT'
  | 'CHECKUP_STOCK_MOVED'
  | 'CHECKUP_BELOW_HOLD_CONFLICT';

export function isCheckupStockMovedCode(code: string): boolean {
  return code === 'CHECKUP_MOVED_CONFLICT' || code === 'CHECKUP_STOCK_MOVED';
}

export class InventoryConflictError extends Error {
  public readonly status: number;
  public readonly code: InventoryConflictCode;
  public readonly staleLines: readonly CheckupMovedLineDiagnostic[];
  public readonly holdFloorLines: readonly CheckupHoldFloorDiagnostic[];
  public readonly recoverable: boolean | undefined;
  public readonly nextAction: string | undefined;

  public constructor(
    message: string,
    options: {
      status: number;
      code: InventoryConflictCode;
      staleLines?: readonly CheckupMovedLineDiagnostic[];
      holdFloorLines?: readonly CheckupHoldFloorDiagnostic[];
      recoverable?: boolean;
      nextAction?: string;
    },
  ) {
    super(message);
    this.name = 'InventoryConflictError';
    this.status = options.status;
    this.code = options.code;
    this.staleLines = options.staleLines ?? [];
    this.holdFloorLines = options.holdFloorLines ?? [];
    this.recoverable = options.recoverable;
    this.nextAction = options.nextAction;
  }
}

export function isInventoryConflictError(err: unknown): err is InventoryConflictError {
  return err instanceof InventoryConflictError;
}
