import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowsOutSimple,
  CaretDown,
  Check,
  CornersOut,
  CursorClick,
  DownloadSimple,
  FlipHorizontal,
  GridFour,
  ImageSquare,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  PaintBrush,
  PencilSimple,
  PersonSimple,
  PersonSimpleWalk,
  Plus,
  Sparkle,
  Trash,
  UploadSimple,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import {
  EditorContextBar,
  EditorToolRail,
  EditorUtilityDock,
} from "./EditorChrome";
import {
  annotationTextSizes,
  getAnnotationArrow,
  getAnnotationTextSize,
  getAnnotationShape,
  isMeaningfulAnnotationArrow,
  isMeaningfulAnnotationShape,
  normalizeAnnotationText,
  upsertAnnotationText,
  wrapAnnotationText,
} from "./annotationDrawing";
import {
  artboardRatioOptions,
  getAvailableArtboardSize,
  getAspectRatioValue,
  getContainTransform,
  getFitArtboardSize,
  transformEditorObjects,
} from "./artboardLayout";
import { assetUrl } from "./assetUrl";
import {
  canvasContextMenuActions,
  createBlankSketchEditorSession,
  createImageBrushEditorSession,
  createOrdinaryImageNode,
  getEditorCapabilities,
  getNodeQuickActions,
  getSavedNodePosition,
  savedImageNodePresentation,
  topBarActions,
} from "./canvasPresentation";
import {
  commitEditorSnapshot,
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "./editorHistory";
import {
  canCanvasCapturePointer,
  canSaveEditor,
  getPanelStateAfterInsert,
  keepSelectionOnPlacedObjectClick,
} from "./editorSessionRules";
import {
  createInitialToolSession,
  getToolFromShortcut,
  selectBrushType as applyBrushTypeSelection,
  updateToolStyle,
} from "./editorToolModel";
import {
  getSessionLayers,
  moveSessionLayer,
  setSessionLayerVisibility,
} from "./editorSessionLayers";
import {
  armTransientAssetClickSuppression,
  createMediaInsertCoordinator,
  getElementDropPlacement,
  preventNativeAssetDrag,
  shouldStartAssetPointerDrag,
} from "./editorMedia";
import { elementCategories, elementTemplates } from "./elementLibrary";
import {
  createOneShotScenario,
  readPrototypeScenario,
} from "./prototypeScenarios";
import {
  createSaveTransaction,
  saveAssetStage,
  saveNodeStage,
} from "./saveTransaction";
import {
  applyCanvasStrokeStyle,
  compositeDrawingCanvas,
  createDrawingGesture,
  getGestureCompletion,
  getRenderedPenPoint,
  getStraightLine,
} from "./strokeRendering";

const annotationTextBoxWidth = 280;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

function drawAnnotationArrow(context, arrow, color, lineWidth) {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(arrow.start.x, arrow.start.y);
  context.lineTo(arrow.end.x, arrow.end.y);
  context.moveTo(arrow.headLeft.x, arrow.headLeft.y);
  context.lineTo(arrow.end.x, arrow.end.y);
  context.lineTo(arrow.headRight.x, arrow.headRight.y);
  context.stroke();
  context.restore();
}

const projectImages = [
  {
    id: "character-front",
    label: "角色正面图",
    src: assetUrl("assets/character-stand.png"),
  },
  {
    id: "character-duo",
    label: "双人角色参考",
    src: assetUrl("assets/character-duo.png"),
  },
  {
    id: "owl-shot",
    label: "猫头鹰镜头",
    src: assetUrl("assets/owl-reference.jpg"),
  },
];

const topBarIcons = {
  collaboration: UsersThree,
};

function Logo() {
  return (
    <div className="logo-mark" aria-label="SumengAI">
      <span className="logo-fold logo-fold-a" />
      <span className="logo-fold logo-fold-b" />
      <span className="logo-fold logo-fold-c" />
    </div>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <Logo />
      <button className="project-switcher">
        <span>空白画布-26/07/29 10:08:35</span>
        <CaretDown size={15} weight="bold" />
      </button>
      <div className="save-state">
        <Check size={14} />
        已保存草稿 10:08
      </div>
      <div className="topbar-spacer" />
      {topBarActions.map((action) => {
        const Icon = topBarIcons[action.id];
        return (
          <button key={action.id} className="top-icon" aria-label={action.label}>
            <Icon size={18} />
          </button>
        );
      })}
      <div className="credit-pill">
        <Sparkle size={14} weight="fill" />
        1,284
      </div>
      <button className="avatar">苏</button>
    </header>
  );
}

function CanvasViewportControls() {
  return (
    <div className="zoom-controls" onClick={(event) => event.stopPropagation()}>
      <button aria-label="缩小">
        <MagnifyingGlassMinus size={16} />
      </button>
      <span>72%</span>
      <button aria-label="放大">
        <MagnifyingGlassPlus size={16} />
      </button>
      <span className="tool-separator" />
      <button aria-label="适应画布">
        <CornersOut size={16} />
      </button>
      <button aria-label="网格">
        <GridFour size={16} />
      </button>
    </div>
  );
}

function NodeQuickActions({ selected, onImageBrush }) {
  const actions = getNodeQuickActions({ selected, kind: "image" });
  if (!actions.length) return null;

  return (
    <div className="node-quick-actions" role="toolbar" aria-label="图片快捷功能">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          aria-label={action.label}
          title="使用画笔标注图片"
          onClick={(event) => {
            event.stopPropagation();
            onImageBrush();
          }}
        >
          <PaintBrush size={17} weight="fill" />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function CanvasContextMenu({ position, onCreateWhiteboard, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    menuRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="canvas-context-menu"
      role="menu"
      aria-label="画布右键菜单"
      tabIndex={-1}
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCreateWhiteboard();
          onClose();
        }}
      >
        <span className="context-menu-icon">
          <PaintBrush size={17} />
        </span>
        <span>{canvasContextMenuActions[0].label}</span>
      </button>
    </div>
  );
}

function SourceImageNode({ selected, onSelect, onImageBrush }) {
  return (
    <article
      className={`canvas-node source-node ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <NodeQuickActions selected={selected} onImageBrush={onImageBrush} />
      <header className="node-title-row">
        <div className="node-title">
          <ImageSquare size={18} />
          图片节点 18 - 副本.png
        </div>
        <button aria-label="下载" className="node-ghost-action">
          <DownloadSimple size={18} />
        </button>
      </header>
      <div className="node-image-wrap">
        <span className="ai-badge">AI生成</span>
        <img src={assetUrl("assets/owl-reference.jpg")} alt="一只迎面飞来的猫头鹰" />
        <button className="expand-button" aria-label="预览大图">
          <ArrowsOutSimple size={18} />
        </button>
      </div>
      <button className="node-plus" aria-label="连接新节点">
        <Plus size={22} weight="bold" />
      </button>
    </article>
  );
}

function SketchPreview({ dataUrl }) {
  return (
    <div className="sketch-preview">
      {dataUrl ? (
        <img className="stroke-preview" src={dataUrl} alt="保存的手绘草图" />
      ) : (
        <div className="empty-preview-lines">
          <PersonSimple size={56} />
          <ArrowRight size={88} color="#ee4d5b" />
          <PersonSimpleWalk size={44} />
        </div>
      )}
    </div>
  );
}

function SavedSketchNode({ node, index, selected, onSelect, onImageBrush }) {
  return (
    <article
      className={`canvas-node sketch-node ${selected ? "selected" : ""}`}
      style={getSavedNodePosition(index)}
      onClick={onSelect}
    >
      <NodeQuickActions selected={selected} onImageBrush={onImageBrush} />
      {savedImageNodePresentation.titlePlacement === "outside" && (
        <div className="saved-node-title">
          <ImageSquare size={18} />
          {node.annotation ? "图片标注" : "手绘草图"} · {node.id}
        </div>
      )}
      <SketchPreview dataUrl={node.dataUrl} />
      <button className="node-plus" aria-label="连接新节点">
        <Plus size={22} weight="bold" />
      </button>
    </article>
  );
}

function ShapeLibrary({
  open,
  onClose,
  onInsert,
  onDragMove,
  onDragDrop,
  onDragCancel,
  loadFailed,
  onRetry,
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef(null);
  const ignoreNextClickRef = useRef(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTemplates = elementTemplates.filter((template) => {
    const matchesCategory =
      activeCategory === "all" || template.category === activeCategory;
    const matchesQuery =
      !normalizedQuery ||
      `${template.label} ${template.keywords}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }).sort((a, b) => {
    if (!normalizedQuery) return 0;
    const score = (template) => {
      const label = template.label.toLowerCase();
      if (label === normalizedQuery) return 0;
      if (label.startsWith(normalizedQuery)) return 1;
      if (label.includes(normalizedQuery)) return 2;
      return 3;
    };
    return score(a) - score(b);
  });

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.active && !shouldStartAssetPointerDrag(drag, event)) {
        return;
      }
      drag.active = true;
      setDraggingId(drag.template.id);
      onDragMove(drag.template, event);
    };

    const handlePointerUp = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.active) {
        ignoreNextClickRef.current = true;
        onDragDrop(drag.template, event);
      }
      dragRef.current = null;
      setDraggingId(null);
    };

    const handlePointerCancel = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDraggingId(null);
      onDragCancel();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [open, onDragMove, onDragDrop, onDragCancel]);

  if (!open) return null;

  if (loadFailed) {
    return (
      <aside
        id="element-library-panel"
        className="shape-library"
        aria-label="元素库"
      >
        <header>
          <div>
            <strong>元素库</strong>
            <span>内置手绘素材</span>
          </div>
          <button onClick={onClose} aria-label="收起元素库">
            <X size={16} />
          </button>
        </header>
        <div className="panel-error" role="alert">
          <GridFour size={28} />
          <strong>元素库暂时无法加载</strong>
          <span>不影响继续绘画、标注或保存</span>
          <button type="button" onClick={onRetry}>
            <ArrowClockwise size={15} />
            重新加载
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="element-library-panel"
      className="shape-library"
      aria-label="元素库"
    >
      <header>
        <div>
          <strong>元素库</strong>
          <span>内置手绘素材</span>
        </div>
        <button onClick={onClose} aria-label="收起元素库">
          <X size={16} />
        </button>
      </header>
      <label className="library-search">
        <MagnifyingGlass size={15} />
        <input
          type="search"
          value={query}
          placeholder="搜索房子、路灯、椅子…"
          aria-label="搜索元素"
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value) setActiveCategory("all");
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="清空搜索"
            onClick={() => setQuery("")}
          >
            <X size={13} />
          </button>
        )}
      </label>
      <nav className="library-tabs" aria-label="元素分类">
        {elementCategories.map((category) => (
          <button
            key={category.id}
            className={activeCategory === category.id ? "active" : ""}
            aria-pressed={activeCategory === category.id}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </nav>
      {filteredTemplates.length ? (
        <div className="template-grid">
          {filteredTemplates.map((template) => {
            return (
              <button
                className={`template-card ${draggingId === template.id ? "dragging" : ""}`}
                key={template.id}
                onClick={() => {
                  if (ignoreNextClickRef.current) {
                    ignoreNextClickRef.current = false;
                    return;
                  }
                  onInsert(template);
                }}
                aria-label={`拖拽或点击添加${template.label}`}
                title="拖拽到画板，或点击添加"
                onDragStart={preventNativeAssetDrag}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  dragRef.current = {
                    pointerId: event.pointerId,
                    template,
                    startX: event.clientX,
                    startY: event.clientY,
                    active: false,
                  };
                }}
              >
                <span className="template-figure">
                  <img src={template.asset} alt="" />
                </span>
                <span>{template.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="library-empty" role="status">
          <MagnifyingGlass size={22} />
          <strong>没有找到“{query}”</strong>
          <span>换个关键词试试</span>
        </div>
      )}
      <p>
        {normalizedQuery
          ? `找到 ${filteredTemplates.length} 个元素`
          : "拖拽到画面定位；点击则添加到画面中央"}
      </p>
    </aside>
  );
}

export function ImageBrowser({
  open,
  onClose,
  onInsert,
  onDragMove,
  onDragDrop,
  onDragCancel,
  error,
}) {
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef(null);
  const ignoreNextClickRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.active && !shouldStartAssetPointerDrag(drag, event)) return;
      drag.active = true;
      setDraggingId(drag.asset.id);
      onDragMove(drag.asset, event);
    };

    const handlePointerUp = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.active) {
        armTransientAssetClickSuppression(ignoreNextClickRef);
        onDragDrop(drag.asset, event);
      }
      dragRef.current = null;
      setDraggingId(null);
    };

    const handlePointerCancel = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDraggingId(null);
      onDragCancel();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [open, onDragMove, onDragDrop, onDragCancel]);

  if (!open) return null;

  return (
    <aside
      id="image-browser-panel"
      className="image-browser"
      aria-label="图片浏览器"
    >
      <header>
        <div>
          <ImageSquare size={18} />
          <strong>添加图片</strong>
        </div>
        <button onClick={onClose} aria-label="关闭图片浏览器">
          <X size={16} />
        </button>
      </header>
      <div className="image-browser-tabs" role="tablist" aria-label="图片来源">
        <button className="active" role="tab" aria-selected="true">
          项目图片
        </button>
        <label className="upload-image-action">
          <UploadSimple size={15} />
          本地上传
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onInsert({
                id: `upload-${Date.now()}`,
                label: file.name,
                src: URL.createObjectURL(file),
              });
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error && (
        <div className="image-load-error" role="alert">
          {error}
        </div>
      )}
      <div className="project-image-grid">
        {projectImages.map((image) => (
          <button
            key={image.id}
            className={draggingId === image.id ? "dragging" : ""}
            aria-label={`拖拽或点击添加${image.label}`}
            title="拖拽到画板，或点击添加到中央"
            onClick={() => {
              if (ignoreNextClickRef.current) {
                ignoreNextClickRef.current = false;
                return;
              }
              onInsert(image);
            }}
            onDragStart={preventNativeAssetDrag}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              dragRef.current = {
                pointerId: event.pointerId,
                asset: image,
                startX: event.clientX,
                startY: event.clientY,
                active: false,
              };
            }}
          >
            <span>
              <img src={image.src} alt="" draggable="false" />
            </span>
            <strong>{image.label}</strong>
          </button>
        ))}
      </div>
      <p>拖拽到画板定位；点击则添加到画面中央</p>
    </aside>
  );
}

