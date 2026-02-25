"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createExpense, getCategories } from "@/app/actions/expenses";
import { expenseFormSchema, ExpenseFormInput } from "@/lib/schemas";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { UpgradeDialogContext } from "@/components/entitlements";
import {
  formatBusinessDate,
  parseExpenseDateInput,
} from "@/lib/expenses/date-serialization";

interface ExpenseFormProps {
  onSuccess?: () => void;
  onUpgradeRequired?: (context: UpgradeDialogContext) => void;
}

export default function ExpenseForm({
  onSuccess,
  onUpgradeRequired,
}: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const form = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      date: formatBusinessDate(new Date()),
      categoryId: "",
    },
  });

  useEffect(() => {
    async function loadCategories(): Promise<void> {
      setIsCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const result = await getCategories();
        if (Array.isArray(result)) {
          setCategories(result);
          return;
        }

        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Failed to load categories";

        setCategoriesError(errorMessage);
        toast.error(errorMessage);
      } catch {
        const errorMessage = "Failed to load categories";
        setCategoriesError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  async function onSubmit(data: ExpenseFormInput) {
    const formData = new FormData();
    formData.append("amount", data.amount);
    formData.append("description", data.description);
    formData.append("date", data.date);
    formData.append("categoryId", data.categoryId);

    const result = await createExpense(formData);

    if (result.success) {
      toast.success("Expense added");
      form.reset();
      setOpen(false);
      onSuccess?.();
    } else {
      if (result.code === "LIMIT_EXCEEDED") {
        onUpgradeRequired?.({
          feature: "monthlyExpenses",
          source: "expense_create",
          reason: result.error,
        });
        return;
      }
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Enter the details for your new expense below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="What was this for?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isCategoriesLoading || categoriesError !== null}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isCategoriesLoading ? (
                        <SelectItem value="__loading__" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : categoriesError ? (
                        <SelectItem value="__error__" disabled>
                          Failed to load categories
                        </SelectItem>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {categoriesError ? (
                    <p className="text-sm text-destructive">{categoriesError}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(parseExpenseDateInput(field.value), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? parseExpenseDateInput(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? formatBusinessDate(date) : "")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isCategoriesLoading || categoriesError !== null}
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
