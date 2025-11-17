import { useState } from 'react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { AdminPasswordDialog } from './AdminPasswordDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface SystemRestoreProps {
  compact?: boolean;
}

export const SystemRestore = ({ compact = false }: SystemRestoreProps) => {
  const { toast } = useToast();
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [restorePeriod, setRestorePeriod] = useState<string>('1-day');

  const handleRestore = async () => {
    try {
      const now = new Date();
      let cutoffDate = new Date();

      switch (restorePeriod) {
        case '1-day':
          cutoffDate.setDate(now.getDate() - 1);
          break;
        case '3-days':
          cutoffDate.setDate(now.getDate() - 3);
          break;
        case '1-week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '1-month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          cutoffDate = new Date(0);
          break;
      }

      await db.transaction('rw', [db.sales, db.products, db.expenses], async () => {
        // Delete sales after cutoff date
        const salesToDelete = await db.sales
          .filter(sale => new Date(sale.timestamp) >= cutoffDate)
          .toArray();
        
        // Restore product stock
        for (const sale of salesToDelete) {
          for (const item of sale.items) {
            const product = await db.products.get(item.productId);
            if (product) {
              await db.products.update(item.productId, {
                stock: (product.stock || 0) + item.quantity
              });
            }
          }
        }

        // Delete the sales
        await db.sales
          .filter(sale => new Date(sale.timestamp) >= cutoffDate)
          .delete();

        // Delete expenses after cutoff date
        await db.expenses
          .filter(expense => new Date(expense.date) >= cutoffDate)
          .delete();
      });

      toast({
        title: 'System Restored',
        description: `All transactions from ${restorePeriod.replace('-', ' ')} ago have been reversed`,
      });

      setShowAdminDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore system',
        variant: 'destructive'
      });
    }
  };

  const restoreContent = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Restore the system to a previous state by removing all transactions within a time period. This action cannot be undone.
      </p>
      
      <div className="space-y-2">
        <Label>Restore Period</Label>
        <Select value={restorePeriod} onValueChange={setRestorePeriod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-day">Last 1 Day</SelectItem>
            <SelectItem value="3-days">Last 3 Days</SelectItem>
            <SelectItem value="1-week">Last 1 Week</SelectItem>
            <SelectItem value="1-month">Last 1 Month</SelectItem>
            <SelectItem value="all">Everything</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        variant="destructive" 
        onClick={() => setShowAdminDialog(true)}
        className="w-full"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Restore System
      </Button>
    </div>
  );

  if (compact) {
    return (
      <>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="mr-2 h-4 w-4" />
              System Restore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                System Restore
              </DialogTitle>
              <DialogDescription>
                Restore the system to a previous state
              </DialogDescription>
            </DialogHeader>
            {restoreContent}
          </DialogContent>
        </Dialog>

        <AdminPasswordDialog
          open={showAdminDialog}
          onOpenChange={setShowAdminDialog}
          onConfirm={handleRestore}
          title="Confirm System Restore"
          description="This will permanently delete transactions and restore product stock. Enter admin password to continue."
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            System Restore
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restoreContent}
        </CardContent>
      </Card>

      <AdminPasswordDialog
        open={showAdminDialog}
        onOpenChange={setShowAdminDialog}
        onConfirm={handleRestore}
        title="Confirm System Restore"
        description="This will permanently delete transactions and restore product stock. Enter admin password to continue."
      />
    </>
  );
};
