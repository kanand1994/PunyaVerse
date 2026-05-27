import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatINR, regionLabel } from "@/lib/utils-app";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, Pie, PieChart, Legend } from "recharts";
import { Edit, Plus, Trash, Eye, MapPin, DollarSign, Calendar, Landmark, Info } from "lucide-react";

const STATUS_COLORS = ["#D4AF37", "#FF9933", "#1C2541", "#7C9A92", "#B85042", "#3B5249"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [packages, setPackages] = useState([]);
  const [temples, setTemples] = useState([]);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: "", email: "", password: "" });
  const [assign, setAssign] = useState({ bookingId: "", employeeId: "" });

  // Dialog / Modal states
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [isUserCreateOpen, setIsUserCreateOpen] = useState(false);
  const [isPkgEditOpen, setIsPkgEditOpen] = useState(false);
  const [isPkgCreateOpen, setIsPkgCreateOpen] = useState(false);
  const [isTempleEditOpen, setIsTempleEditOpen] = useState(false);
  const [isTempleCreateOpen, setIsTempleCreateOpen] = useState(false);

  // Form states
  const [editUser, setEditUser] = useState({ id: "", name: "", email: "", role: "user", is_active: true });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user", is_active: true });
  
  const [editPkg, setEditPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState({
    title: "", slug: "", summary: "", duration_days: 7, base_price_inr: 25000,
    luxury_price_inr: "", region: "north_india", difficulty: "easy", category: "pilgrimage",
    transport_modes: "train,bus", inclusions: "Accommodation,Guiding,Darshan", exclusions: "Personal expenses,Tips",
    is_active: true
  });

  const [editTemple, setEditTemple] = useState(null);
  const [templeForm, setTempleForm] = useState({
    name: "", slug: "", region: "north_india", state_or_country: "India",
    deity: "", significance: "", history: "", best_season: "", darshan_timings: "",
    vip_darshan: false, elevation_m: 200, nearest_airport: "", nearest_railway: "",
    image_url: "", lat: 30.0, lng: 78.0, requires_trek: false, trek_distance_km: 0,
    trek_difficulty: "easy", is_active: true
  });

  const load = async () => {
    const [u, b, a, p, t, pay, aud] = await Promise.all([
      api.get("/admin/users"),
      api.get("/admin/bookings"),
      api.get("/admin/analytics"),
      api.get("/packages", { params: { include_inactive: true } }),
      api.get("/temples", { params: { include_inactive: true } }),
      api.get("/admin/payments"),
      api.get("/admin/audit-logs"),
    ]);
    setUsers(u.data);
    setBookings(b.data);
    setAnalytics(a.data);
    setPackages(p.data);
    setTemples(t.data);
    setPayments(pay.data);
    setAudit(aud.data);
    setEmployees(u.data.filter((x) => x.role === "employee"));
  };

  useEffect(() => { load(); }, []);

  const createEmployee = async () => {
    try {
      await api.post("/admin/employees", newEmp);
      toast.success("Employee created successfully");
      setNewEmp({ name: "", email: "", password: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to create employee"); }
  };

  const doAssign = async () => {
    if (!assign.bookingId || !assign.employeeId) return;
    await api.post(`/admin/bookings/${assign.bookingId}/assign/${assign.employeeId}`);
    toast.success("Booking assigned successfully");
    setAssign({ bookingId: "", employeeId: "" });
    load();
  };

  // User CRUD
  const handleEditUserClick = (u) => {
    setEditUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active ?? true,
    });
    setIsUserEditOpen(true);
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
      setIsUserEditOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update user");
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/admin/users", newUser);
      toast.success("Account created successfully");
      setIsUserCreateOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "user", is_active: true });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create account");
    }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm("Delete this user? This is irreversible.")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted successfully");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete user");
    }
  };

  // Package CRUD
  const handleAddPackageClick = () => {
    setPkgForm({
      title: "", slug: "", summary: "", duration_days: 7, base_price_inr: 25000,
      luxury_price_inr: "", region: "north_india", difficulty: "easy", category: "pilgrimage",
      transport_modes: "train,bus", inclusions: "Accommodation,Guiding,Darshan", exclusions: "Personal expenses,Tips",
      is_active: true
    });
    setIsPkgCreateOpen(true);
  };

  const handleEditPackageClick = (p) => {
    setEditPkg(p);
    setPkgForm({
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      duration_days: p.duration_days,
      base_price_inr: p.base_price_inr,
      luxury_price_inr: p.luxury_price_inr || "",
      region: p.region,
      difficulty: p.difficulty || "easy",
      category: p.category || "pilgrimage",
      transport_modes: p.transport_modes?.join(",") || "",
      inclusions: p.inclusions?.join(",") || "",
      exclusions: p.exclusions?.join(",") || "",
      is_active: p.is_active ?? true,
    });
    setIsPkgEditOpen(true);
  };

  const handleCreatePackage = async () => {
    try {
      const payload = {
        ...pkgForm,
        duration_days: parseInt(pkgForm.duration_days),
        base_price_inr: parseFloat(pkgForm.base_price_inr),
        luxury_price_inr: pkgForm.luxury_price_inr ? parseFloat(pkgForm.luxury_price_inr) : null,
        transport_modes: pkgForm.transport_modes.split(",").map(s => s.trim()).filter(Boolean),
        inclusions: pkgForm.inclusions.split(",").map(s => s.trim()).filter(Boolean),
        exclusions: pkgForm.exclusions.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.post("/packages", payload);
      toast.success("Package created successfully");
      setIsPkgCreateOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create package");
    }
  };

  const handleUpdatePackage = async () => {
    try {
      const payload = {
        ...pkgForm,
        duration_days: parseInt(pkgForm.duration_days),
        base_price_inr: parseFloat(pkgForm.base_price_inr),
        luxury_price_inr: pkgForm.luxury_price_inr ? parseFloat(pkgForm.luxury_price_inr) : null,
        transport_modes: pkgForm.transport_modes.split(",").map(s => s.trim()).filter(Boolean),
        inclusions: pkgForm.inclusions.split(",").map(s => s.trim()).filter(Boolean),
        exclusions: pkgForm.exclusions.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.patch(`/packages/${editPkg.id}`, payload);
      toast.success("Package updated successfully");
      setIsPkgEditOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update package");
    }
  };

  const handleRemovePackage = async (id) => {
    if (!window.confirm("Delete this package? This is irreversible.")) return;
    try {
      await api.delete(`/packages/${id}`);
      toast.success("Package deleted successfully");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete package");
    }
  };

  // Temple CRUD
  const handleAddTempleClick = () => {
    setTempleForm({
      name: "", slug: "", region: "north_india", state_or_country: "India",
      deity: "", significance: "", history: "", best_season: "", darshan_timings: "",
      vip_darshan: false, elevation_m: 200, nearest_airport: "", nearest_railway: "",
      image_url: "", lat: 30.0, lng: 78.0, requires_trek: false, trek_distance_km: 0,
      trek_difficulty: "easy", is_active: true
    });
    setIsTempleCreateOpen(true);
  };

  const handleEditTempleClick = (t) => {
    setEditTemple(t);
    setTempleForm({
      name: t.name,
      slug: t.slug,
      region: t.region,
      state_or_country: t.state_or_country,
      deity: t.deity || "",
      significance: t.significance || "",
      history: t.history || "",
      best_season: t.best_season || "",
      darshan_timings: t.darshan_timings || "",
      vip_darshan: t.vip_darshan ?? false,
      elevation_m: t.elevation_m || 200,
      nearest_airport: t.nearest_airport || "",
      nearest_railway: t.nearest_railway || "",
      image_url: t.image_url || "",
      lat: t.lat || 30.0,
      lng: t.lng || 78.0,
      requires_trek: t.requires_trek ?? false,
      trek_distance_km: t.trek_distance_km || 0,
      trek_difficulty: t.trek_difficulty || "easy",
      is_active: t.is_active ?? true
    });
    setIsTempleEditOpen(true);
  };

  const handleCreateTemple = async () => {
    try {
      const payload = {
        ...templeForm,
        elevation_m: templeForm.elevation_m ? parseInt(templeForm.elevation_m) : null,
        lat: templeForm.lat ? parseFloat(templeForm.lat) : null,
        lng: templeForm.lng ? parseFloat(templeForm.lng) : null,
        trek_distance_km: templeForm.trek_distance_km ? parseFloat(templeForm.trek_distance_km) : null,
      };
      await api.post("/temples", payload);
      toast.success("Temple created successfully");
      setIsTempleCreateOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create temple");
    }
  };

  const handleUpdateTemple = async () => {
    try {
      const payload = {
        ...templeForm,
        elevation_m: templeForm.elevation_m ? parseInt(templeForm.elevation_m) : null,
        lat: templeForm.lat ? parseFloat(templeForm.lat) : null,
        lng: templeForm.lng ? parseFloat(templeForm.lng) : null,
        trek_distance_km: templeForm.trek_distance_km ? parseFloat(templeForm.trek_distance_km) : null,
      };
      await api.patch(`/temples/${editTemple.id}`, payload);
      toast.success("Temple updated successfully");
      setIsTempleEditOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update temple");
    }
  };

  const handleRemoveTemple = async (id) => {
    if (!window.confirm("Delete this temple? This is irreversible.")) return;
    try {
      await api.delete(`/temples/${id}`);
      toast.success("Temple deleted successfully");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete temple");
    }
  };

  const handleToggleTempleStatus = async (temple) => {
    try {
      const nextActive = !(temple.is_active ?? true);
      await api.patch(`/temples/${temple.id}`, { is_active: nextActive });
      toast.success(`Temple "${temple.name}" ${nextActive ? "activated" : "temporarily suspended"} successfully`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to toggle status");
    }
  };

  const handleTogglePackageStatus = async (pkg) => {
    try {
      const nextActive = !(pkg.is_active ?? true);
      await api.patch(`/packages/${pkg.id}`, { is_active: nextActive });
      toast.success(`Package "${pkg.title}" ${nextActive ? "activated" : "temporarily suspended"} successfully`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to toggle status");
    }
  };

  if (!analytics) return <div className="flex justify-center py-24"><div className="mandala-loader" /></div>;

  const statusData = Object.entries(analytics.bookings_by_status).map(([k, v]) => ({ name: k, value: v }));
  const regionData = Object.entries(analytics.revenue_by_region).map(([k, v]) => ({ name: regionLabel(k), revenue: v }));

  // Helper to determine if a user can be managed by the logged-in user
  const canManageUser = (targetUser) => {
    if (targetUser.id === user.id) return false;
    // Admins cannot do CRUD on other admins or superadmins
    if (user.role === "admin" && (targetUser.role === "admin" || targetUser.role === "superadmin")) return false;
    return true;
  };

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-overline text-gold">Admin Console</p>
          <h1 className="font-display text-4xl tracking-tight mt-3">PunyaVerse — Operations</h1>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Users" value={analytics.total_users} />
        <Stat label="Employees" value={analytics.total_employees} />
        <Stat label="Bookings" value={analytics.total_bookings} />
        <Stat label="Revenue" value={`₹ ${formatINR(analytics.total_revenue_inr)}`} />
      </div>

      <Tabs defaultValue="overview" className="mt-10">
        <TabsList>
          <TabsTrigger value="overview" data-testid="admin-tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="temples" data-testid="admin-tab-temples">Temples</TabsTrigger>
          <TabsTrigger value="packages" data-testid="admin-tab-packages">Packages</TabsTrigger>
          <TabsTrigger value="bookings" data-testid="admin-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="employees" data-testid="admin-tab-employees">Employees</TabsTrigger>
          <TabsTrigger value="payments" data-testid="admin-tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="audit" data-testid="admin-tab-audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <p className="font-overline">Bookings by status</p>
            <div className="h-72 mt-4">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <p className="font-overline">Revenue by region</p>
            <div className="h-72 mt-4">
              <ResponsiveContainer>
                <BarChart data={regionData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 md:col-span-2">
            <p className="font-overline">Top packages</p>
            <div className="mt-4 space-y-2">
              {analytics.top_packages.map((p) => (
                <div key={p.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span>{p.title}</span>
                  <Badge variant="outline">{p.bookings} bookings</Badge>
                </div>
              ))}
              {analytics.top_packages.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsUserCreateOpen(true)} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="admin-add-user-btn">
              <Plus className="h-4 w-4 mr-2" /> Add Yatri (User)
            </Button>
          </div>
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
                  <tr key={u.id} className="border-t border-border" data-testid={`admin-user-${u.id}`}>
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                    <td className="p-3"><Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? "Yes" : "No"}</Badge></td>
                    <td className="p-3 flex gap-2">
                      {canManageUser(u) ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEditUserClick(u)} data-testid={`admin-edit-${u.id}`}>
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveUser(u.id)} data-testid={`admin-delete-${u.id}`}>
                            <Trash className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">ReadOnly (Admin Locked)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="temples" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddTempleClick} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="admin-add-temple-btn">
              <Plus className="h-4 w-4 mr-2" /> Add Temple
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {temples.map((t) => (
              <Card key={t.id} className="p-5 flex flex-col justify-between" data-testid={`admin-temple-card-${t.id}`}>
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display text-lg tracking-tight leading-tight">{t.name}</h3>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="capitalize text-xs">{t.state_or_country}</Badge>
                      <Badge variant={(t.is_active ?? true) ? "default" : "secondary"} className={(t.is_active ?? true) ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] hover:bg-emerald-100" : "bg-rose-100 text-rose-800 border-rose-200 text-[10px] hover:bg-rose-100"}>
                        {(t.is_active ?? true) ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {regionLabel(t.region)}</p>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{t.significance || "No details provided."}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.deity && <Badge variant="secondary" className="text-[10px]">Deity: {t.deity}</Badge>}
                    {t.elevation_m && <Badge variant="secondary" className="text-[10px]">Elevation: {t.elevation_m}m</Badge>}
                    {t.vip_darshan && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">VIP available</Badge>}
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border flex justify-between items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    <p>Trek: {t.requires_trek ? `${t.trek_distance_km}km (${t.trek_difficulty})` : "No trek"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={(t.is_active ?? true) ? "secondary" : "outline"} onClick={() => handleToggleTempleStatus(t)} data-testid={`admin-temple-toggle-${t.id}`}>
                      {(t.is_active ?? true) ? "Suspend" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditTempleClick(t)} data-testid={`admin-temple-edit-${t.id}`}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRemoveTemple(t.id)} data-testid={`admin-temple-delete-${t.id}`}>
                      <Trash className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {temples.length === 0 && <p className="text-muted-foreground p-6 col-span-3 text-center">No temples configured.</p>}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddPackageClick} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="admin-add-pkg-btn">
              <Plus className="h-4 w-4 mr-2" /> Add Package
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((p) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between" data-testid={`admin-pkg-card-${p.id}`}>
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display text-lg tracking-tight leading-tight">{p.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-gold hover:bg-gold text-himalaya-900 capitalize text-xs">{p.difficulty}</Badge>
                      <Badge variant={(p.is_active ?? true) ? "default" : "secondary"} className={(p.is_active ?? true) ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] hover:bg-emerald-100" : "bg-rose-100 text-rose-800 border-rose-200 text-[10px] hover:bg-rose-100"}>
                        {(p.is_active ?? true) ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {regionLabel(p.region)}</p>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed">{p.summary}</p>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border flex justify-between items-center gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Base Price</p>
                    <p className="font-display text-base text-gold mt-0.5">₹ {formatINR(p.base_price_inr)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={(p.is_active ?? true) ? "secondary" : "outline"} onClick={() => handleTogglePackageStatus(p)} data-testid={`admin-pkg-toggle-${p.id}`}>
                      {(p.is_active ?? true) ? "Suspend" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditPackageClick(p)} data-testid={`admin-pkg-edit-${p.id}`}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRemovePackage(p.id)} data-testid={`admin-pkg-delete-${p.id}`}>
                      <Trash className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {packages.length === 0 && <p className="text-muted-foreground p-6 col-span-3 text-center">No packages configured.</p>}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-6 space-y-3">
          <Card className="p-4 flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label>Booking</Label>
              <Select value={assign.bookingId} onValueChange={(v) => setAssign({ ...assign, bookingId: v })}>
                <SelectTrigger data-testid="assign-booking-select"><SelectValue placeholder="Pick booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.map((b) => <SelectItem key={b.id} value={b.id}>{b.user_name} · {b.package_title.slice(0, 30)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Employee</Label>
              <Select value={assign.employeeId} onValueChange={(v) => setAssign({ ...assign, employeeId: v })}>
                <SelectTrigger data-testid="assign-employee-select"><SelectValue placeholder="Pick employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={doAssign} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="assign-btn">Assign</Button>
          </Card>

          {bookings.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col md:flex-row justify-between gap-3" data-testid={`admin-booking-${b.id}`}>
              <div>
                <p className="font-display">{b.package_title}</p>
                <p className="text-xs text-muted-foreground">{b.user_name} ({b.user_email})</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="capitalize">{b.status.replace("_", " ")}</Badge>
                <p className="font-display mt-1">₹ {formatINR(b.total_amount_inr)}</p>
                {b.assigned_employee_id && <p className="text-xs text-muted-foreground">Assigned · {employees.find(e => e.id === b.assigned_employee_id)?.name}</p>}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="employees" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="open-add-employee">
                  <Plus className="h-4 w-4 mr-2" /> Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create employee account</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} data-testid="emp-name" /></div>
                  <div><Label>Email</Label><Input type="email" value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} data-testid="emp-email" /></div>
                  <div><Label>Password</Label><Input type="password" value={newEmp.password} onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })} data-testid="emp-password" /></div>
                </div>
                <DialogFooter>
                  <Button onClick={createEmployee} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="emp-create-btn">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

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
                {employees.map((e) => (
                  <tr key={e.id} className="border-t border-border" data-testid={`admin-emp-row-${e.id}`}>
                    <td className="p-3 font-medium">{e.name}</td>
                    <td className="p-3 text-muted-foreground">{e.email}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{e.role}</Badge></td>
                    <td className="p-3"><Badge variant={e.is_active ? "default" : "destructive"}>{e.is_active ? "Yes" : "No"}</Badge></td>
                    <td className="p-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditUserClick(e)} data-testid={`admin-emp-edit-${e.id}`}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveUser(e.id)} data-testid={`admin-emp-delete-${e.id}`}>
                        <Trash className="h-3 w-3 mr-1" /> Delete
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
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3">Session</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Amount (INR / USD)</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.session_id || p.id} className="border-t border-border" data-testid={`admin-payment-${p.id}`}>
                    <td className="p-3 text-xs font-mono">{(p.session_id || p.id)?.slice(0, 20)}…</td>
                    <td className="p-3">{p.user_email}</td>
                    <td className="p-3 font-medium">
                      {p.amount_inr ? `₹ ${formatINR(p.amount_inr)}` : ""}
                      {p.amount_usd ? ` ($${p.amount_usd?.toFixed?.(2)})` : ""}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize">
                        {p.payment_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{p.created_at?.slice(0, 16)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td className="p-6 text-muted-foreground text-center" colSpan={5}>
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Actor</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 text-xs text-muted-foreground">{a.created_at?.slice(0, 19)}</td>
                    <td className="p-3 font-medium">{a.actor_email}</td>
                    <td className="p-3">
                      <Badge variant="outline">{a.action}</Badge>
                      {a.new_role && <Badge className="ml-1 bg-gold text-himalaya-900">{a.new_role}</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{(a.target_user_id || "")?.slice(0, 12)}…</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                      No actions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE USER DIALOG */}
      <Dialog open={isUserCreateOpen} onOpenChange={setIsUserCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="font-overline text-gold">Create Account</p>
            <h2 className="font-display text-2xl mt-1">Add Yatri</h2>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input 
                value={newUser.name} 
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} 
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                value={newUser.email} 
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                placeholder="e.g. rahul@gmail.com"
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
            <Button variant="outline" onClick={() => setIsUserCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} className="bg-gold hover:bg-gold-hover text-himalaya-900">Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={isUserEditOpen} onOpenChange={setIsUserEditOpen}>
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
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Yatri)</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Account Status</Label>
                <Select 
                  value={editUser.is_active ? "active" : "disabled"} 
                  onValueChange={(v) => setEditUser({ ...editUser, is_active: v === "active" })}
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
            <Button variant="outline" onClick={() => setIsUserEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} className="bg-gold hover:bg-gold-hover text-himalaya-900">Save Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE PACKAGE DIALOG */}
      <Dialog open={isPkgCreateOpen} onOpenChange={setIsPkgCreateOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <p className="font-overline text-gold">Package Catalog</p>
            <h2 className="font-display text-2xl mt-1">Add New Sacred Package</h2>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Package Title</Label>
                <Input value={pkgForm.title} onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })} placeholder="Char Dham Luxury Yatra" />
              </div>
              <div className="space-y-1">
                <Label>Unique Slug</Label>
                <Input value={pkgForm.slug} onChange={(e) => setPkgForm({ ...pkgForm, slug: e.target.value })} placeholder="char-dham-luxury-yatra" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Summary Description</Label>
              <Input value={pkgForm.summary} onChange={(e) => setPkgForm({ ...pkgForm, summary: e.target.value })} placeholder="Enter brief summary of the spiritual tour package" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Duration (Days)</Label>
                <Input type="number" value={pkgForm.duration_days} onChange={(e) => setPkgForm({ ...pkgForm, duration_days: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Base Price (INR)</Label>
                <Input type="number" value={pkgForm.base_price_inr} onChange={(e) => setPkgForm({ ...pkgForm, base_price_inr: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Luxury Price (INR)</Label>
                <Input type="number" value={pkgForm.luxury_price_inr} onChange={(e) => setPkgForm({ ...pkgForm, luxury_price_inr: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Region</Label>
                <Select value={pkgForm.region} onValueChange={(v) => setPkgForm({ ...pkgForm, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_india">North India</SelectItem>
                    <SelectItem value="south_india">South India</SelectItem>
                    <SelectItem value="east_india">East India</SelectItem>
                    <SelectItem value="west_india">West India</SelectItem>
                    <SelectItem value="central_india">Central India</SelectItem>
                    <SelectItem value="nepal">Nepal</SelectItem>
                    <SelectItem value="kailash">Tibet (Kailash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Difficulty</Label>
                <Select value={pkgForm.difficulty} onValueChange={(v) => setPkgForm({ ...pkgForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (Mild Walking)</SelectItem>
                    <SelectItem value="medium">Medium (Moderate Trekking)</SelectItem>
                    <SelectItem value="hard">Hard (Extreme Altitudes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={pkgForm.category} onValueChange={(v) => setPkgForm({ ...pkgForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pilgrimage">Standard Pilgrimage</SelectItem>
                    <SelectItem value="trekking">Trekking Expedition</SelectItem>
                    <SelectItem value="helicopter">Helicopter Charter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Transport Modes (comma separated)</Label>
                <Input value={pkgForm.transport_modes} onChange={(e) => setPkgForm({ ...pkgForm, transport_modes: e.target.value })} placeholder="train, bus, helicopter" />
              </div>
              <div className="space-y-1">
                <Label>Active Status</Label>
                <Select 
                  value={pkgForm.is_active ? "active" : "suspended"} 
                  onValueChange={(v) => setPkgForm({ ...pkgForm, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Publicly Visible)</SelectItem>
                    <SelectItem value="suspended">Suspended (Temporarily Hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Package Inclusions (comma separated)</Label>
              <Input value={pkgForm.inclusions} onChange={(e) => setPkgForm({ ...pkgForm, inclusions: e.target.value })} placeholder="Luxury stays, Sattvik meals, VIP Entry" />
            </div>

            <div className="space-y-1">
              <Label>Package Exclusions (comma separated)</Label>
              <Input value={pkgForm.exclusions} onChange={(e) => setPkgForm({ ...pkgForm, exclusions: e.target.value })} placeholder="Personal tips, Porter charges" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPkgCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePackage} className="bg-gold hover:bg-gold-hover text-himalaya-900">Publish Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PACKAGE DIALOG */}
      <Dialog open={isPkgEditOpen} onOpenChange={setIsPkgEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <p className="font-overline text-gold">Package Catalog</p>
            <h2 className="font-display text-2xl mt-1">Edit Sacred Package</h2>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Package Title</Label>
                <Input value={pkgForm.title} onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Unique Slug</Label>
                <Input value={pkgForm.slug} onChange={(e) => setPkgForm({ ...pkgForm, slug: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Summary Description</Label>
              <Input value={pkgForm.summary} onChange={(e) => setPkgForm({ ...pkgForm, summary: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Duration (Days)</Label>
                <Input type="number" value={pkgForm.duration_days} onChange={(e) => setPkgForm({ ...pkgForm, duration_days: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Base Price (INR)</Label>
                <Input type="number" value={pkgForm.base_price_inr} onChange={(e) => setPkgForm({ ...pkgForm, base_price_inr: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Luxury Price (INR)</Label>
                <Input type="number" value={pkgForm.luxury_price_inr} onChange={(e) => setPkgForm({ ...pkgForm, luxury_price_inr: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Region</Label>
                <Select value={pkgForm.region} onValueChange={(v) => setPkgForm({ ...pkgForm, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_india">North India</SelectItem>
                    <SelectItem value="south_india">South India</SelectItem>
                    <SelectItem value="east_india">East India</SelectItem>
                    <SelectItem value="west_india">West India</SelectItem>
                    <SelectItem value="central_india">Central India</SelectItem>
                    <SelectItem value="nepal">Nepal</SelectItem>
                    <SelectItem value="kailash">Tibet (Kailash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Difficulty</Label>
                <Select value={pkgForm.difficulty} onValueChange={(v) => setPkgForm({ ...pkgForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (Mild Walking)</SelectItem>
                    <SelectItem value="medium">Medium (Moderate Trekking)</SelectItem>
                    <SelectItem value="hard">Hard (Extreme Altitudes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={pkgForm.category} onValueChange={(v) => setPkgForm({ ...pkgForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pilgrimage">Standard Pilgrimage</SelectItem>
                    <SelectItem value="trekking">Trekking Expedition</SelectItem>
                    <SelectItem value="helicopter">Helicopter Charter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Transport Modes (comma separated)</Label>
                <Input value={pkgForm.transport_modes} onChange={(e) => setPkgForm({ ...pkgForm, transport_modes: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Active Status</Label>
                <Select 
                  value={pkgForm.is_active ? "active" : "suspended"} 
                  onValueChange={(v) => setPkgForm({ ...pkgForm, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Publicly Visible)</SelectItem>
                    <SelectItem value="suspended">Suspended (Temporarily Hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Package Inclusions (comma separated)</Label>
              <Input value={pkgForm.inclusions} onChange={(e) => setPkgForm({ ...pkgForm, inclusions: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Package Exclusions (comma separated)</Label>
              <Input value={pkgForm.exclusions} onChange={(e) => setPkgForm({ ...pkgForm, exclusions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPkgEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePackage} className="bg-gold hover:bg-gold-hover text-himalaya-900">Save Package Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE TEMPLE DIALOG */}
      <Dialog open={isTempleCreateOpen} onOpenChange={setIsTempleCreateOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <p className="font-overline text-gold">Temple Directory</p>
            <h2 className="font-display text-2xl mt-1">Add Sacred Temple</h2>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Temple Name</Label>
                <Input value={templeForm.name} onChange={(e) => setTempleForm({ ...templeForm, name: e.target.value })} placeholder="e.g. Somnath Temple" />
              </div>
              <div className="space-y-1">
                <Label>Unique Slug</Label>
                <Input value={templeForm.slug} onChange={(e) => setTempleForm({ ...templeForm, slug: e.target.value })} placeholder="e.g. somnath-temple" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Region</Label>
                <Select value={templeForm.region} onValueChange={(v) => setTempleForm({ ...templeForm, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_india">North India</SelectItem>
                    <SelectItem value="south_india">South India</SelectItem>
                    <SelectItem value="east_india">East India</SelectItem>
                    <SelectItem value="west_india">West India</SelectItem>
                    <SelectItem value="central_india">Central India</SelectItem>
                    <SelectItem value="nepal">Nepal</SelectItem>
                    <SelectItem value="kailash">Tibet (Kailash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>State / Country</Label>
                <Input value={templeForm.state_or_country} onChange={(e) => setTempleForm({ ...templeForm, state_or_country: e.target.value })} placeholder="e.g. Gujarat, India" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Primary Deity</Label>
                <Input value={templeForm.deity} onChange={(e) => setTempleForm({ ...templeForm, deity: e.target.value })} placeholder="e.g. Lord Shiva" />
              </div>
              <div className="space-y-1">
                <Label>Elevation (meters)</Label>
                <Input type="number" value={templeForm.elevation_m} onChange={(e) => setTempleForm({ ...templeForm, elevation_m: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>VIP Darshan Cost</Label>
                <Select 
                  value={templeForm.vip_darshan ? "available" : "unavailable"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, vip_darshan: v === "available" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">VIP Booking Available</SelectItem>
                    <SelectItem value="unavailable">No VIP Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nearest Airport</Label>
                <Input value={templeForm.nearest_airport} onChange={(e) => setTempleForm({ ...templeForm, nearest_airport: e.target.value })} placeholder="e.g. Dehradun Airport" />
              </div>
              <div className="space-y-1">
                <Label>Nearest Railway Station</Label>
                <Input value={templeForm.nearest_railway} onChange={(e) => setTempleForm({ ...templeForm, nearest_railway: e.target.value })} placeholder="e.g. Haridwar Junction" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Requires Trek?</Label>
                <Select 
                  value={templeForm.requires_trek ? "yes" : "no"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, requires_trek: v === "yes" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Requires Trek</SelectItem>
                    <SelectItem value="no">No Trek (Road Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Trek Distance (km)</Label>
                <Input type="number" disabled={!templeForm.requires_trek} value={templeForm.trek_distance_km} onChange={(e) => setTempleForm({ ...templeForm, trek_distance_km: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Trek Difficulty</Label>
                <Select disabled={!templeForm.requires_trek} value={templeForm.trek_difficulty} onValueChange={(v) => setTempleForm({ ...templeForm, trek_difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Latitude</Label>
                <Input type="number" value={templeForm.lat} onChange={(e) => setTempleForm({ ...templeForm, lat: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Longitude</Label>
                <Input type="number" value={templeForm.lng} onChange={(e) => setTempleForm({ ...templeForm, lng: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Significance / Details</Label>
              <Input value={templeForm.significance} onChange={(e) => setTempleForm({ ...templeForm, significance: e.target.value })} placeholder="Primary spiritual details and cost rules..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input value={templeForm.image_url} onChange={(e) => setTempleForm({ ...templeForm, image_url: e.target.value })} placeholder="https://assets..." />
              </div>
              <div className="space-y-1">
                <Label>Active Status</Label>
                <Select 
                  value={templeForm.is_active ? "active" : "suspended"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Publicly Visible)</SelectItem>
                    <SelectItem value="suspended">Suspended (Temporarily Hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTempleCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemple} className="bg-gold hover:bg-gold-hover text-himalaya-900">Publish Temple</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT TEMPLE DIALOG */}
      <Dialog open={isTempleEditOpen} onOpenChange={setIsTempleEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <p className="font-overline text-gold">Temple Directory</p>
            <h2 className="font-display text-2xl mt-1">Edit Sacred Temple</h2>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Temple Name</Label>
                <Input value={templeForm.name} onChange={(e) => setTempleForm({ ...templeForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Unique Slug</Label>
                <Input value={templeForm.slug} onChange={(e) => setTempleForm({ ...templeForm, slug: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Region</Label>
                <Select value={templeForm.region} onValueChange={(v) => setTempleForm({ ...templeForm, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_india">North India</SelectItem>
                    <SelectItem value="south_india">South India</SelectItem>
                    <SelectItem value="east_india">East India</SelectItem>
                    <SelectItem value="west_india">West India</SelectItem>
                    <SelectItem value="central_india">Central India</SelectItem>
                    <SelectItem value="nepal">Nepal</SelectItem>
                    <SelectItem value="kailash">Tibet (Kailash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>State / Country</Label>
                <Input value={templeForm.state_or_country} onChange={(e) => setTempleForm({ ...templeForm, state_or_country: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Primary Deity</Label>
                <Input value={templeForm.deity} onChange={(e) => setTempleForm({ ...templeForm, deity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Elevation (meters)</Label>
                <Input type="number" value={templeForm.elevation_m} onChange={(e) => setTempleForm({ ...templeForm, elevation_m: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>VIP Darshan Cost</Label>
                <Select 
                  value={templeForm.vip_darshan ? "available" : "unavailable"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, vip_darshan: v === "available" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">VIP Booking Available</SelectItem>
                    <SelectItem value="unavailable">No VIP Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nearest Airport</Label>
                <Input value={templeForm.nearest_airport} onChange={(e) => setTempleForm({ ...templeForm, nearest_airport: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Nearest Railway Station</Label>
                <Input value={templeForm.nearest_railway} onChange={(e) => setTempleForm({ ...templeForm, nearest_railway: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Requires Trek?</Label>
                <Select 
                  value={templeForm.requires_trek ? "yes" : "no"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, requires_trek: v === "yes" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Requires Trek</SelectItem>
                    <SelectItem value="no">No Trek (Road Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Trek Distance (km)</Label>
                <Input type="number" disabled={!templeForm.requires_trek} value={templeForm.trek_distance_km} onChange={(e) => setTempleForm({ ...templeForm, trek_distance_km: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Trek Difficulty</Label>
                <Select disabled={!templeForm.requires_trek} value={templeForm.trek_difficulty} onValueChange={(v) => setTempleForm({ ...templeForm, trek_difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Latitude</Label>
                <Input type="number" value={templeForm.lat} onChange={(e) => setTempleForm({ ...templeForm, lat: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Longitude</Label>
                <Input type="number" value={templeForm.lng} onChange={(e) => setTempleForm({ ...templeForm, lng: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Significance / Details</Label>
              <Input value={templeForm.significance} onChange={(e) => setTempleForm({ ...templeForm, significance: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input value={templeForm.image_url} onChange={(e) => setTempleForm({ ...templeForm, image_url: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Active Status</Label>
                <Select 
                  value={templeForm.is_active ? "active" : "suspended"} 
                  onValueChange={(v) => setTempleForm({ ...templeForm, is_active: v === "active" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Publicly Visible)</SelectItem>
                    <SelectItem value="suspended">Suspended (Temporarily Hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTempleEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTemple} className="bg-gold hover:bg-gold-hover text-himalaya-900">Save Temple Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }) {
  return <Card className="p-5"><p className="font-overline">{label}</p><p className="font-display text-3xl mt-2">{value}</p></Card>;
}
