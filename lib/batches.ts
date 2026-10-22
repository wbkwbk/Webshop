import { BATCH_SIZE } from "./constants";

export type AllocationPreview = {
  closesBatch: boolean;
  batchesClosed: number;
  intoOpen: number;
  intoFollowing: number;
};

export function describeAllocation(
  openFilled: number,
  quantity: number,
  batchSize = BATCH_SIZE,
): AllocationPreview {
  const filled = Math.max(0, Math.min(batchSize, openFilled));
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { closesBatch: false, batchesClosed: 0, intoOpen: 0, intoFollowing: 0 };
  }
  const space = batchSize - filled;
  if (quantity < space) {
    return { closesBatch: false, batchesClosed: 0, intoOpen: quantity, intoFollowing: 0 };
  }
  const rest = quantity - space;
  const extraFull = Math.floor(rest / batchSize);
  return {
    closesBatch: true,
    batchesClosed: 1 + extraFull,
    intoOpen: space,
    intoFollowing: rest % batchSize,
  };
}

export function allocationCopy(openFilled: number, quantity: number) {
  const plan = describeAllocation(openFilled, quantity);
  if (!plan.closesBatch) {
    const after = openFilled + quantity;
    return `${after} of ${BATCH_SIZE} will be reserved. Payment stays closed until the hundred is full.`;
  }
  if (plan.intoFollowing === 0 && plan.batchesClosed === 1) {
    return `This fills the batch of ${BATCH_SIZE}. Everyone in it is asked to pay, and then the workshop produces the pieces.`;
  }
  if (plan.intoFollowing === 0) {
    return `This fills ${plan.batchesClosed} batches of ${BATCH_SIZE}. Payment opens for each of them.`;
  }
  return `${plan.intoOpen} ${plan.intoOpen === 1 ? "piece fills" : "pieces fill"} the current batch and open payment. ${plan.intoFollowing} start the next batch and stay reserved.`;
}