function PlacedFigure({
  item,
  selected,
  onSelect,
  onMove,
  onInteractionStart,
}) {
  const dragRef = useRef(null);

  const handlePointerDown = (event) => {
    event.stopPropagation();
    onSelect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: item.x,
      top: item.y,
      historyCaptured: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    if (!dragRef.current.historyCaptured) {
      onInteractionStart();
      dragRef.current.historyCaptured = true;
    }
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    const deltaX =
      ((event.clientX - dragRef.current.x) / bounds.width) * 100;
    const deltaY =
      ((event.clientY - dragRef.current.y) / bounds.height) * 100;
    onMove({
      x: Math.min(92, Math.max(4, dragRef.current.left + deltaX)),
      y: Math.min(86, Math.max(4, dragRef.current.top + deltaY)),
    });
  };

  return (
    <button
      className={`placed-figure ${selected ? "selected" : ""}`}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width + 20}px`,
        height: `${item.height + 20}px`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale}) scaleX(${item.flipped ? -1 : 1})`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={keepSelectionOnPlacedObjectClick}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      aria-label={`移动${item.label}`}
    >
      <img
        src={item.asset}
        alt=""
        style={{ width: `${item.width}px`, height: `${item.height}px` }}
      />
      {selected && (
        <>
          <span className="selection-handle top-left" />
          <span className="selection-handle top-right" />
          <span className="selection-handle bottom-left" />
          <span className="selection-handle bottom-right" />
          <span className="rotation-handle" />
        </>
      )}
    </button>
  );
}

