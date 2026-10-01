# แดชบอร์ดงบประมาณภาครัฐ

แดชบอร์ดภาษาไทยสำหรับสำรวจงบประมาณรายจ่ายจากหมวดใหญ่ลงสู่หน่วยรับและแผนงาน พร้อมรายงานย้อนจากแผนไปยังหน่วยรับ เชื่อม Supabase ตาม `schema_supabase.sql` ด้วย Next.js และ Recharts

## เริ่มต้นใช้งาน

1. ติดตั้ง Node.js รุ่น LTS
2. ติดตั้งแพ็กเกจด้วย `npm install`
3. กำหนด URL และ publishable key ใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

4. เริ่มระบบด้วย `npm run dev` แล้วเปิด `http://localhost:3000`

## ตารางที่ใช้

- `budget_items` เป็นโครงสร้าง parent-child โดย `parent_id` ใช้เจาะดูแต่ละระดับ และ `is_leaf` ใช้ระบุรายการปลายกิ่ง
- `entities` ให้ชื่อหน่วยงานและประเภทแผน
- `budget_acts` ให้ชื่อ พ.ร.บ. และปีงบประมาณ พ.ศ. (`fiscal_year_be`)
- `sections` และ `chapters` ให้โครงสร้างมาตราและบท
- หน้า “เจาะตามหมวดงบประมาณ” แสดงสัดส่วนหมวดระดับรากเทียบกับวงเงินรวม แล้วเจาะลงผ่าน parent-child พร้อมวงเงินและสัดส่วนเทียบกับระดับแม่
- หน้า “รายงานตามแผน” รวม node ที่มีชื่อแผนเดียวกัน แล้วแสดงหน่วยรับงบ วงเงิน และสัดส่วนภายในแผน ค้นหาแผน/หน่วยรับ และส่งออกรายงาน CSV
- การรวมหมวดระดับบนใช้เฉพาะ root nodes เพื่อไม่บวกยอด parent-child ซ้ำ ส่วน drill-down ใช้วงเงินของ node ต่อวงเงินระดับแม่

## ผลตรวจข้อมูลล่าสุด

ข้อมูลที่อ่านได้ ณ วันที่ตรวจ: `budget_items` 8,917 nodes (4,485 leaf), `entities` 4,289, `budget_acts` 1, `chapters` 7 และ `sections` 38 ปีงบประมาณ พ.ศ. 2570 ยอด root nodes รวม 3.788 ล้านล้านบาท ตรงกับ `budget_acts.total_amount`

หมวดระดับบนสุด: งบกลาง 699.9 พันล้านบาท (18.5%), หน่วยรับ 2.425 ล้านล้านบาท (64.0%), ท้องถิ่น/พื้นที่ 223.1 พันล้านบาท (5.9%), กองทุน 299.3 พันล้านบาท (7.9%) และแผนตั้งต้น 140.8 พันล้านบาท (3.7%)

มีชื่อแผนไม่ซ้ำ 60 ชื่อที่เชื่อมกับ 4,116 leaf items รวม 1.474 ล้านล้านบาท (38.9% ของงบรวม) ส่วนวงเงินที่เหลือไม่มีแผนบรรพบุรุษใน hierarchy จึงไม่ถูกนำไปอ้างเป็นงบตามแผน รายงานรวมแผนชื่อซ้ำและจัดวงเงินเข้า recipient ที่ใกล้ที่สุดใน parent chain

รัน `node scripts/analyze-budget.mjs` เพื่ออ่านตารางแบบแบ่งหน้าและพิมพ์สรุป aggregate สำหรับตรวจข้อมูลใหม่

ตาม `schema_supabase.sql` ทุกตารางเปิด RLS แต่ยังไม่มี SELECT policy ดังนั้น publishable key จะไม่เห็นแถวข้อมูลจนกว่าจะกำหนด policy ที่เหมาะสม การตอบกลับ `Content-Range: */0` ในกรณีนี้ไม่ยืนยันว่าตารางว่าง

หากข้อมูลทั้งหมดในห้าตารางที่แอปใช้ได้รับอนุมัติให้เปิดเผยต่อสาธารณะ สามารถตรวจสอบและรัน `supabase/enable_dashboard_read.sql` ใน Supabase SQL Editor ได้ สคริปต์นี้เพิ่ม SELECT policy ให้ `anon` และ `authenticated` ซึ่งเปิดให้อ่านทุกคอลัมน์ในตารางเหล่านั้นผ่าน Data API อย่ารันหากมีข้อมูลที่ต้องจำกัดสิทธิ์ และห้ามใส่ secret หรือ service role key ในตัวแปร `NEXT_PUBLIC_*`

## ตรวจสอบและ production

- `npm run build` ตรวจสอบและสร้าง production build
- `npm run start` เริ่ม production server หลัง build
- `npm run lint` ตรวจ lint

หน้า dashboard อ่าน hierarchy ทั้งหมดแบบแบ่งหน้า API เพื่อใช้ root nodes และ parent-child drilldown; รายงานแผนจะรวมเฉพาะ leaf descendants ที่มี plan ancestor