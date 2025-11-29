// Shared Pagination component for platform-wide use
// GOLD STANDARD: This component provides consistent pagination UI across all modules
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean; // Optional prop to hide "Showing X-Y of Z items"
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemCount = true
}: PaginationProps) {
  // Calculate range
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Show max 7 page buttons

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - 2);
      let end = Math.min(totalPages - 1, currentPage + 2);

      // Add ellipsis if needed
      if (start > 2) pages.push('...');

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) pages.push('...');

      // Always show last page
      if (totalPages > 1) pages.push(totalPages);
    }

    return pages;
  };

  // Always show pagination, even with 1 page
  // if (totalPages <= 1) return null;

  // GOLD STANDARD: Pagination button styles for light backgrounds
  // These styles ensure visibility on white cards while maintaining design consistency
  const paginationButtonStyle = {
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
      {/* Pagination Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          style={paginationButtonStyle}
        >
          «
        </Button>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} style={{ padding: '0 var(--space-2)', display: 'flex', alignItems: 'center', color: 'var(--color-gray-400)' }}>...</span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                disabled={page === currentPage}
                style={page === currentPage ? {} : paginationButtonStyle}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          style={paginationButtonStyle}
        >
          »
        </Button>
      </div>

      {/* Item Count */}
      {showItemCount && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}
    </div>
  );
}
