"use client";

import { CheckSquare, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "../expenses-client-types";

interface ExpenseBulkActionsBarProps {
  selectedCount: number;
  categories: Category[];
  isDeleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onBulkUpdateCategory: (categoryId: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
}

export function ExpenseBulkActionsBar({
  selectedCount,
  categories,
  isDeleteDialogOpen,
  onDeleteDialogOpenChange,
  onBulkUpdateCategory,
  onBulkDelete,
  onClearSelection,
}: ExpenseBulkActionsBarProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-5 w-5 text-primary" />
        <span className="font-medium">
          {selectedCount} expense{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Select onValueChange={(value) => { void onBulkUpdateCategory(value); }}>
          <SelectTrigger className="w-[180px]">
            <Tag className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Change Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Expenses</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedCount} expense{selectedCount !== 1 ? "s" : ""}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onDeleteDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => { void onBulkDelete(); }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
