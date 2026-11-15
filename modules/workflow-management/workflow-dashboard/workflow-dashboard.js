(function () {
    "use strict";

    const workflowStages = [
        { status: "Submitted", owner: "Maker" },
        { status: "Risk Review", owner: "Risk Analyst" },
        { status: "Finance Review", owner: "Finance Approver" },
        { status: "Compliance Review", owner: "Compliance Officer" },
        { status: "Final Approval", owner: "Senior Manager" },
        { status: "Published", owner: "Published" }
    ];

    let currentStage = 1;
    let app;

    function $(id) {
        return app.querySelector("#" + id);
    }

    function approveStage() {

        if (currentStage >= workflowStages.length - 1) {
            alert("Report Already Published");
            return;
        }

        addHistory(
            workflowStages[currentStage].status,
            workflowStages[currentStage].owner,
            "Approved"
        );

        currentStage++;

        updateWorkflow();

        if (workflowStages[currentStage].status === "Published") {

            addHistory("Published", "System", "Published");

            alert("Report Published Successfully");
        }
    }

    function sendRework() {

        if (workflowStages[currentStage].status === "Published") {
            alert("Published Report Cannot Be Sent For Rework");
            return;
        }

        addHistory(
            workflowStages[currentStage].status,
            workflowStages[currentStage].owner,
            "Rework"
        );

        currentStage = 0;

        updateWorkflow();

        alert("Report Sent Back To Maker");
    }

    function updateWorkflow() {

        const steps = app.querySelectorAll(".workflow-step");
        const lines = app.querySelectorAll(".workflow-line");

        steps.forEach(function (step, index) {

            step.classList.remove("completed", "current");

            if (index < currentStage) {
                step.classList.add("completed");
            }

            if (index === currentStage) {
                step.classList.add(
                    currentStage === workflowStages.length - 1
                        ? "completed"
                        : "current"
                );
            }
        });

        lines.forEach(function (line, index) {
            line.classList.toggle("completed", index < currentStage);
        });

        $("currentOwner").textContent = workflowStages[currentStage].owner;

        $("currentStatus").textContent = workflowStages[currentStage].status;

        const finished = currentStage === workflowStages.length - 1;

        $("approveBtn").disabled = finished;
        $("reworkBtn").disabled = finished;

        $("approveBtn").textContent =
            finished ? "Published" : "Approve & Move Next";
    }

    function addHistory(stage, user, action) {

        const table = $("historyTable");

        const row = table.insertRow(0);

        const cls = action === "Rework" ? "rework" : "approved";

        [
            stage,
            user,
            action,
            new Date().toLocaleString()
        ].forEach(function (value, index) {

            const cell = row.insertCell();

            cell.textContent = value;

            if (index === 2) {
                cell.className = cls;
            }
        });
    }

    function handleClick(event) {
        const button = event.target.closest("button");
        if (!button || !app.contains(button)) return;
        if (button.id === "approveBtn") approveStage();
        if (button.id === "reworkBtn") sendRework();
    }

    function initWorkflowModule() {
        app = document.getElementById("workflowApp");
        if (!app || app.dataset.initialized === "true") return;
        app.dataset.initialized = "true";
        app.addEventListener("click", handleClick);
        updateWorkflow();
    }

    window.initWorkflowModule = initWorkflowModule;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            if (document.getElementById("workflowApp")) initWorkflowModule();
        });
    } else if (document.getElementById("workflowApp")) {
        initWorkflowModule();
    }
})();
