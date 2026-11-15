/* =========================================
   ISSUE WORKBENCH MODULE
========================================= */

(function () {
  "use strict";

  // Reuse the shared DQ data object.
  window.baselTrackDQData = window.baselTrackDQData || {};

  const dqData = window.baselTrackDQData;

  // Initialize issues only when the array does not already exist.
  if (!Array.isArray(dqData.issues)) {
    dqData.issues = [
      {
        id: "DQ001",
        file: "LCR Feed",
        owner: "Risk Team",
        status: "Correction Requested",
        history: [
          {
            event: "Validation Issue Identified",
            description:
              "A data quality issue was identified during validation of the LCR Feed.",
            actor: "DQ Team",
            time: "Initial validation",
          },
          {
            event: "Issue Recorded",
            description:
              "The issue was recorded in the Issue Workbench for tracking.",
            actor: "DQ Team",
            time: "Issue registration",
          },
          {
            event: "Correction Requested",
            description:
              "The issue was assigned to the Risk Team for review and correction.",
            actor: "DQ Team",
            time: "Current status",
          },
        ],
      },
    ];
  }

  /* =========================================
       INITIALIZE MODULE
    ========================================= */

  window.initIssueWorkbenchModule = function () {
    const app = document.getElementById("issueWorkbenchApp");

    if (!app) return;

    renderIssueSummary(app);
    renderIssues(app);

    if (app.dataset.initialized === "true") return;

    app.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action]");

      if (!button || !app.contains(button)) return;

      const action = button.dataset.action;

      if (action === "view-history") {
        const index = Number(button.dataset.index);
        openIssueHistory(app, index);
      }

      if (action === "close-history") {
        closeIssueHistory(app);
      }
    });

    const modal = app.querySelector("#iwHistoryModal");

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeIssueHistory(app);
      }
    });

    app.dataset.initialized = "true";
  };

  /* =========================================
       SUMMARY CARDS
    ========================================= */

  function renderIssueSummary(app) {
    const issues = dqData.issues;

    const totalIssues = issues.length;

    const openIssues = issues.filter(function (issue) {
      return issue.status !== "Closed";
    }).length;

    const correctionIssues = issues.filter(function (issue) {
      return issue.status === "Correction Requested";
    }).length;

    app.querySelector("#iwTotalIssues").textContent = totalIssues;
    app.querySelector("#iwOpenIssues").textContent = openIssues;
    app.querySelector("#iwCorrectionIssues").textContent = correctionIssues;
  }

  /* =========================================
       ISSUE TABLE
    ========================================= */

  function renderIssues(app) {
    const tableBody = app.querySelector("#iwIssueTableBody");
    const countElement = app.querySelector("#iwIssueCount");

    const issues = dqData.issues;

    countElement.textContent =
      issues.length + (issues.length === 1 ? " Issue" : " Issues");

    if (issues.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="iw-empty">
                        No data quality issues available.
                    </td>
                </tr>
            `;
      return;
    }

    tableBody.innerHTML = issues
      .map(function (issue, index) {
        return `
                <tr>
                    <td>
                        <span class="iw-issue-id">
                            ${escapeHTML(issue.id)}
                        </span>
                    </td>

                    <td>${escapeHTML(issue.file)}</td>

                    <td>
                        <span class="iw-owner">
                            ${escapeHTML(issue.owner)}
                        </span>
                    </td>

                    <td>
                        <span class="iw-status">
                            ${escapeHTML(issue.status)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="iw-history-btn"
                            data-action="view-history"
                            data-index="${index}">
                            Timeline
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  /* =========================================
       OPEN ISSUE HISTORY
    ========================================= */

  function openIssueHistory(app, index) {
    const issue = dqData.issues[index];

    if (!issue) return;

    app.querySelector("#iwHistorySubtitle").textContent =
      issue.id + " · " + issue.file;

    renderIssueOverview(app, issue);
    renderTimeline(app, issue);

    app.querySelector("#iwHistoryModal").classList.add("iw-modal-open");
  }

  /* =========================================
       ISSUE OVERVIEW
    ========================================= */

  function renderIssueOverview(app, issue) {
    const overview = app.querySelector("#iwIssueOverview");

    const details = [
      ["Issue ID", issue.id],
      ["File / Feed", issue.file],
      ["Assigned Owner", issue.owner],
      ["Current Status", issue.status],
    ];

    overview.innerHTML = details
      .map(function (item) {
        return `
                <div class="iw-overview-item">
                    <span class="iw-overview-label">
                        ${escapeHTML(item[0])}
                    </span>

                    <span class="iw-overview-value">
                        ${escapeHTML(item[1])}
                    </span>
                </div>
            `;
      })
      .join("");
  }

  /* =========================================
       TIMELINE
    ========================================= */

  function renderTimeline(app, issue) {
    const timeline = app.querySelector("#iwTimeline");

    const history = Array.isArray(issue.history) ? issue.history : [];

    if (history.length === 0) {
      timeline.innerHTML = `
                <p class="iw-empty">No history recorded for this issue.</p>
            `;
      return;
    }

    timeline.innerHTML = history
      .map(function (item) {
        return `
                <div class="iw-timeline-item">
                    <div class="iw-timeline-marker"></div>

                    <div class="iw-timeline-content">
                        <h5 class="iw-timeline-event">
                            ${escapeHTML(item.event)}
                        </h5>

                        <p class="iw-timeline-description">
                            ${escapeHTML(item.description)}
                        </p>

                        <span class="iw-timeline-meta">
                            ${escapeHTML(item.actor)}
                            &nbsp;·&nbsp;
                            ${escapeHTML(item.time)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  /* =========================================
       CLOSE MODAL
    ========================================= */

  function closeIssueHistory(app) {
    const modal = app.querySelector("#iwHistoryModal");

    if (modal) {
      modal.classList.remove("iw-modal-open");
    }
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