function PlacedText({
  item,
  selected,
  onSelect,
  onMove,
  onInteractionStart,
  viewScale,
  onEdit,
}) {
  const dragRef = useRef(null);

  const handlePointerDown = (event) => {
    event.stopPropagation();
    onSelect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: item.x,
      top: item.y,
      historyCaptured: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    if (!dragRef.current.historyCaptured) {
      onInteractionStart();
      dragRef.current.historyCaptured = true;
    }
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    const unscaledWidth = bounds.width / viewScale;
    const unscaledHeight = bounds.height / viewScale;
    const deltaX = (event.clientX - dragRef.current.x) / viewScale;
    const deltaY = (event.clientY - dragRef.current.y) / viewScale;
    onMove({
      x: Math.min(
        unscaledWidth - annotationTextBoxWidth - 8,
        Math.max(8, dragRef.current.left + deltaX),
      ),
      y: Math.min(
        unscaledHeight - getAnnotationTextSize(item.size) * 2,
        Math.max(8, dragRef.current.top + deltaY),
      ),
    });
  };

  return (
    <button
      className={`placed-text ${selected ? "selected" : ""}`}
      style={{
        left: item.x,
        top: item.y,
        width: annotationTextBoxWidth,
        color: item.color,
        fontSize: getAnnotationTextSize(item.size),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={keepSelectionOnPlacedObjectClick}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
      aria-label={`移动文字：${item.value}`}
      title="拖动文字，双击编辑"
    >
      {item.value}
    </button>
  );
}

function PlacedMedia({
  item,
  selected,
  onSelect,
  onMove,
  onInteractionStart,
  viewScale,
}) {
  const dragRef = useRef(null);

  const handlePointerDown = (event) => {
    event.stopPropagation();
    onSelect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: item.x,
      top: item.y,
      historyCaptured: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    if (!dragRef.current.historyCaptured) {
      onInteractionStart();
      dragRef.current.historyCaptured = true;
    }
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    const unscaledWidth = bounds.width / viewScale;
    const unscaledHeight = bounds.height / viewScale;
    const width = item.width * item.scale;
    const height = item.height * item.scale;
    const deltaX = (event.clientX - dragRef.current.x) / viewScale;
    const deltaY = (event.clientY - dragRef.current.y) / viewScale;
    onMove({
      x: Math.min(
        unscaledWidth - width - 8,
        Math.max(8, dragRef.current.left + deltaX),
      ),
      y: Math.min(
        unscaledHeight - height - 8,
        Math.max(8, dragRef.current.top + deltaY),
      ),
    });
  };

  return (
    <button
      className={`placed-media ${selected ? "selected" : ""}`}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg) scale(${item.scale}) scaleX(${item.flipped ? -1 : 1})`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={keepSelectionOnPlacedObjectClick}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      aria-label={`移动图片：${item.label}`}
    >
      <img src={item.src} alt="" />
    </button>
  );
}

function SketchEditor({
  background,
  onClose,
  onSave,
  scenarioController,
}) {
  const hasImageBackground = background?.type === "image";
  const baseImage = hasImageBackground ? background.src : null;
  const capabilities = getEditorCapabilities({ kind: "drawing", background });
  const artboardRef = useRef(null);
  const canvasRef = useRef(null);
  const [toolSession, setToolSession] = useState(() =>
    createInitialToolSession({ hasImageBackground }),
  );
  const tool = toolSession.activeTool;
  const activeStyle = toolSession.styles[tool] ?? {};
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imageBrowserOpen, setImageBrowserOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [figures, setFigures] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [textItems, setTextItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawingVisible, setDrawingVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [textDraft, setTextDraft] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [baseImageAspect, setBaseImageAspect] = useState(16 / 9);
  const [zoom, setZoom] = useState(100);
  const [libraryLoadFailed, setLibraryLoadFailed] = useState(false);
  const [imageLoadError, setImageLoadError] = useState("");
  const [elementDragOver, setElementDragOver] = useState(false);
  const [elementDragPreview, setElementDragPreview] = useState(null);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [imageDragPreview, setImageDragPreview] = useState(null);
  const [availableArtboardSize, setAvailableArtboardSize] = useState(() =>
    getAvailableArtboardSize({
      width: window.innerWidth - (window.innerWidth >= 1080 && layersOpen ? 180 : 0),
      height: window.innerHeight,
    }),
  );
  const drawingRef = useRef(null);
  const textInputRef = useRef(null);
  const historyRef = useRef(createEditorHistory());
  const pendingRatioRef = useRef(null);
  const saveTransactionIdRef = useRef(null);
  const latestEditorStateRef = useRef(null);
  const mediaInsertCoordinatorRef = useRef(null);
  const mediaInsertSequenceRef = useRef(0);
  const [, setHistoryRevision] = useState(0);
  const artboardAspect =
    hasImageBackground
      ? baseImageAspect
      : getAspectRatioValue(aspectRatio);
  const artboardSize = getFitArtboardSize(
    availableArtboardSize,
    artboardAspect,
  );
  const hasContent =
    hasDrawn ||
    figures.length > 0 ||
    mediaItems.length > 0 ||
    textItems.length > 0;
  const hasVisibleContent =
    (hasDrawn && drawingVisible) ||
    figures.some((item) => item.visible !== false) ||
    mediaItems.some((item) => item.visible !== false) ||
    textItems.some((item) => item.visible !== false);
  const sessionLayers = getSessionLayers({
    hasImageBackground,
    hasDrawn,
    drawingVisible,
    mediaItems,
    figures,
    textItems,
  });
  const hasPendingText = Boolean(
    normalizeAnnotationText(textDraft?.value ?? ""),
  );
  const hasSessionChanges = hasContent || hasPendingText;
  const canSave = canSaveEditor({
    hasContent: hasVisibleContent,
    isSaving,
    hasPendingText: Boolean(textDraft),
  });

  useEffect(() => {
    const updateAvailableSize = () => {
      setAvailableArtboardSize(
        getAvailableArtboardSize({
          width: window.innerWidth - (window.innerWidth >= 1080 && layersOpen ? 180 : 0),
          height: window.innerHeight,
        }),
      );
    };
    window.addEventListener("resize", updateAvailableSize);
    return () => window.removeEventListener("resize", updateAvailableSize);
  }, [layersOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const previous = document.createElement("canvas");
    previous.width = canvas.width;
    previous.height = canvas.height;
    if (canvas.width && canvas.height) {
      previous.getContext("2d").drawImage(canvas, 0, 0);
    }

    const fitCanvas = () => {
      const rect = {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      };
      canvas.width = Math.max(1, Math.round(rect.width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * window.devicePixelRatio));
      const context = canvas.getContext("2d");
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      if (previous.width > 0) {
        const pending = pendingRatioRef.current;
        if (pending) {
          const transform = getContainTransform(pending.fromSize, {
            width: rect.width,
            height: rect.height,
          });
          context.drawImage(
            previous,
            transform.offsetX,
            transform.offsetY,
            pending.fromSize.width * transform.scale,
            pending.fromSize.height * transform.scale,
          );
          const transformed = transformEditorObjects(
            pending.objects,
            pending.fromSize,
            { width: rect.width, height: rect.height },
          );
          setFigures(transformed.figures);
          setMediaItems(transformed.mediaItems);
          setTextItems(transformed.textItems);
          pendingRatioRef.current = null;
        } else {
          context.drawImage(previous, 0, 0, rect.width, rect.height);
        }
      }
    };
    fitCanvas();
  }, [artboardSize.width, artboardSize.height]);

  const readCanvasDataUrl = () => canvasRef.current?.toDataURL() ?? "";

  useLayoutEffect(() => {
    latestEditorStateRef.current = {
      aspectRatio,
      figures,
      mediaItems,
      textItems,
      hasDrawn,
      drawingVisible,
      selectedId,
      activeTool: tool,
    };
  }, [
    aspectRatio,
    drawingVisible,
    figures,
    hasDrawn,
    mediaItems,
    selectedId,
    textItems,
    tool,
  ]);

  const createEditorSnapshot = (state = latestEditorStateRef.current) => {
    const current = state ?? {
      aspectRatio,
      figures,
      mediaItems,
      textItems,
      hasDrawn,
      drawingVisible,
      selectedId,
    };
    return {
      aspectRatio: current.aspectRatio,
      figures: current.figures,
      mediaItems: current.mediaItems,
      textItems: current.textItems,
      hasDrawn: current.hasDrawn,
      drawingVisible: current.drawingVisible ?? true,
      selectedId: current.selectedId ?? null,
      canvasDataUrl: current.canvasDataUrl ?? readCanvasDataUrl(),
    };
  };

  const commitHistory = (snapshot = createEditorSnapshot()) => {
    historyRef.current = commitEditorSnapshot(
      historyRef.current,
      snapshot,
    );
    setHistoryRevision((value) => value + 1);
  };

  const redrawCanvasData = (dataUrl) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = {
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        };
        canvas.width = Math.max(1, Math.round(rect.width * window.devicePixelRatio));
        canvas.height = Math.max(
          1,
          Math.round(rect.height * window.devicePixelRatio),
        );
        const context = canvas.getContext("2d");
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.clearRect(0, 0, rect.width, rect.height);
        if (!dataUrl) return;
        const image = new Image();
        image.onload = () => {
          context.clearRect(0, 0, rect.width, rect.height);
          context.drawImage(image, 0, 0, rect.width, rect.height);
        };
        image.src = dataUrl;
      });
    });
  };

  const restoreEditorSnapshot = (snapshot) => {
    setAspectRatio(snapshot.aspectRatio);
    setFigures(snapshot.figures);
    setMediaItems(snapshot.mediaItems);
    setTextItems(snapshot.textItems);
    setHasDrawn(snapshot.hasDrawn);
    setDrawingVisible(snapshot.drawingVisible ?? true);
    setSelectedId(snapshot.selectedId ?? null);
    setTextDraft(null);
    redrawCanvasData(snapshot.canvasDataUrl);
  };

  const undo = () => {
    const result = undoEditorHistory(
      historyRef.current,
      createEditorSnapshot(),
    );
    if (!result.snapshot) return;
    historyRef.current = result.history;
    restoreEditorSnapshot(result.snapshot);
    setHistoryRevision((value) => value + 1);
  };

  const redo = () => {
    const result = redoEditorHistory(
      historyRef.current,
      createEditorSnapshot(),
    );
    if (!result.snapshot) return;
    historyRef.current = result.history;
    restoreEditorSnapshot(result.snapshot);
    setHistoryRevision((value) => value + 1);
  };

  const changeAspectRatio = (nextRatio) => {
    if (nextRatio === aspectRatio) return;
    commitHistory();
    const rect = {
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
    };
    pendingRatioRef.current = {
      fromSize: { width: rect.width, height: rect.height },
      objects: { figures, mediaItems, textItems },
    };
    setAspectRatio(nextRatio);
    setSelectedId(null);
    setZoom(100);
  };

  useEffect(() => {
    if (tool !== "text") {
      setTextDraft(null);
      return;
    }
    textInputRef.current?.focus();
  }, [tool, textDraft?.x, textDraft?.y]);

  const pointFromEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const viewScale = zoom / 100;
    return {
      x: (event.clientX - rect.left) / viewScale,
      y: (event.clientY - rect.top) / viewScale,
    };
  };

  const beginDraw = (event) => {
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    const point = pointFromEvent(event);
    if (tool === "text") {
      const rect = {
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight,
      };
      setTextDraft({
        x: Math.max(8, Math.min(point.x, rect.width - 312)),
        y: Math.max(8, Math.min(point.y, rect.height - 120)),
        value: "",
      });
      setSelectedId(null);
      return;
    }

    const historySnapshot = createEditorSnapshot();
    if (!drawingVisible) setDrawingVisible(true);
    const canvas = canvasRef.current;
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);
    drawingRef.current = createDrawingGesture({
      tool,
      style: activeStyle,
      start: point,
      snapshot,
      historySnapshot,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const restoreDrawingSnapshot = (snapshot) => {
    if (!snapshot) return false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(snapshot, 0, 0);
    context.restore();
    return true;
  };

  const draw = (event, { isFinal = false } = {}) => {
    if (!drawingRef.current) return;
    const gesture = drawingRef.current;
    const gestureTool = gesture.tool;
    const gestureStyle = gesture.style;
    const context = canvasRef.current.getContext("2d");
    const point = pointFromEvent(event);
    const previous = gesture.last;

    if (["line", "circle", "area", "arrow"].includes(gestureTool)) {
      const { snapshot, start } = gesture;
      restoreDrawingSnapshot(snapshot);

      if (gestureTool === "line") {
        const line = getStraightLine(start, point);
        context.save();
        applyCanvasStrokeStyle(context, gestureTool, gestureStyle);
        context.beginPath();
        context.moveTo(line.start.x, line.start.y);
        context.lineTo(line.end.x, line.end.y);
        context.stroke();
        context.restore();
        gesture.last = point;
        return;
      }

      if (gestureTool === "arrow") {
        context.save();
        applyCanvasStrokeStyle(context, gestureTool, gestureStyle);
        drawAnnotationArrow(
          context,
          getAnnotationArrow(start, point, gestureStyle.size),
          gestureStyle.color,
          gestureStyle.size,
        );
        context.restore();
        gesture.last = point;
        return;
      }

      const shape = getAnnotationShape(gestureTool, start, point);
      context.save();
      applyCanvasStrokeStyle(context, gestureTool, gestureStyle);
      context.setLineDash(shape.kind === "rectangle" ? [8, 6] : []);
      context.beginPath();
      if (shape.kind === "ellipse") {
        context.ellipse(
          shape.centerX,
          shape.centerY,
          shape.radiusX,
          shape.radiusY,
          0,
          0,
          Math.PI * 2,
        );
      } else {
        context.rect(shape.x, shape.y, shape.width, shape.height);
      }
      context.stroke();
      context.restore();
      gesture.last = point;
      return;
    }

    context.save();
    applyCanvasStrokeStyle(context, gestureTool, gestureStyle);
    context.beginPath();
    if (gestureTool === "pen") {
      const previousRendered = gesture.lastRendered;
      const rendered = getRenderedPenPoint(
        previousRendered,
        point,
        gestureStyle.smoothing,
        { isFinal },
      );
      context.moveTo(previousRendered.x, previousRendered.y);
      context.quadraticCurveTo(
        previousRendered.x,
        previousRendered.y,
        rendered.x,
        rendered.y,
      );
      gesture.lastRendered = rendered;
    } else {
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
    }
    context.stroke();
    context.restore();
    gesture.last = point;
  };

  const finishDraw = (event) => {
    if (!drawingRef.current) return;
    const gesture = drawingRef.current;
    const completion = getGestureCompletion(gesture.tool, "pointerup");

    if (completion === "preview") {
      const end = pointFromEvent(event);
      draw(event);
      const isMeaningful =
        gesture.tool === "arrow"
          ? isMeaningfulAnnotationArrow(gesture.start, end)
          : gesture.tool === "line"
            ? Math.hypot(
                end.x - gesture.start.x,
                end.y - gesture.start.y,
              ) >= 4
            : isMeaningfulAnnotationShape(gesture.start, end);
      if (isMeaningful) {
        commitHistory(gesture.historySnapshot);
        setHasDrawn(true);
      } else {
        restoreDrawingSnapshot(gesture.snapshot);
      }
      drawingRef.current = null;
      return;
    }

    if (completion === "final-segment") {
      draw(event, { isFinal: true });
      commitHistory(gesture.historySnapshot);
      if (gesture.tool === "pen") setHasDrawn(true);
    }

    drawingRef.current = null;
  };

  const cancelDraw = () => {
    if (!drawingRef.current) return;
    const gesture = drawingRef.current;
    if (getGestureCompletion(gesture.tool, "pointercancel") === "cancel") {
      restoreDrawingSnapshot(gesture.snapshot);
    }
    drawingRef.current = null;
  };

  const insertTemplate = (template, dropPosition = null) => {
    commitHistory();
    const id = `${template.id}-${Date.now()}`;
    setFigures((items) => [
      ...items,
      {
        ...template,
        id,
        x: dropPosition?.x ?? 50,
        y: dropPosition?.y ?? 50,
        scale: 1,
        flipped: false,
        rotation: 0,
      },
    ]);
    setSelectedId(id);
    selectTool("select");
    const panelState = getPanelStateAfterInsert();
    setLibraryOpen(panelState.libraryOpen);
    setImageBrowserOpen(panelState.imageBrowserOpen);
  };

  const updateLibraryElementDrag = (template, pointer) => {
    const placement = getElementDropPlacement(
      pointer,
      artboardRef.current.getBoundingClientRect(),
    );
    setElementDragOver(Boolean(placement));
    setElementDragPreview({
      template,
      clientX: pointer.clientX,
      clientY: pointer.clientY,
    });
  };

  const dropLibraryElement = (template, pointer) => {
    const placement = getElementDropPlacement(
      pointer,
      artboardRef.current.getBoundingClientRect(),
    );
    if (placement) insertTemplate(template, placement);
    setElementDragOver(false);
    setElementDragPreview(null);
  };

  const cancelLibraryElementDrag = () => {
    setElementDragOver(false);
    setElementDragPreview(null);
  };

  const selectedFigure = figures.find((item) => item.id === selectedId);
  const selectedMedia = mediaItems.find((item) => item.id === selectedId);
  const selectedText = textItems.find((item) => item.id === selectedId);

  const updateSelected = (patch) => {
    commitHistory();
    setFigures((items) =>
      items.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    );
  };

  const updateSelectedMedia = (patch) => {
    commitHistory();
    setMediaItems((items) =>
      items.map((item) =>
        item.id === selectedId ? { ...item, ...patch } : item,
      ),
    );
  };

  const moveSelectedObjectLayer = (direction) => {
    commitHistory();
    if (selectedFigure) {
      setFigures((items) => moveSessionLayer(items, selectedId, direction));
    }
    if (selectedMedia) {
      setMediaItems((items) => moveSessionLayer(items, selectedId, direction));
    }
    if (selectedText) {
      setTextItems((items) => moveSessionLayer(items, selectedId, direction));
    }
  };

  const selectTool = (nextTool) => {
    setToolSession((session) => {
      const resolvedTool =
        nextTool === "shape" ? session.lastShapeTool : nextTool;
      return {
        ...session,
        activeTool: resolvedTool,
        lastShapeTool: ["circle", "area"].includes(resolvedTool)
          ? resolvedTool
          : session.lastShapeTool,
      };
    });
    if (nextTool !== "select") setSelectedId(null);
    setLibraryOpen(false);
    setImageBrowserOpen(false);
  };

  const selectShapeTool = (nextTool) => {
    selectTool(nextTool);
  };

  const selectBrush = (brushType) => {
    setToolSession((session) => applyBrushTypeSelection(session, brushType));
    setSelectedId(null);
    setLibraryOpen(false);
    setImageBrowserOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (textDraft) {
          event.preventDefault();
          setTextDraft(null);
          return;
        }
        if (libraryOpen || imageBrowserOpen || layersOpen || shortcutsOpen) {
          event.preventDefault();
          setLibraryOpen(false);
          setImageBrowserOpen(false);
          setLayersOpen(false);
          setShortcutsOpen(false);
        }
        return;
      }

      if (isSaving) return;
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping =
        ["input", "textarea", "select"].includes(tagName) ||
        Boolean(target?.isContentEditable);
      const nextTool = getToolFromShortcut(event.key, { isTyping });
      if (!nextTool) return;
      event.preventDefault();
      selectTool(nextTool);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    imageBrowserOpen,
    isSaving,
    layersOpen,
    libraryOpen,
    shortcutsOpen,
    textDraft,
  ]);

  const changeActiveStyle = (patch) => {
    setToolSession((session) =>
      updateToolStyle(session, session.activeTool, patch),
    );
  };

  const toggleElementLibrary = () => {
    setLibraryOpen((value) => {
      const next = !value;
      if (next && scenarioController.shouldFail("element-library-fail")) {
        setLibraryLoadFailed(true);
      }
      return next;
    });
    setImageBrowserOpen(false);
  };

  const toggleImageBrowser = () => {
    setImageBrowserOpen((value) => !value);
    setLibraryOpen(false);
    setImageLoadError("");
  };

  const changeContextStyle = (patch) => {
    if (!selectedText) {
      changeActiveStyle(patch);
      return;
    }

    setToolSession((session) => updateToolStyle(session, "text", patch));
    commitHistory();
    setTextItems((items) =>
      items.map((item) =>
        item.id === selectedId ? { ...item, ...patch } : item,
      ),
    );
  };

  const selectTextItem = (item) => {
    setSelectedId(item.id);
    setToolSession((session) =>
      updateToolStyle(
        { ...session, activeTool: "select" },
        "text",
        { size: item.size, color: item.color },
      ),
    );
    setLibraryOpen(false);
    setImageBrowserOpen(false);
  };

  const editTextItem = (item) => {
    setSelectedId(item.id);
    setToolSession((session) =>
      updateToolStyle(
        { ...session, activeTool: "text" },
        "text",
        { size: item.size, color: item.color },
      ),
    );
    setTextDraft({
      editingId: item.id,
      value: item.value,
      x: item.x,
      y: item.y,
    });
  };

  const selectSessionLayer = (layer) => {
    if (["media", "figure", "text"].includes(layer.kind)) {
      setSelectedId(layer.id);
      selectTool("select");
    }
  };

  const toggleSessionLayerVisibility = (layer) => {
    commitHistory();
    const next = setSessionLayerVisibility(
      { drawingVisible, mediaItems, figures, textItems },
      layer.id,
      !layer.visible,
    );
    setDrawingVisible(next.drawingVisible ?? drawingVisible);
    setMediaItems(next.mediaItems);
    setFigures(next.figures);
    setTextItems(next.textItems);
    if (layer.id === selectedId && layer.visible) setSelectedId(null);
  };

  const deleteSelected = () => {
    commitHistory();
    if (selectedFigure) {
      setFigures((items) => items.filter((item) => item.id !== selectedId));
    }
    if (selectedText) {
      setTextItems((items) => items.filter((item) => item.id !== selectedId));
    }
    if (selectedMedia) {
      setMediaItems((items) => items.filter((item) => item.id !== selectedId));
    }
    setSelectedId(null);
  };

  const selectionActions = selectedFigure
    ? [
        {
          id: "layer-backward",
          label: "下移一层",
          icon: ArrowDown,
          onClick: () => moveSelectedObjectLayer("backward"),
        },
        {
          id: "layer-forward",
          label: "上移一层",
          icon: ArrowUp,
          onClick: () => moveSelectedObjectLayer("forward"),
        },
        {
          id: "flip",
          label: "水平翻转",
          icon: FlipHorizontal,
          onClick: () => updateSelected({ flipped: !selectedFigure.flipped }),
        },
        {
          id: "rotate",
          label: "旋转 15 度",
          icon: ArrowClockwise,
          onClick: () =>
            updateSelected({ rotation: (selectedFigure.rotation + 15) % 360 }),
        },
        {
          id: "scale-down",
          label: "缩小",
          icon: MagnifyingGlassMinus,
          onClick: () =>
            updateSelected({
              scale: Math.max(0.7, selectedFigure.scale - 0.15),
            }),
        },
        {
          id: "scale-up",
          label: "放大",
          icon: MagnifyingGlassPlus,
          onClick: () =>
            updateSelected({
              scale: Math.min(2, selectedFigure.scale + 0.15),
            }),
        },
        {
          id: "delete",
          label: "删除",
          icon: Trash,
          onClick: deleteSelected,
        },
      ]
    : selectedMedia
      ? [
          {
            id: "layer-backward",
            label: "下移一层",
            icon: ArrowDown,
            onClick: () => moveSelectedObjectLayer("backward"),
          },
          {
            id: "layer-forward",
            label: "上移一层",
            icon: ArrowUp,
            onClick: () => moveSelectedObjectLayer("forward"),
          },
          {
            id: "flip",
            label: "水平翻转",
            icon: FlipHorizontal,
            onClick: () =>
              updateSelectedMedia({ flipped: !selectedMedia.flipped }),
          },
          {
            id: "rotate",
            label: "旋转 15 度",
            icon: ArrowClockwise,
            onClick: () =>
              updateSelectedMedia({
                rotation: (selectedMedia.rotation + 15) % 360,
              }),
          },
          {
            id: "scale-down",
            label: "缩小",
            icon: MagnifyingGlassMinus,
            onClick: () =>
              updateSelectedMedia({
                scale: Math.max(0.35, selectedMedia.scale - 0.15),
              }),
          },
          {
            id: "scale-up",
            label: "放大",
            icon: MagnifyingGlassPlus,
            onClick: () =>
              updateSelectedMedia({
                scale: Math.min(2, selectedMedia.scale + 0.15),
              }),
          },
          {
            id: "delete",
            label: "删除",
            icon: Trash,
            onClick: deleteSelected,
          },
        ]
      : selectedText
        ? [
            {
              id: "layer-backward",
              label: "下移一层",
              icon: ArrowDown,
              onClick: () => moveSelectedObjectLayer("backward"),
            },
            {
              id: "layer-forward",
              label: "上移一层",
              icon: ArrowUp,
              onClick: () => moveSelectedObjectLayer("forward"),
            },
            {
              id: "edit",
              label: "编辑文字",
              icon: PencilSimple,
              onClick: () => editTextItem(selectedText),
            },
            {
              id: "delete",
              label: "删除",
              icon: Trash,
              onClick: deleteSelected,
            },
          ]
        : [];

  const insertMedia = async (asset, dropPosition = null) => {
    setImageLoadError("");
    try {
      mediaInsertCoordinatorRef.current ??= createMediaInsertCoordinator({
        loadImage: async (requestedAsset) => {
          if (scenarioController.shouldFail("image-load-fail")) {
            throw new Error("Prototype image load failure");
          }
          return loadImage(requestedAsset.src);
        },
        getLatestState: () => ({
          ...latestEditorStateRef.current,
          canvasDataUrl: readCanvasDataUrl(),
        }),
        getArtboard: () => ({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        }),
        createId: (requestedAsset) =>
          `${requestedAsset.id}-${Date.now()}-${++mediaInsertSequenceRef.current}`,
        commit: ({ previousState, nextState, shouldSelect }) => {
          commitHistory(createEditorSnapshot(previousState));
          latestEditorStateRef.current = nextState;
          setMediaItems(nextState.mediaItems);
          if (shouldSelect) {
            setSelectedId(nextState.selectedId);
            setToolSession((session) => ({
              ...session,
              activeTool: "select",
            }));
          }
          const panelState = getPanelStateAfterInsert();
          setLibraryOpen(panelState.libraryOpen);
          setImageBrowserOpen(panelState.imageBrowserOpen);
        },
      });
      await mediaInsertCoordinatorRef.current.insert(asset, dropPosition);
    } catch {
      setImageLoadError("图片加载失败，当前画面未改变，请重新选择");
    }
  };

  const updateProjectImageDrag = (asset, pointer) => {
    const placement = getElementDropPlacement(
      pointer,
      artboardRef.current.getBoundingClientRect(),
    );
    setImageDragOver(Boolean(placement));
    setImageDragPreview({
      asset,
      clientX: pointer.clientX,
      clientY: pointer.clientY,
    });
  };

  const dropProjectImage = (asset, pointer) => {
    const placement = getElementDropPlacement(
      pointer,
      artboardRef.current.getBoundingClientRect(),
    );
    if (placement) insertMedia(asset, placement);
    setImageDragOver(false);
    setImageDragPreview(null);
  };

  const cancelProjectImageDrag = () => {
    setImageDragOver(false);
    setImageDragPreview(null);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const source = canvasRef.current;
      const output = document.createElement("canvas");
      output.width = source.width;
      output.height = source.height;
      const context = output.getContext("2d");
      context.fillStyle = "#f4f3ef";
      context.fillRect(0, 0, output.width, output.height);

      if (hasImageBackground) {
        const reference = await loadImage(baseImage);
        const scale = Math.max(
          output.width / reference.naturalWidth,
          output.height / reference.naturalHeight,
        );
        const width = reference.naturalWidth * scale;
        const height = reference.naturalHeight * scale;
        context.drawImage(
          reference,
          (output.width - width) / 2,
          (output.height - height) / 2,
          width,
          height,
        );
      }

      for (const mediaItem of mediaItems) {
        if (mediaItem.visible === false) continue;
        const image = await loadImage(mediaItem.src);
        const width =
          mediaItem.width * window.devicePixelRatio * mediaItem.scale;
        const height =
          mediaItem.height * window.devicePixelRatio * mediaItem.scale;
        const x = mediaItem.x * window.devicePixelRatio;
        const y = mediaItem.y * window.devicePixelRatio;
        context.save();
        context.translate(x + width / 2, y + height / 2);
        context.rotate((mediaItem.rotation * Math.PI) / 180);
        context.scale(mediaItem.flipped ? -1 : 1, 1);
        context.drawImage(image, -width / 2, -height / 2, width, height);
        context.restore();
      }

      if (drawingVisible) {
        compositeDrawingCanvas(context, source, {
          width: output.width,
          height: output.height,
        });
      }

      for (const figure of figures) {
        if (figure.visible === false) continue;
        const image = await loadImage(figure.asset);
        const width = figure.width * window.devicePixelRatio * figure.scale;
        const height = figure.height * window.devicePixelRatio * figure.scale;
        const x = (figure.x / 100) * output.width;
        const y = (figure.y / 100) * output.height;
        context.save();
        context.translate(x, y);
        context.rotate((figure.rotation * Math.PI) / 180);
        context.scale(figure.flipped ? -1 : 1, 1);
        context.drawImage(image, -width / 2, -height / 2, width, height);
        context.restore();
      }

      for (const textItem of textItems) {
        if (textItem.visible === false) continue;
        const fontSize =
          getAnnotationTextSize(textItem.size) * window.devicePixelRatio;
        const lineHeight = fontSize * 1.35;
        context.save();
        context.fillStyle = textItem.color;
        context.font =
          `600 ${fontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
        context.textBaseline = "top";
        const lines = wrapAnnotationText(
          textItem.value,
          annotationTextBoxWidth * window.devicePixelRatio,
          (value) => context.measureText(value).width,
        );
        lines.forEach((line, index) => {
          context.fillText(
            line,
            textItem.x * window.devicePixelRatio,
            textItem.y * window.devicePixelRatio + index * lineHeight,
          );
        });
        context.restore();
      }

      saveTransactionIdRef.current ??= `sketch-save-${Date.now()}`;
      await onSave({
        dataUrl: output.toDataURL("image/png"),
        annotation: hasImageBackground,
        transactionId: saveTransactionIdRef.current,
      });
    } catch (error) {
      setSaveError(
        error.stage === "node"
          ? "图片已保存，但节点创建失败；内容仍在，重试不会重复保存图片"
          : "保存失败，当前内容仍在，可以直接重试",
      );
      setIsSaving(false);
    }
  };

  const requestClose = () => {
    if (hasSessionChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  return (
    <div className="editor-backdrop" role="dialog" aria-modal="true">
      <div className={`editor-shell ${isSaving ? "is-saving" : ""}`}>
        <header className="editor-header">
          <div>
            <button
              className="back-button"
              onClick={requestClose}
              aria-label="退出编辑"
              disabled={isSaving}
            >
              <X size={20} />
            </button>
            <div className="editor-title-block">
              <h1>草图标注</h1>
              {capabilities.allowRatioChange && (
                <label className="ratio-control">
                  <span>画幅</span>
                  <select
                    value={aspectRatio}
                    onChange={(event) => changeAspectRatio(event.target.value)}
                    disabled={isSaving}
                    aria-label="画板比例"
                  >
                    {artboardRatioOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          <div className="header-actions">
            <span className="autosave-hint">
              {isSaving
                ? "正在保存"
                : hasSessionChanges
                  ? "未保存"
                  : "尚未编辑"}
            </span>
            {saveError && <span className="save-error">{saveError}</span>}
            <button
              className="primary-action save-image-action"
              onClick={save}
              disabled={!canSave}
            >
              {isSaving ? "正在保存…" : saveError ? "重试保存" : "保存为新图片"}
            </button>
          </div>
        </header>

        <main className={`editor-stage ${layersOpen ? "with-layers" : ""}`}>
          <EditorToolRail
            activeTool={tool}
            activeBrushType={toolSession.styles.pen.brushType}
            lastShapeTool={toolSession.lastShapeTool}
            disabled={isSaving}
            imageBrowserOpen={imageBrowserOpen}
            libraryOpen={libraryOpen}
            onSelectTool={selectTool}
            onSelectBrushType={selectBrush}
            onSelectShape={selectShapeTool}
            onToggleImage={toggleImageBrowser}
            onToggleElements={toggleElementLibrary}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyRef.current.past.length > 0}
            canRedo={historyRef.current.future.length > 0}
          />
          <ShapeLibrary
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            onInsert={insertTemplate}
            onDragMove={updateLibraryElementDrag}
            onDragDrop={dropLibraryElement}
            onDragCancel={cancelLibraryElementDrag}
            loadFailed={libraryLoadFailed}
            onRetry={() => setLibraryLoadFailed(false)}
          />
          <ImageBrowser
            open={imageBrowserOpen}
            onClose={() => setImageBrowserOpen(false)}
            onInsert={insertMedia}
            onDragMove={updateProjectImageDrag}
            onDragDrop={dropProjectImage}
            onDragCancel={cancelProjectImageDrag}
            error={imageLoadError}
          />
          {elementDragPreview && (
            <div
              className={`element-drag-preview ${elementDragOver ? "over-artboard" : ""}`}
              style={{
                left: elementDragPreview.clientX,
                top: elementDragPreview.clientY,
              }}
              aria-hidden="true"
            >
              <img src={elementDragPreview.template.asset} alt="" />
              <span>{elementDragPreview.template.label}</span>
            </div>
          )}
          {imageDragPreview && (
            <div
              className={`element-drag-preview media-drag-preview ${imageDragOver ? "over-artboard" : ""}`}
              style={{
                left: imageDragPreview.clientX,
                top: imageDragPreview.clientY,
              }}
              aria-hidden="true"
            >
              <img src={imageDragPreview.asset.src} alt="" />
              <span>{imageDragPreview.asset.label}</span>
            </div>
          )}
          <EditorContextBar
            activeTool={tool}
            activeBrushType={toolSession.styles.pen.brushType}
            selectedKind={
              selectedText
                ? "text"
                : selectedMedia
                  ? "media"
                  : selectedFigure
                    ? "figure"
                    : null
            }
            style={selectedText ? toolSession.styles.text : activeStyle}
            disabled={isSaving}
            onStyleChange={changeContextStyle}
            onSelectBrushType={selectBrush}
            textSizes={annotationTextSizes}
            selectionActions={selectionActions}
          />
          <div
            ref={artboardRef}
            className={`artboard ${hasImageBackground ? "image-background-artboard" : ""} ${elementDragOver || imageDragOver ? "element-drop-active" : ""}`}
            onClick={() => setSelectedId(null)}
            style={{
              width: artboardSize.width,
              height: artboardSize.height,
              transform: `scale(${zoom / 100})`,
            }}
          >
            {hasImageBackground && (
              <img
                className="annotation-reference"
                src={baseImage}
                alt="待标注的参考图"
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) {
                    setBaseImageAspect(
                      image.naturalWidth / image.naturalHeight,
                    );
                  }
                }}
              />
            )}
            <div className="composition-grid" aria-hidden="true">
              <span className="grid-v one" />
              <span className="grid-v two" />
              <span className="grid-h one" />
              <span className="grid-h two" />
            </div>
            {!hasContent && !hasImageBackground && (
              <div className="blank-hint">
                <CursorClick size={18} />
                从“图片”或“元素”拖入参考，或直接在这里画
              </div>
            )}
            {(elementDragOver || imageDragOver) && (
              <div className="element-drop-hint" role="status">
                {imageDragOver ? "松手添加图片" : "松手放到这里"}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`drawing-canvas tool-${tool}`}
              style={{
                opacity: drawingVisible ? 1 : 0,
                pointerEvents: canCanvasCapturePointer(tool)
                  ? "auto"
                  : "none",
              }}
              onPointerDown={beginDraw}
              onPointerMove={draw}
              onPointerUp={finishDraw}
              onPointerCancel={cancelDraw}
            />
            <div className="media-layer">
              {mediaItems.filter((item) => item.visible !== false).map((item) => (
                <PlacedMedia
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => {
                    setSelectedId(item.id);
                    selectTool("select");
                  }}
                  onMove={(position) => {
                    setMediaItems((items) =>
                      items.map((mediaItem) =>
                        mediaItem.id === item.id
                          ? { ...mediaItem, ...position }
                          : mediaItem,
                      ),
                    );
                  }}
                  onInteractionStart={commitHistory}
                  viewScale={zoom / 100}
                />
              ))}
            </div>
            {textDraft && (
              <form
                className="annotation-text-editor"
                style={{ left: textDraft.x, top: textDraft.y }}
                onPointerDown={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = normalizeAnnotationText(textDraft.value);
                  if (!value) {
                    setTextDraft(null);
                    return;
                  }

                  const id = `text-${Date.now()}`;
                  commitHistory();
                  setTextItems((items) =>
                    upsertAnnotationText(
                      items,
                      { ...textDraft, value },
                      toolSession.styles.text,
                      id,
                    ),
                  );
                  setSelectedId(textDraft.editingId ?? id);
                  selectTool("select");
                  setTextDraft(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setTextDraft(null);
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    event.currentTarget.requestSubmit();
                  }
                }}
              >
                <textarea
                  ref={textInputRef}
                  value={textDraft.value}
                  onChange={(event) =>
                    setTextDraft((draft) => ({
                      ...draft,
                      value: event.target.value,
                    }))
                  }
                  aria-label="标注文字"
                  placeholder="输入标注文字，Enter 换行"
                />
                <div className="text-editor-actions">
                  <button type="submit" aria-label="添加文字" title="添加文字">
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="取消文字"
                    title="取消"
                    onClick={() => setTextDraft(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              </form>
            )}
            <div className="figure-layer">
              {figures.filter((item) => item.visible !== false).map((item) => (
                <PlacedFigure
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => {
                    setSelectedId(item.id);
                    selectTool("select");
                  }}
                  onMove={(position) => {
                    setFigures((items) =>
                      items.map((figure) =>
                        figure.id === item.id ? { ...figure, ...position } : figure,
                      ),
                    );
                  }}
                  onInteractionStart={commitHistory}
                />
              ))}
            </div>
            <div className="text-layer">
              {textItems
                .filter(
                  (item) =>
                    item.visible !== false && item.id !== textDraft?.editingId,
                )
                .map((item) => (
                <PlacedText
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => selectTextItem(item)}
                  onMove={(position) => {
                    setTextItems((items) =>
                      items.map((textItem) =>
                        textItem.id === item.id
                          ? { ...textItem, ...position }
                          : textItem,
                      ),
                    );
                  }}
                  onInteractionStart={commitHistory}
                  viewScale={zoom / 100}
                  onEdit={() => editTextItem(item)}
                />
              ))}
            </div>
          </div>
          <div className="editor-zoom">
            <button
              onClick={() => setZoom((value) => Math.max(40, value - 20))}
              disabled={isSaving || zoom <= 40}
              aria-label="缩小画面"
            >
              <MagnifyingGlassMinus size={15} />
            </button>
            <span>{zoom}%</span>
            <button
              onClick={() => setZoom((value) => Math.min(160, value + 20))}
              disabled={isSaving || zoom >= 160}
              aria-label="放大画面"
            >
              <MagnifyingGlassPlus size={15} />
            </button>
            <button
              onClick={() => setZoom(100)}
              disabled={isSaving || zoom === 100}
              aria-label="适应画面"
            >
              <CornersOut size={15} />
            </button>
          </div>
          <EditorUtilityDock
            layerCount={sessionLayers.length}
            layersOpen={layersOpen}
            shortcutsOpen={shortcutsOpen}
            layers={sessionLayers}
            selectedId={selectedId}
            disabled={isSaving}
            onToggleLayers={() => {
              setLayersOpen((value) => !value);
              setShortcutsOpen(false);
            }}
            onToggleShortcuts={() => {
              setShortcutsOpen((value) => !value);
              setLayersOpen(false);
            }}
            onSelectLayer={selectSessionLayer}
            onToggleLayerVisibility={toggleSessionLayerVisibility}
          />
        </main>
        {discardConfirmOpen && (
          <div className="discard-confirm-backdrop" role="alertdialog">
            <div className="discard-confirm">
              <div className="discard-icon">
                <PaintBrush size={22} />
              </div>
              <h2>放弃未保存的内容？</h2>
              <p>退出后，本次绘制内容不会生成图片节点。</p>
              <div className="discard-confirm-actions">
                <button
                  className="secondary-action"
                  onClick={() => setDiscardConfirmOpen(false)}
                >
                  继续绘制
                </button>
                <button className="danger-action" onClick={onClose}>
                  放弃并退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast">
      <span>
        <Check size={15} weight="bold" />
      </span>
      {message}
    </div>
  );
}

export function App() {
  const [editorSession, setEditorSession] = useState(null);
  const [selectedNode, setSelectedNode] = useState("source");
  const [canvasContextMenu, setCanvasContextMenu] = useState(null);
  const [sketchNodes, setSketchNodes] = useState([]);
  const [toast, setToast] = useState("");
  const saveTransactionsRef = useRef(new Map());
  const nextNodeIdRef = useRef(1);
  const scenarioControllerRef = useRef(null);
  scenarioControllerRef.current ??= createOneShotScenario(
    readPrototypeScenario(window.location.search),
  );

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const handleSave = async ({ dataUrl, annotation, transactionId }) => {
    let transaction =
      saveTransactionsRef.current.get(transactionId) ??
      createSaveTransaction(transactionId);

    try {
      transaction = await saveAssetStage(transaction, async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 360));
        if (
          scenarioControllerRef.current.shouldFail("save-asset-fail")
        ) {
          throw new Error("Prototype asset save failure");
        }
        return {
          id: `asset-${transactionId}`,
          dataUrl,
          annotation,
        };
      });
      saveTransactionsRef.current.set(transactionId, transaction);

      transaction = await saveNodeStage(transaction, async (asset) => {
        await new Promise((resolve) => window.setTimeout(resolve, 320));
        if (
          scenarioControllerRef.current.shouldFail("save-node-fail")
        ) {
          throw new Error("Prototype node creation failure");
        }
        const id = String(nextNodeIdRef.current).padStart(2, "0");
        nextNodeIdRef.current += 1;
        return createOrdinaryImageNode({
          id,
          dataUrl: asset.dataUrl,
          annotation: asset.annotation,
          assetId: asset.id,
        });
      });
      saveTransactionsRef.current.set(transactionId, transaction);

      const node = transaction.node;
      setSketchNodes((items) =>
        items.some((item) => item.id === node.id) ? items : [...items, node],
      );
      setEditorSession(null);
      setSelectedNode(`sketch-${node.id}`);
      showToast(
        annotation
          ? "标注已保存为新图片节点"
          : "草图已保存为新图片节点",
      );
      return node;
    } catch (error) {
      saveTransactionsRef.current.set(
        transactionId,
        error.transaction ?? transaction,
      );
      throw error;
    }
  };

  const openCanvasContextMenu = (event) => {
    if (
      event.target.closest(
        ".canvas-node, .zoom-controls, .mini-map, .canvas-context-menu",
      )
    ) {
      return;
    }

    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    setSelectedNode(null);
    setCanvasContextMenu({
      x: Math.max(12, Math.min(event.clientX - bounds.left, bounds.width - 184)),
      y: Math.max(12, Math.min(event.clientY - bounds.top, bounds.height - 56)),
    });
  };

  return (
    <div className="app-shell">
      <TopBar />
      <main
        className={`infinite-canvas ${sketchNodes.length ? "layout-saved" : "layout-base"}`}
        onClick={() => {
          setSelectedNode(null);
          setCanvasContextMenu(null);
        }}
        onContextMenu={openCanvasContextMenu}
      >
        <div className="canvas-origin">
          <SourceImageNode
            selected={selectedNode === "source"}
            onImageBrush={() => {
              setEditorSession(
                createImageBrushEditorSession(assetUrl("assets/owl-reference.jpg")),
              );
              setCanvasContextMenu(null);
            }}
            onSelect={(event) => {
              event.stopPropagation();
              setSelectedNode("source");
            }}
          />
          {sketchNodes.map((node, index) => (
            <SavedSketchNode
              key={node.id}
              node={node}
              index={index}
              selected={selectedNode === `sketch-${node.id}`}
              onImageBrush={() => {
                setEditorSession(createImageBrushEditorSession(node.dataUrl));
                setCanvasContextMenu(null);
              }}
              onSelect={(event) => {
                event.stopPropagation();
                setSelectedNode(`sketch-${node.id}`);
              }}
            />
          ))}
        </div>
        <CanvasViewportControls />
        <CanvasContextMenu
          position={canvasContextMenu}
          onCreateWhiteboard={() =>
            setEditorSession(createBlankSketchEditorSession())
          }
          onClose={() => setCanvasContextMenu(null)}
        />
        <button className="mini-map" aria-label="小地图">
          <div>
            <span />
          </div>
        </button>
      </main>

      {editorSession && (
        <SketchEditor
          background={editorSession.background}
          onClose={() => setEditorSession(null)}
          onSave={handleSave}
          scenarioController={scenarioControllerRef.current}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
