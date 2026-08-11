import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowRight,
  CaretDown,
  Check,
  Circle,
  Eraser,
  Eye,
  EyeSlash,
  GridFour,
  ImageSquare,
  LockSimple,
  Minus,
  MouseSimple,
  PencilSimple,
  Selection,
  Square,
  Stack,
  TextT,
  X,
} from "@phosphor-icons/react";
import { editorToolHitSize } from "./canvasPresentation";
import {
  brushTypes,
  getRelevantControls,
  getToolButtonState,
  primaryToolGroups,
  stabilizerOptions,
} from "./editorToolModel";
import {
  applyRangeControlUpdate,
  commitRangeDraft,
  getRangeDraftUpdate,
  getRangeSliderUpdate,
  handlePopoverEscape,
  selectPopoverOption,
  shouldCloseShapeChooser,
} from "./editorChromeInteractions";

const toolIcons = {
  select: MouseSimple,
  pen: PencilSimple,
  eraser: Eraser,
  line: Minus,
  arrow: ArrowRight,
  shape: Selection,
  text: TextT,
  image: ImageSquare,
  elements: GridFour,
};

const quickColors = ["#303238", "#ef4154", "#e58a36", "#ebca3f", "#279766", "#2d75d4"];
const moreColors = ["#854bd7", "#ffffff"];

function ToolButton({
  tool,
  active,
  disabled,
  expanded,
  controls,
  accessibleName,
  onClick,
}) {
  const Icon = toolIcons[tool.id];
  const buttonName =
    accessibleName ?? `${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`;

  return (
    <button
      type="button"
      className={`editor-tool-button ${active ? "active" : ""}`}
      aria-label={buttonName}
      aria-pressed={active}
      aria-expanded={expanded}
      aria-controls={controls}
      title={buttonName}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={21} aria-hidden="true" />
      <span className="editor-tool-label">{tool.label}</span>
    </button>
  );
}

