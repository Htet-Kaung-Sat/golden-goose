import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SelectField from "./SelectField";

interface AppPaginationProps {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  initialLimit?: number;
}

const BasePagination = ({
  currentPage,
  totalItems,
  onPageChange,
  onLimitChange,
  initialLimit = 20,
}: AppPaginationProps) => {
  const [pageSize, setPageSize] = useState(initialLimit);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const { t } = useTranslation();
  const getPageNumbers = () => {
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    start = Math.max(1, end - 2);

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const limits = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
  ];

  const handleLimitChange = (value: number) => {
    setPageSize(value);
    onPageChange(1);
    onLimitChange?.(value);
  };

  useEffect(() => {
    setPageSize(initialLimit);
  }, [initialLimit]);

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between w-full gap-4">
      <SelectField
        id="rows-per-page"
        label={t("row_per_page")}
        labelClassName="hidden md:flex"
        selectWidth="w-20"
        labelWidth=""
        options={limits}
        dropdownSide="top"
        value={pageSize}
        onChange={(value) => handleLimitChange(Number(value))}
      />

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={currentPage <= 1}
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            />
          </PaginationItem>
          {/* Mobile: compact page selector */}
          <PaginationItem className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[4.5rem] h-9 px-3"
                  aria-label="Page selector"
                >
                  {currentPage} / {totalPages}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="max-h-60 overflow-y-auto"
              >
                {allPages.map((page) => (
                  <DropdownMenuItem
                    key={page}
                    className="cursor-pointer"
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </PaginationItem>
          {/* Desktop: page numbers + ellipsis */}
          {pageNumbers[0] > 1 && (
            <PaginationItem className="hidden sm:list-item">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="More pages"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="max-h-60 overflow-y-auto"
                >
                  {Array.from(
                    { length: pageNumbers[0] - 1 },
                    (_, i) => 1 + i,
                  ).map((page) => (
                    <DropdownMenuItem
                      key={page}
                      className="cursor-pointer"
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PaginationItem>
          )}
          {pageNumbers.map((num) => (
            <PaginationItem key={num} className="hidden sm:list-item">
              <PaginationLink
                href="#"
                isActive={currentPage === num}
                onClick={() => onPageChange(num)}
              >
                {num}
              </PaginationLink>
            </PaginationItem>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <PaginationItem className="hidden sm:list-item">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="More pages"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="max-h-60 overflow-y-auto"
                >
                  {Array.from(
                    {
                      length: totalPages - pageNumbers[pageNumbers.length - 1],
                    },
                    (_, i) => pageNumbers[pageNumbers.length - 1] + 1 + i,
                  ).map((page) => (
                    <DropdownMenuItem
                      key={page}
                      className="cursor-pointer"
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              disabled={currentPage >= totalPages}
              onClick={() =>
                currentPage < totalPages && onPageChange(currentPage + 1)
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <div className="flex items-center font-medium justify-between">
        {t("total_data")} {totalItems}
      </div>
    </div>
  );
};

export default BasePagination;
