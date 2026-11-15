window.initDashboardModule = function () {
  const root = document.getElementById("dashboardView");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const role =
    typeof window.getCurrentRole === "function" ? window.getCurrentRole() : "";

  const title = root.querySelector("#pageTitle");
  const description = root.querySelector("#pageDescription");
  const breadcrumb = root.querySelector("#breadcrumb");
  const date = root.querySelector("#currentDate");

  if (title && typeof window.getRoleDashboardTitle === "function") {
    title.textContent = window.getRoleDashboardTitle(role);
  }
  if (description && typeof window.getRoleDescription === "function") {
    description.textContent = window.getRoleDescription(role);
  }
  if (breadcrumb) breadcrumb.textContent = "Dashboard";
  if (date) {
    date.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
};
