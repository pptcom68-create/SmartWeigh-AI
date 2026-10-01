import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Truck, 
  Building2, 
  Calendar, 
  CreditCard, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Eye, 
  Edit3, 
  FileSpreadsheet, 
  ExternalLink 
} from 'lucide-react';
import { PurchaseOrder, OrderRecord, StoreMerchant } from '../types';
import { reconcilePO } from '../utils/poReconciliation';

interface PODetailModalProps {
  isOpen: boolean;
  po: PurchaseOrder | null;
  orders: OrderRecord[];
  onClose: () => void;
  onEditPO: (po: PurchaseOrder) => void;
  onInspectOrder: (order: OrderRecord) => void;
  onAddTicketForPO: (po: PurchaseOrder) => void;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({
  isOpen,
  po,
  orders,
  onClose,
  onEditPO,
  onInspectOrder,
  onAddTicketForPO
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'tickets'>('document');

  if (!isOpen || !po) return null;

  const recon = reconcilePO(po, orders);

  const fmtCurrency = (val: number) => {
    return '฿' + (val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn border border-slate-200">
        
        {/* Top Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              PO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">{po.poNumber}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  recon.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  recon.status === 'partially_delivered' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  recon.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {recon.status === 'completed' ? '✓ ส่งมอบครบแล้ว' :
                   recon.status === 'partially_delivered' ? '⏳ ส่งมอบบางส่วน' :
                   recon.status === 'cancelled' ? '✕ ยกเลิก' : '⏱️ รอส่งมอบ'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {po.storeName} · {po.projectId || 'โครงการทั่วไป'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditPO(po)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>แก้ไข PO</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบสั่งซื้อ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('document')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'document'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ใบสั่งซื้อต้นฉบับ (PO Document)</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'tickets'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>การตัดยอดส่งมอบ & ตั๋วขนส่ง (Delivery Matching)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-bold tabular-nums">
              {recon.linkedOrders.length} ตั๋ว
            </span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* VIEW TAB 1: FORMAL PURCHASE ORDER SLIP */}
          {activeTab === 'document' && (
            <div className="bg-white border border-slate-300 rounded-xl p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
              
              {/* Document Header */}
              <div className="flex flex-wrap items-start justify-between border-b border-slate-200 pb-5 gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    ใบสั่งซื้อสินค้า (PURCHASE ORDER)
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    ระบบบริหารการจัดซื้อและการขนส่งวัสดุก่อสร้างอัตโนมัติ
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-slate-500">เลขที่ / PO NO.</div>
                  <div className="text-base font-bold text-blue-900">{po.poNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    วันที่: <span className="text-slate-900 font-medium">{po.orderDate}</span>
                  </div>
                  {po.deliveryDueDate && (
                    <div className="text-xs text-slate-500">
                      กำหนดส่งมอบ: <span className="text-slate-900 font-medium">{po.deliveryDueDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor & Project Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Vendor Column */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    ผู้จำหน่าย / ผู้ขาย (VENDOR)
                  </span>
                  <p className="text-sm font-bold text-slate-900">{po.storeName}</p>
                  <p className="text-slate-600">หมวดหมู่: {po.category}</p>
                  <p className="text-slate-600">เงื่อนไขชำระเงิน: {po.creditTerms || 'ตามตกลง'}</p>
                </div>

                {/* Delivery & Project Column */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    ข้อมูลโครงการ & สถานที่จัดส่ง (DELIVERY DETAILS)
                  </span>
                  <p className="text-sm font-bold text-slate-900">{po.projectId || 'โครงการหลัก'}</p>
                  <p className="text-slate-600">สถานที่ส่งมอบ: {po.deliveryLocation || 'หน้างานโครงการ'}</p>
                  <p className="text-slate-600">ผู้สั่งซื้อ: {po.orderedBy || '-'}</p>
                </div>

              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">รายการสินค้า (DESCRIPTION)</th>
                      <th className="p-3 w-32">สเปก / CODE</th>
                      <th className="p-3 w-28 text-right">ปริมาณ</th>
                      <th className="p-3 w-24 text-center">หน่วย</th>
                      <th className="p-3 w-32 text-right">ราคา/หน่วย</th>
                      <th className="p-3 w-36 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {po.items && po.items.length > 0 ? (
                      po.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">{item.itemDescription}</td>
                          <td className="p-3 text-slate-500 font-mono">{item.specCode || '-'}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                            {(Number(item.orderedQty) || 0).toLocaleString('th-TH')}
                          </td>
                          <td className="p-3 text-center text-slate-600">{item.unit}</td>
                          <td className="p-3 text-right font-mono text-slate-700 tabular-nums">
                            {fmtCurrency(item.unitPrice)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {fmtCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          ไม่มีรายการสินค้า
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={3} className="p-3.5 text-right">รวมทั้งสิ้น (TOTAL AMOUNT):</td>
                      <td className="p-3.5 text-right font-mono text-blue-900 tabular-nums">
                        {po.totalQty.toLocaleString('th-TH')}
                      </td>
                      <td></td>
                      <td></td>
                      <td className="p-3.5 text-right font-mono text-base text-emerald-800 tabular-nums">
                        {fmtCurrency(po.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes & Terms */}
              {po.notes && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">หมายเหตุและเงื่อนไข:</span>
                  <p className="text-amber-800">{po.notes}</p>
                </div>
              )}

              {/* Signature Blocks */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center border-t border-slate-200">
                <div className="space-y-12">
                  <div className="text-slate-500 font-medium">ลงชื่อ .................................................... ผู้สั่งซื้อ</div>
                  <div className="text-slate-800 font-semibold">( {po.orderedBy || '....................................................'} )</div>
                  <div className="text-slate-400 text-[11px]">วันที่: ......./......./...........</div>
                </div>
                <div className="space-y-12">
                  <div className="text-slate-500 font-medium">ลงชื่อ .................................................... ผู้อนุมัติ</div>
                  <div className="text-slate-800 font-semibold">( {po.approvedBy || 'ผู้มีอำนาจลงนาม'} )</div>
                  <div className="text-slate-400 text-[11px]">วันที่: ......./......./...........</div>
                </div>
              </div>

            </div>
          )}

          {/* VIEW TAB 2: DELIVERY RECONCILIATION & TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              
              {/* Progress Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>สถานะการส่งมอบและการตัดยอดตาม PO ({po.poNumber})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      ตรวจสอบปริมาณที่สั่งซื้อเทียบกับตั๋วชั่งและบิลส่งของจริงที่บันทึกเข้ามา
                    </p>
                  </div>

                  <button
                    onClick={() => onAddTicketForPO(po)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ บันทึกตั๋วส่งของตัดยอด PO นี้</span>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      ความคืบหน้าการส่งมอบ: {recon.percentageDelivered}%
                    </span>
                    <span className="font-mono text-slate-600">
                      ส่งแล้ว <strong className="text-slate-900">{recon.deliveredQty.toLocaleString('th-TH')}</strong> / สั่งซื้อ {po.totalQty.toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        recon.status === 'completed' ? 'bg-emerald-500' :
                        recon.percentageDelivered > 50 ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, recon.percentageDelivered)}%` }}
                    />
                  </div>
                </div>

                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500">ยอดเงินตาม PO ทั้งหมด</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{fmtCurrency(po.totalAmount)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ปริมาณ {po.totalQty.toLocaleString('th-TH')}</div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div className="text-[11px] text-emerald-800 font-semibold">ส่งมอบเข้ามาแล้ว</div>
                    <div className="text-base font-bold text-emerald-700 mt-0.5">{fmtCurrency(recon.deliveredAmount)}</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">ปริมาณ {recon.deliveredQty.toLocaleString('th-TH')}</div>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div className="text-[11px] text-amber-800 font-semibold">คงเหลือยังไม่ส่งมอบ</div>
                    <div className="text-base font-bold text-amber-700 mt-0.5">{fmtCurrency(recon.remainingAmount)}</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">เหลืออีก {recon.remainingQty.toLocaleString('th-TH')}</div>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    <div className="text-[11px] text-blue-800 font-semibold">จำนวนตั๋ว/เที่ยวรถ</div>
                    <div className="text-base font-bold text-blue-700 mt-0.5">{recon.linkedOrders.length} เที่ยว</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">อ้างอิงเลข PO เดียวกัน</div>
                  </div>
                </div>

              </div>

              {/* Linked Inbound Tickets Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    รายการตั๋วชั่งและบิลส่งของที่ตัดยอด PO นี้ ({recon.linkedOrders.length} รายการ)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    จับคู่อัตโนมัติจากคอลัมน์ [4. PO] ในตารางหลัก
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">เลข TR</th>
                        <th className="p-2.5">วันที่ส่ง</th>
                        <th className="p-2.5">DO / ตั๋ว</th>
                        <th className="p-2.5">ทะเบียนรถ</th>
                        <th className="p-2.5">รายการสินค้า</th>
                        <th className="p-2.5 text-right">ปริมาณส่งมอบ</th>
                        <th className="p-2.5 text-right">มูลค่าที่ตัดยอด</th>
                        <th className="p-2.5 text-center">ดูตั๋ว</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {recon.linkedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            ยังไม่มีตั๋วชั่งหรือใบส่งของที่อ้างอิงเลขที่ {po.poNumber}
                          </td>
                        </tr>
                      ) : (
                        recon.linkedOrders.map(ord => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-blue-600">{ord.col1}</td>
                            <td className="p-2.5 font-mono text-slate-600">{ord.col7}</td>
                            <td className="p-2.5 font-mono text-slate-700">{ord.col6 || '-'}</td>
                            <td className="p-2.5 font-mono font-medium text-slate-800 bg-slate-50">{ord.col10 || '-'}</td>
                            <td className="p-2.5 font-semibold text-slate-900 truncate max-w-[160px]">{ord.col11}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                              {Number(ord.col22) > 0 ? `${ord.col22} ${ord.col23}` : `${(Number(ord.col15) / 1000).toFixed(2)} ตัน`}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                              {fmtCurrency(Number(ord.col29) || Number(ord.col25) || 0)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  onClose();
                                  onInspectOrder(ord);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                                title="เปิดดูตั๋วใบนี้"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            สร้างเมื่อ: <span className="font-mono text-slate-700">{new Date(po.createdAt).toLocaleDateString('th-TH')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
