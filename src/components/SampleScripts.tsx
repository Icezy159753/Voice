import React from 'react';
import { FileText, Sparkles, Copy, BookOpen } from 'lucide-react';

export interface SampleScript {
  id: string;
  category: string;
  title: string;
  text: string;
}

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: 'intro',
    category: 'แนะนำระบบ',
    title: '🎙️ ต้อนรับสู่ VoiceCraft Studio',
    text: 'ยินดีต้อนรับสู่ VoiceCraft สตูดิโอแปลงข้อความเป็นเสียงพูด AI อัจฉริยะ คุณสามารถพิมพ์หรือวางข้อความ ปรับแต่งความเร็ว และเปลี่ยนโทนเสียงทุ้มแหลมได้ตามต้องการ พร้อมดาวน์โหลดไฟล์เสียงคุณภาพสูงได้ทันทีครับ',
  },
  {
    id: 'news',
    category: 'ข่าวสาร',
    title: '📰 ข่าวเทคโนโลยีสารสนเทศ',
    text: 'รายงานข่าวความก้าวหน้าด้านปัญญาประดิษฐ์ วันนี้มีการเปิดตัวเทคโนโลยีสังเคราะห์เสียงรุ่นใหม่ ที่สามารถเลียนแบบน้ำเสียงและจังหวะการพูดของมนุษย์ได้อย่างเป็นธรรมชาติ รองรับการใช้งานหลากหลายภาษาทั่วโลก',
  },
  {
    id: 'story',
    category: 'นิทาน',
    title: '🌲 นิทานป่าโบราณแห่งสายลม',
    text: 'กาลครั้งหนึ่งนานมาแล้ว ท่ามกลางหุบเขาเขียวขจีอันเงียบสงบ มีต้นไม้ใหญ่ต้นหนึ่งที่ผู้คนเรียกขานว่า ต้นไม้แห่งสายลม ยามใดที่สายลมพัดผ่าน กิ่งก้านจะส่งเสียงดนตรีอันไพเราะ คอยปลอบประโลมหัวใจของผู้เดินทางทุกคน',
  },
  {
    id: 'promo',
    category: 'การตลาด',
    title: '⚡ สปอตโฆษณาเปิดตัวสินค้า',
    text: 'พิเศษสุดสำหรับคุณวันนี้! พบกับโปรโมชั่นแห่งปี ลดราคาสูงสุดถึง 50% พร้อมของสมนาคุณพิเศษเมื่อสั่งซื้อภายในสิ้นเดือนนี้เท่านั้น อย่ารอช้า สินค้ามีจำนวนจำกัด รีบกดสั่งซื้อเลยตอนนี้!',
  },
  {
    id: 'announcement',
    category: 'ประชาสัมพันธ์',
    title: '📢 ประกาศบริการสาธารณะ',
    text: 'ประกาศแจ้งเตือนผู้รับบริการทุกท่าน ขณะนี้ระบบได้เปิดให้บริการช่องทางออนไลน์แล้ว เพื่อความสะดวกรวดเร็ว ท่านสามารถทำรายการผ่านหน้าเว็บไซต์ได้ตลอด 24 ชั่วโมง ขอบคุณค่ะ',
  },
  {
    id: 'tongue-twister',
    category: 'ทดสอบเสียง',
    title: '🗣️ ประโยคภาษาไทยทดสอบความชัด',
    text: 'กินมันติดเหงือก กินเผือกติดฟัน ชามเขียวคว่ำเช้า ชามขาวคว่ำค่ำ ยายกินน้ำลำไยไหลย้อยลงบนหมอนขวาน',
  },
];

interface SampleScriptsProps {
  onSelect: (text: string) => void;
}

export const SampleScripts: React.FC<SampleScriptsProps> = ({ onSelect }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          ข้อความตัวอย่างสำหรับทดสอบ:
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_SCRIPTS.map((script) => (
          <button
            key={script.id}
            onClick={() => onSelect(script.text)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 transition-all hover:border-indigo-500/60 hover:bg-indigo-950/40 hover:text-white"
          >
            <span>{script.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
