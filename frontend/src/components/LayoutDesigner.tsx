import { API_BASE } from "../api";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Trash2, Download, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/** Types */
export interface LayoutZone {
  id: string;
  type: "text" | "image" | "table" | "richtext" | "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  isDynamic: boolean;
  variableName?: string;
  styles: React.CSSProperties; // now accepts textAlign, fontStyle, etc.
}

type TemplateDef = {
  id: string;
  name: string;
  description?: string;
  structure: { zones: LayoutZone[] };
};

export interface LayoutDesignerProps {
  onExport?: (format: string, zones: LayoutZone[]) => void | Promise<void>;
  onSave?: (zones: LayoutZone[], name?: string) => void;
  templates?: TemplateDef[];
}

/** Logical page size (A4-ish @ ~72dpi) */
const PAGE_W = 794;
const PAGE_H = 1123;

/** Zoom helpers */
type FitMode = "FIT" | "FIT_WIDTH" | "CUSTOM" | "ONE_TO_ONE";
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

// Helpers
const parseTableColumns = (spec: string): string[] => {
  const m = spec.match(/columns=([^;]+)/i);
  if (!m) return [];
  return m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
};

const LayoutDesigner: React.FC<LayoutDesignerProps> = ({ onExport, onSave, templates = [] }) => {
  const [zones, setZones] = useState<LayoutZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // zoom + center
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("FIT_WIDTH");

  // layout metadata
  const [layoutName, setLayoutName] = useState("");
  const [savedLayouts, setSavedLayouts] = useState<
    Array<{ _id?: string; name: string; structure: any }>
  >([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");

  const [showTemplates, setShowTemplates] = useState(false);

  /** Compute scale when container changes OR when fit mode changes */
  useEffect(() => {
    const recompute = () => {
      if (!centerRef.current) return;
      const pad = 24;
      const { clientWidth, clientHeight } = centerRef.current;

      const sx = (clientWidth - pad) / PAGE_W;
      const sy = (clientHeight - pad) / PAGE_H;

      if (fitMode === "FIT") {
        setScale(clamp(Math.min(sx, sy), MIN_SCALE, MAX_SCALE));
      } else if (fitMode === "FIT_WIDTH") {
        setScale(clamp(sx, MIN_SCALE, MAX_SCALE));
      } else if (fitMode === "ONE_TO_ONE") {
        setScale(1);
      }
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(document.documentElement);
    if (centerRef.current) ro.observe(centerRef.current);
    return () => ro.disconnect();
  }, [fitMode]);

  /** Ctrl/⌘ + wheel to zoom (CUSTOM mode) */
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setFitMode("CUSTOM");
      setScale((s) => clamp(s * (e.deltaY > 0 ? 0.9 : 1.1), MIN_SCALE, MAX_SCALE));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // --- zone manipulation logic
  const addZone = (type: LayoutZone["type"]) => {
    const newZone: LayoutZone = {
      id: `zone-${Date.now()}`,
      type,
      x: 50,
      y: 50,
      width: type === "text" ? 320 : type === "image" ? 320 : type === "rect" ? 360 : 420,
      height: type === "text" ? 90 : type === "image" ? 200 : type === "rect" ? 80 : 220,
      content:
        type === "text"
          ? "Sample text"
          : type === "image"
          ? "image-placeholder.jpg"
          : type === "table"
          ? "columns=Column A|Column B|Column C; data={{Rows}}"
          : type === "rect"
          ? ""
          : "Rich text content",
      isDynamic: false,
      styles: {
        fontSize: type === "text" || type === "richtext" ? 16 : 14,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "left",
        color: "#000000",
        backgroundColor: type === "rect" ? "#f5f5f5" : "transparent",
        border: "1px solid #ccc",
      },
    };
    setZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone.id);
  };

  const updateZone = (id: string, updates: Partial<LayoutZone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const deleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedZone === id) setSelectedZone(null);
  };

  const handleMouseDown = (e: React.MouseEvent, zoneId: string) => {
    e.preventDefault();
    setSelectedZone(zoneId);
    setIsDragging(true);

    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = (e.clientX - rect.left) / scale;
    const localY = (e.clientY - rect.top) / scale;

    setDragOffset({ x: localX - zone.x, y: localY - zone.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedZone) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const localX = (e.clientX - rect.left) / scale;
    const localY = (e.clientY - rect.top) / scale;

    updateZone(selectedZone, {
      x: Math.max(0, Math.round(localX - dragOffset.x)),
      y: Math.max(0, Math.round(localY - dragOffset.y)),
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const selectedZoneData = zones.find((z) => z.id === selectedZone);

  // --- Backend calls ---
  const saveLayoutToServer = async () => {
    if (!layoutName.trim()) {
      alert("Please enter a layout name before saving.");
      return;
    }
    try {
      const payload = { name: layoutName.trim(), structure: { zones } };
      const res = await fetch(`${API_BASE}/layouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
      await res.json();
      alert("Layout saved");
      try {
        onSave?.(zones, layoutName.trim());
      } catch (err) {
        console.warn("onSave handler threw:", err);
      }
      fetchSavedLayouts();
    } catch (err) {
      console.error(err);
      alert("Failed to save layout. See console for details.");
    }
  };

  const fetchSavedLayouts = async () => {
    try {
      const res = await fetch(`${API_BASE}/layouts`);
      if (!res.ok) throw new Error("Failed to fetch saved layouts");
      const data = await res.json();
      setSavedLayouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSavedLayoutById = (layoutId: string) => {
    const layout = savedLayouts.find((l) => String(l._id || (l as any).id || "") === layoutId);
    if (!layout) return;

    const struct = layout.structure;
    if (struct && Array.isArray(struct.zones)) {
      const cloned = JSON.parse(JSON.stringify(struct.zones));
      setZones(cloned);
      setSelectedZone(null);
      setLayoutName(layout.name || "");
    } else {
      alert("Saved layout has unexpected structure.");
    }
  };

  const applyTemplate = (tpl: TemplateDef) => {
    const cloned = JSON.parse(JSON.stringify(tpl.structure?.zones || [])) as LayoutZone[];
    setZones(cloned);
    if (!layoutName || layoutName.trim().length === 0 || layoutName === "Untitled Layout") {
      setLayoutName(tpl.name);
    }
    setSelectedZone(null);
    setShowTemplates(false);
  };

  const handleExport = async (format: string) => {
    if (onExport) {
      try {
        await onExport(format, zones);
        return;
      } catch (err) {
        console.warn("onExport prop failed, falling back to local download:", err);
      }
    }
    const data = { name: layoutName, zones };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${layoutName || "layout"}-layout.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchSavedLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================== RENDER =========================== */

  return (
    <div className="flex h-screen bg-background overflow-hidden text-sm">
      {/* Toolbox */}
      <div className="w-64 bg-card border-r p-3 space-y-4 overflow-auto">
        {/* Layout name */}
        <div>
          <h3 className="mb-2 text-base font-medium">Layout</h3>
          <Label className="text-xs">Layout Name</Label>
          <Input
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="My Layout name"
            className="h-8"
          />
        </div>

        {/* Templates */}
        {templates.length > 0 && (
          <div>
            <Button
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={() => setShowTemplates(true)}
            >
              Templates
            </Button>
          </div>
        )}

        {/* Saved Layouts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium">Saved Layouts</Label>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Refresh" onClick={fetchSavedLayouts}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <Select
            value={selectedLayoutId}
            onValueChange={(id) => {
              setSelectedLayoutId(id);
              loadSavedLayoutById(id);
            }}
          >
            <SelectTrigger className="h-8 text-xs text-left">
              <SelectValue className="text-left truncate" placeholder="Choose layout" />
            </SelectTrigger>

            <SelectContent className="max-h-60 overflow-auto">
              {savedLayouts.length === 0 ? (
                <div className="px-3 py-2 text-muted-foreground text-xs">No saved layouts</div>
              ) : (
                savedLayouts.map((l, i) => {
                  const id = String(l._id || (l as any).id || i);
                  return (
                    <SelectItem key={id} value={id} className="text-xs">
                      {l.name || "(untitled)"}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Add Zones */}
        <div>
          <Label className="mb-2 block text-xs font-medium">Add Zones</Label>
          <div className="space-y-1">
            <Button onClick={() => addZone("text")} className="w-full h-8 text-xs justify-start">
              Text Zone
            </Button>
            <Button onClick={() => addZone("image")} className="w-full h-8 text-xs justify-start">
              Image Zone
            </Button>
            <Button onClick={() => addZone("table")} className="w-full h-8 text-xs justify-start">
              Table Zone
            </Button>
            <Button onClick={() => addZone("richtext")} className="w-full h-8 text-xs justify-start">
              Rich Text Zone
            </Button>
            <Button onClick={() => addZone("rect")} variant="outline" className="w-full h-8 text-xs justify-start">
              Rectangle
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="pb-2">
          <Label className="mb-2 block text-xs font-medium">Actions</Label>
          <div className="space-y-2">
            <Button onClick={saveLayoutToServer} className="w-full h-8 text-xs">
              Save Layout
            </Button>
            <Button onClick={fetchSavedLayouts} variant="outline" className="w-full h-8 text-xs">
              Refresh Saved
            </Button>
            <Button onClick={() => handleExport("json")} variant="ghost" className="w-full h-8 text-xs">
              <Download className="w-3 h-3 mr-2" /> Export (JSON)
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas side */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-3 py-2 bg-card shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-sm">Layout Canvas</h2>
            <p className="text-xs text-muted-foreground">Zoom with Ctrl/⌘ + mouse wheel. Drag zones to move.</p>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant={fitMode === "FIT" ? "default" : "outline"} onClick={() => setFitMode("FIT")}>
              Fit
            </Button>
            <Button size="sm" variant={fitMode === "FIT_WIDTH" ? "default" : "outline"} onClick={() => setFitMode("FIT_WIDTH")}>
              Fit-Width
            </Button>
            <Button size="sm" variant={fitMode === "ONE_TO_ONE" ? "default" : "outline"} onClick={() => setFitMode("ONE_TO_ONE")}>
              100%
            </Button>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFitMode("CUSTOM");
                  setScale((s) => clamp(s * 0.9, MIN_SCALE, MAX_SCALE));
                }}
              >
                −
              </Button>
              <div className="w-16 text-center text-xs tabular-nums">{(scale * 100).toFixed(0)}%</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFitMode("CUSTOM");
                  setScale((s) => clamp(s * 1.1, MIN_SCALE, MAX_SCALE));
                }}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Centered canvas */}
        <div ref={centerRef} className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-6">
          {/* Frame that matches scaled size */}
          <div className="border bg-white shadow-sm" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            {/* Unscaled logical page; visually scaled */}
            <div
              ref={canvasRef}
              className="relative"
              style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {zones.map((zone) => {
                const isSelected = selectedZone === zone.id;
                const rawFS = zone.styles.fontSize;
                const fs = clamp(
                  typeof rawFS === "string" ? parseFloat(rawFS) || 16 : (rawFS ?? 16),
                  10,
                  28
                );

                // shared block styles
                const blockStyle: React.CSSProperties = {
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  backgroundColor: zone.styles.backgroundColor,
                  border: zone.styles.border || "1px solid #ddd",
                };

                return (
                  <div
                    key={zone.id}
                    className={`absolute cursor-move ${isSelected ? "ring-2 ring-primary" : ""}`}
                    style={blockStyle}
                    onMouseDown={(e) => handleMouseDown(e, zone.id)}
                  >
                    <div className="p-1 h-full overflow-hidden">
                      {zone.type === "rect" && <div className="w-full h-full" />}

                      {zone.type === "text" && (
                        <div
                          style={{
                            fontSize: fs,
                            fontWeight: zone.styles.fontWeight as React.CSSProperties["fontWeight"],
                            fontStyle: zone.styles.fontStyle as React.CSSProperties["fontStyle"],
                            textAlign: zone.styles.textAlign as React.CSSProperties["textAlign"],
                            color: zone.styles.color,
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                          }}
                          className="whitespace-pre-wrap"
                        >
                          {zone.isDynamic ? `{{${zone.variableName}}}` : zone.content}
                        </div>
                      )}

                      {zone.type === "image" && (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-[12px]">
                          {zone.isDynamic ? `{{${zone.variableName}}}` : zone.content}
                        </div>
                      )}

                      {zone.type === "table" && (
                        <div className="text-[12px] h-full flex flex-col">
                          {/* header preview from columns=... */}
                          {(() => {
                            const headers = parseTableColumns(zone.content || "");
                            if (headers.length === 0) {
                              return (
                                <div className="text-muted-foreground">
                                  {zone.isDynamic ? `{{${zone.variableName}}}` : "Table: " + (zone.content || "(no spec)")}
                                </div>
                              );
                            }
                            return (
                              <>
                                <div
                                  className="grid border-b"
                                  style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
                                >
                                  {headers.map((h, i) => (
                                    <div key={i} className="px-2 py-1 font-medium border-r last:border-r-0">
                                      {h}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-muted-foreground px-2 py-1">
                                  {zone.isDynamic
                                    ? `rows: {{${zone.variableName}}}`
                                    : "(Static preview — provide rows via data={{VarName}})"}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {zone.type === "richtext" && (
                        <div
                          className="text-[12px] whitespace-pre-wrap"
                          style={{
                            fontSize: fs,
                            fontWeight: zone.styles.fontWeight as React.CSSProperties["fontWeight"],
                            fontStyle: zone.styles.fontStyle as React.CSSProperties["fontStyle"],
                            textAlign: zone.styles.textAlign as React.CSSProperties["textAlign"],
                            color: zone.styles.color,
                          }}
                        >
                          {zone.isDynamic ? `{{${zone.variableName}}}` : zone.content}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="absolute -top-7 right-0 flex space-x-1">
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => deleteZone(zone.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 bg-card border-l p-3 overflow-auto">
        <h3 className="mb-3 text-sm">Properties</h3>
        {selectedZoneData ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Zone Type</Label>
              <Badge variant="secondary" className="ml-2 text-[10px]">{selectedZoneData.type}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X</Label>
                <Input
                  type="number"
                  value={selectedZoneData.x}
                  onChange={(e) => updateZone(selectedZoneData.id, { x: parseInt(e.target.value || "0") })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Y</Label>
                <Input
                  type="number"
                  value={selectedZoneData.y}
                  onChange={(e) => updateZone(selectedZoneData.id, { y: parseInt(e.target.value || "0") })}
                  className="h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={selectedZoneData.width}
                  onChange={(e) => updateZone(selectedZoneData.id, { width: parseInt(e.target.value || "0") })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={selectedZoneData.height}
                  onChange={(e) => updateZone(selectedZoneData.id, { height: parseInt(e.target.value || "0") })}
                  className="h-8"
                />
              </div>
            </div>

            {selectedZoneData.type !== "rect" && (
              <>
                <div>
                  <Label className="text-xs">Content</Label>
                  <Textarea value={selectedZoneData.content} onChange={(e) => updateZone(selectedZoneData.id, { content: e.target.value })} rows={3} />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedZoneData.isDynamic}
                    onChange={(e) => updateZone(selectedZoneData.id, { isDynamic: e.target.checked })}
                  />
                  <Label className="text-xs">Dynamic Content</Label>
                </div>

                {selectedZoneData.isDynamic && (
                  <div>
                    <Label className="text-xs">Variable Name</Label>
                    <Input
                      value={selectedZoneData.variableName || ""}
                      onChange={(e) => updateZone(selectedZoneData.id, { variableName: e.target.value })}
                      placeholder="variable_name"
                      className="h-8"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Font Size (px)</Label>
                    <Input
                      type="number"
                      value={typeof selectedZoneData.styles.fontSize === "string" ? (parseFloat(selectedZoneData.styles.fontSize) || 0) : ((selectedZoneData.styles.fontSize as number) || 0)}
                      onChange={(e) =>
                        updateZone(selectedZoneData.id, {
                          styles: {
                            ...selectedZoneData.styles,
                            fontSize: parseInt(e.target.value || "0"),
                          },
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Font Weight</Label>
                    <Select
                      value={(selectedZoneData.styles.fontWeight as string) || "normal"}
                      onValueChange={(v) =>
                        updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, fontWeight: v as React.CSSProperties["fontWeight"] } })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">normal</SelectItem>
                        <SelectItem value="bold">bold</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="600">600</SelectItem>
                        <SelectItem value="700">700</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Font Style</Label>
                    <Select
                      value={(selectedZoneData.styles.fontStyle as string) || "normal"}
                      onValueChange={(v) =>
                        updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, fontStyle: v as React.CSSProperties["fontStyle"] } })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">normal</SelectItem>
                        <SelectItem value="italic">italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Text Align</Label>
                    <Select
                      value={(selectedZoneData.styles.textAlign as string) || "left"}
                      onValueChange={(v) =>
                        updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, textAlign: v as React.CSSProperties["textAlign"] } })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">left</SelectItem>
                        <SelectItem value="center">center</SelectItem>
                        <SelectItem value="right">right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <Input
                      type="color"
                      value={(selectedZoneData.styles.color as string) || "#000000"}
                      onChange={(e) => updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, color: e.target.value } })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Background</Label>
                    <Input
                      type="color"
                      value={(selectedZoneData.styles.backgroundColor as string) || "#ffffff"}
                      onChange={(e) => updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, backgroundColor: e.target.value } })}
                      className="h-8"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Border (CSS)</Label>
                  <Input
                    value={(selectedZoneData.styles.border as string) || "1px solid #ccc"}
                    onChange={(e) => updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, border: e.target.value } })}
                    className="h-8"
                  />
                </div>
              </>
            )}

            {selectedZoneData.type === "rect" && (
              <>
                <div>
                  <Label className="text-xs">Fill / Background</Label>
                  <Input
                    type="color"
                    value={(selectedZoneData.styles.backgroundColor as string) || "#f5f5f5"}
                    onChange={(e) => updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, backgroundColor: e.target.value } })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Border (CSS)</Label>
                  <Input
                    value={(selectedZoneData.styles.border as string) || "1px solid #ccc"}
                    onChange={(e) => updateZone(selectedZoneData.id, { styles: { ...selectedZoneData.styles, border: e.target.value } })}
                    className="h-8"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Select a zone to edit properties</p>
        )}
      </div>

      {/* Template Dialog */}
      {showTemplates && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTemplates(false);
          }}
        >
          <div className="bg-white rounded-lg w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] overflow-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <Button variant="ghost" onClick={() => setShowTemplates(false)}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.id} className="border rounded p-3 flex flex-col">
                  <div className="font-medium">{tpl.name}</div>
                  {tpl.description && (
                    <div className="text-xs text-muted-foreground mb-2">{tpl.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mb-3">
                    {(tpl.structure?.zones?.length ?? 0)} zones
                  </div>
                  <div className="mt-auto">
                    <Button className="w-full" onClick={() => applyTemplate(tpl)}>
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-sm text-muted-foreground">No templates available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutDesigner;
