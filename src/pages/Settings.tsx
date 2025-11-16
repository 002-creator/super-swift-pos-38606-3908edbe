import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Settings as SettingsType, Cashier } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, Upload, Plus, Trash2, UserPlus, KeyRound } from 'lucide-react';
import { SystemRestore } from '@/components/SystemRestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>({
    storeName: 'SuperMart POS',
    taxRate: 10,
    currency: 'LKR',
    receiptHeader: 'Thank you for shopping with us!',
    receiptFooter: 'Visit again soon!'
  });

  const categories = useLiveQuery(() => db.categories.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const units = useLiveQuery(() => db.units.toArray());
  const cashiers = useLiveQuery(() => db.cashiers.toArray());
  const quickQuantities = useLiveQuery(() => db.quickQuantities.toArray());

  const [newCategory, setNewCategory] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newUnit, setNewUnit] = useState({ name: '', symbol: '' });
  const [newCashier, setNewCashier] = useState({ name: '', pin: '', role: 'cashier' as 'admin' | 'cashier' });
  const [isCashierDialogOpen, setIsCashierDialogOpen] = useState(false);
  const [newQuickQty, setNewQuickQty] = useState({ value: 0, label: '' });
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await db.settings.toArray();
    if (result.length > 0) {
      setSettings(result[0]);
    }
  };

  const handleSave = async () => {
    try {
      const existing = await db.settings.toArray();
      if (existing.length > 0) {
        await db.settings.update(existing[0].id!, settings);
      } else {
        await db.settings.add(settings);
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    }
  };

  const handleResetAdminPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 4) {
      toast({
        title: 'Error',
        description: 'Password must be at least 4 characters',
        variant: 'destructive'
      });
      return;
    }

    try {
      const adminCashiers = await db.cashiers.filter(c => c.role === 'admin').toArray();
      
      if (adminCashiers.length > 0) {
        await db.cashiers.update(adminCashiers[0].id!, { pin: newAdminPassword });
        toast({
          title: 'Success',
          description: 'Admin password has been reset'
        });
      }
      
      setIsPasswordDialogOpen(false);
      setNewAdminPassword('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset admin password',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    try {
      const data = {
        products: await db.products.toArray(),
        sales: await db.sales.toArray(),
        customers: await db.customers.toArray(),
        settings: await db.settings.toArray(),
        categories: await db.categories.toArray(),
        suppliers: await db.suppliers.toArray(),
        units: await db.units.toArray(),
        cashiers: await db.cashiers.toArray(),
        expenses: await db.expenses.toArray(),
        quickQuantities: await db.quickQuantities.toArray()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supermart-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      toast({
        title: 'Backup created',
        description: 'Database exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        await db.transaction('rw', [
          db.products, db.sales, db.customers, db.settings,
          db.categories, db.suppliers, db.units, db.cashiers,
          db.expenses, db.quickQuantities
        ], async () => {
          if (data.products) await db.products.bulkPut(data.products);
          if (data.sales) await db.sales.bulkPut(data.sales);
          if (data.customers) await db.customers.bulkPut(data.customers);
          if (data.settings) await db.settings.bulkPut(data.settings);
          if (data.categories) await db.categories.bulkPut(data.categories);
          if (data.suppliers) await db.suppliers.bulkPut(data.suppliers);
          if (data.units) await db.units.bulkPut(data.units);
          if (data.cashiers) await db.cashiers.bulkPut(data.cashiers);
          if (data.expenses) await db.expenses.bulkPut(data.expenses);
          if (data.quickQuantities) await db.quickQuantities.bulkPut(data.quickQuantities);
        });
        
        toast({
          title: 'Import successful',
          description: 'Database restored from backup'
        });
        
        loadSettings();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to import data',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await db.categories.add({ name: newCategory });
      setNewCategory('');
      toast({ title: 'Success', description: 'Category added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await db.categories.delete(id);
      toast({ title: 'Success', description: 'Category deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const addSupplier = async () => {
    if (!newSupplier.trim()) return;
    try {
      await db.suppliers.add({ name: newSupplier });
      setNewSupplier('');
      toast({ title: 'Success', description: 'Supplier added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add supplier', variant: 'destructive' });
    }
  };

  const deleteSupplier = async (id: number) => {
    try {
      await db.suppliers.delete(id);
      toast({ title: 'Success', description: 'Supplier deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete supplier', variant: 'destructive' });
    }
  };

  const addUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.symbol.trim()) return;
    try {
      await db.units.add(newUnit);
      setNewUnit({ name: '', symbol: '' });
      toast({ title: 'Success', description: 'Unit added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add unit', variant: 'destructive' });
    }
  };

  const deleteUnit = async (id: number) => {
    try {
      await db.units.delete(id);
      toast({ title: 'Success', description: 'Unit deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete unit', variant: 'destructive' });
    }
  };

  const addCashier = async () => {
    if (!newCashier.name.trim() || !newCashier.pin.trim()) {
      toast({ title: 'Error', description: 'Name and PIN are required', variant: 'destructive' });
      return;
    }
    try {
      await db.cashiers.add({ ...newCashier, createdAt: new Date() });
      setNewCashier({ name: '', pin: '', role: 'cashier' });
      setIsCashierDialogOpen(false);
      toast({ title: 'Success', description: 'Cashier added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add cashier', variant: 'destructive' });
    }
  };

  const deleteCashier = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cashier?')) return;
    try {
      await db.cashiers.delete(id);
      toast({ title: 'Success', description: 'Cashier deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete cashier', variant: 'destructive' });
    }
  };

  const addQuickQuantity = async () => {
    if (!newQuickQty.label.trim() || newQuickQty.value <= 0) {
      toast({ title: 'Error', description: 'Valid label and value are required', variant: 'destructive' });
      return;
    }
    try {
      await db.quickQuantities.add(newQuickQty);
      setNewQuickQty({ value: 0, label: '' });
      toast({ title: 'Success', description: 'Quick quantity added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add quick quantity', variant: 'destructive' });
    }
  };

  const deleteQuickQuantity = async (id: number) => {
    try {
      await db.quickQuantities.delete(id);
      toast({ title: 'Success', description: 'Quick quantity deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete quick quantity', variant: 'destructive' });
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="receiptHeader">Receipt Header</Label>
              <Input
                id="receiptHeader"
                value={settings.receiptHeader}
                onChange={(e) => setSettings({...settings, receiptHeader: e.target.value})}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="receiptFooter">Receipt Footer</Label>
              <Input
                id="receiptFooter"
                value={settings.receiptFooter}
                onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="exportFileName">Export Filename Pattern</Label>
              <Input
                id="exportFileName"
                value={settings.exportFileName || 'pos-backup'}
                onChange={(e) => setSettings({...settings, exportFileName: e.target.value})}
                placeholder="pos-backup"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be used as the filename when exporting database. Date will be automatically appended.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Options */}
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button onClick={addCategory}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {categories?.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span>{cat.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat.id!)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new supplier"
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
              />
              <Button onClick={addSupplier}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {suppliers?.map((sup) => (
                <div key={sup.id} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span>{sup.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteSupplier(sup.id!)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Units of Measurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Unit name (e.g., kilogram)"
                value={newUnit.name}
                onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
              />
              <Input
                placeholder="Symbol (e.g., kg)"
                value={newUnit.symbol}
                onChange={(e) => setNewUnit({...newUnit, symbol: e.target.value})}
                className="w-24"
              />
              <Button onClick={addUnit}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {units?.map((unit) => (
                <div key={unit.id} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span>{unit.name} ({unit.symbol})</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteUnit(unit.id!)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Quantity Presets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Label (e.g., Half)"
                value={newQuickQty.label}
                onChange={(e) => setNewQuickQty({...newQuickQty, label: e.target.value})}
              />
              <Input
                placeholder="Value (e.g., 0.5)"
                type="number"
                step="0.01"
                value={newQuickQty.value || ''}
                onChange={(e) => setNewQuickQty({...newQuickQty, value: parseFloat(e.target.value)})}
                className="w-32"
              />
              <Button onClick={addQuickQuantity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {quickQuantities?.map((qq) => (
                <div key={qq.id} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span>{qq.label} ({qq.value})</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuickQuantity(qq.id!)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cashier Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Cashier Management
              <Dialog open={isCashierDialogOpen} onOpenChange={setIsCashierDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Cashier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Cashier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newCashier.name}
                        onChange={(e) => setNewCashier({...newCashier, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>PIN (4 digits)</Label>
                      <Input
                        type="password"
                        maxLength={4}
                        value={newCashier.pin}
                        onChange={(e) => setNewCashier({...newCashier, pin: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select value={newCashier.role} onValueChange={(value: 'admin' | 'cashier') => setNewCashier({...newCashier, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addCashier} className="w-full">Add Cashier</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cashiers?.map((cashier) => (
                <div key={cashier.id} className="flex justify-between items-center p-3 bg-secondary rounded">
                  <div>
                    <p className="font-semibold">{cashier.name}</p>
                    <p className="text-sm text-muted-foreground">{cashier.role}</p>
                  </div>
                  {cashier.role !== 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => deleteCashier(cashier.id!)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin Password Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Admin Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Admin Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Admin Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password (min 4 characters)"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleResetAdminPassword} className="flex-1">
                      Reset Password
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* System Restore */}
        <SystemRestore />

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle>Backup & Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Database
              </Button>
              
              <label className="flex-1">
                <Button asChild className="w-full">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Database
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full">
          <Save className="w-5 h-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
