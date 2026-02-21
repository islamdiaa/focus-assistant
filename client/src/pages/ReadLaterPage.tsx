/**
 * Read Later Page — Pocket-style link saving with tags, notes, and status tracking
 */
import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookmarkPlus,
  ExternalLink,
  Check,
  BookOpen,
  Trash2,
  Tag,
  StickyNote,
  Search,
  Filter,
  Globe,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
} from "lucide-react";
import type { ReadingItem, ReadingStatus } from "@/lib/types";

type FilterStatus = "all" | ReadingStatus;

const STATUS_CONFIG: Record<
  ReadingStatus,
  { label: string; icon: typeof BookOpen; color: string; bg: string }
> = {
  unread: {
    label: "Unread",
    icon: Clock,
    color: "text-warm-terracotta",
    bg: "bg-warm-terracotta/10",
  },
  reading: {
    label: "Reading",
    icon: BookOpen,
    color: "text-warm-blue",
    bg: "bg-warm-blue/10",
  },
  read: {
    label: "Read",
    icon: CheckCircle2,
    color: "text-warm-sage",
    bg: "bg-warm-sage/10",
  },
};

export default function ReadLaterPage() {
  const { state, dispatch } = useApp();
  const readingList = state.readingList || [];

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addTags, setAddTags] = useState("");

  // Notes dialog
  const [notesItem, setNotesItem] = useState<ReadingItem | null>(null);
  const [notesText, setNotesText] = useState("");

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    readingList.forEach(r => r.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [readingList]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...readingList];
    if (filterStatus !== "all")
      list = list.filter(r => r.status === filterStatus);
    if (filterTag) list = list.filter(r => r.tags.includes(filterTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.url.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [readingList, filterStatus, filterTag, searchQuery]);

  // Stats
  const unreadCount = readingList.filter(r => r.status === "unread").length;
  const readingCount = readingList.filter(r => r.status === "reading").length;
  const readCount = readingList.filter(r => r.status === "read").length;

  function handleAdd() {
    if (!addUrl.trim()) return;
    let title = addTitle.trim();
    if (!title) {
      try {
        title = new URL(addUrl.trim()).hostname;
      } catch {
        title = addUrl.trim();
      }
    }
    const tags = addTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    dispatch({
      type: "ADD_READING_ITEM",
      payload: {
        url: addUrl.trim(),
        title,
        description: addDescription.trim() || undefined,
        tags,
      },
    });
    setAddUrl("");
    setAddTitle("");
    setAddDescription("");
    setAddTags("");
    setAddOpen(false);
  }

  function handleStatusCycle(item: ReadingItem) {
    const next: ReadingStatus =
      item.status === "unread"
        ? "reading"
        : item.status === "reading"
          ? "read"
          : "unread";
    dispatch({
      type: "MARK_READING_STATUS",
      payload: { id: item.id, status: next },
    });
  }

  function handleSaveNotes() {
    if (!notesItem) return;
    dispatch({
      type: "UPDATE_READING_ITEM",
      payload: { id: notesItem.id, notes: notesText },
    });
    setNotesItem(null);
  }

  function handleDelete(id: string) {
    dispatch({ type: "DELETE_READING_ITEM", payload: id });
  }

  function handleRemoveTag(itemId: string, tag: string) {
    const item = readingList.find(r => r.id === itemId);
    if (!item) return;
    dispatch({
      type: "UPDATE_READING_ITEM",
      payload: { id: itemId, tags: item.tags.filter(t => t !== tag) },
    });
  }

  function handleAddTag(itemId: string, tag: string) {
    const item = readingList.find(r => r.id === itemId);
    if (!item || item.tags.includes(tag)) return;
    dispatch({
      type: "UPDATE_READING_ITEM",
      payload: { id: itemId, tags: [...item.tags, tag] },
    });
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Read Later</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Save links, add notes, read when ready
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-warm-lavender hover:bg-warm-lavender/90 text-white gap-1.5"
        >
          <BookmarkPlus className="w-4 h-4" /> Save Link
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() =>
            setFilterStatus(filterStatus === "unread" ? "all" : "unread")
          }
          className={`rounded-xl p-3 text-center border transition-all ${filterStatus === "unread" ? "border-warm-terracotta/40 bg-warm-terracotta/10" : "border-border bg-card hover:bg-warm-terracotta/5"}`}
        >
          <Clock className="w-4 h-4 mx-auto mb-1 text-warm-terracotta" />
          <div className="text-xl font-bold text-foreground">{unreadCount}</div>
          <div className="text-xs text-muted-foreground">Unread</div>
        </button>
        <button
          onClick={() =>
            setFilterStatus(filterStatus === "reading" ? "all" : "reading")
          }
          className={`rounded-xl p-3 text-center border transition-all ${filterStatus === "reading" ? "border-warm-blue/40 bg-warm-blue/10" : "border-border bg-card hover:bg-warm-blue/5"}`}
        >
          <BookOpen className="w-4 h-4 mx-auto mb-1 text-warm-blue" />
          <div className="text-xl font-bold text-foreground">
            {readingCount}
          </div>
          <div className="text-xs text-muted-foreground">Reading</div>
        </button>
        <button
          onClick={() =>
            setFilterStatus(filterStatus === "read" ? "all" : "read")
          }
          className={`rounded-xl p-3 text-center border transition-all ${filterStatus === "read" ? "border-warm-sage/40 bg-warm-sage/10" : "border-border bg-card hover:bg-warm-sage/5"}`}
        >
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-warm-sage" />
          <div className="text-xl font-bold text-foreground">{readCount}</div>
          <div className="text-xs text-muted-foreground">Read</div>
        </button>
      </div>

      {/* Search + tag filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search links, notes, tags..."
            className="pl-9 bg-card"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  filterTag === tag
                    ? "bg-warm-lavender text-white border-warm-lavender"
                    : "bg-card text-muted-foreground border-border hover:border-warm-lavender/40"
                }`}
              >
                {tag}
              </button>
            ))}
            {filterTag && (
              <button
                onClick={() => setFilterTag(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookmarkPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">
            {readingList.length === 0
              ? "No saved links yet"
              : "No links match your filters"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {readingList.length === 0
              ? 'Click "Save Link" to start your reading list'
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(item => {
              const cfg = STATUS_CONFIG[item.status];
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status button */}
                      <button
                        onClick={() => handleStatusCycle(item)}
                        className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${cfg.bg} hover:opacity-80`}
                        title={`Status: ${cfg.label} (click to cycle)`}
                      >
                        <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-foreground hover:text-warm-lavender transition-colors line-clamp-1 flex items-center gap-1.5"
                            >
                              {item.title}
                              <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                            </a>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {item.domain || "link"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                              {item.readAt && (
                                <span className="text-xs text-warm-sage">
                                  Read{" "}
                                  {new Date(item.readAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand toggle */}
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : item.id)
                            }
                            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-warm-sand/50 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Tags */}
                        {item.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {item.tags.map(tag => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs bg-warm-lavender/10 text-warm-lavender border-warm-lavender/20 gap-1"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Notes preview */}
                        {item.notes && !isExpanded && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-1 italic">
                            <StickyNote className="w-3 h-3 inline mr-1" />
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            {/* Notes */}
                            {item.notes && (
                              <div className="bg-warm-sand/30 rounded-lg p-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <StickyNote className="w-3.5 h-3.5 text-warm-lavender" />
                                  <span className="text-xs font-medium text-foreground">
                                    Notes
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {item.notes}
                                </p>
                              </div>
                            )}

                            {/* Tag management */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 text-xs bg-warm-lavender/10 text-warm-lavender px-2 py-1 rounded-full"
                                >
                                  {tag}
                                  <button
                                    onClick={() =>
                                      handleRemoveTag(item.id, tag)
                                    }
                                    className="hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                              <AddTagInline
                                onAdd={tag => handleAddTag(item.id, tag)}
                                existingTags={allTags}
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setNotesItem(item);
                                  setNotesText(item.notes || "");
                                }}
                                className="gap-1.5 text-xs"
                              >
                                <StickyNote className="w-3.5 h-3.5" />
                                {item.notes ? "Edit Notes" : "Add Notes"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusCycle(item)}
                                className={`gap-1.5 text-xs ${cfg.color}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                Mark as{" "}
                                {item.status === "unread"
                                  ? "Reading"
                                  : item.status === "reading"
                                    ? "Read"
                                    : "Unread"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(item.id)}
                                className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Link Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Save a Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                URL *
              </label>
              <Input
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="bg-background"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Title
              </label>
              <Input
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                placeholder="Auto-detected from URL if empty"
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <Textarea
                value={addDescription}
                onChange={e => setAddDescription(e.target.value)}
                placeholder="Why you want to read this..."
                className="bg-background resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tags (comma-separated)
              </label>
              <Input
                value={addTags}
                onChange={e => setAddTags(e.target.value)}
                placeholder="ai, productivity, engineering"
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addUrl.trim()}
              className="bg-warm-lavender hover:bg-warm-lavender/90 text-white gap-1.5"
            >
              <BookmarkPlus className="w-4 h-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={!!notesItem}
        onOpenChange={open => {
          if (!open) setNotesItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {notesItem?.notes ? "Edit Notes" : "Add Notes"}
            </DialogTitle>
            {notesItem && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {notesItem.title}
              </p>
            )}
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            placeholder="Your notes, highlights, key takeaways..."
            className="bg-background resize-none min-h-[200px]"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              className="bg-warm-lavender hover:bg-warm-lavender/90 text-white gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline tag adder component */
function AddTagInline({
  onAdd,
  existingTags,
}: {
  onAdd: (tag: string) => void;
  existingTags: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-warm-lavender px-2 py-1 rounded-full border border-dashed border-border hover:border-warm-lavender/40 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add tag
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="tag name"
        className="h-6 text-xs w-24 px-2"
        autoFocus
        list="existing-tags"
      />
      <datalist id="existing-tags">
        {existingTags.map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <button
        onClick={handleSubmit}
        className="text-warm-lavender hover:text-warm-lavender/80"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
