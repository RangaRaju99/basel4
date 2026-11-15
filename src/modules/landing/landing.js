
const $ = id => document.getElementById(id);

/* =========================
   THEME
========================= */

function setupTheme() {
    const toggle = $("themeToggle");
    const saved = localStorage.getItem("baseltrack-theme");

    function applyTheme(value) {
        document.documentElement.dataset.theme = value;

        toggle.textContent = value === "dark" ? "☀" : "☾";

        toggle.setAttribute(
            "aria-label",
            `Switch to ${value === "dark" ? "light" : "dark"} theme`
        );

        toggle.title = `Switch to ${value === "dark" ? "light" : "dark"} theme`;

        localStorage.setItem("baseltrack-theme", value);
    }

    applyTheme(saved || "light");

    toggle.addEventListener("click", () => {
        applyTheme(
            document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark"
        );
    });
}

/* =========================
   LOGIN
========================= */

function openLogin() {
    $("loginOverlay").classList.add("show");
    document.body.style.overflow = "hidden";

    setTimeout(() => $("employeeId").focus(), 100);
}

function closeLogin() {
    $("loginOverlay").classList.remove("show");
    document.body.style.overflow = "";
    $("loginMessage").textContent = "";
}

/* =========================
   BACK TO TOP
========================= */

function setupBackToTop() {
    const button = document.createElement("button");

    button.className = "back-to-top";
    button.innerHTML = "&#8593;";
    button.type = "button";
    button.setAttribute("aria-label", "Back to top");

    document.body.appendChild(button);

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
        button.classList.toggle("show", window.scrollY > 350);
    });
}

/* =========================
   INITIALIZE
========================= */

function setup() {
    setupTheme();
    setupBackToTop();

    const header = $("header");

    window.addEventListener("scroll", () => {
        header.classList.toggle("scrolled", window.scrollY > 18);
    });

    /* LOGIN BUTTONS */

    document.querySelectorAll("[data-login]").forEach(btn => {
        btn.addEventListener("click", openLogin);
    });

    $("closeLogin").addEventListener("click", closeLogin);

    $("loginOverlay").addEventListener("click", e => {
        if (e.target === $("loginOverlay")) {
            closeLogin();
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeLogin();
        }
    });

    /* PASSWORD VISIBILITY */

    $("togglePassword").addEventListener("click", () => {
        const password = $("password");
        const hidden = password.type === "password";

        password.type = hidden ? "text" : "password";
        $("togglePassword").textContent = hidden ? "Hide" : "Show";
    });

    /* LOGIN FORM */

    $("loginForm").addEventListener("submit", e => {
        e.preventDefault();

        const empId = $("employeeId").value.trim();
        const password = $("password").value.trim();
        const role = $("role").value;
        const message = $("loginMessage");

        if (!empId || !password || !role) {
            message.style.color = "#C94B4B";
            message.textContent =
                "Enter Employee ID, Password and select Role.";
            return;
        }

        /* STORE USER DETAILS */

        const userData = {
            employeeId: empId,
            role: role,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(
            "baseltrack-user",
            JSON.stringify(userData)
        );

        localStorage.setItem("baseltrack-role", role);

        /* LOGIN SUCCESS */

        message.style.color = "#16877A";
        message.textContent =
            "Login successful. Opening workspace...";

        setTimeout(() => {
            window.location.href = "workspace.html";
        }, 500);
    });

    /* MOBILE NAVIGATION */

    $("menuBtn").addEventListener("click", () => {
        $("mobileNav").classList.toggle("show");
    });

    document.querySelectorAll(".mobile-nav a").forEach(link => {
        link.addEventListener("click", () => {
            $("mobileNav").classList.remove("show");
        });
    });

    /* SCROLL REVEAL ANIMATION */

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => {
        observer.observe(el);
    });

    /* CARD TILT ANIMATION */

    document.querySelectorAll(".tilt").forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();

            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            card.style.transform =
                `perspective(900px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg) translateY(-3px)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });

    /* HERO LOGO ANIMATION */

    const heroArt = $("heroArt");
    const heroLogo = $("heroLogo");

    heroArt.addEventListener("mousemove", e => {
        const rect = heroArt.getBoundingClientRect();

        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        heroLogo.style.animation = "none";

        heroLogo.style.transform =
            `translate(-50%,-50%) perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 8}deg) scale(1.02)`;
    });

    heroArt.addEventListener("mouseleave", () => {
        heroLogo.style.transform = "translate(-50%,-50%)";
        heroLogo.style.animation = "logoFloat 5s ease-in-out infinite";
    });
}

/* =========================
   DOM READY
========================= */

document.addEventListener("DOMContentLoaded", setup);
