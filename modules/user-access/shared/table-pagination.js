(function () {
    "use strict";

    const PAGE_SIZES = [5, 10, 20, 50];

    function createTablePagination(container, onPageChange, label) {
        if (!container) {
            throw new Error("A pagination container is required.");
        }

        let currentPage = 1;
        let pageSize = 10;
        let totalRecords = 0;
        const notifyPageChange = typeof onPageChange === "function" ? onPageChange : function () {};

        function totalPages() {
            return Math.max(1, Math.ceil(totalRecords / pageSize));
        }

        function renderControls() {
            const pages = totalPages();
            const start = totalRecords ? (currentPage - 1) * pageSize + 1 : 0;
            const end = Math.min(currentPage * pageSize, totalRecords);
            const firstDisabled = currentPage === 1 ? "disabled" : "";
            const lastDisabled = currentPage === pages ? "disabled" : "";

            container.innerHTML = `
                <nav class="table-pagination" aria-label="${label}">
                    <span class="pagination-summary" aria-live="polite">Showing ${start}-${end} of ${totalRecords} records</span>
                    <div class="pagination-controls">
                        <button type="button" class="pagination-button" data-pagination-action="first" aria-label="First page" title="First page" ${firstDisabled}>First</button>
                        <button type="button" class="pagination-button" data-pagination-action="previous" aria-label="Previous page" title="Previous page" ${firstDisabled}>Previous</button>
                        <span class="pagination-page-label">Page <span class="pagination-current" aria-current="page">${currentPage}</span> of ${pages}</span>
                        <button type="button" class="pagination-button" data-pagination-action="next" aria-label="Next page" title="Next page" ${lastDisabled}>Next</button>
                        <button type="button" class="pagination-button" data-pagination-action="last" aria-label="Last page" title="Last page" ${lastDisabled}>Last</button>
                    </div>
                    <label class="pagination-page-size">Rows per page
                        <select class="pagination-size" aria-label="Rows per page">
                            ${PAGE_SIZES.map(function (size) {
                                return `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`;
                            }).join("")}
                        </select>
                    </label>
                </nav>`;
        }

        container.addEventListener("click", function (event) {
            const button = event.target.closest("[data-pagination-action]");
            if (!button || !container.contains(button) || button.disabled) return;

            const pages = totalPages();
            const actions = {
                first: 1,
                previous: currentPage - 1,
                next: currentPage + 1,
                last: pages
            };
            const nextPage = actions[button.dataset.paginationAction];
            if (typeof nextPage !== "number" || nextPage === currentPage) return;
            currentPage = Math.max(1, Math.min(nextPage, pages));
            notifyPageChange();
        });

        container.addEventListener("change", function (event) {
            if (!event.target.matches(".pagination-size")) return;
            const nextSize = Number(event.target.value);
            if (!PAGE_SIZES.includes(nextSize) || nextSize === pageSize) return;
            pageSize = nextSize;
            currentPage = 1;
            notifyPageChange();
        });

        return {
            paginate: function (records) {
                totalRecords = records.length;
                currentPage = Math.min(currentPage, totalPages());
                renderControls();
                const start = (currentPage - 1) * pageSize;
                return records.slice(start, start + pageSize);
            },
            reset: function () {
                currentPage = 1;
            }
        };
    }

    window.createTablePagination = createTablePagination;
})();
