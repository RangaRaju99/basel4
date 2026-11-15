/* =====================================================
   BASELTRACK - DATA QUALITY & VALIDATION
   MODULE 2: FILE INTAKE CENTER
===================================================== */

(function () {
  /* =================================================
       1. SHARED DATA INITIALIZATION
    ================================================= */

  window.baselTrackDQData = window.baselTrackDQData || {};

  const dqData = window.baselTrackDQData;

  /* Files Currently Under Validation */

  if (!dqData.filesUnderValidation) {
    dqData.filesUnderValidation = [
      {
        file: "Credit_Risk_Q4.csv",
        records: 125000,
        stage: "Accuracy Validation",
        run: null,
        owner: "DQ Team",
      },
    ];
  }

  /* New Files Received From Data Ingestion */

  if (!dqData.newFilesReceived) {
    dqData.newFilesReceived = [
      {
        file: "Market_Risk_Q4.csv",
        receivedTime: "09:12",
        records: 98000,
      },

      {
        file: "Capital_Adequacy.xml",
        receivedTime: "09:18",
        records: 45000,
      },
    ];
  }

  /* Ensure shared Operations Center data exists */

  if (!dqData.summary) {
    dqData.summary = {
      validationInProgress: 12,
      awaitingReview: 8,
      openIssues: 14,
      revalidationQueue: 6,
      readyForNextStep: 21,
      dqScore: 96,
    };
  }

  if (!dqData.liveRuns) {
    dqData.liveRuns = [];
  }

  if (!dqData.finalizedRuns) {
    dqData.finalizedRuns = [];
  }

  /* =================================================
       2. INITIALIZE FILE INTAKE CENTER
    ================================================= */

  window.initFileIntakeModule = function () {
    const root = document.getElementById("fileIntakeApp");

    if (!root) {
      console.error("File Intake Center: Template not found.");

      return;
    }

    renderAll();

    /* Event delegation */

    root.addEventListener("click", handleActions);

    /* =================================================
           3. RENDER ALL SECTIONS
        ================================================= */

    function renderAll() {
      renderSummary();

      renderActiveFiles();

      renderNewFiles();
    }

    /* =================================================
           4. SUMMARY CARDS
        ================================================= */

    function renderSummary() {
      const activeFiles = dqData.filesUnderValidation;

      const newFiles = dqData.newFilesReceived;

      const activeRecords = activeFiles.reduce(
        (total, item) => total + Number(item.records || 0),
        0,
      );

      const newRecords = newFiles.reduce(
        (total, item) => total + Number(item.records || 0),
        0,
      );

      setText("ficUnderValidation", activeFiles.length);

      setText("ficNewFiles", newFiles.length);

      setText(
        "ficTotalRecords",
        (activeRecords + newRecords).toLocaleString("en-IN"),
      );

      setText(
        "ficActiveCount",
        activeFiles.length + (activeFiles.length === 1 ? " File" : " Files"),
      );

      setText(
        "ficNewCount",
        newFiles.length + (newFiles.length === 1 ? " File" : " Files"),
      );
    }

    /* =================================================
           5. FILES CURRENTLY UNDER VALIDATION
        ================================================= */

    function renderActiveFiles() {
      const tbody = root.querySelector("#ficActiveTableBody");

      if (!tbody) return;

      tbody.replaceChildren();

      if (dqData.filesUnderValidation.length === 0) {
        showEmptyState(tbody, 4, "No files are currently under validation.");

        return;
      }

      dqData.filesUnderValidation.forEach((item) => {
        const row = document.createElement("tr");

        /* File Name */

        row.appendChild(createCell(item.file, "fic-file-name"));

        /* Records */

        row.appendChild(
          createCell(
            Number(item.records).toLocaleString("en-IN"),
            "fic-record-count",
          ),
        );

        /* Stage */

        const stageCell = document.createElement("td");

        const stageBadge = document.createElement("span");

        stageBadge.className = "fic-stage";

        stageBadge.textContent = item.stage;

        stageCell.appendChild(stageBadge);

        row.appendChild(stageCell);

        /* Track Action */

        const actionCell = document.createElement("td");

        const trackButton = document.createElement("button");

        trackButton.type = "button";

        trackButton.className = "fic-action-btn fic-track-btn";

        trackButton.textContent = "Track";

        trackButton.dataset.action = "track";

        trackButton.dataset.file = item.file;

        actionCell.appendChild(trackButton);

        row.appendChild(actionCell);

        tbody.appendChild(row);
      });
    }

    /* =================================================
           6. NEW FILES RECEIVED FROM DATA INGESTION
        ================================================= */

    function renderNewFiles() {
      const tbody = root.querySelector("#ficNewTableBody");

      if (!tbody) return;

      tbody.replaceChildren();

      if (dqData.newFilesReceived.length === 0) {
        showEmptyState(tbody, 4, "No new files are waiting for validation.");

        return;
      }

      dqData.newFilesReceived.forEach((item) => {
        const row = document.createElement("tr");

        /* File Name */

        row.appendChild(createCell(item.file, "fic-file-name"));

        /* Received Time */

        row.appendChild(createCell(item.receivedTime));

        /* Records */

        row.appendChild(
          createCell(
            Number(item.records).toLocaleString("en-IN"),
            "fic-record-count",
          ),
        );

        /* Start Validation Button */

        const actionCell = document.createElement("td");

        const startButton = document.createElement("button");

        startButton.type = "button";

        startButton.className = "fic-action-btn fic-start-btn";

        startButton.textContent = "Start Validation";

        startButton.dataset.action = "start-validation";

        startButton.dataset.file = item.file;

        actionCell.appendChild(startButton);

        row.appendChild(actionCell);

        tbody.appendChild(row);
      });
    }

    /* =================================================
           7. HANDLE TRACK AND START VALIDATION ACTIONS
        ================================================= */

    function handleActions(event) {
      const button = event.target.closest(
        "button[data-action], [data-fic-close]",
      );

      if (!button || !root.contains(button)) return;

      /* Close Modal */

      if (button.hasAttribute("data-fic-close")) {
        closeTrackModal();

        return;
      }

      const action = button.dataset.action;

      const fileName = button.dataset.file;

      if (action === "track") {
        trackFile(fileName);
      }

      if (action === "start-validation") {
        startValidation(fileName, button);
      }
    }

    /* =================================================
           8. TRACK FILE
        ================================================= */

    function trackFile(fileName) {
      const item = dqData.filesUnderValidation.find(
        (file) => file.file === fileName,
      );

      if (!item) return;

      setText("ficTrackFileName", item.file);

      setText("ficTrackRecords", Number(item.records).toLocaleString("en-IN"));

      setText("ficTrackStage", item.stage);

      setText("ficTrackRun", item.run || "Not assigned");

      setText("ficTrackStatus", "In Progress");

      const modal = root.querySelector("#ficTrackModal");

      if (modal) {
        modal.hidden = false;
      }
    }

    /* =================================================
           9. START VALIDATION
        ================================================= */

    function startValidation(fileName, button) {
      const fileIndex = dqData.newFilesReceived.findIndex(
        (item) => item.file === fileName,
      );

      if (fileIndex === -1) return;

      const selectedFile = dqData.newFilesReceived[fileIndex];

      /* Prevent repeated clicks */

      if (button.disabled) return;

      button.disabled = true;

      button.textContent = "Starting...";

      /* Generate a new validation run ID */

      const runId = generateRunId();

      /* Create active validation record */

      const activeFile = {
        file: selectedFile.file,

        records: selectedFile.records,

        stage: "Initial Validation",

        run: runId,

        owner: "DQ Team",
      };

      /* Move file into validation queue */

      dqData.filesUnderValidation.push(activeFile);

      /* Remove from new files */

      dqData.newFilesReceived.splice(fileIndex, 1);

      /* Add run to Operations Center */

      dqData.liveRuns.push({
        run: runId,

        feed: selectedFile.file,

        stage: "Initial Validation",

        owner: "DQ Team",

        status: "In Progress",
      });

      /* Update Operations Center summary */

      dqData.summary.validationInProgress =
        Number(dqData.summary.validationInProgress || 0) + 1;

      /* Refresh File Intake Center */

      renderAll();

      showToast(
        "Validation started successfully for " +
          selectedFile.file +
          ". Run ID: " +
          runId,
      );
    }

    /* =================================================
           10. GENERATE VALIDATION RUN ID
        ================================================= */

    function generateRunId() {
      const allRuns = [...dqData.liveRuns, ...dqData.finalizedRuns];

      let highestNumber = 0;

      allRuns.forEach((item) => {
        const match = String(item.run || "").match(/^VR-(\d+)$/);

        if (match) {
          highestNumber = Math.max(highestNumber, Number(match[1]));
        }
      });

      return "VR-" + String(highestNumber + 1).padStart(3, "0");
    }

    /* =================================================
           11. CLOSE TRACK MODAL
        ================================================= */

    function closeTrackModal() {
      const modal = root.querySelector("#ficTrackModal");

      if (modal) {
        modal.hidden = true;
      }
    }

    /* =================================================
           12. TOAST NOTIFICATION
        ================================================= */

    let toastTimer;

    function showToast(message) {
      const toast = root.querySelector("#ficToast");

      if (!toast) return;

      clearTimeout(toastTimer);

      toast.textContent = message;

      toast.classList.add("fic-toast-visible");

      toastTimer = setTimeout(() => {
        toast.classList.remove("fic-toast-visible");
      }, 3500);
    }

    /* =================================================
           13. COMMON DOM HELPERS
        ================================================= */

    function setText(id, value) {
      const element = root.querySelector("#" + id);

      if (element) {
        element.textContent = value;
      }
    }

    function createCell(value, className = "") {
      const cell = document.createElement("td");

      cell.textContent = value ?? "";

      if (className) {
        cell.className = className;
      }

      return cell;
    }

    function showEmptyState(tbody, columnCount, message) {
      const row = document.createElement("tr");

      const cell = document.createElement("td");

      cell.colSpan = columnCount;

      cell.className = "fic-empty";

      cell.textContent = message;

      row.appendChild(cell);

      tbody.appendChild(row);
    }
  };
})();
