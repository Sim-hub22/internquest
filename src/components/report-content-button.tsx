"use client";

import { useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { FlagIcon } from "lucide-react";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  REPORT_REASONS,
  type ReportTargetType,
  toReportLabel,
} from "@/lib/reports";

export function ReportContentButton({
  targetId,
  targetType,
}: {
  targetId: string;
  targetType: Exclude<ReportTargetType, "user">;
}) {
  const currentUser = useQuery(api.users.current, {});
  const createReport = useMutation(api.reports.create);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser === undefined) {
    return null;
  }

  if (
    currentUser === null ||
    currentUser.role === "admin" ||
    currentUser.isSuspended === true
  ) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await createReport({
        targetId,
        targetType,
        reason,
        details: details.trim() || undefined,
      });
      toast.success("Report submitted");
      setOpen(false);
      setDetails("");
      setReason("spam");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit report"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FlagIcon />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>
            Send this {toReportLabel(targetType)} to the moderation queue for
            admin review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Reason</p>
          <Select
            value={reason}
            onValueChange={(value) =>
              setReason(value as (typeof REPORT_REASONS)[number])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {toReportLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Additional details</p>
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Share any context that will help an admin review this report."
            rows={5}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
