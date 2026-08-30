import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import api from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";

const BLANK = { heading: "", sub: "", image: "", cta: "Shop Now", link: "/shop", startAt: "", endAt: "" };

export default function AdminBanners() {
  const qc = useQueryClient();
  const { data: sections = [] } = useQuery({ queryKey: ["admin", "sections"], queryFn: () => api.get("/admin/sections").then((r) => r.data) });
  const banner = sections.find((s) => s.type === "banner");
  const [slides, setSlides] = useState([]);
  useEffect(() => { if (banner) setSlides(banner.config?.slides || []); }, [banner?.id]);

  if (!banner) return <p className="text-n500">No banner section found. Add one from Homepage Builder / Sections.</p>;

  const setSlide = (i, k, v) => setSlides(slides.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const addSlide = () => setSlides([...slides, { ...BLANK }]);
  const removeSlide = (i) => setSlides(slides.filter((_, idx) => idx !== i));

  const save = async () => {
    await api.put(`/admin/sections/${banner.id}`, { data: { config: { ...banner.config, slides } } });
    qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    qc.invalidateQueries({ queryKey: ["sections"] });
    toast.success("Banners saved — live on homepage");
  };

  return (
    <div data-testid="admin-banners">
      <div className="flex items-center justify-between mb-1"><h1 className="font-display text-3xl text-n900">Banner Manager</h1>
        <button onClick={addSlide} data-testid="add-slide" className="bg-fx text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Add Slide</button></div>
      <p className="text-sm text-n500 mb-5">Manage hero slides — image, CTA text, link and optional schedule.</p>

      <div className="space-y-4">
        {slides.map((s, i) => (
          <div key={i} className="bg-white border border-n200 rounded-xl p-4" data-testid={`slide-${i}`}>
            <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold uppercase text-n500">Slide {i + 1}</span>
              <button onClick={() => removeSlide(i)} data-testid={`del-slide-${i}`} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button></div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:row-span-2">
                {s.image && <img src={s.image} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />}
                <ImageUpload value={s.image} onChange={(url) => setSlide(i, "image", url)} />
              </div>
              <Field label="Heading" value={s.heading} onChange={(v) => setSlide(i, "heading", v)} tid={`slide-heading-${i}`} />
              <Field label="CTA Text" value={s.cta} onChange={(v) => setSlide(i, "cta", v)} tid={`slide-cta-${i}`} />
              <Field label="Subtitle" value={s.sub} onChange={(v) => setSlide(i, "sub", v)} tid={`slide-sub-${i}`} />
              <Field label="Link (e.g. /repair)" value={s.link} onChange={(v) => setSlide(i, "link", v)} tid={`slide-link-${i}`} />
              <Field label="Start (optional)" type="datetime-local" value={s.startAt} onChange={(v) => setSlide(i, "startAt", v)} />
              <Field label="End (optional)" type="datetime-local" value={s.endAt} onChange={(v) => setSlide(i, "endAt", v)} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} data-testid="save-banners" className="mt-5 bg-fx text-white font-bold px-6 py-3 rounded-lg active:scale-95 transition-transform">Save Banners</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", tid }) {
  return (
    <div><label className="text-[11px] font-semibold text-n800">{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={tid} className="w-full mt-1 bg-n200/30 rounded-lg p-2 text-sm outline-none focus:ring-2 ring-fx" /></div>
  );
}