export function EditorToolRail({
  activeTool,
  activeBrushType = "pencil",
  lastShapeTool,
  disabled = false,
  imageBrowserOpen = false,
  libraryOpen = false,
  onSelectTool,
  onSelectBrushType,
  onSelectShape,
  onToggleImage,
  onToggleElements,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) {
  const [brushExpanded, setBrushExpanded] = useState(false);
  const [shapeExpanded, setShapeExpanded] = useState(false);
  const brushChooserId = useId();
  const shapeChooserId = useId();
  const brushDisclosureRef = useRef(null);
  const shapeDisclosureRef = useRef(null);

  useEffect(() => {
    if (activeTool !== "pen") setBrushExpanded(false);
    if (shouldCloseShapeChooser(activeTool)) {
      setShapeExpanded(false);
    }
  }, [activeTool]);

  const handleTool = (tool) => {
    setBrushExpanded(false);
    setShapeExpanded(false);
    if (tool.id === "image") {
      onToggleImage();
      return;
    }
    if (tool.id === "elements") {
      onToggleElements();
      return;
    }
    onSelectTool(tool.id);
  };

  return (
    <div
      className="editor-tool-rail"
      style={{ "--editor-tool-hit-size": `${editorToolHitSize}px` }}
      role="toolbar"
      aria-label="绘制工具"
      aria-disabled={disabled}
    >
      {primaryToolGroups.map((group, groupIndex) => (
        <div className="editor-tool-group" role="group" key={group.id}>
          {groupIndex > 0 && <span className="editor-tool-divider" aria-hidden="true" />}
          {group.tools.map((tool) => {
            const active = getToolButtonState({
              toolId: tool.id,
              activeTool,
              imageBrowserOpen,
              libraryOpen,
            });
            const isShape = tool.id === "shape";
            const isBrush = tool.id === "pen";
            const expanded = isShape
              ? shapeExpanded
              : tool.id === "image"
                ? imageBrowserOpen
                : tool.id === "elements"
                  ? libraryOpen
                  : undefined;
            const controls = isShape
              ? shapeChooserId
              : tool.id === "image"
                ? "image-browser-panel"
                : tool.id === "elements"
                  ? "element-library-panel"
                  : undefined;

            if (isBrush) {
              const currentBrush =
                brushTypes.find((option) => option.id === activeBrushType) ??
                brushTypes[0];
              const disclosureLabel = brushExpanded
                ? "收起画笔选择"
                : "展开画笔选择";
              return (
                <div className="brush-tool-buttons" key={tool.id}>
                  <ToolButton
                    tool={tool}
                    active={active}
                    disabled={disabled}
                    accessibleName={`使用当前画笔：${currentBrush.label} (P)`}
                    onClick={() => onSelectTool("pen")}
                  />
                  <button
                    ref={brushDisclosureRef}
                    type="button"
                    className="brush-tool-disclosure"
                    aria-label={disclosureLabel}
                    aria-expanded={brushExpanded}
                    aria-controls={brushChooserId}
                    title={disclosureLabel}
                    disabled={disabled}
                    onClick={() => {
                      setShapeExpanded(false);
                      setBrushExpanded((value) => !value);
                    }}
                  >
                    <CaretDown size={12} aria-hidden="true" />
                  </button>
                </div>
              );
            }

            if (isShape) {
              const recentShape = lastShapeTool === "area" ? "area" : "circle";
              const recentShapeLabel = recentShape === "area" ? "区域" : "圆形";
              const mainLabel = `使用最近形状：${recentShapeLabel}`;
              const disclosureLabel = shapeExpanded ? "收起形状选择" : "展开形状选择";
              return (
                <div className="shape-tool-buttons" key={tool.id}>
                  <ToolButton
                    tool={tool}
                    active={active}
                    disabled={disabled}
                    accessibleName={mainLabel}
                    onClick={() => onSelectShape(recentShape)}
                  />
                  <button
                    ref={shapeDisclosureRef}
                    type="button"
                    className="shape-tool-disclosure"
                    aria-label={disclosureLabel}
                    aria-expanded={shapeExpanded}
                    aria-controls={shapeChooserId}
                    title={disclosureLabel}
                    disabled={disabled}
                    onClick={() => {
                      setBrushExpanded(false);
                      setShapeExpanded((value) => !value);
                    }}
                    onKeyDown={(event) => {
                      if (!shapeExpanded) return;
                      handlePopoverEscape(event, {
                        close: () => setShapeExpanded(false),
                        trigger: shapeDisclosureRef.current,
                      });
                    }}
                  >
                    <CaretDown size={12} aria-hidden="true" />
                  </button>
                </div>
              );
            }

            return (
              <ToolButton
                key={tool.id}
                tool={tool}
                active={active}
                disabled={disabled}
                expanded={expanded}
                controls={controls}
                onClick={() => handleTool(tool)}
              />
            );
          })}
        </div>
      ))}
      <div className="editor-tool-group history-tool-group" role="group" aria-label="历史记录">
        <span className="editor-tool-divider" aria-hidden="true" />
        <button
          type="button"
          className="editor-tool-button editor-history-tool"
          aria-label="撤销"
          title="撤销 (Ctrl+Z)"
          disabled={disabled || !canUndo}
          onClick={onUndo}
        >
          <ArrowCounterClockwise size={21} aria-hidden="true" />
          <span className="editor-tool-label">撤销</span>
        </button>
        <button
          type="button"
          className="editor-tool-button editor-history-tool"
          aria-label="重做"
          title="重做 (Ctrl+Shift+Z)"
          disabled={disabled || !canRedo}
          onClick={onRedo}
        >
          <ArrowClockwise size={21} aria-hidden="true" />
          <span className="editor-tool-label">重做</span>
        </button>
      </div>
      {brushExpanded && (
        <div
          id={brushChooserId}
          className="brush-tool-chooser"
          role="group"
          aria-label="画笔类型"
          onKeyDown={(event) =>
            handlePopoverEscape(event, {
              close: () => setBrushExpanded(false),
              trigger: brushDisclosureRef.current,
            })
          }
        >
          {brushTypes.map((brush) => (
            <button
              type="button"
              key={brush.id}
              className={activeBrushType === brush.id ? "active" : ""}
              aria-pressed={activeBrushType === brush.id}
              disabled={disabled}
              onClick={() =>
                selectPopoverOption({
                  select: () => onSelectBrushType(brush.id),
                  close: () => setBrushExpanded(false),
                  trigger: brushDisclosureRef.current,
                })
              }
            >
              {brush.label}
            </button>
          ))}
        </div>
      )}
      {shapeExpanded && (
        <div
          id={shapeChooserId}
          className="shape-tool-chooser"
          role="group"
          aria-label="形状类型"
          onKeyDown={(event) =>
            handlePopoverEscape(event, {
              close: () => setShapeExpanded(false),
              trigger: shapeDisclosureRef.current,
            })
          }
        >
          <button
            type="button"
            className={activeTool === "circle" ? "active" : ""}
            aria-label="圆形"
            aria-pressed={activeTool === "circle"}
            title="圆形"
            disabled={disabled}
            onClick={() =>
              selectPopoverOption({
                select: () => onSelectShape("circle"),
                close: () => setShapeExpanded(false),
                trigger: shapeDisclosureRef.current,
              })
            }
          >
            <Circle size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={activeTool === "area" ? "active" : ""}
            aria-label="区域"
            aria-pressed={activeTool === "area"}
            title="区域"
            disabled={disabled}
            onClick={() =>
              selectPopoverOption({
                select: () => onSelectShape("area"),
                close: () => setShapeExpanded(false),
                trigger: shapeDisclosureRef.current,
              })
            }
          >
            <Square size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function ColorControl({ color, disabled, onChange }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreColorsId = useId();
  const nativeColorId = useId();
  const moreColorsTriggerRef = useRef(null);

  const renderSwatch = (value) => {
    const active = color?.toLowerCase() === value;
    return (
      <button
        type="button"
        key={value}
        className={`context-color-swatch ${active ? "active" : ""} ${value === "#ffffff" ? "light" : ""}`}
        style={{ backgroundColor: value }}
        aria-label={`颜色 ${value}`}
        aria-pressed={active}
        title={`颜色 ${value}`}
        disabled={disabled}
        onClick={() => {
          selectPopoverOption({
            select: () => onChange({ color: value }),
            close: () => setMoreOpen(false),
            trigger: moreColorsTriggerRef.current,
          });
        }}
      >
        {active && <Check size={12} weight="bold" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <div className="context-control context-color-control" role="group" aria-label="颜色">
      <span className="context-control-label">颜色</span>
      <div className="more-color-wrap">
        <button
          ref={moreColorsTriggerRef}
          type="button"
          className="more-color-button"
          title="更多颜色"
          aria-expanded={moreOpen}
          aria-controls={moreColorsId}
          disabled={disabled}
          onClick={() => setMoreOpen((value) => !value)}
          onKeyDown={(event) => {
            if (!moreOpen) return;
            handlePopoverEscape(event, {
              close: () => setMoreOpen(false),
              trigger: moreColorsTriggerRef.current,
            });
          }}
        >
          <span
            className="active-color-chip"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <CaretDown size={13} aria-hidden="true" />
        </button>
        {moreOpen && (
          <div
            id={moreColorsId}
            className="more-color-popover"
            role="group"
            aria-label="更多颜色"
            onKeyDown={(event) =>
              handlePopoverEscape(event, {
                close: () => setMoreOpen(false),
                trigger: moreColorsTriggerRef.current,
              })
            }
          >
            {[...quickColors, ...moreColors].map(renderSwatch)}
            <label className="native-color-control" htmlFor={nativeColorId}>
              自定义
              <input
                id={nativeColorId}
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(color || "") ? color : "#303238"}
                disabled={disabled}
                aria-label="自定义颜色"
                onChange={(event) =>
                  selectPopoverOption({
                    select: () => onChange({ color: event.target.value }),
                    close: () => setMoreOpen(false),
                    trigger: moreColorsTriggerRef.current,
                  })
                }
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function RangeControl({ id, label, value, min, max, step, suffix = "", disabled, onChange }) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  const commitDraft = () => {
    const update = commitRangeDraft(draft, {
      currentValue: value,
      min,
      max,
      step,
    });
    applyRangeControlUpdate(update, { setDraft, onChange });
  };

  return (
    <div className="context-control context-range-control">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const update = getRangeSliderUpdate(event.target.value, {
            currentValue: value,
            min,
            max,
            step,
          });
          applyRangeControlUpdate(update, { setDraft, onChange });
        }}
      />
      <span className="context-number-wrap">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          aria-label={`${label}数值`}
          disabled={disabled}
          onFocus={() => setEditing(true)}
          onChange={(event) => {
            const update = getRangeDraftUpdate(event.target.value);
            setDraft(update.draft);
          }}
          onBlur={() => {
            setEditing(false);
            commitDraft();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitDraft();
          }}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </span>
    </div>
  );
}

export function EditorContextBar({
  activeTool,
  activeBrushType = "pencil",
  selectedKind,
  style = {},
  disabled = false,
  onStyleChange,
  onSelectBrushType,
  textSizes = [],
  selectionActions = [],
}) {
  const sizeId = useId();
  const opacityId = useId();
  const eraserSizeId = useId();
  const controls = getRelevantControls({ activeTool, selectedKind });

  return (
    <div
      className="editor-context-bar"
      role="toolbar"
      aria-label="工具属性"
      aria-disabled={disabled}
    >
      {activeTool === "pen" && (
        <div className="context-control brush-type-control">
          <label htmlFor="active-brush-type">画笔</label>
          <select
            id="active-brush-type"
            value={activeBrushType}
            disabled={disabled}
            onChange={(event) => onSelectBrushType?.(event.target.value)}
          >
            {brushTypes.map((brush) => (
              <option key={brush.id} value={brush.id}>
                {brush.label}
              </option>
            ))}
          </select>
          <span
            className={`brush-stroke-preview brush-${activeBrushType}`}
            style={{
              "--stroke-color": style.color,
              "--stroke-opacity": (style.opacity ?? 100) / 100,
              "--stroke-size": `${Math.max(2, Math.min(9, style.size ?? 3))}px`,
            }}
            aria-hidden="true"
          />
        </div>
      )}
      {controls.length === 0 && <span className="context-empty">选择画布对象以编辑</span>}
      {controls.includes("color") && (
        <ColorControl color={style.color} disabled={disabled} onChange={onStyleChange} />
      )}
      {controls.includes("size") && (
        <RangeControl
          id={sizeId}
          label="线宽"
          value={style.size ?? 3}
          min="1"
          max="24"
          step="1"
          disabled={disabled}
          onChange={(size) => onStyleChange({ size })}
        />
      )}
      {controls.includes("opacity") && (
        <RangeControl
          id={opacityId}
          label="不透明度"
          value={style.opacity ?? 100}
          min="10"
          max="100"
          step="10"
          suffix="%"
          disabled={disabled}
          onChange={(opacity) => onStyleChange({ opacity })}
        />
      )}
      {controls.includes("eraser-size") && (
        <RangeControl
          id={eraserSizeId}
          label="橡皮大小"
          value={style.size ?? 24}
          min="8"
          max="80"
          step="1"
          disabled={disabled}
          onChange={(size) => onStyleChange({ size })}
        />
      )}
      {controls.includes("smoothing") && (
        <div className="context-control smoothing-control" role="group" aria-label="笔触稳定器">
          <label className="context-control-label" htmlFor="stroke-smoothing">稳定</label>
          <select
            id="stroke-smoothing"
            value={style.smoothing}
            disabled={disabled}
            onChange={(event) => onStyleChange({ smoothing: event.target.value })}
          >
            {stabilizerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {controls.includes("text-size") && (
        <div className="context-control text-size-control" role="group" aria-label="字号">
          <span className="context-control-label">字号</span>
          {textSizes.map((option) => (
            <button
              type="button"
              key={option.id}
              className={style.size === option.id ? "active" : ""}
              title={option.label}
              aria-pressed={style.size === option.id}
              disabled={disabled}
              onClick={() => onStyleChange({ size: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {controls.includes("object-actions") && (
        <div className="context-control selection-actions" role="group" aria-label="对象操作">
          {selectionActions.length === 0 && <span className="context-empty">对象操作位于画布上</span>}
          {selectionActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                type="button"
                key={action.id}
                aria-label={action.label}
                title={action.label}
                disabled={disabled || action.disabled}
                onClick={action.onClick}
              >
                {Icon && <Icon size={17} aria-hidden="true" />}
                {!Icon && action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const layerIcons = {
  media: ImageSquare,
  figure: GridFour,
  text: TextT,
  drawing: PencilSimple,
  base: LockSimple,
};

export function EditorUtilityDock({
  layerCount = 0,
  layersOpen = false,
  layers = [],
  selectedId = null,
  disabled = false,
  onToggleLayers,
  onSelectLayer,
  onToggleLayerVisibility,
}) {
  return (
    <div className="editor-utility-dock">
      {layersOpen && (
        <aside className="session-layers-panel" aria-label="本次编辑图层">
          <header>
            <div>
              <strong>图层</strong>
              <span>仅本次编辑有效</span>
            </div>
            <button type="button" aria-label="关闭图层" onClick={onToggleLayers}>
              <X size={15} aria-hidden="true" />
            </button>
          </header>
          <div className="session-layer-list">
            {layers.map((layer) => {
              const LayerIcon = layerIcons[layer.kind] ?? Stack;
              return (
                <div
                  className={`session-layer-row ${selectedId === layer.id ? "selected" : ""}`}
                  key={layer.id}
                >
                <button
                  type="button"
                  className="session-layer-main"
                  disabled={disabled || layer.kind === "drawing" || layer.locked}
                  onClick={() => onSelectLayer(layer)}
                >
                  <span className={`session-layer-kind kind-${layer.kind}`} aria-hidden="true">
                    <LayerIcon size={14} />
                  </span>
                  <span>{layer.label}</span>
                </button>
                {layer.locked ? (
                  <span className="session-layer-lock" title="底图已锁定">
                    <LockSimple size={15} aria-hidden="true" />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="session-layer-visibility"
                    aria-label={`${layer.visible ? "隐藏" : "显示"}${layer.label}`}
                    disabled={disabled}
                    onClick={() => onToggleLayerVisibility(layer)}
                  >
                    {layer.visible ? (
                      <Eye size={16} aria-hidden="true" />
                    ) : (
                      <EyeSlash size={16} aria-hidden="true" />
                    )}
                  </button>
                )}
                </div>
              );
            })}
          </div>
        </aside>
      )}
      <div className="editor-utility-actions" role="toolbar" aria-label="辅助面板">
        <button
          type="button"
          className={layersOpen ? "active" : ""}
          aria-pressed={layersOpen}
          disabled={disabled}
          onClick={onToggleLayers}
        >
          <Stack size={17} aria-hidden="true" />
          图层 {layerCount}
        </button>
      </div>
    </div>
  );
}
