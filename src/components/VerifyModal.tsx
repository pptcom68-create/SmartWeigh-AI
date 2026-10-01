import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  FileText,
  Truck,
  Boxes,
  Receipt,
  Scale,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';
import { OrderRecord, StoreMerchant, DocumentType } from '../types';

interface VerifyModalProps {
  isOpen: boolean;
  orderData: Partial<OrderRecord> | null;
  billImage: string | null;
  storeSuggestion?: Partial<StoreMerchant>;
  stores: StoreMerchant[];
  onClose: () => void;
  onSaveOrder: (order: OrderRecord, storeToSave?: StoreMerchant) => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
  isOpen,
  orderData,
  billImage,
  storeSuggestion,
  stores,
  onClose,
  onSaveOrder
}) => {
  const [zoom, setZoom] = useState(1);
  const [form, setForm] = useState<Partial<OrderRecord>>({});
  const [saveToStoreDirectory, setSaveToStoreDirectory] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('delivery_order');
  const [showAllCols, setShowAllCols] = useState(false);

  useEffect(() => {
    if (orderData) {
      setForm({ ...orderData });

      // Intelligent detection of document type if not specified
      let detectedType: DocumentType = orderData.docType || 'delivery_order';
      if (!orderData.docType) {
        const netO = Number(orderData.col13) || Number(orderData.col15) || 0;
        const cat = (orderData.col3 || '').toLowerCase();
        const item = (orderData.col11 || '').toLowerCase();
        const unit = (orderData.col23 || '').toLowerCase();
        const doNum = (orderData.col6 || '').toLowerCase();

        if (cat.includes('คอนกรีต') || item.includes('คอนกรีต') || unit.includes('คิว') || unit.includes('m3')) {
          detectedType = 'concrete';
        } else if (netO > 0 || cat.includes('หิน') || cat.includes('ดิน') || cat.includes('ทราย') || item.includes('หิน')) {
          detectedType = 'weighbridge';
        } else if (doNum.includes('inv') || doNum.includes('tax') || item.includes('ภาษี')) {
          detectedType = 'tax_invoice';
        } else {
          detectedType = 'delivery_order';
        }
      }

      setSelectedDocType(detectedType);
    }
    setZoom(1);
    setShowAllCols(false);
  }, [orderData, isOpen]);

  if (!isOpen || !orderData) return null;

  // Determine which zones are relevant for the current document type
  const isWeighbridge = selectedDocType === 'weighbridge' || selectedDocType === 'full_logistics';
  const showWeightsOrigin = showAllCols || isWeighbridge;
  const showWeightsDest = showAllCols || selectedDocType === 'full_logistics' || (isWeighbridge && (Number(form.col18) > 0 || Number(form.col20) > 0));

  // Auto-calculation functions
  const handleWeightChange = (field: 'col13' | 'col14' | 'col18' | 'col19', value: number) => {
    const nextForm = { ...form, [field]: value };

    // Zone 3: Net Origin = Gross - Tare
    const grossO = Number(field === 'col13' ? value : nextForm.col13) || 0;
    const tareO = Number(field === 'col14' ? value : nextForm.col14) || 0;
    const netO = Math.max(0, grossO - tareO);
    nextForm.col15 = netO;

    // Zone 4: Net Dest = Dest Gross - Dest Tare
    const grossD = Number(field === 'col18' ? value : nextForm.col18) || 0;
    const tareD = Number(field === 'col19' ? value : nextForm.col19) || 0;
    const netD = Math.max(0, grossD - tareD);
    nextForm.col20 = netD;

    // Weight Diff
    if (netO > 0 && netD > 0) {
      nextForm.col21 = netO - netD;
    }

    // Auto-update quantity if unit is tons
    const unit = nextForm.col23 || 'ตัน';
    if (unit.includes('ตัน') && netO > 0 && (!nextForm.col22 || nextForm.col22 === 0)) {
      nextForm.col22 = Number((netO / 1000).toFixed(2));
    }

    setForm(nextForm);
    recalculateFinancials(nextForm);
  };

  const handleFinancialChange = (field: 'col22' | 'col24' | 'col27' | 'col31' | 'col33' | 'col35', value: number) => {
    const nextForm = { ...form, [field]: value };
    recalculateFinancials(nextForm);
  };

  const recalculateFinancials = (currentForm: Partial<OrderRecord>) => {
    const qty = Number(currentForm.col22) || 0;
    const price = Number(currentForm.col24) || 0;
    const goodsTotal = qty * price;
    currentForm.col25 = Number(goodsTotal.toFixed(2));

    const freightRate = Number(currentForm.col27) || 0;
    const freightTotal = qty * freightRate;
    currentForm.col28 = Number(freightTotal.toFixed(2));

    const grandTotal = goodsTotal + freightTotal;
    currentForm.col29 = Number(grandTotal.toFixed(2));

    const paidSeller = Number(currentForm.col31) || 0;
    const paidFreight = Number(currentForm.col33) || 0;
    currentForm.col32 = Number(Math.max(0, goodsTotal - paidSeller).toFixed(2));
    currentForm.col34 = Number(Math.max(0, freightTotal - paidFreight).toFixed(2));

    const totalPaid = Number(currentForm.col35) !== undefined && Number(currentForm.col35) > 0 
      ? Number(currentForm.col35) 
      : paidSeller + paidFreight;
    currentForm.col35 = Number(totalPaid.toFixed(2));
    currentForm.col36 = Number(Math.max(0, grandTotal - totalPaid).toFixed(2));

    setForm({ ...currentForm });
  };

  const handleTextChange = (field: keyof OrderRecord, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDocTypeSelect = (docType: DocumentType) => {
    setSelectedDocType(docType);
    const updated = { ...form, docType };

    // Auto-adjust default unit or vehicle based on doc type
    if (docType === 'concrete') {
      if (!updated.col23 || updated.col23 === 'ตัน') updated.col23 = 'คิว';
      if (!updated.col26) updated.col26 = 'รถโม่คอนกรีต';
      if (!updated.col3) updated.col3 = 'งานคอนกรีตผสมเสร็จ';
    } else if (docType === 'delivery_order') {
      if (!updated.col23 || updated.col23 === 'ตัน') updated.col23 = 'รายการ';
      if (!updated.col26) updated.col26 = 'สิบล้อ/หกล้อ';
    } else if (docType === 'weighbridge') {
      if (!updated.col23) updated.col23 = 'ตัน';
      if (!updated.col26) updated.col26 = 'พ่วง 18 ล้อ';
      if (!updated.col3) updated.col3 = 'งานหิน/ดิน/ทราย';
    }

    setForm(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalizedOrder: OrderRecord = {
      id: form.id || 'ord-' + Date.now(),
      docType: selectedDocType,
      col1: form.col1 || 'TR-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      col2: form.col2 || 'โครงการทั่วไป',
      col3: form.col3 || (selectedDocType === 'concrete' ? 'คอนกรีต' : 'ทั่วไป'),
      col4: form.col4 || '',
      col5: form.col5 || '',
      col6: form.col6 || '',
      col7: form.col7 || new Date().toISOString().split('T')[0],
      col8: form.col8 || 'ผู้จำหน่ายไม่ระบุชื่อ',
      col9: form.col9 || '',
      col10: form.col10 || '',
      col11: form.col11 || 'วัสดุก่อสร้าง',
      col12: form.col12 || '',
      col13: showWeightsOrigin ? (Number(form.col13) || 0) : 0,
      col14: showWeightsOrigin ? (Number(form.col14) || 0) : 0,
      col15: showWeightsOrigin ? (Number(form.col15) || 0) : 0,
      col16: form.col16 || '',
      col17: form.col17 || '',
      col18: showWeightsDest ? (Number(form.col18) || 0) : 0,
      col19: showWeightsDest ? (Number(form.col19) || 0) : 0,
      col20: showWeightsDest ? (Number(form.col20) || 0) : 0,
      col21: showWeightsDest ? (Number(form.col21) || 0) : 0,
      col22: Number(form.col22) || 1,
      col23: form.col23 || (selectedDocType === 'concrete' ? 'คิว' : 'ตัน'),
      col24: Number(form.col24) || 0,
      col25: Number(form.col25) || 0,
      col26: form.col26 || '',
      col27: Number(form.col27) || 0,
      col28: Number(form.col28) || 0,
      col29: Number(form.col29) || 0,
      col30: form.col30 || 'โอนเงิน',
      col31: Number(form.col31) || 0,
      col32: Number(form.col32) || 0,
      col33: Number(form.col33) || 0,
      col34: Number(form.col34) || 0,
      col35: Number(form.col35) || 0,
      col36: Number(form.col36) || 0,
      col37: form.col37 || '',
      col38: form.col38 || '',
      image: billImage || form.image || null,
      aiExtracted: true,
      status: 'verified',
      createdAt: form.createdAt || new Date().toISOString()
    };

    // Prepare Store/Merchant object if requested
    let storeToSave: StoreMerchant | undefined;
    if (saveToStoreDirectory && finalizedOrder.col8) {
      const existingStore = stores.find(
        s => s.name.trim().toLowerCase() === finalizedOrder.col8.trim().toLowerCase()
      );

      if (!existingStore) {
        storeToSave = {
          id: 'store-' + Date.now(),
          name: finalizedOrder.col8,
          category: finalizedOrder.col3 || storeSuggestion?.category || 'ทั่วไป',
          taxId: storeSuggestion?.taxId || '',
          phone: storeSuggestion?.phone || '',
          contactPerson: storeSuggestion?.contactPerson || '',
          address: storeSuggestion?.address || '',
          creditTerms: finalizedOrder.col30 || 'เครดิต 30 วัน',
          totalOrders: 1,
          totalPurchases: finalizedOrder.col29,
          totalPaid: finalizedOrder.col35,
          totalDebt: finalizedOrder.col36,
          lastOrderDate: finalizedOrder.col7,
          primaryGoods: [finalizedOrder.col11],
          notes: 'บันทึกอัตโนมัติจากการสแกนบิล'
        };
        finalizedOrder.storeId = storeToSave.id;
      } else {
        finalizedOrder.storeId = existingStore.id;
      }
    }

    onSaveOrder(finalizedOrder, storeToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-[1750px] w-full h-[95vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>ตรวจสอบข้อมูลและจัดเก็บ (Split-Screen Verification)</span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  เลือกประเภทบิลเพื่อกรองฟิลด์ที่จำเป็น
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ระบบปรับการแสดงฟิลด์ตามประเภทบิลอัตโนมัติ เพื่อให้ตรวจทานได้รวดเร็ว ไม่แสดงช่องที่ไม่เกี่ยวข้อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Screen Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
          
          {/* Left Column: Image Viewer (5 Cols) */}
          <div className="md:col-span-5 bg-slate-950 p-3 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>ภาพเอกสารต้นฉบับ</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white text-xs cursor-pointer"
                  title="ขยาย"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white text-xs cursor-pointer"
                  title="ย่อ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white text-xs cursor-pointer"
                  title="รีเซ็ต"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-900/60 flex items-center justify-center p-3 relative">
              {billImage ? (
                <img
                  src={billImage}
                  alt="ภาพบิลต้นฉบับ"
                  style={{ transform: `scale(${zoom})` }}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-md shadow-lg"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  <p className="text-slate-400">ไม่มีภาพเอกสารแนบ</p>
                  <p className="text-[11px] text-slate-600 mt-1">(ป้อนข้อมูลด้วยตนเอง)</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Form tailored by Bill Type (7 Cols) */}
          <div className="md:col-span-7 bg-white p-4 overflow-y-auto space-y-3.5 flex flex-col h-full text-xs">
            
            {/* Top Toolbar: Document Type Selector Buttons */}
            <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>ประเภทเอกสาร / บิล:</span>
                </span>
                
                {/* Toggle Show All 39 Cols button */}
                <button
                  type="button"
                  onClick={() => setShowAllCols(!showAllCols)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    showAllCols 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {showAllCols ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAllCols ? 'ซ่อนฟิลด์ที่ไม่จำเป็น' : 'แสดงทุกฟิลด์ (ครบ 39 ช่อง)'}</span>
                </button>
              </div>

              {/* Document Type Selector Segmented Options */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                
                {/* 1. Delivery Order */}
                <button
                  type="button"
                  onClick={() => handleDocTypeSelect('delivery_order')}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    selectedDocType === 'delivery_order'
                      ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs ring-1 ring-sky-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Boxes className="w-3.5 h-3.5 text-sky-600" />
                    <span>ใบส่งสินค้า/ส่งของ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">นับชิ้น/เส้น/กล่อง (ซ่อนชั่งน้ำหนัก)</div>
                </button>

                {/* 2. Weighbridge */}
                <button
                  type="button"
                  onClick={() => handleDocTypeSelect('weighbridge')}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    selectedDocType === 'weighbridge'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ตั๋วชั่งน้ำหนัก</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">หิน/ดิน/ทราย (ชั่ง Gross/Tare)</div>
                </button>

                {/* 3. Concrete */}
                <button
                  type="button"
                  onClick={() => handleDocTypeSelect('concrete')}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    selectedDocType === 'concrete'
                      ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs ring-1 ring-purple-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Truck className="w-3.5 h-3.5 text-purple-600" />
                    <span>คอนกรีตผสมเสร็จ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">เกรด KSC / คิว (m³) / รถโม่</div>
                </button>

                {/* 4. Tax Invoice */}
                <button
                  type="button"
                  onClick={() => handleDocTypeSelect('tax_invoice')}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    selectedDocType === 'tax_invoice'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>ใบเสร็จ/กำกับภาษี</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">ซื้อสินค้าทั่วไป / ยอดชำระ</div>
                </button>

                {/* 5. Full Logistics 39 Cols */}
                <button
                  type="button"
                  onClick={() => handleDocTypeSelect('full_logistics')}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    selectedDocType === 'full_logistics'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>39 คอลัมน์เต็ม</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">โลจิสติกส์ชั่ง 2 ฝั่งครบถ้วน</div>
                </button>

              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              
              {/* Auto Store Directory Option */}
              <div className="flex items-center justify-between text-xs px-1">
                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={saveToStoreDirectory}
                    onChange={(e) => setSaveToStoreDirectory(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>บันทึกชื่อผู้จำหน่ายลงในทะเบียนร้านค้าอัตโนมัติ</span>
                </label>
              </div>

              {/* Zone 1: Reference & Project */}
              <div className="border border-orange-200 rounded-xl p-3 bg-orange-50/20 space-y-2">
                <div className="font-bold text-orange-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>[โซน 1] เอกสารอ้างอิงหลัก & โครงการ</span>
                  </span>
                  <span className="text-[11px] text-orange-700 font-mono">
                    {selectedDocType === 'delivery_order' ? 'เลขที่ใบส่งของ (DO)' : 
                     selectedDocType === 'concrete' ? 'เลขที่ตั๋วคอนกรีต' :
                     selectedDocType === 'tax_invoice' ? 'เลขที่ใบแจ้งหนี้/ใบเสร็จ' : 'เลขที่ตั๋วชั่ง'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">1. เลข TR</label>
                    <input
                      type="text"
                      value={form.col1 || ''}
                      onChange={(e) => handleTextChange('col1', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">2. โครงการ / หน้างาน</label>
                    <input
                      type="text"
                      value={form.col2 || ''}
                      onChange={(e) => handleTextChange('col2', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                      placeholder="เช่น อาคาร A, โครงการทางหลวง"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">3. หมวดหมู่</label>
                    <input
                      type="text"
                      value={form.col3 || ''}
                      onChange={(e) => handleTextChange('col3', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      placeholder="เช่น งานเหล็ก, คอนกรีต, หิน/ทราย"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">4. เลขที่ PO</label>
                    <input
                      type="text"
                      value={form.col4 || ''}
                      onChange={(e) => handleTextChange('col4', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                      placeholder="PO-xxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">5. เลขที่ RR (ใบรับของ)</label>
                    <input
                      type="text"
                      value={form.col5 || ''}
                      onChange={(e) => handleTextChange('col5', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                      placeholder="RR-xxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-950 mb-0.5">
                      6. DO / เลขที่ตั๋ว / ใบส่งของ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.col6 || ''}
                      onChange={(e) => handleTextChange('col6', e.target.value)}
                      className="w-full p-2 border border-orange-300 rounded-lg bg-white font-mono font-bold text-orange-900"
                      placeholder="DO-xxxxx หรือ เลขที่บิล"
                    />
                  </div>
                </div>
              </div>

              {/* Zone 2: Date, Merchant & Goods */}
              <div className="border border-sky-200 rounded-xl p-3 bg-sky-50/20 space-y-2">
                <div className="font-bold text-sky-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span>[โซน 2] วันที่ ร้านค้าผู้จำหน่าย & รายการสินค้า</span>
                  </span>
                  <span className="text-[11px] text-sky-700">คู่ค้า & รายการส่งของ</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">7. วันที่ (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={form.col7 || ''}
                      onChange={(e) => handleTextChange('col7', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      8. ผู้จำหน่าย / ร้านค้า <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.col8 || ''}
                      onChange={(e) => handleTextChange('col8', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                      placeholder="เช่น บจก. สหพาณิชย์ หรือ แพลนท์ QMIX"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">9. ผู้รับเหมา / ผู้ซื้อ</label>
                    <input
                      type="text"
                      value={form.col9 || ''}
                      onChange={(e) => handleTextChange('col9', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      placeholder="ชื่อผู้รับสินค้าหรือบริษัทผู้รับเหมา"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">10. ทะเบียนรถขนส่ง</label>
                    <input
                      type="text"
                      value={form.col10 || ''}
                      onChange={(e) => handleTextChange('col10', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-semibold"
                      placeholder="เช่น 70-1234 กทม."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-950 mb-0.5">
                      11. รายการสินค้า <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.col11 || ''}
                      onChange={(e) => handleTextChange('col11', e.target.value)}
                      className="w-full p-2 border border-blue-300 rounded-lg bg-white font-bold text-blue-900"
                      placeholder="เช่น เหล็กฉาก 50x50มม., 350 KSC Cube, หินฝุ่น"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">12. สเปก / Code / Slump</label>
                    <input
                      type="text"
                      value={form.col12 || ''}
                      onChange={(e) => handleTextChange('col12', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                      placeholder="เช่น STL-50, Slump 10cm, มอก."
                    />
                  </div>
                </div>
              </div>

              {/* Zone 3: Origin Weights (ONLY SHOWN IF RELEVANT) */}
              {showWeightsOrigin && (
                <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/20 space-y-2 animate-fadeIn">
                  <div className="font-bold text-emerald-900 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>[โซน 3] น้ำหนักต้นทางจากตราชั่งรถบรรทุก (คอลัมน์ 13 - 15)</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">Gross - Tare = Net Weight</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">13. หนักเข้า (Gross กก.)</label>
                      <input
                        type="number"
                        value={form.col13 !== undefined ? form.col13 : ''}
                        onChange={(e) => handleWeightChange('col13', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">14. เบาออก (Tare กก.)</label>
                      <input
                        type="number"
                        value={form.col14 !== undefined ? form.col14 : ''}
                        onChange={(e) => handleWeightChange('col14', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">15. สุทธิ (Net กก.)</label>
                      <input
                        type="number"
                        readOnly
                        value={form.col15 || 0}
                        className="w-full p-1.5 border border-emerald-300 rounded-lg bg-emerald-50 text-right font-mono font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Zone 4: Destination Weights (ONLY SHOWN IF FULL LOGISTICS OR DUAL WEIGHBRIDGE) */}
              {showWeightsDest && (
                <div className="border border-teal-200 rounded-xl p-3 bg-teal-50/20 space-y-2 animate-fadeIn">
                  <div className="font-bold text-teal-900 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      <span>[โซน 4] น้ำหนักปลายทางหน้างาน & ผลต่างน้ำหนัก (คอลัมน์ 16 - 21)</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-600">
                      ผลต่าง: {form.col21 || 0} กก.
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">18. หนักปลายทาง (กก.)</label>
                      <input
                        type="number"
                        value={form.col18 !== undefined ? form.col18 : ''}
                        onChange={(e) => handleWeightChange('col18', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">19. เบาปลายทาง (กก.)</label>
                      <input
                        type="number"
                        value={form.col19 !== undefined ? form.col19 : ''}
                        onChange={(e) => handleWeightChange('col19', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-teal-800 mb-0.5">20. สุทธิปลายทาง (กก.)</label>
                      <input
                        type="number"
                        readOnly
                        value={form.col20 || 0}
                        className="w-full p-1.5 border border-teal-300 rounded-lg bg-teal-50 text-right font-mono font-bold text-teal-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Zone 5: Billing, Quantity & Freight */}
              <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/20 space-y-2">
                <div className="font-bold text-purple-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span>[โซน 5] จำนวน ปริมาณ ราคา & ค่าสินค้า</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-blue-700">
                    ยอดรวมสุทธิ: ฿{(form.col29 || 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      22. ปริมาณ / จำนวน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.col22 !== undefined ? form.col22 : ''}
                      onChange={(e) => handleFinancialChange('col22', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-right font-mono font-bold text-slate-900"
                      placeholder="เช่น 10, 50, 7.2"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      23. หน่วยนับ
                    </label>
                    <input
                      type="text"
                      value={form.col23 || ''}
                      onChange={(e) => handleTextChange('col23', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-center font-medium"
                      placeholder="เช่น ตัน, คิว, เส้น, กล่อง, แผ่น, ถุง"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      24. ราคาต่อหน่วย (บาท)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.col24 !== undefined ? form.col24 : ''}
                      onChange={(e) => handleFinancialChange('col24', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-right font-mono"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-0.5">
                      25. รวมค่าสินค้า (บาท)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={form.col25 || 0}
                      className="w-full p-2 border border-purple-300 rounded-lg bg-purple-50 text-right font-mono font-bold text-purple-900"
                    />
                  </div>

                  {/* Show Vehicle & Freight Rate only when relevant or expanded */}
                  {(showAllCols || selectedDocType !== 'tax_invoice') && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">26. ประเภทรถ</label>
                        <input
                          type="text"
                          value={form.col26 || ''}
                          onChange={(e) => handleTextChange('col26', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          placeholder={selectedDocType === 'concrete' ? 'รถโม่คอนกรีต' : 'พ่วง 18 ล้อ/สิบล้อ'}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">27. ค่าขนส่ง/หน่วย</label>
                        <input
                          type="number"
                          step="any"
                          value={form.col27 !== undefined ? form.col27 : ''}
                          onChange={(e) => handleFinancialChange('col27', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-right font-mono"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 mb-0.5">28. รวมค่าขนส่ง (บาท)</label>
                        <input
                          type="number"
                          readOnly
                          value={form.col28 || 0}
                          className="w-full p-2 border border-purple-300 rounded-lg bg-purple-50 text-right font-mono font-bold text-purple-900"
                        />
                      </div>
                    </>
                  )}

                  <div className={selectedDocType === 'tax_invoice' && !showAllCols ? 'col-span-4' : ''}>
                    <label className="block text-[11px] font-bold text-blue-900 mb-0.5">29. รวมทั้งสิ้น (บาท)</label>
                    <input
                      type="number"
                      readOnly
                      value={form.col29 || 0}
                      className="w-full p-2 border border-blue-400 rounded-lg bg-blue-100 text-right font-mono font-bold text-blue-950 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Zone 6: Payment Tracking */}
              <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/20 space-y-2">
                <div className="font-bold text-rose-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>[โซน 6] เงื่อนไขการชำระเงิน & ยอดคงค้าง</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700">
                    หนี้ค้างชำระ: ฿{(form.col36 || 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">30. รูปแบบการชำระ</label>
                    <select
                      value={form.col30 || 'โอนเงิน'}
                      onChange={(e) => handleTextChange('col30', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="โอนเงิน">โอนเงินธนาคาร</option>
                      <option value="เครดิต 30 วัน">เครดิต 30 วัน</option>
                      <option value="เครดิต 15 วัน">เครดิต 15 วัน</option>
                      <option value="เครดิต 60 วัน">เครดิต 60 วัน</option>
                      <option value="เงินสด">เงินสด</option>
                      <option value="เช็ค">เช็คสั่งจ่าย</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">31. ชำระให้ผู้จำหน่ายแล้ว</label>
                    <input
                      type="number"
                      step="any"
                      value={form.col31 !== undefined ? form.col31 : ''}
                      onChange={(e) => handleFinancialChange('col31', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-right font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">35. ยอดชำระแล้วรวม</label>
                    <input
                      type="number"
                      step="any"
                      value={form.col35 !== undefined ? form.col35 : ''}
                      onChange={(e) => handleFinancialChange('col35', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-emerald-300 rounded-lg bg-emerald-50 text-right font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-rose-800 mb-0.5">36. ยอดคงค้างชำระ (บาท)</label>
                    <input
                      type="number"
                      readOnly
                      value={form.col36 || 0}
                      className="w-full p-2 border border-rose-300 rounded-lg bg-rose-50 text-right font-mono font-bold text-rose-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Zone 7: Location & Remarks */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  <span>[โซน 7] สถานที่ส่งมอบ & หมายเหตุ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      37. สถานที่ส่งมอบ / จุดเท / กม.
                    </label>
                    <input
                      type="text"
                      value={form.col37 || ''}
                      onChange={(e) => handleTextChange('col37', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      placeholder={selectedDocType === 'concrete' ? 'เช่น คานสะพาน Span 2 หรือ ฐานราก F1' : 'เช่น คลังสินค้า C หรือ หน้างาน กม. 42+500'}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">38. หมายเหตุ</label>
                    <input
                      type="text"
                      value={form.col38 || ''}
                      onChange={(e) => handleTextChange('col38', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      placeholder="ระบุข้อความเพิ่มเติมหรือบันทึกหน้างาน"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Submit Action */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer text-xs"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-md shadow-emerald-200 cursor-pointer active:scale-95 text-xs md:text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูลเอกสาร</span>
                </button>
              </div>

            </form>

          </div>

        </div>

      </div>
    </div>
  );
};
