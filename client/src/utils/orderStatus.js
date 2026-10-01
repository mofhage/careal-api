// Pure functions — maps API values to UI state

const STATUS_MAP = {
  paid:                1,
  assigned:            2,
  in_progress:         2,
  ready_for_delivery:  3,
  ready_for_pickup:    3,
  delivered:           4,
  collected:           4,
};

export function statusToStage(status) {
  if (Object.prototype.hasOwnProperty.call(STATUS_MAP, status)) {
    return STATUS_MAP[status];
  }
  return 1;
}

export function getDeliveryLabel(deliveryMethod) {
  if (deliveryMethod === 'agent_delivery') return 'Delivered';
  if (deliveryMethod === 'personal_collection') return 'Collected';
  return 'Delivered / Collected';
}

export function getBadgeVariant(status) {
  // Returns 'complete' | 'pending' | 'na'
  if (status === 'Delivered' || status === 'Done') return 'complete';
  if (status === 'N/A') return 'na';
  return 'pending';
}
