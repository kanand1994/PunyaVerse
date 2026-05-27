import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldAlert, Eye, Edit, Plus, Trash } from "lucide-react";
import { formatINR } from "@/lib/utils-app";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [system, setSystem] = useState(null);
  const [payments, setPayments] = useState([]);

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState({ id: "", name: "", email: "", role: "user", is_active: true });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user", is_active: true });

  const load = async () => {
    const [u, s, a, p] = await Promise.all([
      api.get("/superadmin/users"),
      api.get("/superadmin/system"),
      api.get("/superadmin/audit-logs"),
      api.get("/superadmin/payments"),
    ]);
    setUsers(u.data); setSystem(s.data); setAudit(a.data); setPayments(p.data);
  };

  useEffect(() => { if (user?.role === "superadmin") load(); }, [user]);

  const handleEditClick = (u) => {
    setEditUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active ?? true,
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      await api.patch(`/admin/users/${editUser.id}`, {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        is_active: editUser.is_active,
      });
      toast.success("User updated successfully");
      setIsEditOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update user");
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/admin/users", newUser);
      toast.success("User created successfully");
      setIsCreateOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "user", is_active: true });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create user");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete user? This is irreversible.")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User removed successfully");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete user");
    }
  };

  if (user?.role !== "superadmin") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <Card className="p-10 text-center max-w-md">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="font-display text-3xl mt-4">404 · Not Found</h1>
          <p className="text-sm text-muted-foreground mt-2">This portal does not exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge className="bg-destructive text-destructive-foreground" data-testid="sa-badge"><Eye className="h-3 w-3 mr-1" /> SANCTUM PORTAL</Badge>
          <h1 className="font-display text-4xl tracking-tight mt-3">SuperAdmin Console</h1>
          <p className="text-muted-foreground mt-2">Hidden controls for the operating system. Every action is audit-logged.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button 
            onClick={() => navigate("/admin")}
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-himalaya-900"
            data-testid="sa-go-operations-btn"
          >
            Operations Console (Temples & Packages CRUD)
          </Button>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-gold hover:bg-gold-hover text-himalaya-900"
            data-testid="sa-create-user-btn"
          >
            <Plus className="h-4 w-4 mr-2" /> Add User / Admin
          </Button>
        </div>
      </div>

      {system && (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(system.collections).map(([k, v]) => (
            <Card key={k} className="p-5"><p className="font-overline capitalize">{k.replaceAll("_", " ")}</p><p className="font-display text-3xl mt-2">{v}</p></Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="users" className="mt-10">
        <TabsList>
          <TabsTrigger value="users" data-testid="sa-tab-users">Users</TabsTrigger>
          <TabsTrigger value="payments" data-testid="sa-tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="audit" data-testid="sa-tab-audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="system" data-testid="sa-tab-system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Active</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border" data-testid={`sa-user-${u.id}`}>
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize px-2 py-0.5">{u.role}</Badge>
                    </td>
                    <td className="p-3"><Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? "Yes" : "No"}</Badge></td>
                    <td className="p-3 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(u)} data-testid={`sa-edit-${u.id}`}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" disabled={u.id === user.id} onClick={() => remove(u.id)} data-testid={`sa-delete-${u.id}`}>
                        <Trash className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr>
                <th className="text-left p-3">Session</th><th className="text-left p-3">User</th><th className="text-left p-3">Amount (INR / USD)</th><th className="text-left p-3">Status</th><th className="text-left p-3">Created</th>
              </tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.session_id || p.id} className="border-t border-border">
                    <td className="p-3 text-xs font-mono">{(p.session_id || p.id)?.slice(0, 20)}…</td>
                    <td className="p-3">{p.user_email}</td>
                    <td className="p-3 font-medium">
                      {p.amount_inr ? `₹ ${formatINR(p.amount_inr)}` : ""}
                      {p.amount_usd ? ` ($${p.amount_usd?.toFixed?.(2)})` : ""}
                    </td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{p.payment_status}</Badge></td>
                    <td className="p-3 text-muted-foreground text-xs">{p.created_at?.slice(0, 16)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td className="p-6 text-muted-foreground text-center" colSpan={5}>No payments yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr>
                <th className="text-left p-3">Time</th><th className="text-left p-3">Actor</th><th className="text-left p-3">Action</th><th className="text-left p-3">Target</th>
              </tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 text-xs text-muted-foreground">{a.created_at?.slice(0, 19)}</td>
                    <td className="p-3">{a.actor_email}</td>
                    <td className="p-3"><Badge variant="outline">{a.action}</Badge> {a.new_role && <Badge className="ml-1 bg-gold text-himalaya-900">{a.new_role}</Badge>}</td>
                    <td className="p-3 text-muted-foreground">{a.target_user_id?.slice(0, 12)}…</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={4}>No actions logged yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6 grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <p className="font-overline">Feature flags</p>
            <ul className="mt-3 space-y-2 text-sm">
              {system && Object.entries(system.feature_flags).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="capitalize">{k.replaceAll("_", " ")}</span>
                  <Badge variant={v ? "default" : "destructive"} className={v ? "bg-gold text-himalaya-900" : ""}>{v ? "ON" : "OFF"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <p className="font-overline">AI fallback chain</p>
            <ol className="mt-3 space-y-2 text-sm list-decimal list-inside">
              {system?.ai_fallback_chain?.map((m) => <li key={m}>{m}</li>)}
            </ol>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE USER DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="font-overline text-gold">Create Account</p>
            <h2 className="font-display text-2xl mt-1">Add User or Admin</h2>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input 
                value={newUser.name} 
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} 
                placeholder="e.g. Swami Chinmayananda"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                value={newUser.email} 
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                placeholder="e.g. swami@punyaverse.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input 
                type="password" 
                value={newUser.password} 
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                placeholder="At least 6 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>System Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Yatri)</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Account Status</Label>
                <Select 
                  value={newUser.is_active ? "active" : "disabled"} 
                  onValueChange={(v) => setNewUser({ ...newUser, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} className="bg-gold hover:bg-gold-hover text-himalaya-900">Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="font-overline text-gold">Edit Account</p>
            <h2 className="font-display text-2xl mt-1">Live Interactive Update</h2>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input 
                value={editUser.name} 
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} 
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                value={editUser.email} 
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>System Role</Label>
                <Select 
                  value={editUser.role} 
                  onValueChange={(v) => setEditUser({ ...editUser, role: v })}
                  disabled={editUser.id === user.id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Yatri)</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Account Status</Label>
                <Select 
                  value={editUser.is_active ? "active" : "disabled"} 
                  onValueChange={(v) => setEditUser({ ...editUser, is_active: v === "active" })}
                  disabled={editUser.id === user.id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} className="bg-gold hover:bg-gold-hover text-himalaya-900">Save Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
