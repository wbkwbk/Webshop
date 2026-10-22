import { PRODUCTION_AT } from "./constants";

export type AllocationPreview = {
  closesBatch: boolean;
  batchesClosed: number;
  intoOpen: number;
  intoFollowing: number;
};

export function describeAllocation(
  openFilled: number,
  quantity: number,
  batchSize = PRODUCTION_AT,
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

export function allocationCopy(alreadyReserved: number, quantity: number) {
  const after = Math.max(0, alreadyReserved) + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  if (after < PRODUCTION_AT) {
    return `${after} reserved after this. Production starts at ${PRODUCTION_AT}. You can reserve as many as you want.`;
  }
  if (alreadyReserved < PRODUCTION_AT) {
    return `This brings the total to ${after}. Production starts, and everyone who has reserved is asked to pay.`;
  }
  return `${after} are already reserved. Production is underway, so this reservation can be paid now.`;
}
