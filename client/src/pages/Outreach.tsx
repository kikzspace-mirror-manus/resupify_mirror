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
import { Users, Plus, Mail, Linkedin, Search, MessageSquare, Clock, Briefcase, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
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
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onUpdated={() => utils.contacts.listWithUsage.invalidate()}
            />
          ))}
        </div>
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
    </div>
  );
}

// ─── Contact Row ──────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onUpdated,
}: {
  contact: ContactWithUsage;
  onUpdated: () => void;
}) {
  const createdDate = formatShortDate(contact.createdAt);
  const lastTouchDate = formatShortDate(contact.lastTouchAt);
  const nextTouchDate = formatShortDate(contact.nextTouchAt);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-sm font-semibold text-primary">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Name + contact badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{contact.name}</p>
              <Badge className="text-xs bg-blue-100 text-blue-700 shrink-0">
                contact
              </Badge>
            </div>

            {/* Contact details row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {contact.company && <span>{contact.company}</span>}
              {contact.role && <span>· {contact.role}</span>}
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />{contact.email}
                </span>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Linkedin className="h-3 w-3" />LinkedIn
                </a>
              )}
            </div>

            {/* Metadata row: Created + Used in + Last/Next touch */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
              {/* Created date */}
              {createdDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Created: {createdDate}
                </span>
              )}

              {/* Used in job cards */}
              <UsedInBadge contact={contact} />

              {/* Last touch */}
              {lastTouchDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last touch: {lastTouchDate}
                </span>
              )}

              {/* Next touch */}
              {nextTouchDate && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" />
                  Next touch: {nextTouchDate}
                </span>
              )}
            </div>
          </div>

          {/* Notes (desktop) */}
          {contact.notes && (
            <div className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:block shrink-0">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              {contact.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Used In Badge ────────────────────────────────────────────────────────────

function UsedInBadge({ contact }: { contact: ContactWithUsage }) {
  if (contact.usedInCount === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground/60 italic">
        <Briefcase className="h-3 w-3" />
        Not used yet
      </span>
    );
  }

  if (contact.usedInCount === 1 && contact.mostRecentJobCard) {
    const jc = contact.mostRecentJobCard;
    return (
      <Link
        href={`/jobs/${jc.id}`}
        className="flex items-center gap-1 text-primary hover:underline"
      >
        <Briefcase className="h-3 w-3" />
        Used in: {jc.company ? `${jc.company} — ` : ""}{jc.title} ({formatStageLabel(jc.stage)})
      </Link>
    );
  }

  // Multiple job cards — show popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
          <Briefcase className="h-3 w-3" />
          Used in: {contact.usedInCount} job cards · View
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Job Cards ({contact.usedInCount})</p>
          <p className="text-xs text-muted-foreground">Showing up to 10 most recent</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {contact.recentJobCards.map((jc) => (
            <Link
              key={jc.id}
              href={`/jobs/${jc.id}`}
              className="flex items-start gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
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
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
