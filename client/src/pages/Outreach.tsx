import { trpc } from "@/lib/trpc";
import { MAX_LENGTHS } from "../../../shared/maxLengths";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Plus, Mail, Linkedin, Search, Clock, Briefcase, ExternalLink, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── Date formatting helpers ──────────────────────────────────────────────────

function formatShortDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatStageLabel(stage: string): string {
  const map: Record<string, string> = {
    bookmarked: "Bookmarked",
    applying: "Applying",
    applied: "Applied",
    interviewing: "Interviewing",
    offered: "Offered",
    rejected: "Rejected",
    archived: "Archived",
  };
  return map[stage] ?? stage;
}

function stageBadgeVariant(stage: string): string {
  const map: Record<string, string> = {
    bookmarked: "bg-slate-100 text-slate-700",
    applying: "bg-blue-100 text-blue-700",
    applied: "bg-indigo-100 text-indigo-700",
    interviewing: "bg-amber-100 text-amber-700",
    offered: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    archived: "bg-gray-100 text-gray-500",
  };
  return map[stage] ?? "bg-slate-100 text-slate-700";
}

// ─── Type for enriched contact ────────────────────────────────────────────────

type ContactWithUsage = {
  id: number;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  usedInCount: number;
  mostRecentJobCard: {
    id: number;
    company: string | null;
    title: string;
    stage: string;
    updatedAt: Date | string;
  } | null;
  recentJobCards: {
    id: number;
    company: string | null;
    title: string;
    stage: string;
    updatedAt: Date | string;
  }[];
  lastTouchAt: Date | string | null;
  nextTouchAt: Date | string | null;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Outreach() {
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.contacts.listWithUsage.useQuery();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState<ContactWithUsage | null>(null);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return (contacts as ContactWithUsage[]).filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contacts, search]);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Outreach CRM</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {contacts?.length ?? 0} contacts
            </p>
          </div>
          <CreateContactDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            onCreated={() => {
              utils.contacts.listWithUsage.invalidate();
              setShowCreate(false);
            }}
          />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contact Table / List */}
        {isLoading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredContacts.length > 0 ? (
          <>
            {/* Desktop: compact table with fixed layout */}
            <div className="hidden md:block rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm table-fixed"
                  data-testid="contacts-table"
                  style={{ minWidth: "900px" }}
                >
                  <colgroup>
                    <col style={{ width: "180px" }} />  {/* Name */}
                    <col style={{ width: "160px" }} />  {/* Role */}
                    <col style={{ width: "200px" }} />  {/* Email */}
                    <col style={{ width: "70px" }} />   {/* Links */}
                    <col />                              {/* Used in — flexible */}
                    <col style={{ width: "140px" }} />  {/* Status */}
                    <col style={{ width: "110px" }} />  {/* Last touch */}
                    <col style={{ width: "110px" }} />  {/* Next touch */}
                    <col style={{ width: "60px" }} />   {/* Actions */}
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Links</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Used in</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Last touch</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Next touch</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact, idx) => (
                      <ContactTableRow
                        key={contact.id}
                        contact={contact}
                        isLast={idx === filteredContacts.length - 1}
                        onEdit={() => setEditContact(contact)}
                        onUpdated={() => utils.contacts.listWithUsage.invalidate()}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: compact cards */}
            <div className="md:hidden space-y-1.5" data-testid="contacts-cards">
              {filteredContacts.map((contact) => (
                <ContactMobileCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => setEditContact(contact)}
                  onUpdated={() => utils.contacts.listWithUsage.invalidate()}
                />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No contacts yet</p>
              <p className="text-sm mt-1">
                Add recruiters, hiring managers, and referrals.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Contact Dialog */}
        {editContact && (
          <EditContactDialog
            contact={editContact}
            open={!!editContact}
            onOpenChange={(open) => { if (!open) setEditContact(null); }}
            onUpdated={() => {
              utils.contacts.listWithUsage.invalidate();
              setEditContact(null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────

function ContactTableRow({
  contact,
  isLast,
  onEdit,
  onUpdated: _onUpdated,
}: {
  contact: ContactWithUsage;
  isLast: boolean;
  onEdit: () => void;
  onUpdated: () => void;
}) {
  const lastTouchDate = formatShortDate(contact.lastTouchAt);
  const nextTouchDate = formatShortDate(contact.nextTouchAt);
  const stage = contact.mostRecentJobCard?.stage ?? null;

  return (
    <tr
      className={`hover:bg-muted/30 transition-colors${isLast ? "" : " border-b"}`}
      data-testid="contact-table-row"
    >
      {/* Name */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium truncate block">{contact.name}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{contact.name}{contact.company ? ` · ${contact.company}` : ""}</TooltipContent>
          </Tooltip>
        </div>
      </td>

      {/* Role */}
      <td className="px-3 py-2.5">
        {contact.role ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground truncate block">{contact.role}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{contact.role}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Email */}
      <td className="px-3 py-2.5">
        {contact.email ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="top">{contact.email}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Links */}
      <td className="px-3 py-2.5">
        {contact.linkedinUrl ? (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/70 transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Open LinkedIn profile"
          >
            <Linkedin className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Used in */}
      <td className="px-3 py-2.5">
        <UsedInBadge contact={contact} />
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        {stage ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageBadgeVariant(stage)}`}>
            {formatStageLabel(stage)}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Last touch */}
      <td className="px-3 py-2.5">
        {lastTouchDate ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0" />
            {lastTouchDate}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Next touch */}
      <td className="px-3 py-2.5">
        {nextTouchDate ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0" />
            {nextTouchDate}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Edit contact"
          data-testid="edit-contact-btn"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Mobile Compact Card ──────────────────────────────────────────────────────

function ContactMobileCard({
  contact,
  onEdit,
  onUpdated: _onUpdated,
}: {
  contact: ContactWithUsage;
  onEdit: () => void;
  onUpdated: () => void;
}) {
  const lastTouchDate = formatShortDate(contact.lastTouchAt);
  const nextTouchDate = formatShortDate(contact.nextTouchAt);
  const stage = contact.mostRecentJobCard?.stage ?? null;

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
      data-testid="contact-mobile-card"
    >
      {/* Avatar */}
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-semibold text-primary">
          {contact.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + role */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-medium text-sm truncate">{contact.name}</span>
          {contact.role && (
            <span className="text-xs text-muted-foreground truncate">{contact.role}</span>
          )}
          {stage && (
            <span className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium ${stageBadgeVariant(stage)}`}>
              {formatStageLabel(stage)}
            </span>
          )}
        </div>

        {/* Email + LinkedIn */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[140px]">{contact.email}</span>
            </a>
          )}
          {contact.linkedinUrl && (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Linkedin className="h-3 w-3" />
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Metadata: Used in + touches */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs text-muted-foreground">
          <UsedInBadge contact={contact} />
          {lastTouchDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastTouchDate}
            </span>
          )}
          {nextTouchDate && (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="h-3 w-3" />
              Next: {nextTouchDate}
            </span>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
        title="Edit contact"
        data-testid="edit-contact-btn"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Used In Badge ────────────────────────────────────────────────────────────

function UsedInBadge({ contact }: { contact: ContactWithUsage }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  if (contact.usedInCount === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground/50 italic text-xs">
        <Briefcase className="h-3 w-3" />
        Not used yet
      </span>
    );
  }

  if (contact.usedInCount === 1 && contact.mostRecentJobCard) {
    const jc = contact.mostRecentJobCard;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${jc.id}`); }}
        className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer min-w-0"
        title={`${jc.company ? `${jc.company} — ` : ""}${jc.title}`}
      >
        <Briefcase className="h-3 w-3 shrink-0" />
        <span className="truncate">{jc.company ? `${jc.company} — ` : ""}{jc.title}</span>
      </button>
    );
  }

  // Multiple job cards — show popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer whitespace-nowrap"
        >
          <Briefcase className="h-3 w-3 shrink-0" />
          {contact.usedInCount} job cards
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Job Cards ({contact.usedInCount})</p>
          <p className="text-xs text-muted-foreground">Showing up to 10 most recent</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {contact.recentJobCards.map((jc) => (
            <button
              key={jc.id}
              onClick={() => { setOpen(false); navigate(`/jobs/${jc.id}`); }}
              className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0 text-left"
            >
              <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{jc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {jc.company && (
                    <span className="text-xs text-muted-foreground truncate">{jc.company}</span>
                  )}
                  <Badge variant="outline" className="text-xs py-0 px-1.5 h-4 shrink-0">
                    {formatStageLabel(jc.stage)}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Edit Contact Dialog ──────────────────────────────────────────────────────

function EditContactDialog({
  contact,
  open,
  onOpenChange,
  onUpdated,
}: {
  contact: ContactWithUsage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(contact.name);
  const [company, setCompany] = useState(contact.company ?? "");
  const [role, setRole] = useState(contact.role ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact.linkedinUrl ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");

  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated!");
      onUpdated();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) { toast.error("Name is required"); return; }
            updateContact.mutate({
              id: contact.id,
              name: name.trim(),
              company: company.trim() || undefined,
              role: role.trim() || undefined,
              email: email.trim() || undefined,
              linkedinUrl: linkedinUrl.trim() || undefined,
              notes: notes.trim() || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              placeholder="Full name"
              value={name}
              maxLength={MAX_LENGTHS.CONTACT_NAME}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                placeholder="Company"
                value={company}
                maxLength={MAX_LENGTHS.CONTACT_COMPANY}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                placeholder="e.g., Recruiter"
                value={role}
                maxLength={MAX_LENGTHS.CONTACT_ROLE}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              placeholder="email@example.com"
              value={email}
              maxLength={MAX_LENGTHS.CONTACT_EMAIL}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              maxLength={MAX_LENGTHS.CONTACT_LINKEDIN_URL}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes..."
              value={notes}
              maxLength={MAX_LENGTHS.CONTACT_NOTES}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateContact.isPending}>
              {updateContact.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Contact Dialog ────────────────────────────────────────────────────

function CreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added!");
      setName("");
      setCompany("");
      setRole("");
      setEmail("");
      setLinkedinUrl("");
      onCreated();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) { toast.error("Name is required"); return; }
            createContact.mutate({
              name,
              company: company || undefined,
              role: role || undefined,
              email: email || undefined,
              linkedinUrl: linkedinUrl || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input placeholder="Full name" value={name} maxLength={MAX_LENGTHS.CONTACT_NAME} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input placeholder="Company" value={company} maxLength={MAX_LENGTHS.CONTACT_COMPANY} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input placeholder="e.g., Recruiter" value={role} maxLength={MAX_LENGTHS.CONTACT_ROLE} onChange={(e) => setRole(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="email@example.com" value={email} maxLength={MAX_LENGTHS.CONTACT_EMAIL} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input placeholder="https://linkedin.com/in/..." value={linkedinUrl} maxLength={MAX_LENGTHS.CONTACT_LINKEDIN_URL} onChange={(e) => setLinkedinUrl(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={createContact.isPending}>
            {createContact.isPending ? "Adding..." : "Add Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
