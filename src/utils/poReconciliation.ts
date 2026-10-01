import { OrderRecord, PurchaseOrder, POReconciliation, POStatus } from '../types';

/**
 * Reconciles a Purchase Order against inbound tickets/bills (OrderRecord)
 * Matching logic: OrderRecord.col4 (PO Number) matches PurchaseOrder.poNumber (case-insensitive)
 */
export function reconcilePO(po: PurchaseOrder, orders: OrderRecord[]): POReconciliation {
  const normalizedPoNum = (po.poNumber || '').trim().toLowerCase();
  
  if (!normalizedPoNum) {
    return {
      po,
      linkedOrders: [],
      deliveredQty: 0,
      deliveredAmount: 0,
      remainingQty: po.totalQty,
      remainingAmount: po.totalAmount,
      percentageDelivered: 0,
      isOverDelivered: false,
      status: po.status || 'pending'
    };
  }

  // Find all orders that reference this PO number
  const linkedOrders = orders.filter(ord => {
    const ordPo = (ord.col4 || '').trim().toLowerCase();
    return ordPo === normalizedPoNum;
  });

  // Calculate total delivered quantity and delivered amount
  let deliveredQty = 0;
  let deliveredAmount = 0;

  linkedOrders.forEach(ord => {
    const qty = Number(ord.col22) || (Number(ord.col15) > 0 ? Number(ord.col15) / 1000 : 0);
    const amount = Number(ord.col29) || Number(ord.col25) || 0;
    deliveredQty += qty;
    deliveredAmount += amount;
  });

  const totalOrderedQty = po.totalQty || 1;
  const percentageDelivered = Math.min(100, Math.round((deliveredQty / totalOrderedQty) * 100));
  const remainingQty = Math.max(0, po.totalQty - deliveredQty);
  const remainingAmount = Math.max(0, po.totalAmount - deliveredAmount);
  const isOverDelivered = deliveredQty > po.totalQty;

  // Derive status
  let status: POStatus = po.status;
  if (po.status !== 'cancelled') {
    if (deliveredQty <= 0) {
      status = 'pending';
    } else if (deliveredQty >= po.totalQty) {
      status = 'completed';
    } else {
      status = 'partially_delivered';
    }
  }

  return {
    po,
    linkedOrders,
    deliveredQty,
    deliveredAmount,
    remainingQty,
    remainingAmount,
    percentageDelivered,
    isOverDelivered,
    status
  };
}

/**
 * Reconciles a list of Purchase Orders against orders
 */
export function reconcileAllPOs(pos: PurchaseOrder[], orders: OrderRecord[]): POReconciliation[] {
  return pos.map(po => reconcilePO(po, orders));
}
