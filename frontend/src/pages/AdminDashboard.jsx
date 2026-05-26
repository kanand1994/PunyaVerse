import { useEffect, useState } from "react";
import api from "@/lib/api";
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

const STATUS_COLORS = ["#D4AF37", "#FF9933", "#1C2541", "#7C9A92", "#B85042", "#3B5249"];

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: "", email: "", password: "" });
  const [assign, setAssign] = useState({ bookingId: "", employeeId: "" });

  const load = async () => {
    const [u, b, a] = await Promise.all([
      api.get("/admin/users"),
      api.get("/admin/bookings"),
      api.get("/admin/analytics"),
    ]);
    setUsers(u.data);
    setBookings(b.data);
    setAnalytics(a.data);
    setEmployees(u.data.filter((x) => x.role === "employee"));
  };
  useEffect(() => { load(); }, []);

  const createEmployee = async () => {
    try {
      await api.post("/admin/employees", newEmp);
      toast.success("Employee created");
      setNewEmp({ name: "", email: "", password: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const doAssign = async () => {
    if (!assign.bookingId || !assign.employeeId) return;
    await api.post(`/admin/bookings/${assign.bookingId}/assign/${assign.employeeId}`);
    toast.success("Booking assigned");
    setAssign({ bookingId: "", employeeId: "" });
    load();
  };

  if (!analytics) return <div className="flex justify-center py-24"><div className="mandala-loader" /></div>;

  const statusData = Object.entries(analytics.bookings_by_status).map(([k, v]) => ({ name: k, value: v }));
  const regionData = Object.entries(analytics.revenue_by_region).map(([k, v]) => ({ name: regionLabel(k), revenue: v }));

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Admin Console</p>
      <h1 className="font-display text-4xl tracking-tight mt-3">PunyaVerse — Operations</h1>

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
          <TabsTrigger value="bookings" data-testid="admin-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="employees" data-testid="admin-tab-employees">Employees</TabsTrigger>
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
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Created</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border" data-testid={`admin-user-${u.id}`}>
                    <td className="p-3">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                    <td className="p-3 text-muted-foreground">{u.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="open-add-employee">Add Employee</Button>
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

          <div className="grid sm:grid-cols-2 gap-3">
            {employees.map((e) => (
              <Card key={e.id} className="p-5">
                <p className="font-display">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.email}</p>
                <Badge variant="outline" className="mt-2">{e.role}</Badge>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }) {
  return <Card className="p-5"><p className="font-overline">{label}</p><p className="font-display text-3xl mt-2">{value}</p></Card>;
}
