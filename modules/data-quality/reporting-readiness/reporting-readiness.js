/* =========================================
   REPORTING READINESS MODULE
========================================= */

(function () {
  "use strict";

  // Reuse shared DQ data.
  window.baselTrackDQData = window.baselTrackDQData || {};

  const dqData = window.baselTrackDQData;

  // Files that have passed validation and are ready for handoff.
  if (!Array.isArray(dqData.reportingReadyFiles)) {
    dqData.reportingReadyFiles = [
      {
        feed: "NSFR Feed",
        status: "Ready",
      },
      {
        feed: "Capital Feed",
        status: "Ready",
      },
    ];
  }

  // Files blocked from proceeding.
  if (!Array.isArray(dqData.blockedFiles)) {
    dqData.blockedFiles = [
      {
        feed: "LCR Feed",
        reason: "Pending Revalidation",
        status: "Blocked",
      },
    ];
  }

  // Record of files sent to the next module.
  if (!Array.isArray(dqData.reconciliationHandoffHistory)) {
    dqData.reconciliationHandoffHistory = [];
  }

  dqData.summary = dqData.summary || {};

  let selectedFeed = null;

  /* =========================================
       INITIALIZE MODULE
    ========================================= */

  window.initReportingReadinessModule = function () {
    const app = document.getElementById("reportingReadinessApp");

    if (!app) return;

    // Promote a blocked file only after its related issue
    // has been marked Revalidated - Passed.
    syncRevalidatedFiles();

    renderReportingReadiness(app);

    if (app.dataset.initialized === "true") return;

    app.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action]");

      if (!button || !app.contains(button)) return;

      const action = button.dataset.action;

      if (action === "send-to-next-step") {
        const index = Number(button.dataset.index);
        openConfirmationModal(app, index);
      }

      if (action === "confirm-handoff") {
        sendToNextStep(app);
      }

      if (action === "close-modal") {
        closeConfirmationModal(app);
      }
    });

    const modal = app.querySelector("#rrdConfirmModal");

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeConfirmationModal(app);
      }
    });

    app.dataset.initialized = "true";
  };

  /* =========================================
       SYNC REVALIDATED FILES
    ========================================= */

  function syncRevalidatedFiles() {
    if (!Array.isArray(dqData.blockedFiles)) return;

    if (!Array.isArray(dqData.reportingReadyFiles)) {
      dqData.reportingReadyFiles = [];
    }

    if (!Array.isArray(dqData.revalidationRequests)) return;

    if (!Array.isArray(dqData.issues)) return;

    dqData.blockedFiles.slice().forEach(function (blockedFile) {
      if (blockedFile.reason !== "Pending Revalidation") return;

      const stillAwaiting = dqData.revalidationRequests.some(
        function (request) {
          return request.feed === blockedFile.feed;
        },
      );

      const relatedIssue = dqData.issues.find(function (issue) {
        return issue.file === blockedFile.feed;
      });

      const revalidationPassed =
        relatedIssue && relatedIssue.status === "Revalidated - Passed";

      if (!stillAwaiting && revalidationPassed) {
        const alreadyReady = dqData.reportingReadyFiles.some(function (item) {
          return item.feed === blockedFile.feed;
        });

        if (!alreadyReady) {
          dqData.reportingReadyFiles.push({
            feed: blockedFile.feed,
            status: "Ready",
          });
        }

        dqData.blockedFiles = dqData.blockedFiles.filter(function (item) {
          return item.feed !== blockedFile.feed;
        });
      }
    });
  }

  /* =========================================
       RENDER COMPLETE SCREEN
    ========================================= */

  function renderReportingReadiness(app) {
    renderSummary(app);
    renderReadyFiles(app);
    renderBlockedFiles(app);
  }

  /* =========================================
       SUMMARY CARDS
    ========================================= */

  function renderSummary(app) {
    const readyCount = dqData.reportingReadyFiles.length;
    const blockedCount = dqData.blockedFiles.length;
    const sentCount = dqData.reconciliationHandoffHistory.length;

    app.querySelector("#rrdReadyCount").textContent = readyCount;
    app.querySelector("#rrdBlockedCount").textContent = blockedCount;
    app.querySelector("#rrdSentCount").textContent = sentCount;
  }

  /* =========================================
       READY FILES TABLE
    ========================================= */

  function renderReadyFiles(app) {
    const tableBody = app.querySelector("#rrdReadyTableBody");
    const badge = app.querySelector("#rrdReadyBadge");

    const files = dqData.reportingReadyFiles;

    badge.textContent =
      files.length + (files.length === 1 ? " File" : " Files");

    if (files.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="rrd-empty">
                        No files are currently ready for reconciliation.
                    </td>
                </tr>
            `;
      return;
    }

    tableBody.innerHTML = files
      .map(function (file, index) {
        return `
                <tr>
                    <td>
                        <span class="rrd-feed-name">
                            ${escapeHTML(file.feed)}
                        </span>
                    </td>

                    <td>
                        <span class="rrd-status rrd-status-ready">
                            ${escapeHTML(file.status)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="rrd-send-btn"
                            data-action="send-to-next-step"
                            data-index="${index}">
                            Send to Next Step
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  /* =========================================
       BLOCKED FILES TABLE
    ========================================= */

  function renderBlockedFiles(app) {
    const tableBody = app.querySelector("#rrdBlockedTableBody");
    const badge = app.querySelector("#rrdBlockedBadge");

    const files = dqData.blockedFiles;

    badge.textContent =
      files.length + (files.length === 1 ? " File" : " Files");

    if (files.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="rrd-empty">
                        No blocked files. All listed files have cleared their blockers.
                    </td>
                </tr>
            `;
      return;
    }

    tableBody.innerHTML = files
      .map(function (file) {
        return `
                <tr>
                    <td>
                        <span class="rrd-feed-name">
                            ${escapeHTML(file.feed)}
                        </span>
                    </td>

                    <td>${escapeHTML(file.reason)}</td>

                    <td>
                        <span class="rrd-status rrd-status-blocked">
                            ${escapeHTML(file.status)}
                        </span>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  /* =========================================
       OPEN CONFIRMATION MODAL
    ========================================= */

  function openConfirmationModal(app, index) {
    const file = dqData.reportingReadyFiles[index];

    if (!file) return;

    selectedFeed = file.feed;

    const details = [
      ["Feed", file.feed],
      ["Current Status", file.status],
      ["Destination", "Reconciliation Module"],
    ];

    app.querySelector("#rrdConfirmDetails").innerHTML = details
      .map(function (item) {
        return `
                    <div class="rrd-detail-row">
                        <span class="rrd-detail-label">
                            ${escapeHTML(item[0])}
                        </span>

                        <span class="rrd-detail-value">
                            ${escapeHTML(item[1])}
                        </span>
                    </div>
                `;
      })
      .join("");

    app.querySelector("#rrdConfirmModal").classList.add("rrd-modal-open");
  }

  /* =========================================
       SEND FILE TO NEXT STEP
    ========================================= */

  function sendToNextStep(app) {
    if (!selectedFeed) return;

    const fileIndex = dqData.reportingReadyFiles.findIndex(function (file) {
      return file.feed === selectedFeed;
    });

    if (fileIndex === -1) {
      closeConfirmationModal(app);
      return;
    }

    const confirmButton = app.querySelector("#rrdConfirmButton");

    confirmButton.disabled = true;
    confirmButton.textContent = "Sending...";

    const file = dqData.reportingReadyFiles[fileIndex];

    // Record the handoff in shared in-memory data.
    dqData.reconciliationHandoffHistory.push({
      feed: file.feed,
      destination: "Reconciliation Module",
      status: "Sent",
      sentAt: new Date().toLocaleString("en-IN"),
    });

    // Remove it from the ready queue.
    dqData.reportingReadyFiles.splice(fileIndex, 1);

    // Update Operations Center summary when available.
    if (typeof dqData.summary.readyForNextStep === "number") {
      dqData.summary.readyForNextStep = Math.max(
        0,
        dqData.summary.readyForNextStep - 1,
      );
    }

    closeConfirmationModal(app);

    renderReportingReadiness(app);

    showToast(
      app,
      file.feed + " successfully sent to the Reconciliation Module.",
    );

    confirmButton.disabled = false;
    confirmButton.textContent = "Send to Next Step";
  }

  /* =========================================
       CLOSE CONFIRMATION MODAL
    ========================================= */

  function closeConfirmationModal(app) {
    const modal = app.querySelector("#rrdConfirmModal");

    if (modal) {
      modal.classList.remove("rrd-modal-open");
    }

    selectedFeed = null;

    const confirmButton = app.querySelector("#rrdConfirmButton");

    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "Send to Next Step";
    }
  }

  /* =========================================
       TOAST
    ========================================= */

  function showToast(app, message) {
    const toast = app.querySelector("#rrdToast");

    toast.textContent = message;
    toast.classList.add("rrd-toast-visible");

    window.setTimeout(function () {
      toast.classList.remove("rrd-toast-visible");
    }, 3500);
  }

  /* =========================================
       HTML ESCAPE HELPER
    ========================================= */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return entities[character];
    });
  }
})();
