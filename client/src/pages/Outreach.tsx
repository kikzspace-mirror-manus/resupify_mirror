import { trpc } from "@/lib/trpc";
import { MAX_LENGTHS } from "../../../shared/maxLengths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Mail, Linkedin, Search, MessageSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Outreach() {
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
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
  }, [contacts, filterStatus, search]);

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-amber-100 text-amber-700",
    replied: "bg-emerald-100 text-emerald-700",
    no_response: "bg-gray-100 text-gray-500",
  };

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
            utils.contacts.list.invalidate();
            setShowCreate(false);
          }}
        />
      </div>

      {/* Filters */}
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="no_response">No Response</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{contact.name}</p>
                      <Badge className="text-xs bg-blue-100 text-blue-700">
                        contact
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
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
                  </div>
                  {contact.notes && (
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:block">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {contact.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
