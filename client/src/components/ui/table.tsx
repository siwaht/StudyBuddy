import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-xl premium-border">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm",
        "backdrop-blur-md",
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "[&_tr]:border-b [&_tr]:border-purple-200/30",
      "bg-gradient-to-r from-purple-50/50 to-indigo-50/50",
      "backdrop-blur-sm",
      className
    )} 
    {...props} 
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-purple-200/30",
      "bg-gradient-to-r from-purple-50/30 to-indigo-50/30",
      "backdrop-blur-sm font-medium",
      "[&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-purple-100/20 transition-all duration-300",
      "hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30",
      "hover:scale-[1.001] hover:shadow-sm",
      "data-[state=selected]:bg-gradient-to-r data-[state=selected]:from-purple-100/40 data-[state=selected]:to-indigo-100/40",
      "odd:bg-white/30 even:bg-purple-50/10",
      "group",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle",
      "font-semibold text-purple-900/80",
      "text-xs uppercase tracking-wider",
      "[&:has([role=checkbox])]:pr-0",
      "relative",
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px]",
      "after:bg-gradient-to-r after:from-transparent after:via-purple-300/50 after:to-transparent",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle",
      "[&:has([role=checkbox])]:pr-0",
      "text-gray-700",
      "group-hover:text-gray-900 transition-colors duration-300",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm text-purple-600/70",
      "font-medium",
      className
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
